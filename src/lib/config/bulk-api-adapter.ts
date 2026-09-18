import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * The library never talks to your backend directly — it talks to this
 * adapter. Provide your own implementation (usually a thin wrapper around
 * whatever HTTP service your app already uses) so the library stays
 * completely decoupled from your auth headers, base URL, tenant/business
 * context, etc.
 *
 * Your implementation is the right place to attach anything the library
 * doesn't know about (auth tokens, tenant/business id, user id, ...) —
 * every payload the library sends you already contains everything
 * domain-specific (the module type, the rows, the values being checked);
 * it never needs those fields to be passed in explicitly.
 *
 * Example, wrapping an existing app-wide HTTP service:
 *
 *   @Injectable({ providedIn: 'root' })
 *   export class MyBulkApiAdapter extends BulkApiAdapter {
 *     constructor(private api: MyAppHttpService) { super(); }
 *     postCall(url: string, params: HttpParams, body: any): Observable<any> {
 *       return this.api.postCall(url, params, body); // adds auth/business context itself
 *     }
 *   }
 *
 * and register it in your app config:
 *
 *   { provide: BulkApiAdapter, useClass: MyBulkApiAdapter }
 */
@Injectable()
export abstract class BulkApiAdapter {
    abstract postCall(url: string, params: HttpParams, body: any): Observable<any>;
}
