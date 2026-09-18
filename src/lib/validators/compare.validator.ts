import { BulkField } from '../models/bulk-field.model';

const OPERATOR_LABEL: Record<string, string> = {
    greaterThan: 'greater than',
    greaterThanOrEqual: 'greater than or equal to',
    lessThan: 'less than',
    lessThanOrEqual: 'less than or equal to'
};

/**
 * Compares this field's value against another field on the same row.
 * Returns null if either side is empty — that's required's job, not
 * this validator's, so a blank Start Date doesn't produce a confusing
 * comparison error on End Date as well.
 */
export function validateCompare(
    value: any,
    row: Record<string, any>,
    field: BulkField
): string | null {

    const config = field.compareTo;

    if (!config) {
        return null;
    }

    const otherValue = row[config.field];

    if (
        value === null || value === undefined || value === '' ||
        otherValue === null || otherValue === undefined || otherValue === ''
    ) {
        return null;
    }

    // const left = config.type === 'date' ? new Date(value).getTime() : Number(value);
    // const right = config.type === 'date' ? new Date(otherValue).getTime() : Number(otherValue);

    const left = config.type === 'date'
        ? parseDate(value, field.dateFormat)
        : Number(value);

    const right = config.type === 'date'
        ? parseDate(otherValue, field.dateFormat)
        : Number(otherValue);

    if (isNaN(left) || isNaN(right)) {
        return null;
    }

    let valid: boolean;

    switch (config.operator) {
        case 'greaterThan':          valid = left > right;  break;
        case 'greaterThanOrEqual':   valid = left >= right; break;
        case 'lessThan':             valid = left < right;  break;
        case 'lessThanOrEqual':      valid = left <= right; break;
        default:                     valid = true;
    }

    if (valid) {
        return null;
    }

    return config.message
        ?? `${field.label} must be ${OPERATOR_LABEL[config.operator]} ${config.field}`;

}

function parseDate(value: any, dateFormat?: string): number {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (value === null || value === undefined || value === '') {
        return NaN;
    }

    const str = String(value).trim();

    if (!dateFormat) {
        return new Date(str).getTime();
    }

    const separator = dateFormat.includes('/')
        ? '/'
        : dateFormat.includes('-')
            ? '-'
            : null;

    if (!separator) {
        return new Date(str).getTime();
    }

    const valueParts = str.split(separator);
    const formatParts = dateFormat.split(separator);

    if (valueParts.length !== 3 || formatParts.length !== 3) {
        return NaN;
    }

    let day: number;
    let month: number;
    let year: number;

    const parts: Record<string, number> = {};

    formatParts.forEach((part, index) => {
        parts[part] = Number(valueParts[index]);
    });

    day = parts['DD'];
    month = parts['MM'];
    year = parts['YYYY'];

    if (
        !Number.isInteger(day) ||
        !Number.isInteger(month) ||
        !Number.isInteger(year)
    ) {
        return NaN;
    }

    const date = new Date(year, month - 1, day);

    // Prevent invalid dates like 31/02/2026
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return NaN;
    }

    return date.getTime();
}
