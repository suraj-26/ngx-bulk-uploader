import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';

import { BulkApiAdapter } from '../config/bulk-api-adapter';
import { BulkField } from '../models/bulk-field.model';
import { BulkSchema } from '../models/bulk-schema.model';

interface UniquenessCheck {
    value: string;
    scope?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BulkUniquenessService {

    // Keeps individual requests a reasonable size on a large sheet.
    private readonly CHUNK_SIZE = 300;

    constructor(
        private apiAdapter: BulkApiAdapter
    ) {}

    /**
     * Checks every dbUniqueCheck-flagged field across the whole sheet in
     * one batched pass and returns, per field key, the set of "value" or
     * "value::scope" composite keys that already exist in the database.
     *
     * Values are checked as (value, scope) PAIRS, not bare values — e.g.
     * for a name field scoped by `property`, the same name under two
     * different properties is two distinct pairs, not a duplicate of
     * itself. Distinct pairs are deduplicated before any request goes
     * out, so 50 rows repeating the same name under the same property
     * costs one lookup, not 50.
     */
    async checkExisting(
        rows: any[],
        schema: BulkSchema
    ): Promise<Map<string, Set<string>>> {

        const dbUniqueFields = schema.fields.filter(field => !!field.dbUniqueCheck);

        const result = new Map<string, Set<string>>();

        for (const field of dbUniqueFields) {

            const checks = this.collectDistinctChecks(rows, field);

            if (checks.length === 0) {
                result.set(field.key, new Set());
                continue;
            }

            result.set(field.key, await this.checkField(field, checks));

        }

        return result;

    }

    /**
     * Builds the same "value" or "value::scope" composite key used both
     * when sending checks and when matching the response back to a row —
     * exposed so BulkValidationService builds an identical key for each
     * row without duplicating this scoping logic.
     */
    buildKey(row: Record<string, any>, field: BulkField): string | null {

        const value = row[field.key];

        if (value === null || value === undefined || String(value).trim() === '') {
            return null;
        }

        const trimmedValue = String(value).trim();

        if (!field.dbUniqueCheck?.scopeField) {
            return trimmedValue;
        }

        const scope = row[field.dbUniqueCheck.scopeField];

        if (scope === null || scope === undefined || String(scope).trim() === '') {
            // No scope value on this row yet (e.g. property not picked) —
            // nothing meaningful to check against.
            return null;
        }

        return `${trimmedValue}::${String(scope).trim()}`;

    }

    private collectDistinctChecks(rows: any[], field: BulkField): UniquenessCheck[] {

        const seen = new Set<string>();
        const checks: UniquenessCheck[] = [];

        rows.forEach(row => {

            const key = this.buildKey(row, field);

            if (key === null || seen.has(key)) {
                return;
            }

            seen.add(key);

            if (field.dbUniqueCheck?.scopeField) {

                const separatorIndex = key.lastIndexOf('::');
                checks.push({
                    value: key.slice(0, separatorIndex),
                    scope: key.slice(separatorIndex + 2)
                });

            } else {

                checks.push({ value: key });

            }

        });

        return checks;

    }

    private async checkField(field: BulkField, checks: UniquenessCheck[]): Promise<Set<string>> {

        const existing = new Set<string>();

        // Sequential on purpose, not Promise.all: a sheet with several
        // dbUniqueCheck fields could otherwise fire a burst of concurrent
        // requests. Sequential keeps backend load predictable. Swap for a
        // small concurrency pool (3-4 at a time) if this becomes an actual
        // bottleneck at your real data sizes — don't go fully parallel.
        for (const chunk of this.chunk(checks, this.CHUNK_SIZE)) {

            const chunkExisting = await this.checkChunk(field, chunk);
            chunkExisting.forEach(key => existing.add(key));

        }

        return existing;

    }

    private checkChunk(field: BulkField, checks: UniquenessCheck[]): Promise<string[]> {

        const params = new HttpParams();

        // Tenant/auth context (business id, user id, etc.) is NOT included
        // here — that's your BulkApiAdapter implementation's job, the same
        // way it would for any other call your app makes.
        const formData = { checks };

        return firstValueFrom(
            this.apiAdapter
                .postCall(field.dbUniqueCheck!.endpoint, params, formData)
                .pipe(
                    map((response: any) => {

                        if (!response?.success) {
                            return [];
                        }

                        // Expected shape: { success: true, data: { existing: string[] } }
                        // where each entry is "value" or "value::scope",
                        // matching buildKey()'s format exactly.
                        return (response.data?.existing ?? []) as string[];

                    })
                )
        );

    }

    private chunk<T>(items: T[], size: number): T[][] {

        const chunks: T[][] = [];

        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }

        return chunks;

    }

}
