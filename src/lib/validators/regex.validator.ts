/**
 * Returns an error message when `value` doesn't match `pattern`,
 * or null when it does (or when there's nothing to check).
 */
export function validateRegex(
    value: any,
    pattern?: string,
    message?: string
): string | null {

    if (!pattern) {
        return null;
    }

    if (value === null || value === undefined || value === '') {
        return null;
    }

    let regex: RegExp;

    try {
        regex = new RegExp(pattern);
    } catch {
        // A malformed pattern in the schema shouldn't crash validation
        // for every row — surface it once instead.
        return `Field has an invalid validation pattern: ${pattern}`;
    }

    return regex.test(String(value))
        ? null
        : (message || 'Value does not match the required format');

}
