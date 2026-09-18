import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {LookupOption} from "../models/lookup-option.model";
import {BulkDatasourceRegistry} from "../core/registry/bulk-datasource.registry";
import {BulkSchema} from "../models/bulk-schema.model";


@Injectable({
    providedIn: 'root'
})
export class BulkLookupService {

    private cache = new Map<string, LookupOption[]>();

    constructor(
        private datasourceRegistry: BulkDatasourceRegistry
    ) {}

    async loadLookups(schema: BulkSchema): Promise<void> {

        const datasources = Array.from(
            new Set<string>(
                schema.fields
                    .map((f: any) => f.datasource)
                    .filter(Boolean) as string[]
            )
        );

        for (const datasource of datasources) {

            const loader =
                this.datasourceRegistry.get(datasource);

            const data =
                await firstValueFrom(
                    loader.load()
                );

            this.cache.set(
                datasource,
                data
            );

        }

    }

    get(key: string): LookupOption[] {
        return this.cache.get(key) || [];
    }

}
