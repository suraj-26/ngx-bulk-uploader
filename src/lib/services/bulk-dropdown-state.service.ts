import { Injectable } from '@angular/core';
import { LookupOption } from '../models/lookup-option.model';

@Injectable({
    providedIn: 'root'
})
export class BulkDropdownStateService {

    private dropdowns = new Map<string, LookupOption[]>();

    private key(row: number, field: string): string {
        return `${row}_${field}`;
    }

    set(
        row: number,
        field: string,
        options: LookupOption[]
    ): void {

        this.dropdowns.set(
            this.key(row, field),
            options
        );

    }

    get(
        row: number,
        field: string
    ): LookupOption[] {

        return this.dropdowns.get(
            this.key(row, field)
        ) || [];

    }

    clear(
        row: number,
        field: string
    ): void {

        this.dropdowns.delete(
            this.key(row, field)
        );

    }

}
