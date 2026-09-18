import Handsontable from 'handsontable';

/**
 * Same simplification as DropdownRenderer — the multi-select accessor
 * already joins the id array into "Label A, Label B" before this runs.
 */
export class MultiSelectRenderer {

    static render(
        instance: Handsontable,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string | number,
        value: any,
        cellProperties: any
    ) {

        Handsontable.renderers.TextRenderer(
            instance,
            td,
            row,
            col,
            prop,
            value ?? '',
            cellProperties
        );

    }

}
