export type BulkFieldValidatorType =
    | 'required'
    | 'email'
    | 'regex'
    | 'date'
    | 'duplicate'
    | 'custom';

export interface BulkFieldValidator {

    type: BulkFieldValidatorType;

    message?: string;

    /** Used when type === 'regex' */
    pattern?: string;

    /** Used when type === 'date', e.g. 'DD/MM/YYYY'. Defaults to DD/MM/YYYY. */
    dateFormat?: string;

    /** Used when type === 'custom'. Return true when the value is valid. */
    fn?: (value: any, row: Record<string, any>) => boolean;

}
