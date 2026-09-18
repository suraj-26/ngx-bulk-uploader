/**
 * Returns an error message when a required value is missing/blank,
 * or null when the value is present. Handles arrays (multi-select) too.
 */
export function validateRequired(value: any): string | null {

    const isEmpty =
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'string' && value.trim() === '');

    return isEmpty ? 'This field is required' : null;

}
