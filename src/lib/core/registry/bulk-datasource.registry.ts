import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LookupOption } from '../../models/lookup-option.model';

export interface BulkDatasource {

    load(): Observable<LookupOption[]>;

}

@Injectable({
    providedIn: 'root'
})
export class BulkDatasourceRegistry {

    private registry = new Map<string, BulkDatasource>();

    register(
        key: string,
        datasource: BulkDatasource
    ): void {

        this.registry.set(
            key,
            datasource
        );

    }

    get(
        key: string
    ): BulkDatasource {

        const datasource = this.registry.get(key);

        if (!datasource) {

            throw new Error(
                `Datasource '${key}' not registered.`
            );

        }

        return datasource;

    }

}
