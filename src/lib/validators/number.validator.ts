/**
 * Returns an error message when `value` isn't a number, or is outside
 * field.min/field.max (whichever are set), or null when it's fine.
 */
export function validateNumber(
    value: any,
    min?: number,
    max?: number
): string | null {

    if (value === null || value === undefined || value === '') {
        return null;
    }

    const num = Number(value);

    if (isNaN(num)) {
        return 'Enter a valid number';
    }

    if (min !== undefined && num < min) {
        return `Must be at least ${min}`;
    }

    if (max !== undefined && num > max) {
        return `Must be at most ${max}`;
    }

    return null;

}
