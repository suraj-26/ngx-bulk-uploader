import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { BulkApiAdapter } from 'ngx-bulk-uploader';

/**
 * Starting point for your own adapter. As written, this returns fake data
 * with no real backend — good for confirming the library renders and wires
 * up correctly before you touch your API at all. Swap each `of(...)` for a
 * real call through whatever HTTP service your app already uses once
 * you're ready.
 */
@Injectable({ providedIn: 'root' })
export class ExampleBulkApiAdapter extends BulkApiAdapter {

    postCall(url: string, params: HttpParams, body: any): Observable<any> {

        console.log(`[ExampleBulkApiAdapter] POST ${url}`, body);

        // dbUniqueCheck endpoints expect { success, data: { existing: string[] } } —
        // an empty `existing` array means "nothing's a duplicate".
        if (body?.checks) {
            return of({ success: true, data: { existing: [] } }).pipe(delay(300));
        }

        // Final upload submit.
        if (body?.rows) {
            return of({ success: true, msg: 'Upload accepted' }).pipe(delay(500));
        }

        return of({ success: true, data: [] }).pipe(delay(200));

    }

}
