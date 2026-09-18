import {BulkRowState} from "../enums/bulk-row-state.enum";

export interface BulkRow {

    data: Record<string, any>;

    state: BulkRowState;

}
