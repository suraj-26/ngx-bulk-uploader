import { Injectable } from '@angular/core';
import Handsontable from 'handsontable';
import {BulkSchema} from "../models/bulk-schema.model";

@Injectable({
    providedIn: 'root'
})
export class BulkGridService {

    private hot!: Handsontable;

    setInstance(instance: Handsontable): void {
        this.hot = instance;
    }

    getInstance(): Handsontable {
        return this.hot;
    }

    refresh(): void {
        this.hot?.render();
    }

    clearCellHighlights(): void {

        if (!this.hot) {
            return;
        }

        const rows = this.hot.countRows();
        const cols = this.hot.countCols();

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.hot.removeCellMeta(row, col, 'className');
            }
        }
    }

    highlightErrors(errors: any[], schema: any): void {

        if (!this.hot) {
            return;
        }

        this.clearCellHighlights();

        errors.forEach(error => {

            const columnIndex = schema.fields.findIndex(
                (field: any) => field.key === error.field
            );

            if (columnIndex >= 0) {
                this.hot.setCellMeta(
                    error.row - 1,
                    columnIndex,
                    'className',
                    'bulk-error-cell'
                );
            }

        });

        this.hot.render();
    }

    addRows(
        data: any[],
        count: number,
        schema: BulkSchema
    ): any[] {

        const rows = [];

        for (let i = 0; i < count; i++) {

            const row: any = {};

            schema.fields.forEach(field => {
                row[field.key] = field.defaultValue ?? '';
            });

            rows.push(row);

        }

        return [
            ...data,
            ...rows
        ];

    }

    refreshData(data: any[]): void {

        if (!this.hot) {
            return;
        }

        this.hot.loadData(data);

    }

}
