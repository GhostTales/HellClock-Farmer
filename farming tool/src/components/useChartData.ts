import { useMemo, useState } from 'react';
import { RunData, ProcessedCurrency } from '../types/gameData';
import { getCurrencyTotal } from '../utils/formatters';

export interface FilterOptions {
  sources: number[];
  gameOverSources: number[];
  currencyIds: number[];
  runIdRange: [number, number] | null; // Track by Run ID instead of Date
}

export function useChartData(
  runs: RunData[], 
  craftingEvents: Record<string, ProcessedCurrency[]>,
  initialFilters: FilterOptions
) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const { sources, gameOverSources, runIdRange, currencyIds } = filters;

  // 1. Filter the raw runs based on user selection
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      // Filter by source
      if (sources.length > 0 && !sources.includes(run.sourceId)) return false;

      // Filter by game over source
      if (gameOverSources.length > 0 && run.gameOverSource !== undefined && !gameOverSources.includes(run.gameOverSource)) return false;
      
      // Filter by Run ID range
      if (runIdRange) {
        if (run.id < runIdRange[0] || run.id > runIdRange[1]) return false;
      }

      return true;
    });
  }, [runs, sources, gameOverSources, runIdRange]);

  // 2. Transform the data for a Line or Bar Chart (e.g., Currency Over Time)
  // Charting libraries prefer flat objects: { name: 'Run 1', Gold: 100, Gems: 5 }
 const currencyChartData = useMemo(() => {
    // Currency is global, so we don't filter by dungeon or game over source.
    // We only apply the runIdRange filter if it exists.
    return runs
      .filter(run => run.currencies && run.currencies.length > 0) // Skip gaps where no currency data was tracked
      .filter(run => {
        if (runIdRange) {
          if (run.id < runIdRange[0] || run.id > runIdRange[1]) return false;
        }
        return true;
      })
      .map(run => {
        const dataPoint: Record<string, any> = {
          runName: `Run ${run.id}`, // X-axis label
          runId: run.id
      };
      
      run.currencies.forEach(currency => {
        // Only include currencies the user wants to see
        if (currencyIds.length === 0 || currencyIds.includes(currency.id)) {
          dataPoint[currency.name] = currency.totalAmount;
        }
      });
      
      return dataPoint;
    });
  }, [runs, currencyIds, runIdRange]);

  // 3. Transform the raw stats (Gold, SoulStones, etc.) for a separate chart
  const statsChartData = useMemo(() => {
    return filteredRuns.map(run => ({
      runName: `Run ${run.id}`, // X-axis label
      runId: run.id,
      "Soul Stones": run.soulStones,
      Gold: run.goldGained,
      Time: run.runTime
    }));
  }, [filteredRuns]);

  // 4. Transform all events for a total currency chart
  const totalChartData = useMemo(() => {
    const dataPoints: Record<string, any>[] = [];

    // Add runs (which include recycling)
    runs.forEach(run => {
      if (runIdRange) {
        if (run.id < runIdRange[0] || run.id > runIdRange[1]) return;
      }
      if (!run.currencies || run.currencies.length === 0) return;
      
      const dataPoint: Record<string, any> = {
        runName: `Run ${run.id}`,
        runId: run.id,
        sortOrder: run.id * 10
      };
      
      run.currencies.forEach(currency => {
        if (currencyIds.length === 0 || currencyIds.includes(currency.id)) {
          dataPoint[currency.name] = getCurrencyTotal(currency.rawAmount, currency.rawFragments);
        }
      });
      dataPoints.push(dataPoint);
    });

    // Add crafting events
    Object.entries(craftingEvents).forEach(([eventId, currencies]) => {
      const runId = parseInt(eventId, 10);
      if (runIdRange) {
        if (runId < runIdRange[0] || runId > runIdRange[1]) return;
      }

      const dataPoint: Record<string, any> = {
        runName: `Run ${runId} Crafting`,
        runId: runId,
        sortOrder: runId * 10 + 1 // Place after the run
      };
      
      currencies.forEach(currency => {
        if (currencyIds.length === 0 || currencyIds.includes(currency.id)) {
          dataPoint[currency.name] = getCurrencyTotal(currency.rawAmount, currency.rawFragments);
        }
      });
      dataPoints.push(dataPoint);
    });

    return dataPoints.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [runs, craftingEvents, currencyIds, runIdRange]);

  return { filters, setFilters, currencyChartData, statsChartData, totalChartData, filteredRuns };
}