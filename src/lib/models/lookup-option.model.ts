/** One dropdown/multi-select choice, as returned by BulkDataSource.load(). */
export interface LookupOption<T = any> {

    /** Uniquely identifies this option — used to detect the value, not necessarily what's stored. */
    id: number | string;

    /** What's shown to the user in the dropdown/chip. */
    label: string;

    /** What's actually written to the row/upload payload when this option is picked. Usually same as `id`. */
    value: any;

    /** The original record this option came from — read by BulkField.filters for dependent-dropdown matching. */
    raw: T;

}
