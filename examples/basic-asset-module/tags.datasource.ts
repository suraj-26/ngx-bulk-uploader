import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { BulkDataSource, LookupOption } from 'ngx-bulk-uploader';

/** Backs the MULTI_SELECT field — this is what exercises the CDK overlay popup. */
@Injectable({ providedIn: 'root' })
export class TagsDatasource implements BulkDataSource {

    id = 'tags';

    load(): Observable<LookupOption[]> {

        return of([
            { id: 1, label: 'Fragile', value: 1, raw: {} },
            { id: 2, label: 'High Value', value: 2, raw: {} },
            { id: 3, label: 'Needs Inspection', value: 3, raw: {} },
            { id: 4, label: 'Leased', value: 4, raw: {} }
        ]).pipe(delay(300));

    }

}
