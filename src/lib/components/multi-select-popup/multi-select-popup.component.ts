import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LookupOption } from '../../models/lookup-option.model';
import { PopupContext } from '../../popup/contracts/popup-context';
import { PopupResult } from '../../popup/contracts/popup-result';
import { PopupEditorComponent } from '../../popup/contracts/popup-editor.interface';

@Component({
    selector: 'bulk-uploader-multi-select-popup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './multi-select-popup.component.html',
    styleUrls: ['./multi-select-popup.component.scss']
})
export class MultiSelectPopupComponent
    implements PopupEditorComponent<any[]>, OnInit {

    constructor(
        private cdr: ChangeDetectorRef
    ) {}

    @Input()
    context!: PopupContext<any[]>;

    @Output()
    result = new EventEmitter<PopupResult<any[]>>();

    options: LookupOption[] = [];
    filteredOptions: LookupOption[] = [];
    selected: any[] = [];
    search = '';

    ngOnInit(): void {

        this.options = (this.context.columnMeta?.options as LookupOption[]) ?? [];
        this.filteredOptions = this.options;
        this.selected = [...(this.context.initialValue ?? [])];

    }

    filter(): void {

        const keyword = this.search.trim().toLowerCase();

        this.filteredOptions = keyword
            ? this.options.filter(option => option.label.toLowerCase().includes(keyword))
            : this.options;

    }

    isSelected(value: any): boolean {
        return this.selected.some(v => String(v) === String(value));
    }

    toggle(value: any): void {

        const index = this.selected.findIndex(v => String(v) === String(value));

        if (index >= 0) {
            this.selected.splice(index, 1);
        } else {
            this.selected.push(value);
        }

        this.cdr.detectChanges();

    }

    isAllSelected(): boolean {

        if (!this.filteredOptions.length) {
            return false;
        }

        return this.filteredOptions.every(option => this.isSelected(option.value));
    }

    selectAll(): void {

        if (this.isAllSelected()) {

            const visible = new Set(this.filteredOptions.map(o => String(o.value)));
            this.selected = this.selected.filter(v => !visible.has(String(v)));

            return;

        }

        const toAdd = this.filteredOptions
            .map(o => o.value)
            .filter(v => !this.isSelected(v));

        this.selected = [...this.selected, ...toAdd];
        this.cdr.detectChanges();

    }

    clear(): void {
        this.selected = [];
        this.cdr.detectChanges();
    }

    apply(): void {

        this.result.emit({
            applied: true,
            value: [...this.selected]
        });

    }

    cancel(): void {

        this.result.emit({
            applied: false
        });

    }

}
