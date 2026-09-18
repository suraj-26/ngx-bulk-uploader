import { InjectionToken, Type } from '@angular/core';

import { BulkSchema } from '../../models/bulk-schema.model';
import { BulkDataSource } from '../../datasources/interfaces/bulk-datasource.interface';

/**
 * Multi-provider token a consuming app uses to register its own bulk-upload
 * schemas. Each feature module can contribute its own array independently —
 * the library never needs to know what modules exist.
 *
 * Example (in your app config / module providers):
 *
 *   { provide: BULK_SCHEMAS, useValue: [AssetSchema, UserSchema], multi: true }
 */
export const BULK_SCHEMAS = new InjectionToken<BulkSchema[]>('BULK_SCHEMAS');

export interface BulkDatasourceRegistration {
    key: string;
    service: Type<BulkDataSource>;
}

/**
 * Multi-provider token a consuming app uses to register its own lookup
 * datasources (dropdown/multi-select option sources), keyed by whatever
 * string each schema field's `datasource` property references.
 *
 * Example:
 *
 *   {
 *     provide: BULK_DATASOURCES,
 *     useValue: [{ key: 'properties', service: PropertyDatasource }],
 *     multi: true
 *   }
 */
export const BULK_DATASOURCES = new InjectionToken<BulkDatasourceRegistration[]>('BULK_DATASOURCES');
