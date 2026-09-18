const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns an error message for a malformed email, or null when valid.
 * Blank values are considered valid here — pair with validateRequired
 * if the field is also mandatory.
 */
export function validateEmail(value: any): string | null {

    if (value === null || value === undefined || value === '') {
        return null;
    }

    return EMAIL_PATTERN.test(String(value).trim())
        ? null
        : 'Enter a valid email address';

}
