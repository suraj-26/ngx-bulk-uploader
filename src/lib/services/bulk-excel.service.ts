import {Injectable} from '@angular/core';
import {Workbook, Worksheet} from 'exceljs';
import {saveAs} from 'file-saver';

import {BulkSchema} from '../models/bulk-schema.model';
import {BulkField} from '../models/bulk-field.model';
import {BulkFieldType} from '../enums/bulk-field-type.enum';
import {BulkLookupService} from './bulk-lookup.service';
import {BulkLookupMapperService} from './bulk-lookup-mapper.service';
import { BulkLookupFilterService} from "./bulk-lookup-filter.service";

export interface ExcelImportResult {
    rows: any[];
    /** Rows beyond schema.maxRows that were dropped, if any. */
    truncated: boolean;
    /** Import-level problems (wrong file, missing headers) — not per-row validation. */
    fileErrors: string[];
}

const SAMPLE_DROPDOWN_ROWS = 500;


@Injectable({
    providedIn: 'root'
})
export class BulkExcelService {
    constructor(
        private lookupService: BulkLookupService,
        private lookupMapper: BulkLookupMapperService,
        private lookupFilter: BulkLookupFilterService
    ) {}

    /* ==================== DOWNLOAD SAMPLE ==================== */

    async downloadSample(schema: BulkSchema): Promise<void> {

        const workbook = new Workbook();

        const worksheet = workbook.addWorksheet(schema.moduleName);

        worksheet.columns = schema.fields.map(field => ({
            header: field.label,
            key: field.key,
            width: 30
        }));

        this.styleHeaderRow(worksheet);

        worksheet.views = [
            { state: 'frozen', ySplit: 1 }
        ];

        this.applyDataValidation(workbook, worksheet, schema);

        const buffer = await workbook.xlsx.writeBuffer();

        const blob = new Blob(
            [buffer],
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );

        saveAs(blob, `${schema.id}_sample.xlsx`);

    }

    private styleHeaderRow(worksheet: Worksheet): void {

        const headerRow = worksheet.getRow(1);

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1976D2' }
        };

        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 22;

    }

    /**
     * Writes real Excel-native data validation onto the sample file, so
     * opening it in Excel/Sheets actually rejects bad input at entry time
     * instead of just labeling columns. Covers:
     *   - SINGLE_SELECT: dropdown arrow, list sourced from a hidden sheet
     *   - MULTI_SELECT: no Excel-native multi-value dropdown exists, so
     *     this gets a cell note documenting the comma-separated format
     *   - NUMBER: whole/decimal range check against field.min/field.max
     *   - TEXT/EMAIL/PHONE/TEXTAREA/PASSWORD: length check against
     *     field.minLength/field.maxLength, or a "must not be blank" check
     *     when the field is required but has no explicit length bounds
     *   - DATE/DATETIME: rejects non-date entries within a generous range
     *   - CHECKBOX: TRUE/FALSE dropdown
     *
     * Dependent SINGLE_SELECT/MULTI_SELECT fields (dependsOn) get the FULL
     * option list here, not a cascading one — true cascading dropdowns in
     * raw Excel need named ranges + INDIRECT() per parent value, which is
     * a lot of generated complexity for a template file. Invalid parent/
     * child combinations are instead caught during import (importExcel
     * re-runs the same dependency engine used live in the grid). Email
     * format is deliberately NOT enforced here — Excel's formula language
     * can only approximate a regex check and produces more false
     * rejections than it's worth; validateEmail() catches it on import.
     */
    private applyDataValidation(workbook: Workbook, worksheet: Worksheet, schema: BulkSchema): void {

        const listsSheet = schema.fields.some(f => f.datasource && (f.type === BulkFieldType.SINGLE_SELECT))
            ? workbook.addWorksheet('Lists', { state: 'hidden' })
            : null;

        // Cascading dropdowns need extra helper columns on Lists beyond
        // the one each field already gets at its own schema-index column
        // — a shared, ever-incrementing cursor kept well clear of every
        // field's own reserved column (1..schema.fields.length) so nothing
        // ever collides, no matter how many dependent fields there are.
        const helperColumnCursor = { next: schema.fields.length + 5 };

        schema.fields.forEach((field, index) => {

            const colNumber = index + 1;

            switch (field.type) {

                case BulkFieldType.SINGLE_SELECT:
                    this.applySelectValidation(worksheet, listsSheet, field, colNumber, schema, helperColumnCursor);
                    break;

                case BulkFieldType.MULTI_SELECT:
                    this.applyMultiSelectNote(worksheet, field, colNumber);
                    break;

                case BulkFieldType.NUMBER:
                    this.applyNumberValidation(worksheet, field, colNumber);
                    break;

                case BulkFieldType.DATE:
                case BulkFieldType.DATETIME:
                    this.applyDateValidation(worksheet, field, colNumber);
                    break;

                case BulkFieldType.CHECKBOX:
                    this.applyBooleanValidation(worksheet, field, colNumber);
                    break;

                case BulkFieldType.TEXT:
                case BulkFieldType.EMAIL:
                case BulkFieldType.PHONE:
                case BulkFieldType.TEXTAREA:
                case BulkFieldType.PASSWORD:
                    this.applyTextValidation(worksheet, field, colNumber);
                    break;

            }

        });

    }

    private applySelectValidation(
        worksheet: Worksheet,
        listsSheet: Worksheet | null,
        field: BulkField,
        colNumber: number,
        schema: BulkSchema,
        helperColumnCursor: { next: number }
    ): void {

        if (!field.datasource || !listsSheet) {
            return;
        }

        const options = this.lookupService.get(field.datasource);

        if (!options.length) {
            return;
        }

        // Only single-parent dependencies get real cascading — see
        // applyCascadingSelectValidation's doc comment for why a
        // multi-parent case (e.g. Assigned Users depending on both
        // Property and Inspection) falls through to the plain full-list
        // behavior below instead of attempting combined cascading.
        const filterKeys = field.filters ? Object.keys(field.filters) : [];

        if (field.dependsOn?.length && filterKeys.length === 1) {

            const parentFieldKey = field.filters![filterKeys[0]];
            const parentField = schema.fields.find(f => f.key === parentFieldKey);
            const parentColIndex = schema.fields.findIndex(f => f.key === parentFieldKey);

            if (parentField?.datasource && parentColIndex !== -1) {

                this.applyCascadingSelectValidation(
                    worksheet,
                    listsSheet,
                    field,
                    colNumber,
                    parentField,
                    parentColIndex + 1,
                    filterKeys[0],
                    options,
                    helperColumnCursor
                );

                return;

            }

            // Parent field missing from schema, or has no datasource —
            // can't build a reference list to MATCH against. Falls
            // through to the plain full-list behavior below rather than
            // silently producing a broken formula.

        }

        const listColumn = listsSheet.getColumn(colNumber);

        options.forEach((option, i) => {
            listsSheet.getCell(i + 1, colNumber).value = option.label;
        });

        const formula = `Lists!$${listColumn.letter}$1:$${listColumn.letter}$${options.length}`;

        this.forEachSampleRow(row => {

            worksheet.getCell(row, colNumber).dataValidation = {
                type: 'list',
                allowBlank: !field.required,
                formulae: [formula],
                showErrorMessage: true,
                errorTitle: 'Invalid value',
                error: `Please choose a value from the ${field.label} list.`
            };

        });

    }

    /**
     * Real cascading dropdowns via INDIRECT() + MATCH(), not the full
     * option list. Named ranges are built as `<fieldKey>_List_<N>`, tied
     * to the parent option's ROW NUMBER in a reference list — never to
     * the parent's label text itself. That's deliberate: Excel defined
     * names can't contain spaces or most punctuation, so building a name
     * out of a label like "Property A" means sanitizing it AND
     * sanitizing the parent cell's value identically every time the
     * formula evaluates. Tying it to a row position instead means labels
     * can be anything, with no sanitization needed anywhere. Names are
     * prefixed with the field's own key so two different cascading
     * fields (e.g. Department and Asset, both depending on Property)
     * never collide on `List_1`, `List_2`, etc.
     *
     * Only handles ONE parent — see the single-filter-key check in
     * applySelectValidation. A field depending on two parents at once
     * (Assigned Users on Property + Inspection) would need two combined
     * MATCH lookups to build a single composite range name, which is a
     * lot more generated complexity for a template file; those fields
     * get the plain full-list fallback instead, same as before this
     * change. Cross-field invalid combinations are still caught on
     * import either way, since importExcel re-runs the real dependency
     * engine.
     */
    private applyCascadingSelectValidation(
        worksheet: Worksheet,
        listsSheet: Worksheet,
        field: BulkField,
        colNumber: number,
        parentField: BulkField,
        parentColNumber: number,
        filterApiKey: string,
        childOptions: { label: string; value: any; raw?: any }[],
        helperColumnCursor: { next: number }
    ): void {

        const parentOptions = this.lookupService.get(parentField.datasource!);

        if (!parentOptions.length) {
            return;
        }

        const namePrefix = this.sanitizeDefinedName(field.key);

        // Reference column: every parent option's label, in order — this
        // is what MATCH() looks the parent cell's value up against to
        // find which row (and therefore which List_N) applies.
        const refColNumber = helperColumnCursor.next++;
        const refColLetter = listsSheet.getColumn(refColNumber).letter;

        parentOptions.forEach((option, i) => {
            listsSheet.getCell(i + 1, refColNumber).value = option.label;
        });

        const refRangeName = `${namePrefix}_ParentList`;

        listsSheet.workbook.definedNames.add(
            `Lists!$${refColLetter}$1:$${refColLetter}$${parentOptions.length}`,
            refRangeName
        );

        // One block per parent option, each holding just that parent's
        // children, each registered under <namePrefix>_List_<row>.
        parentOptions.forEach((parentOption, i) => {

            const rangeName = `${namePrefix}_List_${i + 1}`;

            const matchingChildren = childOptions.filter(
                child => child.raw?.[filterApiKey] == parentOption.value
            );

            if (!matchingChildren.length) {
                return; // no defined name for an empty block — MATCH still finds the row, INDIRECT just resolves to nothing selectable, which is correct
            }

            const blockColNumber = helperColumnCursor.next++;
            const blockColLetter = listsSheet.getColumn(blockColNumber).letter;

            matchingChildren.forEach((child, j) => {
                listsSheet.getCell(j + 1, blockColNumber).value = child.label;
            });

            listsSheet.workbook.definedNames.add(
                `Lists!$${blockColLetter}$1:$${blockColLetter}$${matchingChildren.length}`,
                rangeName
            );

        });

        const parentColLetter = worksheet.getColumn(parentColNumber).letter;

        this.forEachSampleRow(row => {

            const parentCell = `$${parentColLetter}${row}`;

            worksheet.getCell(row, colNumber).dataValidation = {
                type: 'list',
                allowBlank: !field.required,
                formulae: [`=INDIRECT("${namePrefix}_List_"&MATCH(${parentCell},${refRangeName},0))`],
                showErrorMessage: true,
                errorTitle: 'Invalid value',
                error: `Please choose ${parentField.label} first, then a valid ${field.label} for it.`
            };

        });

    }

    private sanitizeDefinedName(key: string): string {

        const cleaned = key.replace(/[^A-Za-z0-9_]/g, '_');

        return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;

    }

    private applyMultiSelectNote(worksheet: Worksheet, field: BulkField, colNumber: number): void {

        if (!field.datasource) {
            return;
        }

        const options = this.lookupService.get(field.datasource);

        if (!options.length) {
            return;
        }

        // Excel's native list validation only allows a single value —
        // there's no built-in multi-value dropdown. Leave the cell free
        // text and document the expected format instead.
        const sample = options.slice(0, 2).map(o => o.label).join(', ');

        worksheet.getCell(1, colNumber).note =
            `Enter one or more values separated by commas, e.g.: ${sample}`;

    }

    private applyNumberValidation(worksheet: Worksheet, field: BulkField, colNumber: number): void {

        const hasMin = field.min !== undefined;
        const hasMax = field.max !== undefined;

        // Excel's data validation always needs bounds — fall back to a
        // very wide range when the schema doesn't configure any, so the
        // only thing actually enforced is "this must be a number".
        const min = hasMin ? field.min! : -1e15;
        const max = hasMax ? field.max! : 1e15;

        const rangeText = hasMin && hasMax
            ? `between ${min} and ${max}`
            : hasMin
                ? `${min} or greater`
                : hasMax
                    ? `${max} or less`
                    : 'a number';

        this.forEachSampleRow(row => {

            worksheet.getCell(row, colNumber).dataValidation = {
                type: 'decimal',
                operator: 'between',
                allowBlank: !field.required,
                formulae: [min, max],
                showErrorMessage: true,
                errorTitle: 'Invalid number',
                error: `Enter ${rangeText}.`
            };

        });

    }

    private applyDateValidation(worksheet: Worksheet, field: BulkField, colNumber: number): void {

        this.forEachSampleRow(row => {

            worksheet.getCell(row, colNumber).dataValidation = {
                type: 'date',
                operator: 'between',
                allowBlank: !field.required,
                formulae: [new Date(1900, 0, 1), new Date(2100, 0, 1)],
                showErrorMessage: true,
                errorTitle: 'Invalid date',
                error: 'Enter a valid date.'
            };

        });

    }

    private applyBooleanValidation(worksheet: Worksheet, field: BulkField, colNumber: number): void {

        this.forEachSampleRow(row => {

            worksheet.getCell(row, colNumber).dataValidation = {
                type: 'list',
                allowBlank: !field.required,
                formulae: ['"TRUE,FALSE"'],
                showErrorMessage: true,
                errorTitle: 'Invalid value',
                error: `${field.label} must be TRUE or FALSE.`
            };

        });

    }

    private applyTextValidation(worksheet: Worksheet, field: BulkField, colNumber: number): void {

        // Password validation
        if (field.key === "password" && field.pattern) {

            const columnLetter = worksheet.getColumn(colNumber).letter;

            this.forEachSampleRow(row => {

                const cell = `${columnLetter}${row}`;

                // Password requirements:
                // 1. Minimum 7 characters
                // 2. At least one letter
                // 3. At least one number
                // 4. At least one special character: @$!%*#?&
                // 5. Only allowed characters

                const formula = `AND(
                    LEN(${cell})>=7,
                    SUMPRODUCT(--ISNUMBER(SEARCH(MID("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",ROW($1:$52),1),${cell})))>0,
                    SUMPRODUCT(--ISNUMBER(SEARCH(MID("0123456789",ROW($1:$10),1),${cell})))>0,
                    SUMPRODUCT(--ISNUMBER(SEARCH(MID("@$!%*#?&",ROW($1:$7),1),${cell})))>0
                )`;

                worksheet.getCell(row, colNumber).dataValidation = {
                    type: 'custom',
                    allowBlank: !field.required,
                    formulae: [formula],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Password',
                    error: field.patternMessage ||
                        'Password must be at least 7 characters and contain a letter, number and special character.'
                };

            });

            return;
        }

        // Email validation
        if (field.type === BulkFieldType.EMAIL) {

            const columnLetter = worksheet.getColumn(colNumber).letter;

            this.forEachSampleRow(row => {

                const cell = `${columnLetter}${row}`;

                const formula = `AND(
                    ISNUMBER(SEARCH("@",${cell})),
                    ISNUMBER(SEARCH(".",${cell})),
                    SEARCH("@",${cell})>1,
                    SEARCH(".",${cell},SEARCH("@",${cell})+2)>SEARCH("@",${cell})+1,
                    LEN(${cell})>=5
                )`;

                worksheet.getCell(row, colNumber).dataValidation = {
                    type: 'custom',
                    allowBlank: !field.required,
                    formulae: [formula.replace(/\s+/g, ' ')],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Email',
                    error: field.patternMessage || 'Please enter a valid email address.'
                };

            });

            return;
        }

        const hasMin = field.minLength !== undefined;
        const hasMax = field.maxLength !== undefined;

        if (!hasMin && !hasMax) {

            // No explicit length bounds — for a required field, at least
            // reject a blank entry so "required" means something in the
            // downloaded sheet too, not just in the grid after import.
            if (field.required) {

                this.forEachSampleRow(row => {

                    worksheet.getCell(row, colNumber).dataValidation = {
                        type: 'textLength',
                        operator: 'greaterThan',
                        allowBlank: false,
                        formulae: [0],
                        showErrorMessage: true,
                        errorTitle: 'Required field',
                        error: `${field.label} cannot be blank.`
                    };

                });

            }

            return;

        }

        const min = hasMin ? field.minLength! : 0;
        const max = hasMax ? field.maxLength! : 32767; // Excel's own cell text limit

        this.forEachSampleRow(row => {

            worksheet.getCell(row, colNumber).dataValidation = {
                type: 'textLength',
                operator: 'between',
                allowBlank: !field.required,
                formulae: [min, max],
                showErrorMessage: true,
                errorTitle: 'Invalid length',
                error: `${field.label} must be between ${min} and ${max} characters.`
            };

        });

    }

    private forEachSampleRow(fn: (row: number) => void): void {

        for (let row = 2; row <= SAMPLE_DROPDOWN_ROWS + 1; row++) {
            fn(row);
        }

    }

    /* ==================== IMPORT ==================== */

    async importExcel(file: File, schema: BulkSchema): Promise<ExcelImportResult> {

        const extension = file.name.split('.').pop()?.toLowerCase();

        if (schema.allowedExtensions?.length && extension && !schema.allowedExtensions.includes(extension)) {

            return {
                rows: [],
                truncated: false,
                fileErrors: [`Unsupported file type ".${extension}". Allowed: ${schema.allowedExtensions.join(', ')}`]
            };

        }




        const buffer = await file.arrayBuffer();

        const workbook = new Workbook();

        const promise = workbook.xlsx.load(buffer);

        await promise;

        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            return { rows: [], truncated: false, fileErrors: ['The file has no worksheets.'] };
        }

        const headerRow = worksheet.getRow(1);

        const columnIndexByFieldKey = this.mapHeadersToFields(headerRow, schema.fields);

        const missingRequired = schema.fields
            .filter(f => f.required && !columnIndexByFieldKey.has(f.key))
            .map(f => f.label);

        if (missingRequired.length) {

            return {
                rows: [],
                truncated: false,
                fileErrors: [`Missing required column(s): ${missingRequired.join(', ')}. Make sure you're using the downloaded sample file's headers.`]
            };

        }

        const rows: any[] = [];

        worksheet.eachRow((row, rowNumber) => {

            if (rowNumber === 1) {
                return; // header
            }

            if (this.isRowEmpty(row)) {
                return;
            }

            const parsedRow: any = {};

            schema.fields.forEach(field => {

                const colIndex = columnIndexByFieldKey.get(field.key);

                const rawValue = colIndex ? row.getCell(colIndex).value : null;

                parsedRow[field.key] = this.parseFieldValue(rawValue, field,parsedRow);

            });

            rows.push(parsedRow);

        });

        const truncated = !!schema.maxRows && rows.length > schema.maxRows;

        const finalRows = truncated ? rows.slice(0, schema.maxRows) : rows;

        const fileErrors: string[] = [];

        if (truncated) {
            fileErrors.push(`File contains ${rows.length} rows; only the first ${schema.maxRows} were imported (module limit).`);
        }

        return { rows: finalRows, truncated, fileErrors };

    }

    private mapHeadersToFields(headerRow: any, fields: BulkField[]): Map<string, number> {

        const map = new Map<string, number>();

        const labelToKey = new Map(fields.map(f => [f.label.trim().toLowerCase(), f.key]));

        headerRow.eachCell((cell: any, colNumber: number) => {

            const headerText = String(cell.value ?? '').trim().toLowerCase();
            const fieldKey = labelToKey.get(headerText);

            if (fieldKey) {
                map.set(fieldKey, colNumber);
            }

        });

        return map;

    }

    private isRowEmpty(row: any): boolean {

        let hasValue = false;

        row.eachCell({ includeEmpty: false }, () => { hasValue = true; });

        return !hasValue;

    }

    // private parseFieldValue(rawValue: any, field: BulkField,row:any): any {
    //
    //     // exceljs represents rich text / hyperlink cells as objects — normalize to plain values.
    //     let value = rawValue;
    //
    //     if (value && typeof value === 'object' && 'text' in value) {
    //         value = value.text;
    //     }
    //
    //     if (value && typeof value === 'object' && 'result' in value) {
    //         value = value.result;
    //     }
    //
    //     if (value instanceof Date) {
    //         if (field.type === BulkFieldType.DATE) {
    //             const year = value.getFullYear();
    //             const month = String(value.getMonth() + 1).padStart(2, '0');
    //             const day = String(value.getDate()).padStart(2, '0');
    //
    //             return `${year}-${month}-${day}`;
    //         }
    //
    //         value = value.toISOString();
    //     }
    //
    //     if (value === null || value === undefined) {
    //         return field.type === BulkFieldType.MULTI_SELECT ? [] : '';
    //     }
    //
    //     // if (field.type === BulkFieldType.SINGLE_SELECT && field.datasource) {
    //     //     const mapped = this.lookupMapper.getValue(field.datasource, String(value).trim());
    //     //     return mapped !== null ? mapped : String(value).trim();
    //     // }
    //
    //     if (field.type === BulkFieldType.SINGLE_SELECT && field.datasource) {
    //         const mapped = this.lookupMapper.getValue(field.datasource, String(value).trim());
    //         return mapped;
    //     }
    //
    //     if (field.type === BulkFieldType.MULTI_SELECT && field.datasource) {
    //
    //         return String(value)
    //             .split(',')
    //             .map(token => token.trim())
    //             .filter(Boolean)
    //             .map(token => this.lookupMapper.getValue(field.datasource!, token))
    //             .filter(mapped => mapped !== null);
    //
    //     }
    //
    //     return value;
    //
    // }

    private parseFieldValue(
        rawValue: any,
        field: BulkField,
        row: any
    ): any {

        let value = rawValue;

        if (value && typeof value === 'object' && 'text' in value) {
            value = value.text;
        }

        if (value && typeof value === 'object' && 'result' in value) {
            value = value.result;
        }

        if (value instanceof Date) {

            if (field.type === BulkFieldType.DATE) {
                const year = value.getFullYear();
                const month = String(value.getMonth() + 1).padStart(2, '0');
                const day = String(value.getDate()).padStart(2, '0');

                return `${year}-${month}-${day}`;
            }

            value = value.toISOString();
        }

        if (value === null || value === undefined) {
            return field.type === BulkFieldType.MULTI_SELECT ? [] : '';
        }

        // SINGLE SELECT
        if (field.type === BulkFieldType.SINGLE_SELECT && field.datasource) {

            // Dependent field
            if (field.filters) {

                const filters: Record<string, any> = {};

                Object.entries(field.filters).forEach(
                    ([apiField, rowField]) => {

                        filters[apiField] = row[rowField];

                    }
                );

                const options = this.lookupFilter.filter(
                    field.datasource,
                    filters
                );

                const matched = options.find(
                    option =>
                        String(option.label).trim().toLowerCase() ===
                        String(value).trim().toLowerCase()
                );

                return matched ? matched.value : null;
            }

            // Normal non-dependent field
            return this.lookupMapper.getValue(
                field.datasource,
                String(value).trim()
            );
        }

        // MULTI SELECT
        if (field.type === BulkFieldType.MULTI_SELECT && field.datasource) {

            const values = String(value)
                .split(',')
                .map(token => token.trim())
                .filter(Boolean);

            if (field.filters) {

                const filters: Record<string, any> = {};

                Object.entries(field.filters).forEach(
                    ([apiField, rowField]) => {

                        filters[apiField] = row[rowField];

                    }
                );

                const options = this.lookupFilter.filter(
                    field.datasource,
                    filters
                );

                return values
                    .map(token => {

                        const matched = options.find(
                            option =>
                                String(option.label).trim().toLowerCase() ===
                                String(token).trim().toLowerCase()
                        );

                        return matched ? matched.value : null;

                    })
                    .filter(value => value !== null);
            }

            return values
                .map(token =>
                    this.lookupMapper.getValue(
                        field.datasource!,
                        token
                    )
                )
                .filter(mapped => mapped !== null);
        }

        return value;
    }

}
