import { Observable } from 'rxjs';
import {LookupOption} from "../../models/lookup-option.model";

/**
 * Backs one SINGLE_SELECT / MULTI_SELECT field's dropdown options. Register
 * an implementation via the BULK_DATASOURCES multi-provider, keyed by
 * whatever string a BulkField's `datasource` property references.
 *
 * Example:
 *
 *   @Injectable({ providedIn: 'root' })
 *   export class PropertyDatasource implements BulkDataSource {
 *     id = 'properties';
 *     constructor(private api: MyHttpService) {}
 *     load(): Observable<LookupOption[]> {
 *       return this.api.get('properties').pipe(
 *         map(res => res.data.map(p => ({ id: p.id, label: p.name, value: p.id, raw: p })))
 *       );
 *     }
 *   }
 */
export interface BulkDataSource<T = any> {

    /** Must match the key this datasource is registered under in BULK_DATASOURCES. */
    readonly id: string;

    /**
     * Called once per grid load (results are cached for the session). Return
     * every available option — the library filters them client-side for
     * dependent dropdowns (see BulkField.filters), it never re-calls this
     * with different arguments per row.
     */
    load(context?: any): Observable<LookupOption[]>;

}
