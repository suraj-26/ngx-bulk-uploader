import { BulkFieldValidator } from '../models/bulk-field-validator.model';

/**
 * Runs a field's `custom` validators (field.validators with type
 * 'custom'). Returns the first failure message, or null when all pass.
 */
export function validateCustom(
    value: any,
    row: Record<string, any>,
    validators?: BulkFieldValidator[]
): string | null {

    if (!validators?.length) {
        return null;
    }

    for (const validator of validators) {

        if (validator.type !== 'custom' || !validator.fn) {
            continue;
        }

        const isValid = validator.fn(value, row);

        if (!isValid) {
            return validator.message || 'Invalid value';
        }

    }

    return null;

}
