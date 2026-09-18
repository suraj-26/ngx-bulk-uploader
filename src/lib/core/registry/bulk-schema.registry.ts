import { Injectable } from '@angular/core';
import { BulkSchema } from '../../models/bulk-schema.model';

@Injectable({
    providedIn: 'root'
})
export class BulkSchemaRegistry {

    private schemas = new Map<string, BulkSchema>();

    register(schema: BulkSchema): void {
        this.schemas.set(schema.id, schema);
    }

    get(id: string): BulkSchema | undefined {
        return this.schemas.get(id);
    }

    getAll(): BulkSchema[] {
        return Array.from(this.schemas.values());
    }

    has(id: string): boolean {
        return this.schemas.has(id);
    }

    remove(id: string): void {
        this.schemas.delete(id);
    }

    clear(): void {
        this.schemas.clear();
    }
}
