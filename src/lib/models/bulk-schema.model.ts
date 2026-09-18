import { BulkField } from './bulk-field.model';

export interface BulkSchema {

    /** Matches this schema when resolved by route param via BulkSchemaRegistry — not otherwise used if you always pass [schema] directly. */
    id: string;

    /** Shown in the grid header ("<moduleName> Bulk Upload") and loading text. */
    moduleName: string;

    /** Where BulkHeaderComponent's back button navigates. Doesn't have to be a real route if you're not using it. */
    backUrl:string;

    // Sent as `type` in the upload payload — must match whatever string
    // your backend's upload endpoint expects for this module (e.g.
    // 'users', 'asset').
    uploadType: string;

    /**
     * Overrides BulkUploadConfig.uploadEndpoint for this module only. Only
     * needed if this schema's rows go to a different endpoint than the
     * shared default.
     */
    uploadEndpoint?: string;

    /** Optional subtitle shown under the grid title. */
    description?: string;

    /** Not enforced by the library — yours to use for your own migration/compat logic if you version schemas. */
    version: number;

    /** Upper bound the grid/Excel import enforces on row count. Omit for no limit. */
    maxRows?: number;

    /** File extensions the import button accepts. Defaults to ['xlsx', 'xls'] if omitted. */
    allowedExtensions?: string[];

    /** Columns, in display order. See BulkField for everything a field can configure. */
    fields: BulkField[];
}
