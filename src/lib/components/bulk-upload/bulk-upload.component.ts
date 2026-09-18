import { Component, Input, Output, EventEmitter, EnvironmentInjector, ViewChild, Optional, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HotTableModule, HotTableComponent } from '@handsontable/angular';
import Handsontable from 'handsontable';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BulkApiAdapter } from '../../config/bulk-api-adapter';
import { BULK_UPLOAD_CONFIG, BulkUploadConfig } from '../../config/bulk-upload.config';

import { BulkSchema } from '../../models/bulk-schema.model';
import { BulkSchemaRegistry } from '../../core/registry/bulk-schema.registry';
import { BulkHeaderComponent } from '../bulk-header/bulk-header.component';
import { BulkToolbarComponent } from '../bulk-toolbar/bulk-toolbar.component';
import { BulkLookupService } from '../../services/bulk-lookup.service';
import { HotColumnBuilder } from '../../builders/hot-column.builder';
import { BulkExcelService } from '../../services/bulk-excel.service';
import { BulkValidationService } from '../../services/bulk-validation.service';
import { ValidationSummaryComponent } from '../validation-summary/validation-summary.component';
import { BulkGridService } from '../../services/bulk-grid.service';
import { BulkValidationError } from '../../models/bulk-validation-error.model';
import { HotSettingsBuilder } from '../../builders/hot-settings.builder';
import { BulkDependencyEngineService } from '../../services/bulk-dependency-engine.service';
import { BulkDropdownStateService } from '../../services/bulk-dropdown-state.service';
import { BulkFrameworkInitializer } from '../../core/bulk-framework.initializer';
import { MultiSelectPopupComponent } from '../multi-select-popup/multi-select-popup.component';
import { BulkFieldType } from '../../enums/bulk-field-type.enum';
import { isRowEmpty } from '../../utils/row.utils';
import { FieldCondition } from '../../utils/condition.utils';
import { BulkLookupMapperService } from '../../services/bulk-lookup-mapper.service';

@Component({
    selector: 'bulk-uploader',
    standalone: true,
    imports: [
        CommonModule,
        HotTableModule,
        BulkHeaderComponent,
        BulkToolbarComponent,
        ValidationSummaryComponent,
        MultiSelectPopupComponent
    ],
    templateUrl: './bulk-upload.component.html',
    styleUrls: ['./bulk-upload.component.scss']
})
export class BulkUploadComponent {

    constructor(
        private registry: BulkSchemaRegistry,
        private lookupService: BulkLookupService,
        private columnBuilder: HotColumnBuilder,
        private excelService: BulkExcelService,
        private validationService: BulkValidationService,
        private gridService: BulkGridService,
        private settingsBuilder: HotSettingsBuilder,
        private dependencyEngine: BulkDependencyEngineService,
        private dropdownState: BulkDropdownStateService,
        private initializer: BulkFrameworkInitializer,
        private lookupMapper: BulkLookupMapperService,
        private environmentInjector: EnvironmentInjector,
        private apiAdapter: BulkApiAdapter,
        private cdr: ChangeDetectorRef,
        @Optional() private route: ActivatedRoute | null,
        @Optional() @Inject(BULK_UPLOAD_CONFIG) private uploadConfig: BulkUploadConfig | null
    ) {
        this.initializer.initialize();
    }

    hotSettings!: Handsontable.GridSettings;
    validated = false;

    /**
     * Pass the schema directly for standalone usage:
     *   <bulk-uploader [schema]="AssetSchema"></bulk-uploader>
     *
     * If omitted, the component falls back to resolving it from the
     * BulkSchemaRegistry using this route's `module` param — a convenience
     * for apps that route to a shared /bulk-upload/:module page.
     */
    @Input()
    schema?: BulkSchema;

    /** Emitted after a successful upload, instead of the component
     *  navigating anywhere itself — you decide what "done" means. */
    @Output()
    uploaded = new EventEmitter<void>();

    /**
     * The schema actually in use, resolved in ngOnInit from either the
     * [schema] input or the route. Definitely assigned by the time
     * anything else in this component runs — ngOnInit throws before
     * that if neither source produced one — so everything past ngOnInit
     * reads this instead of the (possibly-undefined) input directly.
     */
    activeSchema!: BulkSchema;

    private _hotTable?: HotTableComponent;

    // Setter form, not property form: <hot-table> is behind *ngIf="isReady",
    // which only flips true after an async lookup load in ngOnInit. A plain
    // `@ViewChild(...) hotTable!: HotTableComponent` only resolves once,
    // during the very first view check — before isReady is true, so it
    // would stay undefined forever. Angular re-invokes a setter-style
    // ViewChild whenever the queried element's presence changes, which is
    // what we actually need here.
    @ViewChild(HotTableComponent)
    set hotTable(component: HotTableComponent | undefined) {

        this._hotTable = component;

        if (component) {
            this.gridService.setInstance((component as any).hotInstance);
        }

    }

    get hotTable(): HotTableComponent | undefined {
        return this._hotTable;
    }

    validationErrors: BulkValidationError[] = [];
    importErrors: string[] = [];

    hotData: any[] = [];
    hotColumns: any[] = [];

    isReady = false;
    isBusy = false;

    /** Separate from isBusy — drives a dedicated progress-bar UI rather
     *  than the generic toolbar busy state every other action shares. */
    isUploading = false;

    uploadError: string | null = null;
    private hasValidated = false;

    async ngOnInit(): Promise<void> {

        if (this.schema) {

            this.activeSchema = this.schema;

        } else {

            const module = this.route?.snapshot.paramMap.get('module');

            if (!module) {
                throw new Error(
                    'BulkUploadComponent needs a [schema] input, or a `module` route param it can resolve one from.'
                );
            }

            const schema = this.registry.get(module);

            if (!schema) {
                throw new Error(`Schema '${module}' is not registered.`);
            }

            this.activeSchema = schema;

        }

        this.hotSettings = this.settingsBuilder.build(this.activeSchema, (row) => this.hotData[row]);

        // Handsontable instantiates editor classes itself (`new EditorClass(hotInstance)`),
        // so this is how MultiSelectEditor reaches Angular DI (OverlayPopupService)
        // — see MultiSelectEditor.open(). Single-select doesn't need a custom
        // editor at all: HotColumnBuilder gives it a column.data accessor
        // (utils/mapper.utils.ts) that translates id<->label for Handsontable's
        // own built-in dropdown editor, which also makes paste convert correctly.
        (this.hotSettings as any).angularInjector = this.environmentInjector;

        // Not a template [beforePaste] binding — @handsontable/angular
        // only exposes a fixed, hardcoded set of hooks as @Input()s, and
        // beforePaste isn't reliably one of them across versions
        // (afterChange is, which is why that one stays as a binding).
        // Setting it directly on the settings object works regardless,
        // since Handsontable's core reads any hook straight off whatever
        // settings it's constructed with — this bypasses the wrapper's
        // whitelist entirely instead of hoping this specific hook is on it.
        (this.hotSettings as any).beforePaste = this.beforePaste;

        await this.lookupService.loadLookups(this.activeSchema);

        this.buildColumns();
        this.buildRows();

        this.isReady = true;

        // Zoneless-safe: setting a plain property from inside an async
        // continuation (this whole method, after any `await`) isn't a
        // change-detection trigger on its own without zone.js patching it —
        // Angular only knows to re-render after signals, DOM events, or an
        // explicit call like this one. Same reasoning at every other
        // `markForCheck()` in this file.
        this.cdr.markForCheck();

    }

    private buildColumns(): void {
        this.hotColumns = this.activeSchema.fields.map(field => this.columnBuilder.build(field));
    }

    private buildRows(count: number = 10): void {

        this.hotData = [];

        for (let i = 0; i < count; i++) {

            const row: any = {};

            this.activeSchema.fields.forEach(field => {
                row[field.key] = field.type === BulkFieldType.MULTI_SELECT ? [] : (field.defaultValue ?? '');
            });

            this.hotData.push(row);

        }

    }

    /* ==================== TOOLBAR ACTIONS ==================== */

    downloadSample(): void {
        this.excelService.downloadSample(this.activeSchema);
    }

    async importExcel(file: File): Promise<void> {

        this.isBusy = true;
        this.importErrors = [];
        this.validated = false;

        try {

            const result = await this.excelService.importExcel(file, this.activeSchema);

            if (result.fileErrors.length && !result.rows.length) {
                this.importErrors = result.fileErrors;
                return;
            }

            this.importErrors = result.fileErrors;
            this.hotData = result.rows;

            // Re-run the same dependency cascade the grid uses live, so
            // dependent single/multi-select values that don't match their
            // parent's imported value are cleaned up (and dropdownState is
            // populated for every row) before the grid ever renders them.
            this.activeSchema.fields
                .filter(field => !field.dependsOn?.length)
                .forEach(rootField => {
                    this.hotData.forEach((row, rowIndex) => {
                        this.dependencyEngine.processRow(rowIndex, row, rootField.key, this.activeSchema);
                    });
                });

            this.gridService.refreshData(this.hotData);

            await this.runValidation();

        } finally {
            this.isBusy = false;
            this.cdr.markForCheck();
        }

    }

    addRows(): void {

        this.hotData = this.gridService.addRows(this.hotData, 10, this.activeSchema);

        this.gridService.refreshData(this.hotData);

        this.validated = false;


    }

    async validateGrid(): Promise<void> {
        await this.runValidation();
    }

    private async runValidation(): Promise<void> {

        this.isBusy = true;

        try {

            this.validationErrors = await this.validationService.validate(this.hotData, this.activeSchema);
            this.hasValidated = true;

            this.gridService.highlightErrors(this.validationErrors, this.activeSchema);

            this.validated = true;
        } finally {
            this.isBusy = false;
            this.cdr.markForCheck();
        }

    }

    get validRowsCount(): number {

        if (!this.hasValidated) {
            return 0;
        }

        const errorRowNumbers = new Set(this.validationErrors.map(e => e.row));

        return this.hotData.length - errorRowNumbers.size;

    }

    get errorRowsCount(): number {
        return new Set(this.validationErrors.map(e => e.row)).size;
    }

    jumpToError(error: BulkValidationError): void {

        const columnIndex = this.activeSchema.fields.findIndex(f => f.key === error.field);

        if (columnIndex < 0) {
            return;
        }

        const hot = (this.hotTable as any).hotInstance;

        hot.selectCell(error.row - 1, columnIndex);

    }

    async upload(): Promise<void> {

        // await this.runValidation();

        if (this.validationErrors.length) {
            return; // toolbar already disables the button once errorRows > 0; this covers a stale click
        }

        this.isBusy = true;
        this.isUploading = true;
        this.uploadError = null;

        try {

            // const payload = this.hotData.filter(row => !isRowEmpty(row, this.activeSchema));
            const payload = this.hotData
                .filter(row => !isRowEmpty(row, this.activeSchema))
                .map(row =>
                    this.activeSchema.fields.map(field => row[field.key])
                );

            const params = new HttpParams();

            // Tenant/auth context is NOT included here — your BulkApiAdapter
            // implementation attaches that itself, the same as it would for
            // any other request your app makes. `type` is the one thing
            // that varies per module and has to come from the schema, since
            // apps commonly share one upload endpoint across every module.
            const formData = {
                type: this.activeSchema.uploadType,
                rows: payload
            };

            const endpoint = this.activeSchema.uploadEndpoint ?? this.uploadConfig?.uploadEndpoint;

            if (!endpoint) {
                this.uploadError = 'No upload endpoint configured. Set BULK_UPLOAD_CONFIG or schema.uploadEndpoint.';
                return;
            }

            const response = await firstValueFrom(
                this.apiAdapter.postCall(endpoint, params, formData)
            );

            if (!response?.success) {
                this.uploadError = response?.msg ?? 'Upload failed. Please try again.';
                return;
            }

            this.hotData = [];
            this.validationErrors = [];
            this.uploaded.emit();

        } catch (err) {

            this.uploadError = 'Upload failed. Please try again.';

        } finally {
            this.isBusy = false;
            this.isUploading = false;
            this.cdr.markForCheck();
        }

    }

    /* ==================== GRID EVENTS ==================== */

    /**
     * Excel import works cleanly because loadData() replaces the data
     * source directly — it never goes through Handsontable's per-cell
     * write/validate path at all, so dependent-column filtering is a
     * non-issue there. Paste does go through that path, one cell at a
     * time, and Handsontable batches every cell of a row-paste into a
     * single write BEFORE afterChange fires for any of them — so a
     * dependent column's per-row option list is still stale (computed
     * from whatever was in that row before the paste, usually nothing)
     * at the exact moment its own pasted value is being written.
     * allowInvalid:true (see HotColumnBuilder/HotSettingsBuilder) stops
     * Handsontable from silently discarding that write, but the more
     * direct fix is this: resolve any pasted PARENT field (one other
     * columns depend on — Property, Inspection) and run the dependency
     * engine for it BEFORE Handsontable gets to the rest of that row, so
     * the correct option list already exists by the time it's needed
     * instead of arriving one render cycle too late.
     */
    beforePaste = (
        data: string[][],
        coords: { startRow: number; startCol: number; endRow: number; endCol: number }[]
    ): void => {

        const startRow = coords[0].startRow;
        const startCol = coords[0].startCol;

        data.forEach((rowValues, rowOffset) => {

            const targetRow = startRow + rowOffset;
            const row = this.hotData[targetRow];

            if (!row) {
                return;
            }

            rowValues.forEach((cellValue, colOffset) => {

                const targetCol = startCol + colOffset;
                const field = this.activeSchema.fields[targetCol];

                if (!field) {
                    return;
                }

                // Only fields something else actually depends on matter
                // here — resolving every pasted cell up front would be
                // wasted work for the common case of plain text columns.
                const hasDependents = this.activeSchema.fields.some(f => f.dependsOn?.includes(field.key));

                if (!hasDependents) {
                    return;
                }

                let resolvedValue: any = cellValue;

                if (field.type === BulkFieldType.SINGLE_SELECT && field.datasource) {
                    resolvedValue = this.lookupMapper.getValue(field.datasource, cellValue);
                }

                // Applied directly to the row now, ahead of Handsontable's
                // own write for this same cell — processRow() below reads
                // this value back off the row to compute every dependent
                // column's option list.
                row[field.key] = resolvedValue;

                this.dependencyEngine.processRow(targetRow, row, field.key, this.activeSchema);

            });

        });

    };

    afterChange = (
        changes: Handsontable.CellChange[] | null,
        source: Handsontable.ChangeSource
    ): void => {

        if (!changes || source === 'loadData') {
            return;
        }
        this.validated = false;

        const hot = (this.hotTable as any).hotInstance as Handsontable.Core;

        let dependentsChanged = false;

        changes.forEach((change: Handsontable.CellChange) => {

            const rowIndex = change[0] as number;
            const prop = change[1];

            // `prop` is a plain string for text/number/date/etc columns,
            // but for SINGLE_SELECT/MULTI_SELECT it's the column's data
            // ACCESSOR FUNCTION (see utils/mapper.utils.ts) — Handsontable
            // reports column.data literally, whatever type it is. Matching
            // that against field.key (a string) always fails for select
            // columns, which is why dependent dropdowns and multi-select
            // paste silently didn't cascade before. propToCol() resolves
            // either shape back to a column index correctly.
            const columnIndex = hot.propToCol(prop as any) as number;

            if (columnIndex < 0 || columnIndex === undefined) {
                return;
            }

            const field = this.activeSchema.fields[columnIndex];

            if (!field) {
                return;
            }

            // No manual label<->id conversion needed here — the column's
            // data accessor (single/multi-select) already converted
            // whatever the editor or a paste produced into an id (or id
            // array) before this event fired. hotData[rowIndex] already
            // holds the right value.
            const row = this.hotData[rowIndex];

            this.dependencyEngine.processRow(rowIndex, row, field.key, this.activeSchema);

            // Cheap check so a plain text column doesn't force a full grid
            // re-render on every keystroke — only fields that something
            // else depends on (for dropdown options OR readonly state)
            // can have changed anyone's cell properties.
            const hasDependents = this.activeSchema.fields.some(f =>
                f.dependsOn?.includes(field.key) ||
                this.readonlyWhenReferences(f.readonlyWhen, field.key)
            );

            if (hasDependents) {
                dependentsChanged = true;
            }

        });

        if (dependentsChanged) {
            // Re-render so HotSettingsBuilder's cells() callback re-reads
            // BulkDropdownStateService for every row and refreshes the
            // dependent columns' dropdown source / multi-select options,
            // and re-evaluates readonlyWhen against the new row values.
            hot.render();
        }

        // Handsontable calls this hook itself, outside any Angular-bound
        // event listener, so this component's own state changes above
        // (this.validated, in particular) need this — see the note on
        // markForCheck() in ngOnInit.
        this.cdr.markForCheck();

    };

    private readonlyWhenReferences(
        readonlyWhen: FieldCondition | FieldCondition[] | undefined,
        fieldKey: string
    ): boolean {

        if (!readonlyWhen) {
            return false;
        }

        const conditions = Array.isArray(readonlyWhen) ? readonlyWhen : [readonlyWhen];

        return conditions.some(c => c.field === fieldKey);

    }

    clear(): void {

        this.hotData = [];

        this.validationErrors = [];

        this.importErrors = [];

        this.validated = false;

        this.hasValidated = false;

        this.gridService.refreshData(this.hotData);

        this.addRows();

    }

    hasData(): boolean {
        return this.hotData.some(row => !isRowEmpty(row, this.activeSchema));
}

}
