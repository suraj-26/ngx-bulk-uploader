import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { BulkDataSource, LookupOption } from 'ngx-bulk-uploader';

/**
 * Deliberately depends on `property` (see test-asset.schema.ts's `filters`
 * config) to prove dependent-dropdown filtering actually works: picking
 * Warehouse A should only offer its two locations, not Warehouse B's.
 */
@Injectable({ providedIn: 'root' })
export class LocationDatasource implements BulkDataSource {

    id = 'locations';

    load(): Observable<LookupOption[]> {

        return of([
            { id: 10, label: 'Loading Dock', value: 10, raw: { propertyId: 1 } },
            { id: 11, label: 'Storage Room', value: 11, raw: { propertyId: 1 } },
            { id: 20, label: 'Main Floor', value: 20, raw: { propertyId: 2 } },
            { id: 21, label: 'Server Room', value: 21, raw: { propertyId: 2 } }
        ]).pipe(delay(300));

    }

}
