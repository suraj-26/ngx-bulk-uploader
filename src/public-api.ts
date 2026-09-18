/*
 * Public API surface of ngx-bulk-uploader
 */

/* Component — drop this into a template */
export * from './lib/components/bulk-upload/bulk-upload.component';

/* Schema-driven config you write per module */
export * from './lib/models/bulk-schema.model';
export * from './lib/models/bulk-field.model';
export * from './lib/models/bulk-field-validator.model';
export * from './lib/models/bulk-row.model';
export * from './lib/models/bulk-validation-error.model';
export * from './lib/models/bulk-upload-response.model';
export * from './lib/models/lookup-option.model';
export * from './lib/enums/bulk-field-type.enum';
export * from './lib/enums/bulk-row-state.enum';
export * from './lib/utils/condition.utils';

/* Registration: how your app plugs its schemas/datasources into the grid */
export * from './lib/core/tokens/bulk-registrations.token';
export * from './lib/core/registry/bulk-schema.registry';
export * from './lib/core/registry/bulk-datasource.registry';
export * from './lib/core/bulk-framework.initializer';
export * from './lib/datasources/interfaces/bulk-datasource.interface';

/* Integration points: implement these to connect the library to your backend */
export * from './lib/config/bulk-api-adapter';
export * from './lib/config/bulk-upload.config';

/* Optional: exposed in case you want to call validation/import logic yourself */
export * from './lib/services/bulk-validation.service';
export * from './lib/services/bulk-excel.service';
export * from './lib/services/bulk-uniqueness.service';
export * from './lib/services/bulk-lookup.service';
