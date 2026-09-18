import { Injectable } from '@angular/core';

import { BulkLookupService } from './bulk-lookup.service';
import { LookupOption } from '../models/lookup-option.model';

@Injectable({
    providedIn: 'root'
})
export class BulkLookupFilterService {

    constructor(
        private lookupService: BulkLookupService
    ) {}

    /**
     * Returns all lookup options.
     */
    get(
        datasource: string
    ): LookupOption[] {

        return this.lookupService.get(datasource);

    }

    /**
     * Filter lookup options using one or more fields.
     *
     * Example:
     *
     * filter(PROPERTIES, {
     *      businessId: 1
     * })
     *
     * filter(ASSETS, {
     *      propertyId: 5,
     *      assetTypeId: 2
     * })
     *
     * Each side of the comparison can be a single value OR an array —
     * e.g. a user who belongs to multiple properties (raw.propertyId =
     * [1, 2, 3]) correctly matches a row where property = 2. Schema
     * config is identical either way (`filters: { propertyId: 'property' }`
     * doesn't change) — only the datasource's raw shape does, by using an
     * array instead of a single id for a multi-valued relationship.
     */
    filter(
        datasource: string,
        filters: Record<string, any>
    ): LookupOption[] {

        const options = this.lookupService.get(datasource);

        return options.filter(option => {

            // return Object.entries(filters).every(([key, value]) => {
            //
            //     return option.raw?.[key] == value;
            //
            // });

            return Object.entries(filters).every(([key, rowValue]) => {

                return this.matches(option.raw?.[key], rowValue);

            });

        });

    }

    /**
     * True if rawValue and rowValue overlap. Handles all four
     * combinations of scalar/array on either side, comparing as strings
     * so numeric vs string ids (5 vs "5") don't cause a false mismatch —
     * same defensive comparison style used for dropdown option matching
     * elsewhere in the framework.
     */
    private matches(rawValue: any, rowValue: any): boolean {

        if (rowValue === null || rowValue === undefined || rowValue === '') {
            return false;
        }

        const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue];
        const rowValues = Array.isArray(rowValue) ? rowValue : [rowValue];

        return rawValues.some(rv =>
            rowValues.some(rowV => String(rv) === String(rowV))
        );

    }

    /**
     * Find lookup by id/value.
     */
    findByValue(
        datasource: string,
        value: any
    ): LookupOption | undefined {

        return this.lookupService
            .get(datasource)
            .find(option => option.value === value);

    }

    /**
     * Find lookup by display label.
     */
    findByLabel(
        datasource: string,
        label: string
    ): LookupOption | undefined {

        return this.lookupService
            .get(datasource)
            .find(option => option.label === label);

    }

    isValidValue(
        datasource: string,
        value: any,
        filters: Record<string, any>
    ): boolean{

        return this.findByLabel(
            datasource,
            value
        ) !== undefined;

    }

}
