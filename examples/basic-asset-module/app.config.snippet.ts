import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { BulkApiAdapter, BULK_UPLOAD_CONFIG, BULK_SCHEMAS, BULK_DATASOURCES } from 'ngx-bulk-uploader';

import { routes } from './app.routes';

import { ExampleBulkApiAdapter } from './basic-asset-module/bulk-api-adapter';
import { PropertyDatasource } from './basic-asset-module/property.datasource';
import { LocationDatasource } from './basic-asset-module/location.datasource';
import { TagsDatasource } from './basic-asset-module/tags.datasource';
import { AssetSchema } from './basic-asset-module/asset.schema';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    { provide: BulkApiAdapter, useClass: ExampleBulkApiAdapter },

    { provide: BULK_UPLOAD_CONFIG, useValue: { uploadEndpoint: 'assets/bulk-upload' } },

    { provide: BULK_SCHEMAS, useValue: [AssetSchema], multi: true },

    {
      provide: BULK_DATASOURCES,
      useValue: [
        { key: 'properties', service: PropertyDatasource },
        { key: 'locations', service: LocationDatasource },
        { key: 'tags', service: TagsDatasource }
      ],
      multi: true
    }
  ],
};
