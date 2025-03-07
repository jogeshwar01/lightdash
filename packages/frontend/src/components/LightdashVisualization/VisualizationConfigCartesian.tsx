import { ChartType, ItemsMap } from '@lightdash/common';
import { isEqual } from 'lodash';
import { FC, useEffect, useMemo } from 'react';
import { usePrevious } from 'react-use';
import useCartesianChartConfig, {
    CartesianTypeOptions,
} from '../../hooks/cartesianChartConfig/useCartesianChartConfig';
import {
    VisualizationConfig,
    VisualizationConfigCommon,
} from './VisualizationProvider';

export type VisualizationConfigCartesian = {
    chartType: ChartType.CARTESIAN;
    chartConfig: ReturnType<typeof useCartesianChartConfig>;
};

export const isCartesianVisualizationConfig = (
    visualizationConfig: VisualizationConfig | undefined,
): visualizationConfig is VisualizationConfigCartesian => {
    return visualizationConfig?.chartType === ChartType.CARTESIAN;
};

type VisualizationCartesianConfigProps =
    VisualizationConfigCommon<VisualizationConfigCartesian> & {
        itemsMap: ItemsMap | undefined;
        stacking: boolean | undefined;
        cartesianType: CartesianTypeOptions | undefined;
        columnOrder: string[];
        validPivotDimensions: string[] | undefined;
        setPivotDimensions: React.Dispatch<
            React.SetStateAction<string[] | undefined>
        >;
        colorPalette: string[];
    };

const VisualizationCartesianConfig: FC<VisualizationCartesianConfigProps> = ({
    itemsMap,
    resultsData,
    validPivotDimensions,
    columnOrder,
    setPivotDimensions,
    initialChartConfig,
    onChartConfigChange,
    stacking,
    cartesianType,
    colorPalette,
    children,
}) => {
    const prevChartConfig = usePrevious(initialChartConfig);
    const cartesianConfig = useCartesianChartConfig({
        initialChartConfig,
        pivotKeys: validPivotDimensions,
        resultsData,
        setPivotDimensions,
        columnOrder,
        itemsMap,
        stacking,
        cartesianType,
        colorPalette,
    });

    const hasChartConfigChangedInHook = useMemo(() => {
        return (
            isEqual(initialChartConfig, prevChartConfig) &&
            !isEqual(initialChartConfig, cartesianConfig.validConfig)
        );
    }, [cartesianConfig.validConfig, initialChartConfig, prevChartConfig]);

    useEffect(() => {
        if (!hasChartConfigChangedInHook) return;

        // Update chart config state ONLY when the hook has changed it
        onChartConfigChange?.({
            type: ChartType.CARTESIAN,
            config: cartesianConfig.validConfig,
        });
    }, [
        cartesianConfig.validConfig,
        hasChartConfigChangedInHook,
        onChartConfigChange,
    ]);

    return children({
        visualizationConfig: {
            chartType: ChartType.CARTESIAN,
            chartConfig: cartesianConfig,
        },
    });
};

export default VisualizationCartesianConfig;
