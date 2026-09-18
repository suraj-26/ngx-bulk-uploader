import {BulkDependencyService} from "./bulk-dependency.service";
import {BulkLookupFilterService} from "./bulk-lookup-filter.service";
import {BulkSchema} from "../models/bulk-schema.model";
import {Injectable} from "@angular/core";
import {BulkDropdownStateService} from "./bulk-dropdown-state.service";

@Injectable({
    providedIn: 'root'
})
export class BulkDependencyEngineService {

    constructor(
        private dependencyService: BulkDependencyService,
        private lookupFilter: BulkLookupFilterService,
        private dropdownState: BulkDropdownStateService
    ) {}

    processRow(
        rowIndex: number,
        row: any,
        changedField: string,
        schema: BulkSchema
    ): void {

        this.processField(
            rowIndex,
            row,
            changedField,
            schema
        );

    }

    private processField(
        rowIndex: number,
        row: any,
        changedField: string,
        schema: BulkSchema
    ): void {

        const dependents =
            this.dependencyService.getAllDependents(
                changedField,
                schema
            );

        dependents.forEach(field => {

            const filters: Record<string, any> = {};

            Object.entries(field.filters ?? {}).forEach(
                ([apiField, rowField]) => {

                    filters[apiField] = row[rowField];

                }
            );

            const options =
                this.lookupFilter.filter(
                    field.datasource!,
                    filters
                );

            this.dropdownState.set(
                rowIndex,
                field.key,
                options
            );

            const currentValue = row[field.key];

            if (Array.isArray(currentValue)) {
                // Multi-select dependent field (e.g. Designation depends on
                // Department): drop only the selections that are no longer
                // valid for the new parent value, keep the rest.
                row[field.key] = currentValue.filter(value =>
                    options.some(option => option.value == value)
                );

            } else {

                const isValid = options.some(option =>
                    option.value == currentValue
                );

                if (!isValid) {
                    row[field.key] = '';
                }

            }

            // ⭐ Continue processing children
            this.processField(
                rowIndex,
                row,
                field.key,
                schema
            );

        });

    }

}
