import {
    BinType,
    CompactOrAlias,
    CompiledDimension,
    CompiledMetric,
    CompiledTableCalculation,
    CustomDimension,
    CustomFormat,
    FieldId,
    Format,
    friendlyName,
    MetricType,
    TableCalculation,
} from './field';
import { Filters, MetricFilterRule } from './filter';
import { DateGranularity } from './timeFrames';

export interface AdditionalMetric {
    label?: string;
    type: MetricType;
    description?: string;
    sql: string;
    hidden?: boolean;
    round?: number;
    compact?: CompactOrAlias;
    format?: Format;
    table: string;
    name: string;
    index?: number;
    filters?: MetricFilterRule[];
    baseDimensionName?: string;
    uuid?: string | null;
    percentile?: number;
    formatOptions?: CustomFormat;
}

export const getCustomDimensionId = (dimension: CustomDimension) =>
    dimension.id;

export const isAdditionalMetric = (value: any): value is AdditionalMetric =>
    value?.table && value?.name && !value?.fieldType && !value.binType;

export const hasFormatOptions = (
    value: any,
): value is AdditionalMetric & { formatOptions: CustomFormat } =>
    !!value.formatOptions;

export const getCustomMetricDimensionId = (metric: AdditionalMetric) =>
    `${metric.table}_${metric.baseDimensionName}`;

export const isCustomDimension = (value: any): value is CustomDimension =>
    value !== undefined && 'binType' in value;

// Object used to query an explore. Queries only happen within a single explore
export type MetricQuery = {
    exploreName: string;
    dimensions: FieldId[]; // Dimensions to group by in the explore
    metrics: FieldId[]; // Metrics to compute in the explore
    filters: Filters;
    sorts: SortField[]; // Sorts for the data
    limit: number; // Max number of rows to return from query
    tableCalculations: TableCalculation[]; // calculations to append to results
    additionalMetrics?: AdditionalMetric[]; // existing metric type
    customDimensions?: CustomDimension[];
    metadata?: {
        hasADateDimension: Pick<CompiledDimension, 'label' | 'name'>;
    };
};
export type CompiledMetricQuery = MetricQuery & {
    compiledTableCalculations: CompiledTableCalculation[];
    compiledAdditionalMetrics: CompiledMetric[];
};
// Sort by
export type SortField = {
    fieldId: string; // Field must exist in the explore
    descending: boolean; // Direction of the sort
};

const idPattern = /(.+)id$/i;
export const extractEntityNameFromIdColumn = (
    columnName: string,
): string | null => {
    const match = columnName.match(idPattern);
    if (!match || columnName.toLowerCase().endsWith('valid')) {
        return null;
    }
    return (
        match[1]
            .toLowerCase()
            .split(/[^a-z]/)
            .filter((x) => x)
            .join('_') || null
    );
};

export const getAdditionalMetricLabel = (item: AdditionalMetric) =>
    `${friendlyName(item.table)} ${item.label}`;

type FilterGroupResponse =
    | {
          id: string;
          or: any[];
      }
    | {
          id: string;
          and: any[];
      };
export type FiltersResponse = {
    dimensions?: FilterGroupResponse;
    metrics?: FilterGroupResponse;
    tableCalculations?: FilterGroupResponse;
};
export type MetricQueryResponse = {
    exploreName: string;
    dimensions: FieldId[]; // Dimensions to group by in the explore
    metrics: FieldId[]; // Metrics to compute in the explore
    filters: FiltersResponse;
    sorts: SortField[]; // Sorts for the data
    limit: number; // Max number of rows to return from query
    tableCalculations: TableCalculation[]; // calculations to append to results
    additionalMetrics?: AdditionalMetric[]; // existing metric type
    customDimensions?: CustomDimension[];
    metadata?: {
        hasADateDimension: Pick<CompiledDimension, 'label' | 'name'>;
    };
};

export const countCustomDimensionsInMetricQuery = (
    metricQuery: MetricQuery,
) => ({
    numFixedWidthBinCustomDimensions:
        metricQuery.customDimensions?.filter(
            (dimension) => dimension.binType === BinType.FIXED_NUMBER,
        ).length || 0,
    numFixedBinsBinCustomDimensions:
        metricQuery.customDimensions?.filter(
            (dimension) => dimension.binType === BinType.FIXED_WIDTH,
        ).length || 0,
    numCustomRangeBinCustomDimensions: 0, // TODO complete when custom range bin is implemented
});

export const hasCustomDimension = (metricQuery: MetricQuery | undefined) =>
    metricQuery?.customDimensions && metricQuery.customDimensions.length > 0;

export type MetricQueryRequest = {
    // tsoa doesn't support complex types like MetricQuery, so we simplified it
    exploreName: string;
    dimensions: FieldId[]; // Dimensions to group by in the explore
    metrics: FieldId[]; // Metrics to compute in the explore
    filters: {
        dimensions?: any;
        metrics?: any;
        tableCalculations?: any;
    };
    sorts: SortField[]; // Sorts for the data
    limit: number; // Max number of rows to return from query
    tableCalculations: TableCalculation[]; // calculations to append to results
    additionalMetrics?: AdditionalMetric[]; // existing metric type
    csvLimit?: number;
    customDimensions?: CustomDimension[];
    granularity?: DateGranularity;
    metadata?: MetricQuery['metadata'];
};
