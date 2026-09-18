import { Injectable } from '@angular/core';
import { BulkField } from '../models/bulk-field.model';
import { BulkFieldType } from '../enums/bulk-field-type.enum';
import { BulkLookupService } from '../services/bulk-lookup.service';
import { BulkLookupMapperService } from '../services/bulk-lookup-mapper.service';
import { DropdownRenderer } from '../renderers/dropdown.renderer';
import { MultiSelectRenderer } from '../renderers/multiselect.renderer';
import { MultiSelectEditor } from '../editors/multi-select.editor';
import { createMultiSelectAccessor, createSingleSelectAccessor } from '../utils/mapper.utils';

@Injectable({
    providedIn: 'root'
})
export class HotColumnBuilder {

    constructor(
        private lookupService: BulkLookupService,
        private lookupMapper: BulkLookupMapperService
    ) {}

    build(field: BulkField): any {

        // Base settings every column gets, regardless of type — previously
        // width/readOnly/placeholder only landed on columns that fell
        // through to the switch's `default` case, so email/phone/password/
        // textarea columns silently lost them. Set them once, up front.
        const column: any = {
            data: field.key,
            title: field.label,
            width: field.width,
            readOnly: field.readonly,
            placeholder: field.placeholder
        };

        switch (field.type) {

            case BulkFieldType.NUMBER:
                column.type = 'numeric';
                break;

            case BulkFieldType.DATE:
            case BulkFieldType.DATETIME:

                column.type = 'date';
                column.dateFormat = field.dateFormat || 'DD/MM/YYYY';
                column.correctFormat = true;

                break;

            case BulkFieldType.CHECKBOX:

                column.type = 'checkbox';

                break;

            case BulkFieldType.PASSWORD:
            case BulkFieldType.EMAIL:
            case BulkFieldType.PHONE:
            case BulkFieldType.TEXTAREA:

                column.type = 'text';

                break;

            case BulkFieldType.MULTI_SELECT:

                column.data = createMultiSelectAccessor(
                    field.key,
                    field.datasource!,
                    this.lookupMapper
                );

                column.editor = MultiSelectEditor;
                column.renderer = MultiSelectRenderer.render;
                column.datasource = field.datasource;
                column.fieldKey = field.key;

                break;

            case BulkFieldType.SINGLE_SELECT: {

                const options = this.lookupService.get(field.datasource!);

                column.data = createSingleSelectAccessor(
                    field.key,
                    field.datasource!,
                    this.lookupMapper
                );

                column.type = 'dropdown';
                column.source = options.map(option => option.label);

                column.visibleRows = 8;
                column.trimDropdown = false;

                column.strict = true;

                // Matches the per-cell override in HotSettingsBuilder's
                // cells() — see the comment there for the full reasoning.
                // Column-level `false` here was contradicting that
                // override; whichever one Handsontable actually honors
                // for this property, having them disagree is a bug
                // either way. This is what's rejecting pasted values for
                // dependent columns (Asset, Inspection, Location,
                // Section) whose per-row source is still empty at the
                // exact moment a whole-row paste writes them.
                column.allowInvalid = true;

                column.datasource = field.datasource;
                column.renderer = DropdownRenderer.render;

                break;
            }

            default:

                column.type = 'text';

        }

        return column;

    }

}
