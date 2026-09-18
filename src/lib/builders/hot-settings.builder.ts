import { Injectable } from '@angular/core';
import Handsontable from 'handsontable';
import { BulkDropdownStateService } from '../services/bulk-dropdown-state.service';
import { BulkFieldType } from '../enums/bulk-field-type.enum';
import { BulkSchema } from '../models/bulk-schema.model';
import { BulkLookupService } from '../services/bulk-lookup.service';
import { DropdownRenderer } from '../renderers/dropdown.renderer';
import { evaluateConditions } from '../utils/condition.utils';

export interface HotCallbacks {
    onMultiSelect?: (row: number, col: number) => void;
}

@Injectable({
    providedIn: 'root'
})
export class HotSettingsBuilder {

    constructor(
        private dropdownState: BulkDropdownStateService,
        private lookupService: BulkLookupService
    ) {}

    /**
     * getRow: returns the live row data object for a given row index.
     * Needed for readonlyWhen, which has to inspect sibling field values
     * on the same row — cells() itself only receives row/column indices,
     * not data. Pass `(row) => this.hotData[row]` from the component
     * rather than a snapshotted array, so it always reflects whatever
     * hotData currently references even after an import replaces it.
     */
    build(
        schema: BulkSchema,
        getRow: (row: number) => Record<string, any> | undefined,
        callbacks?: HotCallbacks
    ): Handsontable.GridSettings {
        return {
            stretchH: 'all',
            height: 'calc(100vh - 300px)',
            rowHeaders: true,
            colHeaders: true,
            contextMenu: true,
            autoWrapRow: true,
            autoWrapCol: true,
            selectionMode: 'multiple',
            copyPaste: true,
            undo: true,
            themeName: 'ht-theme-main',
            licenseKey: 'non-commercial-and-evaluation',

            // Per-row overrides layer on top of the static column config
            // from HotColumnBuilder. `data` (the id<->label accessor) is
            // set once at column level and never needs to change per row
            // — only the SELECTABLE option list (`source` / `options`)
            // and readOnly vary per row, because both depend on that
            // row's own field values (dependent dropdowns, conditional
            // readonly).
            cells: (row, column) => {

                const props: any = {};

                const field = schema.fields[column];

                if (!field) {
                    return props;
                }

                if (field.readonlyWhen) {

                    const rowData = getRow(row);

                    props.readOnly = !!rowData && evaluateConditions(rowData, field.readonlyWhen);

                }

                if (field.type === BulkFieldType.SINGLE_SELECT) {

                    let options = [];

                    if (field.dependsOn?.length) {

                        options = this.dropdownState.get(
                            row,
                            field.key
                        );

                    } else {

                        options = this.lookupService.get(
                            field.datasource!
                        );

                    }

                    props.source = options.map(x => x.label);

                    props.strict = true;

                    // NOT false. When pasting an entire row at once,
                    // Handsontable writes every cell in the same batch
                    // BEFORE afterChange fires for any of them — so for a
                    // dependent field like Asset, its per-row `source`
                    // (computed from THIS row's Property) is still empty
                    // at the exact moment the pasted value is written,
                    // because the dependency engine hasn't run yet. With
                    // allowInvalid:false, Handsontable's own strict
                    // validator sees "value not in source" and silently
                    // drops it — which is exactly why only Property
                    // (whose source never depends on anything) survives a
                    // row paste and everything dependent on it doesn't.
                    // allowInvalid:true accepts the write regardless; the
                    // accessor above still correctly resolves the pasted
                    // label to an id (or to nothing, for a genuinely bad
                    // value), and the dependency engine's own afterChange
                    // cascade — which already knows how to clear a value
                    // that turns out invalid for its new parent — is what
                    // actually enforces correctness, not this flag.
                    //
                    // This is a CELL-level override (cells() takes
                    // priority over the column-level setting in
                    // HotColumnBuilder) — if this line goes back to
                    // false, it silently wins over that column default
                    // and the entire paste fix is gone even though
                    // HotColumnBuilder still looks correct. If you ever
                    // need allowInvalid:false for some other reason,
                    // change it in exactly one of these two places, not
                    // both, and leave a note for why.
                    props.allowInvalid = true;

                    props.datasource = field.datasource;
                    props.renderer = DropdownRenderer.render;

                }

                if (field.type === BulkFieldType.MULTI_SELECT) {

                    let options = [];

                    if (field.dependsOn?.length) {

                        options = this.dropdownState.get(
                            row,
                            field.key
                        );

                    } else {

                        options = this.lookupService.get(
                            field.datasource!
                        );

                    }

                    // Read by MultiSelectEditor as the list of choices to
                    // show in the popup for this specific row.
                    props.options = options;

                }

                return props;

            }
        };

    }

}
