import { BulkSchema } from '../models/bulk-schema.model';

/**
 * True when every field on this row is empty — the default state of an
 * unused row from buildRows()/addRows(), or a blank line left in an
 * imported file. Used to skip such rows entirely rather than flagging
 * them as failing "required" checks, and to strip them before submit.
 */
export function isRowEmpty(
    row: Record<string, any>,
    schema: BulkSchema
): boolean {

    return schema.fields.every(field => {
        const value = row[field.key];

        if (value === null || value === undefined) {
            return true;
        }

        if (typeof value === 'string') {
            return value.trim() === '';
        }

        if (Array.isArray(value)) {
            return value.length === 0;
        }

        return false;
    });

}
