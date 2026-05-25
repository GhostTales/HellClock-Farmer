import { useEffect, useState, useMemo } from 'react';
import { SaveFile, PastRun, dataManager } from '../dataManager';
import { CURRENCY_MAPPINGS } from '../constants';
import { dataStore } from './store';
import { ProcessedCurrency, RunData } from '../types/gameData';
import { useChartData } from './useChartData';
import { formatTime, calculatePerSec, extractStat} from '../utils/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './RunsTable.css';

interface RunsTableProps {
  saveData: SaveFile;
  selectedSources: number[];
  selectedProfile: string | null;
  selectedDungeon: number | '';
  setRunStats: React.Dispatch<React.SetStateAction<{ avgGoldPerMin: number; avgSoulStonesPerMin: number }>>;
}

// A simple palette for the lines on the graph
const CHART_COLORS = ['#6b6858', '#82a1ca', '#ffc658', '#ff7300', '#ff0000', '#00C49F', '#37be2a', '#8a37ce', '#c1cad1'];

const CustomCurrencyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="custom-tooltip-title">{label}</p>
        {payload
          .filter((entry: any) => Number(entry.value) !== 0 || entry.name === 'Time')
          .map((entry: any, index: number) => {
          const name = entry.name;
          const value = Number(entry.value);
          
          if (name === 'Time') {
            return (
              <div key={index} className="custom-tooltip-row" style={{ color: entry.color }}>
                <span>{name}:</span>
                <span className="custom-tooltip-value">{formatTime(value)}</span>
              </div>
            );
          }

          // Check if this is a mapped currency
          const mapping = Object.values(CURRENCY_MAPPINGS).find((m: any) => m.name === name) as any;
          
          if (mapping) {
            const isTinkering = name.toLowerCase().includes('tinkering');
            const absValue = Math.abs(value);
            const full = Math.floor(absValue);
            const fragments = isTinkering ? 0 : Math.round((absValue - full) * 6);
            
            const isNegative = value < 0;
            const fullSign = (isNegative && (full > 0 || isTinkering)) ? '-' : '';
            const fragSign = isNegative ? '-' : '';

            return (
              <div key={index} className="custom-tooltip-row" style={{ color: entry.color }}>
                <div className="custom-tooltip-group">
                  {mapping.texture && <img src={mapping.texture} alt={name} className="custom-tooltip-icon" />}
                  <span className="custom-tooltip-value mapped">
                    {fullSign}{isTinkering ? absValue.toLocaleString(undefined, { maximumFractionDigits: 3 }) : full.toLocaleString()}
                  </span>
                </div>
                {!isTinkering && (
                  <div className="custom-tooltip-group fragment">
                    <img src={mapping.fragmentTexture} alt={`Fragment`} className="custom-tooltip-icon" />
                    <span className="custom-tooltip-fragment-text">{fragSign}{fragments}</span>
                  </div>
                )}
              </div>
            );
          }

          // Fallback for Gold, Soul Stones, or unknown currencies
          return (
            <div key={index} className="custom-tooltip-row" style={{ color: entry.color }}>
              <span>{name}:</span>
              <span className="custom-tooltip-value">
                {value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export function RunsTable({ saveData, selectedSources, selectedProfile, selectedDungeon, setRunStats }: RunsTableProps) {
  const [runCurrencies, setRunCurrencies] = useState<Record<number, ProcessedCurrency[]>>({});
  const [recyclingEvents, setRecyclingEvents] = useState<Record<string, ProcessedCurrency[]>>({});
  const [craftingEvents, setCraftingEvents] = useState<Record<string, ProcessedCurrency[]>>({});
  const [internalSaveData, setInternalSaveData] = useState<SaveFile>(saveData);

  // Sync with prop when parent updates it (e.g. manual refresh or profile switch)
  useEffect(() => {
    setInternalSaveData(saveData);
  }, [saveData]);

  // Load our generated currency deltas from the Tauri file store
  useEffect(() => {
    const loadCurrencies = async () => {
      const backups = await dataStore.get<Record<number, ProcessedCurrency[]>>('runCurrencies') || {};
      setRunCurrencies(backups);

      const recycle = await dataStore.get<Record<string, ProcessedCurrency[]>>('recyclingEvents') || {};
      setRecyclingEvents(recycle);
      const craft = await dataStore.get<Record<string, ProcessedCurrency[]>>('craftingEvents') || {};
      setCraftingEvents(craft);
    };
    loadCurrencies();

    // Subscribe to real-time changes from the save watcher so the UI updates immediately
    let unlistenRuns: (() => void) | undefined;
    let unlistenRecycle: (() => void) | undefined;
    let unlistenCraft: (() => void) | undefined;

    const fetchLatestSave = async () => {
      if (selectedProfile) {
        try {
          const latestSave = await dataManager.getProfileData(selectedProfile);
          if (latestSave) setInternalSaveData(latestSave);
        } catch (e) {
          console.error("Could not fetch latest save profile data", e);
        }
      }
    };

    dataStore.onKeyChange<Record<number, ProcessedCurrency[]>>('runCurrencies', async (newBackups) => {
      if (newBackups) setRunCurrencies(newBackups);
      await fetchLatestSave();
    }).then(fn => unlistenRuns = fn);

    // Also listen for out-of-run events so the current currency point updates
    dataStore.onKeyChange<Record<string, ProcessedCurrency[]>>('recyclingEvents', async (events) => {
      if (events) setRecyclingEvents(events);
      await fetchLatestSave();
    }).then(fn => unlistenRecycle = fn);

    dataStore.onKeyChange<Record<string, ProcessedCurrency[]>>('craftingEvents', async (events) => {
      if (events) setCraftingEvents(events);
      await fetchLatestSave();
    }).then(fn => unlistenCraft = fn);

    return () => {
      if (unlistenRuns) unlistenRuns();
      if (unlistenRecycle) unlistenRecycle();
      if (unlistenCraft) unlistenCraft();
    };
  }, [selectedProfile]); // Only recreate listener if the selected profile changes
  
  // Merge the raw runs with our store backups to get the format the chart expects
  const allRuns: RunData[] = useMemo(() => {
    const pastRuns = internalSaveData.pastRunsData || [];

    const runs = pastRuns.map((run: PastRun) => {
      const runTime = extractStat(run, '_statAggregators', 'RunTime');
      const soulStones = extractStat(run, '_statCounters', 'SoulStonesCollected');
      const goldGained = extractStat(run, '_statAggregators', 'GoldGained');
      const goldPerMin = calculatePerSec(goldGained, runTime / 60);
      const soulStonesPerMin = calculatePerSec(soulStones, runTime / 60);

      const baseCurrencies = runCurrencies[run._runID] || [];
      const recycleCurrencies = recyclingEvents[run._runID.toString()] || [];

      const combinedCurrencies = [...baseCurrencies];
      recycleCurrencies.forEach(rc => {
        const existing = combinedCurrencies.find(c => c.id === rc.id);
        if (existing) {
          existing.totalAmount += rc.totalAmount;
          existing.rawAmount = rc.rawAmount;
          existing.rawFragments = rc.rawFragments;
        } else {
          combinedCurrencies.push({ ...rc });
        }
      });

      return {
        id: run._runID,
        sourceId: run._dungeonID,
        gameOverSource: run._eGameOverSource,
        currencies: combinedCurrencies,
        soulStones,
        soulStonesPerMin,
        goldGained,
        goldPerMin,
        runTime
      };
    });

    return runs;
  }, [internalSaveData, runCurrencies, recyclingEvents]);

  // Set up the custom hook
  const { filters, setFilters, currencyChartData, statsChartData, totalChartData, filteredRuns } = useChartData(allRuns, craftingEvents, {
    sources: [], // Empty means show all supported dungeons
    gameOverSources: selectedSources,
    currencyIds: Object.keys(CURRENCY_MAPPINGS).map(Number), // Show all currencies by default
    runIdRange: null
  });

  // Sync external selectedDungeon with internal useChartData filter
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      sources: selectedDungeon !== '' ? [selectedDungeon] : [],
      gameOverSources: selectedSources
    }));
  }, [selectedDungeon, selectedSources, setFilters]);

  // Fill in missing currency values with 0 for currencyChartData (gained/spent),
  // but only AFTER the currency has been gained for the first time.
  const filledCurrencyChartData = useMemo(() => {
    const seenCurrencies = new Set<string>();
    return currencyChartData.map(point => {
      const newPoint = { ...point };
      Object.entries(CURRENCY_MAPPINGS).forEach(([idStr, mapping]) => {
        const name = mapping?.name || `Currency ${idStr}`;
        if (newPoint[name] !== undefined) {
          seenCurrencies.add(name);
        } else if (seenCurrencies.has(name)) {
          newPoint[name] = 0;
        }
      });
      return newPoint;
    });
  }, [currencyChartData]);

  // Carry over previous values for totalChartData so events that only change 1 currency don't leave gaps.
  // Backfill initial missing values with the first known value so the chart doesn't start at 0.
  const filledTotalChartData = useMemo(() => {
    const firstKnownValues: Record<string, number> = {};
    for (const point of totalChartData) {
      Object.entries(CURRENCY_MAPPINGS).forEach(([idStr, mapping]) => {
        const name = mapping?.name || `Currency ${idStr}`;
        if (point[name] !== undefined && firstKnownValues[name] === undefined) {
          firstKnownValues[name] = point[name];
        }
      });
    }

    const lastValues: Record<string, number> = {};
    return totalChartData.map(point => {
      const newPoint = { ...point };
      Object.entries(CURRENCY_MAPPINGS).forEach(([idStr, mapping]) => {
        const name = mapping?.name || `Currency ${idStr}`;
        if (newPoint[name] !== undefined) {
          lastValues[name] = newPoint[name];
        } else {
          newPoint[name] = lastValues[name] ?? firstKnownValues[name] ?? 0;
        }
      });
      return newPoint;
    });
  }, [totalChartData]);

  // Ensure per-second metrics are available in the stats chart data
  const extendedStatsData = useMemo(() => {
    return statsChartData.map((stat, index) => ({
      ...stat,
      goldPerMin: filteredRuns[index]?.goldPerMin || 0,
      soulStonesPerMin: filteredRuns[index]?.soulStonesPerMin || 0
    }));
  }, [statsChartData, filteredRuns]);

  // Compute average stats for the title bar
  useEffect(() => {
    if (filteredRuns.length === 0) {
      setRunStats({ avgGoldPerMin: 0, avgSoulStonesPerMin: 0 });
      return;
    }
    const totalGoldPerMin = filteredRuns.reduce((sum, run) => sum + run.goldPerMin, 0);
    const totalSSPerMin = filteredRuns.reduce((sum, run) => sum + run.soulStonesPerMin, 0);
    setRunStats({
      avgGoldPerMin: Number((totalGoldPerMin / filteredRuns.length).toFixed(2)),
      avgSoulStonesPerMin: Number((totalSSPerMin / filteredRuns.length).toFixed(2))
    });
  }, [filteredRuns, setRunStats]);

  const toggleCurrency = (id: number) => {
    setFilters(prev => {
      const active = prev.currencyIds.includes(id);
      return {
        ...prev,
        currencyIds: active
          ? prev.currencyIds.filter(cId => cId !== id)
          : [...prev.currencyIds, id]
      };
    });
  };
  
  return (
    <div className="runs-table-container">
      <h2>Past Runs Currency Analysis ({selectedProfile})</h2>

      {/* --- User Controls --- */}
      <div className="runs-table-controls">
        
        {/* Currency Toggles */}
        <div className="currency-toggles">
          {Object.entries(CURRENCY_MAPPINGS).map(([idStr, mapping]) => {
            const id = parseInt(idStr, 10);
            const isActive = filters.currencyIds.includes(id);
            const color = CHART_COLORS[id % CHART_COLORS.length];
            
            return (
              <button
                key={id}
                className="currency-toggle-btn"
                onClick={() => toggleCurrency(id)}
                style={{
                  opacity: isActive ? 1 : 0.4,
                  border: `2px solid ${color}`,
                  background: isActive ? `${color}22` : 'transparent',
                }}
              >
                <img src={mapping.texture} alt={mapping.name} />
                <span>{mapping.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="chart-row">
        {/* --- Main Chart Display --- */}
        <div className="chart-block">
          <h3 className="chart-title">Gained Currency (Runs + Recycling)</h3>
          {currencyChartData.length === 0 ? (
            <p className="chart-empty-message">
              No run currency data found for the selected filters.<br/>
              <i>(Note: Run deltas are only tracked for runs completed while this app is open)</i>
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filledCurrencyChartData} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="runName" stroke="#ccc" tick={{ fill: '#ccc' }} />
                <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
                <Tooltip content={<CustomCurrencyTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {filters.currencyIds.map((id) => {
                  const mapping = CURRENCY_MAPPINGS[id];
                  return (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={mapping?.name || `Currency ${id}`}
                      stroke={CHART_COLORS[id % CHART_COLORS.length]}
                      activeDot={{ r: 8, fill: CHART_COLORS[id % CHART_COLORS.length] }}
                      strokeWidth={2.5}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
  
        {/* --- Total Currency Chart Display --- */}
        <div className="chart-block">
          <h3 className="chart-title">Total Currency Over Time</h3>
          {totalChartData.length === 0 ? (
            <p className="chart-empty-message">
              No total currency data found for the selected filters.<br/>
              <i>(Note: Events are only tracked while this app is open)</i>
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filledTotalChartData} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="runName" stroke="#ccc" tick={{ fill: '#ccc' }} />
                <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
                <Tooltip content={<CustomCurrencyTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {filters.currencyIds.map((id) => {
                  const mapping = CURRENCY_MAPPINGS[id];
                  return (
                    <Line key={id} type="monotone" dataKey={mapping?.name || `Currency ${id}`} stroke={CHART_COLORS[id % CHART_COLORS.length]} activeDot={{ r: 8, fill: CHART_COLORS[id % CHART_COLORS.length] }} strokeWidth={2.5} />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* --- Run Stats Chart Display --- */}
      <div className="chart-row" style={{ marginTop: '40px' }}>
        <div className="chart-block">
          <h3 className="chart-title">Run Currencies (Gold & Soul Stones)</h3>
          {extendedStatsData.length === 0 ? (
            <p className="chart-empty-message">
              No run data found for the selected filters.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={extendedStatsData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="runName" stroke="#ccc" tick={{ fill: '#ccc' }} />
                <YAxis yAxisId="gold" stroke="#ffd700" tick={{ fill: '#ffd700' }} />
                <YAxis yAxisId="souls" orientation="right" stroke="#8884d8" tick={{ fill: '#8884d8' }} />
                <Tooltip content={<CustomCurrencyTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line yAxisId="gold" type="monotone" dataKey="Gold" stroke="#ffd700" activeDot={{ r: 8 }} strokeWidth={2.5} />
                <Line yAxisId="souls" type="monotone" dataKey="Soul Stones" stroke="#8884d8" activeDot={{ r: 8 }} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-block">
          <h3 className="chart-title">Run Duration & Gold/m</h3>
          {extendedStatsData.length === 0 ? (
            <p className="chart-empty-message">
              No run data found for the selected filters.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={extendedStatsData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="runName" stroke="#ccc" tick={{ fill: '#ccc' }} />
                <YAxis yAxisId="time" stroke="#00C49F" tick={{ fill: '#00C49F' }} />
                <YAxis yAxisId="gpm" orientation="right" stroke="#ff7300" tick={{ fill: '#ff7300' }} />
                <Tooltip content={<CustomCurrencyTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line yAxisId="time" type="monotone" dataKey="Time" stroke="#00C49F" activeDot={{ r: 8 }} strokeWidth={2.5} />
                <Line yAxisId="gpm" type="monotone" dataKey="goldPerMin" name="Gold/m" stroke="#ff7300" activeDot={{ r: 8 }} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}