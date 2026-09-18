import { Injectable } from '@angular/core';
import { BulkLookupService } from './bulk-lookup.service';

@Injectable({
    providedIn: 'root'
})
export class BulkLookupMapperService {

    constructor(
        private lookupService: BulkLookupService
    ) {}

    getLabel(
        datasource: string,
        value: any
    ): string {

        const option = this.lookupService
            .get(datasource)
            .find(x => x.value == value);

        return option?.label ?? '';

    }

    getValue(
        datasource: string,
        input: any
    ): any {

        const options = this.lookupService.get(datasource);

        // Typed/pasted a human-readable label (the normal case).
        const byLabel = options.find(x => x.label == input);

        if (byLabel) {
            return byLabel.value;
        }

        // Pasted from another dropdown cell of the same column — clipboard
        // carries the raw id, not the label. Match that too so copy-paste
        // between two cells of the same column round-trips correctly.
        const byRawValue = options.find(x =>
            String(x.value) === String(input) || String(x.id) === String(input)
        );

        return byRawValue?.value ?? null;

    }

    getOption(
        datasource: string,
        value: any
    ) {

        return this.lookupService
            .get(datasource)
            .find(x => x.value == value);

    }

}
