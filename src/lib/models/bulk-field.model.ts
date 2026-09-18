import { BulkFieldType } from '../enums/bulk-field-type.enum';
import { BulkFieldValidator } from './bulk-field-validator.model';
import { FieldCondition } from '../utils/condition.utils';

export interface BulkField {

    /* ---------- Identity ---------- */

    /** Unique within the schema. Doesn't need to match `key`, but usually does. */
    id: string;

    /** Property name this field reads/writes on each row object — e.g. 'propertyName'. */
    key: string;

    /** Column header shown in the grid. Include a trailing `*` yourself for required fields. */
    label: string;

    /** Determines the editor, renderer, and which validation rules apply. */
    type: BulkFieldType;

    /* ---------- General ---------- */

    /** Empty cells fail validation with a generic "required" message. */
    required?: boolean;

    /** Cell can't be edited in the grid at all (see also `readonlyWhen` for conditional). */
    readonly?: boolean;

    /** Field is skipped entirely — no column, no Excel column, no validation. */
    hidden?: boolean;

    /** Pre-filled into every new row the grid starts with or `addRows()` adds. */
    defaultValue?: any;

    /* ---------- UI ---------- */

    /** Column width in pixels. Omit to let Handsontable size it automatically. */
    width?: number;

    placeholder?: string;

    /** Shown as a tooltip/help text next to the column header, if your header renderer uses it. */
    description?: string;

    /**
     * Required for SINGLE_SELECT / MULTI_SELECT fields — must match a `key`
     * registered via BULK_DATASOURCES (see BulkDataSource), e.g. 'properties'.
     */
    datasource?: string;

    /**
     * Field keys (not ids) this field's option list is filtered by — e.g.
     * `['property']` for a Location field whose choices depend on the row's
     * chosen Property. Pair with `filters` to say HOW it filters.
     */
    dependsOn?: string[];

    /**
     * Maps a property on each datasource option's `raw` object to the field
     * key (from `dependsOn`) it must match — e.g. `{ propertyId: 'property' }`
     * keeps only Location options whose `raw.propertyId` equals the row's
     * current `property` value.
     */
    filters?: Record<string, string>;

    /** SINGLE_SELECT ignores this. Set true on MULTI_SELECT to allow more than one pick (default true there). */
    multiple?: boolean;

    /* ---------- Validation ---------- */

    /** Regex source string (no slashes), e.g. '^[A-Z]{2}\\d{4}$'. */
    pattern?: string;

    /** Human-readable message shown when `pattern` fails. Falls back to a generic message. */
    patternMessage?: string;

    /**
     * In-sheet uniqueness — no network call, checked in one pass across
     * all rows.
     *
     * `true` — globally unique across the whole sheet (unchanged from
     * before).
     *
     * `{ scopeBy: ['section'] }` — unique only among rows that share the
     * same value for every field listed in scopeBy. E.g. Questions unique
     * within a Section: two different sections can both have "Question 1".
     *
     * `{ when: {...} }` — the constraint only applies when the condition
     * matches (see FieldCondition). E.g. Section only needs to be unique
     * when "Assign Users By Section" is No.
     *
     * scopeBy and when combine freely — e.g. Section unique within a
     * Schedule, but only enforced when Assign Users By Section is No, is
     * one config: { scopeBy: ['scheduleName'], when: {...} }.
     */
    unique?: boolean | {
        scopeBy?: string[];
        when?: FieldCondition;
        message?: string;
    };

    /**
     * Same-row comparison against another field — e.g. End Date must be
     * greater than Start Date. Runs as part of the normal per-cell pass.
     */
    compareTo?: {
        field: string;
        operator: 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual';
        /** Defaults to 'number'. Use 'date' for date/datetime fields. */
        type?: 'number' | 'date';
        message?: string;
    };

    /**
     * Makes this field readonly in the grid whenever the condition
     * matches — NOT a validation rule, doesn't produce an error. Re-
     * evaluated live via HotSettingsBuilder's cells(), the same way
     * dependent dropdown options already are. An array means readonly if
     * ANY condition matches.
     */
    readonlyWhen?: FieldCondition | FieldCondition[];


    requiredWhen?: FieldCondition | FieldCondition[];

    /**
     * When set, this field's values are checked against the backend for
     * records that already exist there — separate from `unique`, which
     * only catches duplicates within the sheet itself. Checked in one
     * batched pass across the whole grid (see BulkUniquenessService), not
     * per-cell, so it's safe on large sheets.
     */
    dbUniqueCheck?: {

        /** POST endpoint. Receives { checks: {value: string, scope?: string}[] }. */
        endpoint: string;

        /**
         * Optional: the key of another field on the same row whose value
         * scopes the check — e.g. 'property', so an email only counts as
         * a duplicate against existing records under the SAME property,
         * not globally. Omit for a global (unscoped) check.
         */
        scopeField?: string;

        /** Expected response shape: { success: boolean, data: { existing: string[] } }. */
        /** Each entry in `existing` is "value::scope" (or bare "value" when unscoped). */

        /** Overrides the default "X already exists" message. */
        message?: string;

    };

    /** Expected import date format, only used for messaging (parsing itself uses Date). */
    dateFormat?: string;

    /** Numeric bounds — NUMBER fields only. Either may be omitted. */
    min?: number;

    max?: number;

    /** Character-length bounds — text-like fields only (TEXT/EMAIL/PHONE/TEXTAREA/PASSWORD). */
    minLength?: number;

    maxLength?: number;

    /** Escape hatch for validation that doesn't fit required/pattern/unique/date. */
    validators?: BulkFieldValidator[];

}
