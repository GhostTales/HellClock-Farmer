import { useEffect, useState, useMemo } from 'react';
import { SaveFile, PastRun, dataManager } from '../dataManager';
import { CURRENCY_MAPPINGS } from '../constants';
import { dataStore } from './store';
import { ProcessedCurrency, RunData } from '../types/gameData';
import { useChartData } from './useChartData';
import { formatTime, calculatePerSec, extractStat } from '../utils/formatters';
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

interface RunsTableProps {
  saveData: SaveFile;
  selectedSources: number[];
  selectedProfile: string | null;
  selectedDungeon: number | '';
  setRunStats: React.Dispatch<React.SetStateAction<{ avgGoldPerSec: number; avgSoulStonesPerSec: number }>>;
}

// A simple palette for the lines on the graph
const CHART_COLORS = ['#6b6858', '#82a1ca', '#ffc658', '#ff7300', '#ff0000', '#00C49F', '#37be2a', '#8a37ce', '#c1cad1'];

export function RunsTable({ saveData, selectedSources, selectedProfile, selectedDungeon, setRunStats }: RunsTableProps) {
  const [runCurrencies, setRunCurrencies] = useState<Record<number, ProcessedCurrency[]>>({});
  const [outOfRunEvents, setOutOfRunEvents] = useState<{eventId: string, isCrafting: boolean, currencies: ProcessedCurrency[]}[]>([]);
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
      const craft = await dataStore.get<Record<string, ProcessedCurrency[]>>('craftingEvents') || {};
      
      const events: {eventId: string, isCrafting: boolean, currencies: ProcessedCurrency[]}[] = [];
      Object.entries(recycle).forEach(([eventId, currencies]) => {
        events.push({ eventId, isCrafting: false, currencies });
      });
      Object.entries(craft).forEach(([eventId, currencies]) => {
        events.push({ eventId, isCrafting: true, currencies: currencies.map(c => ({...c, totalAmount: -c.totalAmount})) });
      });
      events.sort((a, b) => Number(a.eventId) - Number(b.eventId));
      setOutOfRunEvents(events);
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
      if (events) {
        setOutOfRunEvents(prev => {
          const craft = prev.filter(p => p.isCrafting);
          const recycleList = Object.entries(events).map(([eventId, currencies]) => ({ eventId, isCrafting: false, currencies }));
          const combined = [...craft, ...recycleList].sort((a, b) => Number(a.eventId) - Number(b.eventId));
          return combined;
        });
      }
      await fetchLatestSave();
    }).then(fn => unlistenRecycle = fn);

    dataStore.onKeyChange<Record<string, ProcessedCurrency[]>>('craftingEvents', async (events) => {
      if (events) {
        setOutOfRunEvents(prev => {
          const recycle = prev.filter(p => !p.isCrafting);
          const craftList = Object.entries(events).map(([eventId, currencies]) => ({ eventId, isCrafting: true, currencies: currencies.map(c => ({...c, totalAmount: -c.totalAmount})) }));
          const combined = [...recycle, ...craftList].sort((a, b) => Number(a.eventId) - Number(b.eventId));
          return combined;
        });
      }
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
      const goldPerSec = calculatePerSec(goldGained, runTime);
      const soulStonesPerSec = calculatePerSec(soulStones, runTime);

      return {
        id: run._runID,
        sourceId: run._dungeonID,
        gameOverSource: run._eGameOverSource,
        currencies: runCurrencies[run._runID] || [],
        soulStones,
        soulStonesPerSec,
        goldGained,
        goldPerSec,
        runTime
      };
    });

    // Append out-of-run events as pseudo-runs to accurately plot deltas over time
    if (internalSaveData.currencySaveData && internalSaveData.currencySaveData._persistentData) {
      const latestRunId = pastRuns.length > 0 ? pastRuns[pastRuns.length - 1]._runID : 0;
      outOfRunEvents.forEach((event, index) => {
        const currentCurrencies: ProcessedCurrency[] = internalSaveData.currencySaveData._persistentData.map(c => {
          const mapping = CURRENCY_MAPPINGS[c._currencyID];
          const outOfRunMatch = event.currencies.find(o => o.id === c._currencyID);
          return {
            id: c._currencyID,
            name: mapping ? mapping.name : `Currency ${c._currencyID}`,
            texture: mapping ? mapping.texture : "",
            totalAmount: outOfRunMatch ? outOfRunMatch.totalAmount : 0,
            rawAmount: c._amount,
            rawFragments: c._fragmentAmount
          };
        });
  
        runs.push({
          id: latestRunId + 1 + index, // Places them sequentially at the end of the chart timeline
          sourceId: -1, // Excludes it from standard dungeon filters
          gameOverSource: -1, // Excludes it from game over filters (Base Stats Chart)
          currencies: currentCurrencies,
          soulStones: 0,
          soulStonesPerSec: 0,
          goldGained: 0,
          goldPerSec: 0,
          runTime: 0
        });
      });
    }

    return runs;
  }, [internalSaveData, runCurrencies, outOfRunEvents]);

  // Set up the custom hook
  const { filters, setFilters, currencyChartData, statsChartData, filteredRuns } = useChartData(allRuns, {
    sources: [], // Empty means show all supported dungeons
    gameOverSources: selectedSources,
    currencyIds: Object.keys(CURRENCY_MAPPINGS).map(Number), // Show all currencies by default
    runIdRange: null
  });

  // Override the X-Axis label for our pseudo-runs
  const displayCurrencyData = useMemo(() => {
    if (currencyChartData.length === 0) return [];
    
    const latestActualRunId = internalSaveData.pastRunsData?.length > 0 
      ? internalSaveData.pastRunsData[internalSaveData.pastRunsData.length - 1]._runID 
      : 0;

    return currencyChartData.map(d => {
      if (d.runId > latestActualRunId) {
        const offset = d.runId - latestActualRunId - 1;
        const event = outOfRunEvents[offset];
        return {
          ...d,
          runName: event ? (event.isCrafting ? "Crafting" : "Recycling") : "Action"
        };
      }
      return d;
    });
  }, [currencyChartData, internalSaveData, outOfRunEvents]);

  // Sync external selectedDungeon with internal useChartData filter
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      sources: selectedDungeon !== '' ? [selectedDungeon] : [],
      gameOverSources: selectedSources
    }));
  }, [selectedDungeon, selectedSources, setFilters]);

  // Compute average stats for the title bar
  useEffect(() => {
    if (filteredRuns.length === 0) {
      setRunStats({ avgGoldPerSec: 0, avgSoulStonesPerSec: 0 });
      return;
    }
    const totalGoldPerSec = filteredRuns.reduce((sum, run) => sum + run.goldPerSec, 0);
    const totalSSPerSec = filteredRuns.reduce((sum, run) => sum + run.soulStonesPerSec, 0);
    setRunStats({
      avgGoldPerSec: Number((totalGoldPerSec / filteredRuns.length).toFixed(2)),
      avgSoulStonesPerSec: Number((totalSSPerSec / filteredRuns.length).toFixed(2))
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
    <div style={{ marginTop: 20 }}>
      <h2>Past Runs Currency Analysis ({selectedProfile})</h2>

      {/* --- User Controls --- */}
      <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Currency Toggles */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(CURRENCY_MAPPINGS).map(([idStr, mapping]) => {
            const id = parseInt(idStr, 10);
            const isActive = filters.currencyIds.includes(id);
            const color = CHART_COLORS[id % CHART_COLORS.length];
            
            return (
              <button
                key={id}
                onClick={() => toggleCurrency(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isActive ? 1 : 0.4,
                  border: `2px solid ${color}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  background: isActive ? `${color}22` : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <img src={mapping.texture} alt={mapping.name} style={{ width: 24, height: 24 }} />
                <span style={{ fontSize: '14px' }}>{mapping.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Main Chart Display --- */}
      <div style={{ width: '100%', height: 450, background: '#222', borderRadius: '8px', padding: '15px 0' }}>
        {currencyChartData.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', paddingTop: 180 }}>
            No run currency data found for the selected filters.<br/>
            <i>(Note: Run deltas are only tracked for runs completed while this app is open)</i>
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayCurrencyData} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="runName" stroke="#ccc" tick={{ fill: '#ccc' }} />
              <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#444', borderRadius: '6px' }}
                itemStyle={{ color: 'white' }}
              />
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

      {/* --- Run Stats Chart Display --- */}
      <div style={{ width: '100%', height: 450, background: '#222', borderRadius: '8px', padding: '15px 0', marginTop: '30px' }}>
        <h3 style={{ textAlign: 'center', color: '#ccc', margin: '0 0 10px 0' }}>Base Run Statistics</h3>
        {statsChartData.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', paddingTop: 180 }}>
            No run data found for the selected filters.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={statsChartData} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="runName" stroke="#ccc" tick={{ fill: '#ccc' }} />
              {/* Use dual Y-Axes to prevent massive numbers crushing the smaller ones */}
              <YAxis yAxisId="left" stroke="#ccc" tick={{ fill: '#ccc' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#ccc" tick={{ fill: '#ccc' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#444', borderRadius: '6px' }}
                itemStyle={{ color: 'white' }}
                formatter={(value: any, name: any) => {
                  if (name === 'Time') {
                    return [formatTime(Number(value)), name];
                  }
                  return [Number(value).toLocaleString(), name];
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line yAxisId="left" type="monotone" dataKey="Gold" stroke="#ffd700" activeDot={{ r: 8 }} strokeWidth={2.5} />
              <Line yAxisId="left" type="monotone" dataKey="Soul Stones" stroke="#8884d8" activeDot={{ r: 8 }} strokeWidth={2.5} />
              <Line yAxisId="right" type="monotone" dataKey="Time" stroke="#00C49F" activeDot={{ r: 8 }} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}