import { InjectionToken } from '@angular/core';

export interface BulkUploadConfig {

    /**
     * POST endpoint the grid submits validated rows to when the user clicks
     * Upload. Many apps share one endpoint across every module and switch on
     * `schema.uploadType` server-side — this is that shared default.
     *
     * A schema can override it per-module by setting `uploadEndpoint` on the
     * BulkSchema itself; that takes precedence over this default when set.
     */
    uploadEndpoint: string;

}

export const BULK_UPLOAD_CONFIG = new InjectionToken<BulkUploadConfig>('BULK_UPLOAD_CONFIG');
