import { Injectable } from '@angular/core';

import { BulkSchema } from '../models/bulk-schema.model';
import { BulkField } from '../models/bulk-field.model';
import { BulkValidationError } from '../models/bulk-validation-error.model';
import { BulkFieldType } from '../enums/bulk-field-type.enum';

import { validateRequired } from '../validators/required.validator';
import { validateEmail } from '../validators/email.validator';
import { validateRegex } from '../validators/regex.validator';
import { validateDate } from '../validators/date.validator';
import { validateNumber } from '../validators/number.validator';
import { validateLength } from '../validators/length.validator';
import { validateCustom } from '../validators/custom.validator';
import { validateCompare } from '../validators/compare.validator';
import { findDuplicateRowIndices } from '../validators/duplicate.validator';
import { isRowEmpty } from '../utils/row.utils';
import { evaluateConditions } from '../utils/condition.utils';
import { BulkUniquenessService } from './bulk-uniqueness.service';

@Injectable({
    providedIn: 'root'
})
export class BulkValidationService {

    constructor(
        private uniquenessService: BulkUniquenessService
    ) {}

    /**
     * Validates every row against the schema. Rows where every field is
     * empty (unused template rows, blank lines left in an import) are
     * skipped entirely — no required-field noise, and they're excluded
     * from the duplicate-value pass below so a handful of blank rows
     * don't all "duplicate" each other on a unique-flagged field.
     *
     * Three passes: per-cell checks first (required / email / number /
     * length / regex / date / compareTo / custom), then one in-sheet
     * uniqueness pass per unique-flagged field — resolving any scopeBy
     * grouping and when condition first — then, if any field is
     * dbUniqueCheck-flagged, one batched round trip to the backend
     * checking every distinct value across the whole sheet at once. That
     * last pass is the only part of this method that's actually async;
     * everything before it is synchronous and, for a few thousand rows of
     * simple field-level checks, comfortably finishes within a single
     * frame. If you profile a real freeze on that synchronous part
     * specifically at your actual data size, that's the point to move it
     * into workers/validation.worker.ts — not before.
     */
    async validate(
        rows: any[],
        schema: BulkSchema
    ): Promise<BulkValidationError[]> {

        const errors: BulkValidationError[] = [];

        const nonEmptyRowIndices: number[] = [];

        rows.forEach((row, rowIndex) => {

            if (isRowEmpty(row, schema)) {
                return;
            }

            nonEmptyRowIndices.push(rowIndex);

            schema.fields.forEach(field => {

                const message = this.validateCell(row[field.key], row, field);

                if (message) {

                    errors.push({
                        row: rowIndex + 1,
                        field: field.key,
                        message
                    });

                }

            });

        });

        const nonEmptyRows = nonEmptyRowIndices.map(i => rows[i]);

        schema.fields
            .filter(field => !!field.unique)
            .forEach(field => {

                const config = field.unique === true ? {} : field.unique as Exclude<BulkField['unique'], boolean | undefined>;

                // 'when' gates whether the constraint applies to a row at
                // all — e.g. Section only needs to be unique when Assign
                // Users By Section is No. Rows that don't match the
                // condition are excluded before duplicate-checking, not
                // just excluded from being reported: they also shouldn't
                // count as a match for OTHER rows in their group.
                const candidateLocalIndices = nonEmptyRows
                    .map((row, localIndex) => ({ row, localIndex }))
                    .filter(({ row }) => !config.when || evaluateConditions(row, config.when))
                    .map(({ localIndex }) => localIndex);

                const candidateRows = candidateLocalIndices.map(i => nonEmptyRows[i]);

                const duplicateCandidateIndices = findDuplicateRowIndices(
                    candidateRows,
                    field.key,
                    config.scopeBy ?? []
                );

                duplicateCandidateIndices.forEach(candidateIndex => {

                    const localIndex = candidateLocalIndices[candidateIndex];
                    const rowIndex = nonEmptyRowIndices[localIndex];

                    errors.push({
                        row: rowIndex + 1,
                        field: field.key,
                        message: config.message
                            ?? `${field.label} must be unique — duplicate value found`
                    });

                });

            });

        const dbUniqueFields = schema.fields.filter(field => !!field.dbUniqueCheck);

        if (dbUniqueFields.length > 0) {

            const existingByField = await this.uniquenessService.checkExisting(nonEmptyRows, schema);

            nonEmptyRowIndices.forEach((rowIndex, localIndex) => {

                const row = nonEmptyRows[localIndex];

                dbUniqueFields.forEach(field => {

                    const key = this.uniquenessService.buildKey(row, field);

                    if (key === null) {
                        return;
                    }

                    const existingSet = existingByField.get(field.key);

                    if (existingSet?.has(key)) {

                        errors.push({
                            row: rowIndex + 1,
                            field: field.key,
                            message: field.dbUniqueCheck?.message
                                ?? `${field.label} already exists`
                        });

                    }

                });

            });

        }

        return errors;

    }

    /**
     * Same per-cell rule set as validate(), exposed separately so the
     * import pipeline / afterChange can validate a single cell without
     * re-scanning the whole grid for duplicates.
     */
    validateCell(
        value: any,
        row: Record<string, any>,
        field: BulkField
    ): string | null {

        const requiredByCondition =
            field.requiredWhen &&
            evaluateConditions(row, field.requiredWhen);

        if (field.required || requiredByCondition) {

        // if (field.required) {

            const requiredError = validateRequired(value);

            if (requiredError) {
                return `${field.label} is required`;
            }

        }

        // Nothing further to check on an empty, non-required value.
        if (value === null || value === undefined || value === '') {
            return null;
        }

        if (field.type === BulkFieldType.EMAIL) {

            const emailError = validateEmail(value);

            if (emailError) {
                return `${field.label}: ${emailError}`;
            }

        }

        if (
            field.type === BulkFieldType.DATE ||
            field.type === BulkFieldType.DATETIME
        ) {

            const dateError = validateDate(value);

            if (dateError) {
                return `${field.label}: ${dateError}`;
            }

        }

        if (field.type === BulkFieldType.NUMBER) {

            const numberError = validateNumber(value, field.min, field.max);

            if (numberError) {
                return `${field.label}: ${numberError}`;
            }

        }

        if (field.minLength !== undefined || field.maxLength !== undefined) {

            const lengthError = validateLength(value, field.minLength, field.maxLength);

            if (lengthError) {
                return `${field.label}: ${lengthError}`;
            }

        }

        if (field.pattern) {

            const patternError = validateRegex(value, field.pattern, field.patternMessage);

            if (patternError) {
                return `${field.label}: ${patternError}`;
            }

        }

        if (field.compareTo) {

            const compareError = validateCompare(value, row, field);

            if (compareError) {
                return compareError;
            }

        }

        const customError = validateCustom(value, row, field.validators);

        if (customError) {
            return `${field.label}: ${customError}`;
        }

        return null;

    }

}
