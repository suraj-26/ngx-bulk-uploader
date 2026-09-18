/**
 * Accepts Date objects, Excel serial numbers, or common string formats
 * (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY). Returns an error message when the
 * value can't be parsed as a real calendar date, or null when it can
 * (or when there's nothing to check).
 */
export function validateDate(value: any): string | null {

    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? 'Enter a valid date' : null;
    }

    if (typeof value === 'number') {
        // Excel serial date (days since 1899-12-30)
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const parsed = new Date(epoch.getTime() + value * 86400000);
        return isNaN(parsed.getTime()) ? 'Enter a valid date' : null;
    }

    const str = String(value).trim();

    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

    if (dmy) {

        const day = Number(dmy[1]);
        const month = Number(dmy[2]);
        const year = Number(dmy[3]);

        const parsed = new Date(year, month - 1, day);

        const valid =
            parsed.getFullYear() === year &&
            parsed.getMonth() === month - 1 &&
            parsed.getDate() === day;

        return valid ? null : 'Enter a valid date (DD/MM/YYYY)';

    }

    const iso = new Date(str);

    return isNaN(iso.getTime()) ? 'Enter a valid date' : null;

}
