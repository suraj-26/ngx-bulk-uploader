import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { BulkDataSource, LookupOption } from 'ngx-bulk-uploader';

/** Static fake data — no HTTP call — just to prove the dropdown wiring works. */
@Injectable({ providedIn: 'root' })
export class PropertyDatasource implements BulkDataSource {

    id = 'properties';

    load(): Observable<LookupOption[]> {

        return of([
            { id: 1, label: 'Warehouse A', value: 1, raw: {} },
            { id: 2, label: 'Warehouse B', value: 2, raw: {} }
        ]).pipe(delay(300));

    }

}
