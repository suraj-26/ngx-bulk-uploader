# ngx-bulk-uploader

A schema-driven bulk Excel upload grid for Angular, built on [Handsontable](https://handsontable.com/).

Define a module as a **schema** (fields, types, validation, dependent dropdowns) and you get, for free:

- An editable spreadsheet-style grid, pre-populated with empty rows
- Excel import (`.xlsx`/`.xls`) and a downloadable sample template
- Per-cell validation: required, regex, min/max, date, same-row comparisons, in-sheet uniqueness
- Optional **DB-side** uniqueness checks, batched across the whole sheet
- Single- and multi-select columns backed by your own async lookup data, with dependent
  dropdowns ("Location" options depend on the chosen "Property")
- Copy/paste that respects dependent-column filtering
- A validation summary panel you can click to jump to the offending cell

This library ships the **generic grid engine only** — it has no knowledge of your data model.
You provide:

1. A **schema** per module (e.g. Asset, User, Location) — plain config, no subclassing.
2. A **datasource** per dropdown (e.g. "which properties exist") — a small injectable class
   with one `load()` method.
3. A **`BulkApiAdapter`** — a one-method wrapper around whatever HTTP client your app already
   uses, so the library never needs to know your auth/tenant scheme.

## Installation

```bash
npm install handsontable @handsontable/angular exceljs file-saver @angular/cdk
npm install --save-dev @types/file-saver
```

> **Handsontable license**: Handsontable is free for non-commercial use and requires a paid
> license for commercial use. Set your license key once in your app (see Handsontable's docs) —
> this library doesn't set it for you.

### CDK Overlay setup (required for multi-select columns)

Multi-select cells open their picker in an Angular CDK overlay. `Overlay` itself needs no
module import (it's `providedIn: 'root'`), but its positioning/backdrop CSS is a separate
stylesheet you have to add yourself — without it the popup can render zero-size or invisible.

Add this to your global styles. In `angular.json`, under the `styles` array for your app:

```json
"styles": [
  "@angular/cdk/overlay-prebuilt.css",
  "src/styles.scss"
]
```

or, if you'd rather import it directly, add this line to your global `styles.scss`:

```scss
@import '@angular/cdk/overlay-prebuilt.css';
```

No `BrowserAnimationsModule` / `provideAnimations()` is required — this library's overlay
usage doesn't depend on Angular animations, only on that one stylesheet.

## 1. Implement `BulkApiAdapter`

The library never calls your backend directly. It calls this adapter, so it stays decoupled
from your auth headers, base URL, and tenant/business context.

```ts
// bulk-api-adapter.impl.ts
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BulkApiAdapter } from 'ngx-bulk-uploader';
import { MyAppHttpService } from './my-app-http.service'; // whatever you already use

@Injectable({ providedIn: 'root' })
export class MyBulkApiAdapter extends BulkApiAdapter {
  constructor(private api: MyAppHttpService) { super(); }

  postCall(url: string, params: HttpParams, body: any): Observable<any> {
    // Attach auth/tenant context here however your app normally does —
    // the library never sends it, so this is the only place it needs to live.
    return this.api.postCall(url, params, body);
  }
}
```

Register it, plus the shared upload endpoint:

```ts
import { BulkApiAdapter, BULK_UPLOAD_CONFIG } from 'ngx-bulk-uploader';
import { MyBulkApiAdapter } from './bulk-api-adapter.impl';

providers: [
  { provide: BulkApiAdapter, useClass: MyBulkApiAdapter },
  { provide: BULK_UPLOAD_CONFIG, useValue: { uploadEndpoint: 'Users/bulkUploadHandson' } }
]
```

## 2. Write a datasource for each dropdown

```ts
// property.datasource.ts
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BulkDataSource, LookupOption } from 'ngx-bulk-uploader';
import { MyAppHttpService } from './my-app-http.service';

@Injectable({ providedIn: 'root' })
export class PropertyDatasource implements BulkDataSource {
  id = 'properties';

  constructor(private api: MyAppHttpService) {}

  load(): Observable<LookupOption[]> {
    return this.api.postCall('properties/list', new HttpParams(), {}).pipe(
      map(res => (res.data ?? []).map((p: any) => ({
        id: p.id,
        label: p.name,
        value: p.id,
        raw: p
      })))
    );
  }
}
```

## 3. Write a schema

```ts
// asset.schema.ts
import { BulkSchema, BulkFieldType } from 'ngx-bulk-uploader';

export const AssetSchema: BulkSchema = {
  id: 'asset',
  moduleName: 'Asset',
  backUrl: '/assets',
  uploadType: 'asset',        // sent as `type` in the upload payload
  version: 1,
  maxRows: 10000,
  allowedExtensions: ['xlsx', 'xls'],
  fields: [
    {
      id: 'name', key: 'name', label: 'Name *',
      type: BulkFieldType.TEXT, required: true, unique: true
    },
    {
      id: 'property', key: 'property', label: 'Property *',
      type: BulkFieldType.SINGLE_SELECT, required: true,
      datasource: 'properties'   // matches PropertyDatasource.id above
    }
  ]
};
```

## 4. Register your schemas and datasources

```ts
import { BULK_SCHEMAS, BULK_DATASOURCES } from 'ngx-bulk-uploader';
import { AssetSchema } from './asset.schema';
import { PropertyDatasource } from './property.datasource';

providers: [
  { provide: BULK_SCHEMAS, useValue: [AssetSchema], multi: true },
  {
    provide: BULK_DATASOURCES,
    useValue: [{ key: 'properties', service: PropertyDatasource }],
    multi: true
  }
]
```

Every feature module can contribute its own array — the library never needs a master list.

## Full working example

`examples/basic-asset-module/` (in this repo, not published to npm) has a complete adapter +
3 datasources + schema using fake in-memory data — copy it into any app with this library
installed and it runs with zero backend setup. Good as both a working reference and a sanity
check before you wire up your real API.

## 5. Drop the component in

```html
<bulk-uploader [schema]="assetSchema" (uploaded)="onUploaded()"></bulk-uploader>
```

```ts
import { AssetSchema } from './asset.schema';
assetSchema = AssetSchema;
onUploaded() { this.router.navigateByUrl('/assets'); }
```

Or route to a shared page and let the component resolve the schema from a `:module` route
param via the schema registry — omit `[schema]` and it falls back to
`BulkSchemaRegistry.get(route.snapshot.paramMap.get('module'))`.

## Field reference

See `BulkField` in `models/bulk-field.model.ts` for the full set of options: `pattern`,
`unique` (in-sheet, with optional scoping/conditions), `compareTo` (cross-field, e.g. end date
> start date), `readonlyWhen` / `requiredWhen` (conditional on other fields), `dbUniqueCheck`
(server-side uniqueness, batched), `min`/`max`/`minLength`/`maxLength`, and a `validators`
escape hatch for anything else.

## What's NOT included

This package deliberately ships no business logic — no schemas, no datasources, no knowledge
of "Assets" or "Users". That part is always yours to write, per app. What you get is the
engine: the grid, the validation pipeline, the dependency/dropdown wiring, Excel import/export,
and the popup infrastructure.
