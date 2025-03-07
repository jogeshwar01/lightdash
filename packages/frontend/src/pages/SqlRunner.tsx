import { subject } from '@casl/ability';
import {
    ChartType,
    ECHARTS_DEFAULT_COLORS,
    getCustomLabelsFromTableConfig,
    NotFoundError,
} from '@lightdash/common';
import { Box, Group, Stack, Tabs } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMount } from 'react-use';

import { downloadCsvFromSqlRunner } from '../api/csv';
import { ChartDownloadMenu } from '../components/ChartDownload';
import CollapsableCard from '../components/common/CollapsableCard';
import Page from '../components/common/Page/Page';
import PageBreadcrumbs from '../components/common/PageBreadcrumbs';
import ShareShortLinkButton from '../components/common/ShareShortLinkButton';
import CatalogTree from '../components/common/SqlRunner/CatalogTree';
import DownloadSqlCsvButton from '../components/DownloadSqlCsvButton';
import VisualizationConfigPanel from '../components/Explorer/VisualizationCard/VisualizationConfigPanel';
import VisualizationCardOptions from '../components/Explorer/VisualizationCardOptions';
import ForbiddenPanel from '../components/ForbiddenPanel';
import LightdashVisualization from '../components/LightdashVisualization';
import VisualizationProvider from '../components/LightdashVisualization/VisualizationProvider';
import RefreshDbtButton from '../components/RefreshDbtButton';
import RunSqlQueryButton from '../components/SqlRunner/RunSqlQueryButton';
import SqlRunnerLoadingSkeleton from '../components/SqlRunner/SqlRunerLoadingSkeleton';
import SqlRunnerInput from '../components/SqlRunner/SqlRunnerInput';
import SqlRunnerResultsTable from '../components/SqlRunner/SqlRunnerResultsTable';
import { useOrganization } from '../hooks/organization/useOrganization';
import { useProjectCatalog } from '../hooks/useProjectCatalog';
import {
    ProjectCatalogTreeNode,
    useProjectCatalogTree,
} from '../hooks/useProjectCatalogTree';
import { useSqlQueryMutation } from '../hooks/useSqlQuery';
import useSqlQueryVisualization from '../hooks/useSqlQueryVisualization';
import {
    useSqlRunnerRoute,
    useSqlRunnerUrlState,
} from '../hooks/useSqlRunnerRoute';
import { useApp } from '../providers/AppProvider';
import { TrackSection } from '../providers/TrackingProvider';
import { SectionName } from '../types/Events';

const generateBasicSqlQuery = (table: string) =>
    `SELECT *
     FROM ${table} LIMIT 25`;

enum SqlRunnerCards {
    CHART = 'CHART',
    SQL = 'SQL',
    RESULTS = 'RESULTS',
}

const SqlRunnerPage = () => {
    const { user, health } = useApp();
    const { data: org } = useOrganization();
    const { projectUuid } = useParams<{ projectUuid: string }>();
    const initialState = useSqlRunnerUrlState();
    const sqlQueryMutation = useSqlQueryMutation();
    const { isInitialLoading: isCatalogLoading, data: catalogData } =
        useProjectCatalog();

    const [sql, setSql] = useState<string>(initialState?.sqlRunner?.sql || '');
    const [lastSqlRan, setLastSqlRan] = useState<string>();

    const [expandedCards, setExpandedCards] = useState(
        new Map([
            [SqlRunnerCards.CHART, false],
            [SqlRunnerCards.SQL, true],
            [SqlRunnerCards.RESULTS, true],
        ]),
    );

    const handleCardExpand = (card: SqlRunnerCards, value: boolean) => {
        setExpandedCards((prev) => new Map(prev).set(card, value));
    };

    const { isLoading, mutate } = sqlQueryMutation;
    const {
        initialPivotDimensions,
        resultsData,
        columnOrder,
        createSavedChart,
        fieldsMap,
        chartConfig,
        setChartType,
        setChartConfig,
        setPivotFields,
    } = useSqlQueryVisualization({
        initialState: initialState?.createSavedChart,
        sqlQueryMutation,
    });

    const sqlRunnerState = useMemo(
        () => ({
            createSavedChart,
            sqlRunner: lastSqlRan ? { sql: lastSqlRan } : undefined,
        }),
        [createSavedChart, lastSqlRan],
    );

    useSqlRunnerRoute(sqlRunnerState);

    const handleSubmit = useCallback(() => {
        if (!sql) return;

        mutate(sql);
        setLastSqlRan(sql);
    }, [mutate, sql]);

    useMount(() => {
        handleSubmit();
    });

    useEffect(() => {
        const handler = getHotkeyHandler([['mod+Enter', handleSubmit]]);
        document.body.addEventListener('keydown', handler);
        return () => document.body.removeEventListener('keydown', handler);
    }, [handleSubmit]);

    const catalogTree = useProjectCatalogTree(catalogData);

    const handleTableSelect = useCallback(
        (node: ProjectCatalogTreeNode) => {
            if (!node.sqlTable) return;

            const query = generateBasicSqlQuery(node.sqlTable);

            setSql(query);
            handleCardExpand(SqlRunnerCards.SQL, true);
        },
        [setSql],
    );

    const cannotManageSqlRunner = user.data?.ability?.cannot(
        'manage',
        subject('SqlRunner', {
            organizationUuid: user.data?.organizationUuid,
            projectUuid,
        }),
    );
    const cannotViewProject = user.data?.ability?.cannot('view', 'Project');
    if (cannotManageSqlRunner || cannotViewProject) {
        return <ForbiddenPanel />;
    }

    const getCsvLink = async () => {
        if (sql) {
            const customLabels = getCustomLabelsFromTableConfig(
                createSavedChart?.chartConfig.config,
            );
            const customLabelsWithoutTablePrefix = customLabels
                ? Object.fromEntries<string>(
                      Object.entries(customLabels).map(([key, value]) => [
                          key.replace(/^sql_runner_/, ''),
                          value,
                      ]),
                  )
                : undefined;
            const csvResponse = await downloadCsvFromSqlRunner({
                projectUuid,
                sql,
                customLabels: customLabelsWithoutTablePrefix,
            });
            return csvResponse.url;
        }
        throw new NotFoundError('no SQL query defined');
    };

    if (health.isInitialLoading || !health.data) {
        return null;
    }

    return (
        <Page
            title="SQL Runner"
            withFullHeight
            withPaddedContent
            sidebar={
                <Stack
                    spacing="xl"
                    mah="100%"
                    sx={{ overflowY: 'hidden', flex: 1 }}
                >
                    <PageBreadcrumbs
                        items={[{ title: 'SQL Runner', active: true }]}
                    />

                    <Tabs
                        defaultValue="warehouse-schema"
                        display="flex"
                        sx={{
                            overflowY: 'hidden',
                            flexGrow: 1,
                            flexDirection: 'column',
                        }}
                    >
                        <Tabs.Panel
                            value="warehouse-schema"
                            display="flex"
                            sx={{ overflowY: 'hidden', flex: 1 }}
                        >
                            {isCatalogLoading ? (
                                <SqlRunnerLoadingSkeleton />
                            ) : (
                                <Stack sx={{ overflowY: 'auto', flex: 1 }}>
                                    <Box>
                                        <CatalogTree
                                            nodes={catalogTree}
                                            onSelect={handleTableSelect}
                                        />
                                    </Box>
                                </Stack>
                            )}
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            }
        >
            <TrackSection name={SectionName.EXPLORER_TOP_BUTTONS}>
                <Group position="apart">
                    <Box>
                        <RefreshDbtButton />
                    </Box>

                    <Group spacing="sm">
                        <RunSqlQueryButton
                            onSubmit={handleSubmit}
                            isLoading={isLoading}
                        />
                        <ShareShortLinkButton
                            disabled={lastSqlRan === undefined}
                        />
                    </Group>
                </Group>
            </TrackSection>

            <Stack mt="lg" spacing="sm" sx={{ flexGrow: 1 }}>
                <VisualizationProvider
                    initialPivotDimensions={initialPivotDimensions}
                    resultsData={resultsData}
                    isLoading={isLoading}
                    chartConfig={chartConfig}
                    onChartConfigChange={setChartConfig}
                    onChartTypeChange={setChartType}
                    onPivotDimensionsChange={setPivotFields}
                    columnOrder={columnOrder}
                    isSqlRunner={true}
                    pivotTableMaxColumnLimit={
                        health.data.pivotTable.maxColumnLimit
                    }
                    colorPalette={org?.chartColors ?? ECHARTS_DEFAULT_COLORS}
                >
                    <CollapsableCard
                        title="Chart"
                        rightHeaderElement={
                            expandedCards.get(SqlRunnerCards.CHART) && (
                                <>
                                    <VisualizationCardOptions />
                                    <VisualizationConfigPanel
                                        chartType={chartConfig.type}
                                    />
                                    {chartConfig.type === ChartType.TABLE && (
                                        <DownloadSqlCsvButton
                                            getCsvLink={getCsvLink}
                                            disabled={!sql}
                                        />
                                    )}
                                    <ChartDownloadMenu
                                        projectUuid={projectUuid}
                                    />
                                </>
                            )
                        }
                        isOpen={expandedCards.get(SqlRunnerCards.CHART)}
                        isVisualizationCard
                        onToggle={(value) =>
                            handleCardExpand(SqlRunnerCards.CHART, value)
                        }
                    >
                        <LightdashVisualization className="sentry-block ph-no-capture" />
                    </CollapsableCard>
                </VisualizationProvider>

                <CollapsableCard
                    title="SQL"
                    isOpen={expandedCards.get(SqlRunnerCards.SQL)}
                    onToggle={(value) =>
                        handleCardExpand(SqlRunnerCards.SQL, value)
                    }
                >
                    <SqlRunnerInput
                        sql={sql}
                        onChange={setSql}
                        projectCatalog={catalogData}
                        isDisabled={isLoading}
                    />
                </CollapsableCard>

                <CollapsableCard
                    title="Results"
                    isOpen={expandedCards.get(SqlRunnerCards.RESULTS)}
                    onToggle={(value) =>
                        handleCardExpand(SqlRunnerCards.RESULTS, value)
                    }
                >
                    <SqlRunnerResultsTable
                        onSubmit={handleSubmit}
                        resultsData={resultsData}
                        fieldsMap={fieldsMap}
                        sqlQueryMutation={sqlQueryMutation}
                    />
                </CollapsableCard>
            </Stack>
        </Page>
    );
};
export default SqlRunnerPage;
