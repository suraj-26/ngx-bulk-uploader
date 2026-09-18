import { Injectable } from '@angular/core';

import { BulkSchema } from '../models/bulk-schema.model';
import { BulkField } from '../models/bulk-field.model';

@Injectable({
    providedIn: 'root'
})
export class BulkDependencyService {

    /**
     * Returns all fields that directly depend on the given field.
     *
     * Example:
     *
     * Property
     * ├── Asset
     * ├── Inspection
     * └── User
     *
     * getDependents('property')
     * => [asset, inspection, user]
     */
    getDependents(
        fieldKey: string,
        schema: BulkSchema
    ): BulkField[] {

        return schema.fields.filter(field =>
            field.dependsOn?.includes(fieldKey)
        );

    }

    /**
     * Returns true if the field has any dependencies.
     */
    hasDependencies(
        field: BulkField
    ): boolean {

        return !!field.dependsOn?.length;

    }

    /**
     * Returns all parent fields of a field.
     *
     * Example:
     *
     * Section
     * dependsOn:
     * [
     *    'property',
     *    'inspection'
     * ]
     *
     * => [propertyField, inspectionField]
     */
    getParents(
        field: BulkField,
        schema: BulkSchema
    ): BulkField[] {

        if (!field.dependsOn?.length) {
            return [];
        }

        return schema.fields.filter(parent =>
            field.dependsOn!.includes(parent.key)
        );

    }

    /**
     * Returns every field that is affected by a parent change.
     *
     * Example:
     *
     * Property
     *   ↓
     * Inspection
     *   ↓
     * Section
     *   ↓
     * Question
     *
     * getAllDependents('property')
     *
     * =>
     * [
     *   inspection,
     *   section,
     *   question
     * ]
     */
    getAllDependents(
        fieldKey: string,
        schema: BulkSchema
    ): BulkField[] {

        const result: BulkField[] = [];

        const visited = new Set<string>();

        const traverse = (parentKey: string): void => {

            const children = this.getDependents(
                parentKey,
                schema
            );

            children.forEach(child => {

                if (visited.has(child.key)) {
                    return;
                }

                visited.add(child.key);

                result.push(child);

                traverse(child.key);

            });

        };

        traverse(fieldKey);

        return result;

    }

}
