import { Injectable, Injector, Optional, Inject } from '@angular/core';

import { BulkSchemaRegistry } from './registry/bulk-schema.registry';
import { BulkDatasourceRegistry } from './registry/bulk-datasource.registry';
import { BULK_SCHEMAS, BULK_DATASOURCES } from './tokens/bulk-registrations.token';

/**
 * Registers every schema and datasource the host app contributed via the
 * BULK_SCHEMAS / BULK_DATASOURCES multi-providers. Call `initialize()` once
 * before the grid needs a schema — BulkUploadComponent already does this in
 * its constructor, so in most apps you never call this yourself.
 *
 * Safe to call more than once; registration only runs the first time.
 */
@Injectable({
    providedIn: 'root'
})
export class BulkFrameworkInitializer {

    private initialized = false;

    constructor(
        private injector: Injector,
        private schemaRegistry: BulkSchemaRegistry,
        private datasourceRegistry: BulkDatasourceRegistry,
        @Optional() @Inject(BULK_SCHEMAS) private schemaGroups: any[][] | null,
        @Optional() @Inject(BULK_DATASOURCES) private datasourceGroups: any[][] | null
    ) {}

    initialize(): void {

        if (this.initialized) {
            return;
        }

        this.initialized = true;

        (this.schemaGroups ?? []).flat().forEach(schema =>
            this.schemaRegistry.register(schema)
        );

        (this.datasourceGroups ?? []).flat().forEach(ds =>
            this.datasourceRegistry.register(
                ds.key,
                this.injector.get(ds.service)
            )
        );

    }

}
