/**
 * A same-row condition, evaluated against one other field's value.
 * Deliberately minimal — every rule so far (Assign Users By Section,
 * Frequency) reduces to equals/notEquals. `in`/`notIn` are here for the
 * inevitable "one of these three values" case so this doesn't need
 * touching again when that shows up.
 */
export interface FieldCondition {

    field: string;

    equals?: any;
    notEquals?: any;

    in?: any[];
    notIn?: any[];

}

/**
 * Evaluates a single condition against a row. Comparisons are done as
 * trimmed, lowercased strings — schema authors write 'Yes' / 'Custom
 * Dates' without worrying about exact casing or whether the underlying
 * value is a string, and it still matches consistently whether the field
 * is a plain toggle or a lookup-backed single select.
 */
export function evaluateCondition(
    row: Record<string, any>,
    condition: FieldCondition
): boolean {

    const raw = row[condition.field];
    const value = raw === null || raw === undefined ? '' : String(raw).trim().toLowerCase();

    if (condition.equals !== undefined) {
        return value === String(condition.equals).trim().toLowerCase();
    }

    if (condition.notEquals !== undefined) {
        return value !== String(condition.notEquals).trim().toLowerCase();
    }

    if (condition.in) {
        return condition.in.some(v => value === String(v).trim().toLowerCase());
    }

    if (condition.notIn) {
        return !condition.notIn.some(v => value === String(v).trim().toLowerCase());
    }

    return false;

}

/**
 * A field can carry one condition or several (OR semantics — readonly if
 * ANY of them match). Used by both readonlyWhen and unique.when so
 * callers never need to branch on single-vs-array themselves.
 */
export function evaluateConditions(
    row: Record<string, any>,
    condition?: FieldCondition | FieldCondition[]
): boolean {

    if (!condition) {
        return false;
    }

    const conditions = Array.isArray(condition) ? condition : [condition];

    return conditions.some(c => evaluateCondition(row, c));

}
