import Handsontable from 'handsontable';

/**
 * Column `data` is now an accessor (see utils/mapper.utils.ts) that
 * already resolves the id to its label before Handsontable calls this
 * renderer, so `value` arrives display-ready. This renderer no longer
 * needs to know about BulkLookupMapperService at all — one less place
 * the id/label mapping could drift out of sync.
 */
export class DropdownRenderer {

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
            value,
            cellProperties
        );

    }

}
