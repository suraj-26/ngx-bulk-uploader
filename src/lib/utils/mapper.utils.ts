import { BulkLookupMapperService } from '../services/bulk-lookup-mapper.service';

/**
 * Root fix for "dropdown shows 1162 instead of the label when you reopen
 * the cell": Handsontable's dropdown/autocomplete editor pre-fills itself
 * from the cell's raw stored value, not from whatever the renderer draws.
 * If the row object stores the id directly, reopening the editor shows
 * the id, because that's the literal value it read.
 *
 * The fix is Handsontable's own documented pattern for this exact
 * situation: make `column.data` a function instead of a string. The
 * function becomes an accessor — GET returns the label (what the editor
 * and renderer should show), SET converts a typed/pasted label back to
 * an id before it's written into the row. The row object itself
 * (hotData[i]) keeps storing the raw id the whole time, so validation,
 * the dependency engine, and your eventual submit-to-backend payload are
 * completely unaffected — only Handsontable's read/write path changes.
 *
 * This also means paste now "just works": pasting a label string runs
 * through the same SET path as a manual edit.
 */
export function createSingleSelectAccessor(
    fieldKey: string,
    datasource: string,
    mapper: BulkLookupMapperService
): (row: any, value?: any) => any {

    return function (row: any, value?: any) {

        if (value === undefined) {

            // GET — Handsontable wants the display/edit value.
            const raw = row[fieldKey];

            if (raw === null || raw === undefined || raw === '') {
                return '';
            }

            return mapper.getLabel(datasource, raw);

        }

        // SET — value is whatever the editor / paste produced.
        // Built-in dropdown/autocomplete editors always hand back a
        // label string here, so convert it back to the id for storage.
        // row[fieldKey] = mapper.getValue(datasource, value);
        //
        // return value;

        if (typeof value === 'number') {
            row[fieldKey] = value;
            return mapper.getLabel(datasource, value);
        }

        row[fieldKey] = mapper.getValue(datasource, value);
        return value;

    };

}

/**
 * Same idea for multi-select. GET joins the row's id array into a
 * readable "Label A, Label B" string (used by copy and by the default
 * renderer). SET accepts either an array of ids directly — which is what
 * MultiSelectEditor.getValue() returns after the popup closes — or a
 * comma-separated label string, which is what a paste produces.
 */
export function createMultiSelectAccessor(
    fieldKey: string,
    datasource: string,
    mapper: BulkLookupMapperService
): (row: any, value?: any) => any {

    return function (row: any, value?: any) {

        if (value === undefined) {

            const raw = row[fieldKey];

            if (!Array.isArray(raw) || raw.length === 0) {
                return '';
            }

            return raw
                .map((id: any) => mapper.getLabel(datasource, id))
                .filter(Boolean)
                .join(', ');

        }

        // if (Array.isArray(value)) {
        //     // Came from MultiSelectEditor — already an array of ids.
        //     row[fieldKey] = value;
        //     return value;
        // }

        if (Array.isArray(value)) {

            row[fieldKey] = [...value];
            return [...value];
        }

        // Came from a paste — comma-separated labels.
        const labels = String(value)
            .split(',')
            .map(label => label.trim())
            .filter(Boolean);

        row[fieldKey] = labels
            .map(label => mapper.getValue(datasource, label))
            .filter((id: any) => id !== null && id !== undefined);

        return row[fieldKey];

    };

}
