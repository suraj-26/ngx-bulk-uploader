import { BulkSchema, BulkFieldType } from 'ngx-bulk-uploader';

export const TestAssetSchema: BulkSchema = {

    id: 'test-asset',
    moduleName: 'Test Asset',
    backUrl: '/',
    uploadType: 'test-asset',
    version: 1,
    maxRows: 100,
    allowedExtensions: ['xlsx', 'xls'],

    fields: [

        {
            id: 'name',
            key: 'name',
            label: 'Name *',
            type: BulkFieldType.TEXT,
            required: true,
            unique: true
        },

        {
            id: 'property',
            key: 'property',
            label: 'Property *',
            type: BulkFieldType.SINGLE_SELECT,
            required: true,
            datasource: 'properties'
        },

        // Depends on `property` — its option list is filtered live by
        // whatever the row's `property` value is (see MockLocationDatasource).
        {
            id: 'location',
            key: 'location',
            label: 'Location',
            type: BulkFieldType.SINGLE_SELECT,
            datasource: 'locations',
            dependsOn: ['property'],
            filters: {
                propertyId: 'property'
            }
        },

        // Exercises the CDK-overlay multi-select popup.
        {
            id: 'tags',
            key: 'tags',
            label: 'Tags',
            type: BulkFieldType.MULTI_SELECT,
            datasource: 'tags'
        },

        {
            id: 'purchaseDate',
            key: 'purchaseDate',
            label: 'Purchase Date',
            type: BulkFieldType.DATE,
            dateFormat: 'YYYY-MM-DD'
        }

    ]

};
