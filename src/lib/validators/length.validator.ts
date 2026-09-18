/**
 * Returns an error message when `value`'s length is outside
 * field.minLength/field.maxLength (whichever are set), or null when
 * it's fine (or when neither bound is configured).
 */
export function validateLength(
    value: any,
    minLength?: number,
    maxLength?: number
): string | null {

    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (minLength === undefined && maxLength === undefined) {
        return null;
    }

    const length = String(value).length;

    if (minLength !== undefined && length < minLength) {
        return `Must be at least ${minLength} character${minLength === 1 ? '' : 's'}`;
    }

    if (maxLength !== undefined && length > maxLength) {
        return `Must be at most ${maxLength} character${maxLength === 1 ? '' : 's'}`;
    }

    return null;

}
