/**
 * Scans one field across every row and returns the set of row indices
 * that share a value with at least one other row WITHIN THE SAME SCOPE.
 * Blank values are ignored (handled separately by validateRequired).
 * O(n) via a value->rows map, run once per field, not per row.
 *
 * Global uniqueness (the original behaviour) is just this function
 * called with no scopeBy — every row shares the same (empty) scope, so
 * it's a single group across the whole sheet.
 *
 * scopeBy groups rows first: two rows only compete for uniqueness if
 * every field listed in scopeBy matches between them. E.g. scopeBy:
 * ['section'] means the same question text in two different sections
 * isn't a duplicate of itself — they're different groups.
 */
export function findDuplicateRowIndices(
    rows: Record<string, any>[],
    fieldKey: string,
    scopeBy: string[] = []
): Set<number> {

    const seen = new Map<string, number[]>();

    rows.forEach((row, index) => {

        const value = row[fieldKey];

        if (value === null || value === undefined || value === '') {
            return;
        }

        const normalizedValue =
            Array.isArray(value)
                ? [...value].sort().join(',')
                : String(value).trim().toLowerCase();

        if (!normalizedValue) {
            return;
        }

        const scopeKey = scopeBy
            .map(scopeField => String(row[scopeField] ?? '').trim().toLowerCase())
            .join('::');

        const key = `${scopeKey}::${normalizedValue}`;

        const indices = seen.get(key) ?? [];

        indices.push(index);

        seen.set(key, indices);

    });

    const duplicates = new Set<number>();

    seen.forEach(indices => {

        if (indices.length > 1) {
            indices.forEach(i => duplicates.add(i));
        }

    });

    return duplicates;

}
