# Example: basic asset module

A complete, working set of the three things every consumer writes: an adapter, a couple of
datasources, and a schema — using fake in-memory data so it runs with zero backend setup.

This is the same code used to verify the library itself works end to end (single-select,
a *dependent* single-select, multi-select, and text validation, all in one schema).

## Files

| File | What it shows |
|---|---|
| `bulk-api-adapter.ts` | The one method every request goes through. Replace the fake `of(...)` responses with real HTTP calls. |
| `property.datasource.ts` | The simplest possible datasource — an independent dropdown. |
| `location.datasource.ts` | A datasource meant to be *filtered* — each option carries a `raw.propertyId` that `asset.schema.ts`'s `filters` config matches against. |
| `tags.datasource.ts` | Backs a MULTI_SELECT field. |
| `asset.schema.ts` | Ties it together: required/unique text, an independent dropdown, a dependent dropdown, a multi-select, and a date field. |
| `app.config.snippet.ts` | Where these get registered — copy the relevant providers into your own `app.config.ts`. |

## To try it yourself

1. Copy this folder into any Angular app that has `ngx-bulk-uploader` installed.
2. Merge `app.config.snippet.ts`'s providers into your own `app.config.ts` (adjust the import
   paths to wherever you put the folder).
3. Drop `<bulk-uploader [schema]="assetSchema"></bulk-uploader>` on a page, with
   `assetSchema = AssetSchema` (imported from `asset.schema.ts`) on the component.
4. Run your app. You should get an editable grid with Name / Property / Location / Tags /
   Purchase Date columns and no backend required.

From there, swap `bulk-api-adapter.ts`'s fake responses for real HTTP calls, and the
datasources' fake `of([...])` for real API calls — everything else keeps working unchanged.
