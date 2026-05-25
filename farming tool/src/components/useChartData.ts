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

  // 1. Filter the raw runs based on user selection
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      // Filter by source
      if (filters.sources.length > 0 && !filters.sources.includes(run.sourceId)) return false;

      // Filter by game over source
      if (filters.gameOverSources.length > 0 && run.gameOverSource !== undefined && !filters.gameOverSources.includes(run.gameOverSource)) return false;
      
      // Filter by Run ID range
      if (filters.runIdRange) {
        if (run.id < filters.runIdRange[0] || run.id > filters.runIdRange[1]) return false;
      }

      return true;
    });
  }, [runs, filters]);

  // 2. Transform the data for a Line or Bar Chart (e.g., Currency Over Time)
  // Charting libraries prefer flat objects: { name: 'Run 1', Gold: 100, Gems: 5 }
 const currencyChartData = useMemo(() => {
    // Currency is global, so we don't filter by dungeon or game over source.
    // We only apply the runIdRange filter if it exists.
    return runs
      .filter(run => run.currencies && run.currencies.length > 0) // Skip gaps where no currency data was tracked
      .filter(run => {
        if (filters.runIdRange) {
          if (run.id < filters.runIdRange[0] || run.id > filters.runIdRange[1]) return false;
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
        if (filters.currencyIds.length === 0 || filters.currencyIds.includes(currency.id)) {
          dataPoint[currency.name] = currency.totalAmount;
        }
      });
      
      return dataPoint;
    });
  }, [runs, filters.currencyIds, filters.runIdRange]);

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
      if (filters.runIdRange) {
        if (run.id < filters.runIdRange[0] || run.id > filters.runIdRange[1]) return;
      }
      if (!run.currencies || run.currencies.length === 0) return;
      
      const dataPoint: Record<string, any> = {
        runName: `Run ${run.id}`,
        runId: run.id,
        sortOrder: run.id * 10
      };
      
      run.currencies.forEach(currency => {
        if (filters.currencyIds.length === 0 || filters.currencyIds.includes(currency.id)) {
          dataPoint[currency.name] = getCurrencyTotal(currency.rawAmount, currency.rawFragments);
        }
      });
      dataPoints.push(dataPoint);
    });

    // Add crafting events
    Object.entries(craftingEvents).forEach(([eventId, currencies]) => {
      const runId = parseInt(eventId, 10);
      if (filters.runIdRange) {
        if (runId < filters.runIdRange[0] || runId > filters.runIdRange[1]) return;
      }

      const dataPoint: Record<string, any> = {
        runName: `Run ${runId} Crafting`,
        runId: runId,
        sortOrder: runId * 10 + 1 // Place after the run
      };
      
      currencies.forEach(currency => {
        if (filters.currencyIds.length === 0 || filters.currencyIds.includes(currency.id)) {
          dataPoint[currency.name] = getCurrencyTotal(currency.rawAmount, currency.rawFragments);
        }
      });
      dataPoints.push(dataPoint);
    });

    return dataPoints.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [runs, craftingEvents, filters.currencyIds, filters.runIdRange]);

  return { filters, setFilters, currencyChartData, statsChartData, totalChartData, filteredRuns };
}