import Handsontable from 'handsontable';
import { Injector } from '@angular/core';

import { OverlayPopupService } from '../popup/services/overlay-popup.service';
import { PopupContext } from '../popup/contracts/popup-context';
import { PopupResult } from '../popup/contracts/popup-result';
import { MultiSelectPopupComponent } from '../components/multi-select-popup/multi-select-popup.component';
import { LookupOption } from '../models/lookup-option.model';

const BaseEditor = Handsontable.editors.BaseEditor;

/**
 * Bridges Handsontable's editor lifecycle to the Angular popup framework
 * for multi-select cells.
 *
 * The row keeps storing the raw id array the whole time (see
 * createMultiSelectAccessor in utils/mapper.utils.ts) — this editor reads
 * that raw array directly via getSourceDataAtRow (bypassing the label-
 * joining accessor) so the popup opens with the real current selection.
 *
 * Commit path: Apply calls hot.setDataAtCell() directly instead of this
 * editor's own finishEditing(). Handsontable also independently closes
 * the "active editor" whenever focus moves outside the edited cell's own
 * DOM — and since this popup renders into a CDK overlay attached to
 * document.body (not inside the cell), that happens the moment the popup
 * gains focus, well before Apply is ever clicked. finishEditing() at that
 * point would be committing through an editor Handsontable already
 * considers closed — a silent no-op. setDataAtCell() writes straight to
 * the grid's data source through the exact same column data-accessor
 * path, independent of whatever state Handsontable thinks this editor is
 * in, so there's no race to win in the first place.
 *
 * DI note: Handsontable instantiates editor classes itself
 * (`new EditorClass(hotInstance)`), so OverlayPopupService can't reach
 * this class via constructor injection. BulkUploadComponent stashes its
 * EnvironmentInjector on the grid settings object as `angularInjector`
 * before the grid renders (see bulk-upload.component.ts ngOnInit) — this
 * editor reads it back from `this.hot.getSettings()`.
 */
export class MultiSelectEditor extends BaseEditor {

    private fieldKey!: string;
    private selectedIds: any[] = [];
    private popupSub: { unsubscribe(): void } | null = null;

    override prepare(
        row: number,
        col: number,
        prop: string | number,
        td: HTMLTableCellElement,
        originalValue: any,
        cellProperties: Handsontable.CellProperties
    ): void {

        super.prepare(row, col, prop, td, originalValue, cellProperties);

        // `prop` here is the column's data ACCESSOR FUNCTION, not a string
        // (Handsontable reports whatever `column.data` literally is) — so
        // we can't use it to index into the row. HotColumnBuilder puts the
        // real field key on cellProperties.fieldKey for exactly this
        // reason. See afterChange in bulk-upload.component.ts for the same
        // gotcha on the read side.
        this.fieldKey = (cellProperties as any).fieldKey;

        const sourceRow = this.hot.getSourceDataAtRow(row) as Record<string, any>;

        this.selectedIds = Array.isArray(sourceRow?.[this.fieldKey])
            ? [...sourceRow[this.fieldKey]]
            : [];

    }

    override open(): void {

        const injector: Injector | undefined = (this.hot.getSettings() as any).angularInjector;

        if (!injector) {

            console.error(
                'MultiSelectEditor: no Angular injector found on grid settings. ' +
                'Set (hotSettings as any).angularInjector = this.environmentInjector ' +
                'before the grid renders — see BulkUploadComponent.ngOnInit().'
            );

            return;

        }

        const overlayPopupService = injector.get(OverlayPopupService);

        // Set per-row by HotSettingsBuilder's cells() callback — already
        // filtered by the dependency engine when this field depends on
        // another column's value.
        const options: LookupOption[] = (this.cellProperties as any).options ?? [];

        const context: PopupContext<any[]> = {
            initialValue: this.selectedIds,
            row: this.row!,
            col: this.col!,
            prop: this.fieldKey,
            columnMeta: { options }
        };

        this.popupSub = overlayPopupService
            .open(MultiSelectPopupComponent, this.TD as unknown as HTMLElement, context)
            .subscribe((result: PopupResult<any[]>) => {

                if (result.applied) {

                    // NOT this.finishEditing() — see class doc. Writing
                    // directly through setDataAtCell doesn't depend on
                    // Handsontable still considering this editor "active"
                    // by the time Apply is clicked, so it's immune to the
                    // premature-close race entirely, rather than trying to
                    // win it.

                    // this.hot.setDataAtCell(this.row, this.col, result.value ?? [], 'edit');
                    this.selectedIds = [...(result.value ?? [])];

                    this.hot.setDataAtCell(
                        this.row!,
                        this.col!,
                        this.selectedIds,
                        'edit'
                    );

                }

            });

    }

    override close(): void {
        // Deliberately does NOT touch popupSub. Handsontable calls close()
        // on us the instant it decides editing is over — including
        // prematurely, the moment focus moves into the popup at all (see
        // class doc). Honoring that would tear down the subscription to
        // Apply's result before the user ever gets to click it, which is
        // exactly the bug this class exists to avoid. The subscription
        // cleans itself up on its own once the popup genuinely resolves —
        // OverlayPopupService completes its result Subject on Apply,
        // Cancel, outside-click, and Escape alike.
    }

    override getValue(): any[] {
        return this.selectedIds;
    }

    override setValue(value: any[]): void {

        // Handsontable calls this between prepare() and open() as part of
        // its own internal editor-opening sequence, passing in whatever
        // the cell currently reads as — which goes through the column's
        // data accessor GET path (a joined label STRING, since column.data
        // is a function; see mapper.utils.ts), not the raw id array.
        // prepare() already populated selectedIds correctly straight from
        // the source row, bypassing that lossy string entirely. Accepting
        // a non-array here would silently reset a real selection back to
        // empty on every reopen — only accept genuine arrays, ignore
        // anything else.
        if (Array.isArray(value)) {
            this.selectedIds = value;
        }

    }

    // Popup owns focus (search input autofocuses inside it) — the cell
    // itself has no focusable native element the way TextEditor does.
    override focus(): void {}

}
