import { useEffect, useState, useMemo } from 'react';
import { SaveFile } from '../dataManager';
import { CURRENCY_MAPPINGS } from '../constants';
import { dataStore } from './store';
import { ProcessedCurrency, RunData } from '../types/gameData';
import { useChartData } from './useChartData';
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

  // Load our generated currency deltas from the Tauri file store
  useEffect(() => {
    const loadCurrencies = async () => {
      const backups = await dataStore.get<Record<number, ProcessedCurrency[]>>('runCurrencies') || {};
      setRunCurrencies(backups);
    };
    loadCurrencies();
  }, [saveData]);
  
  // Merge the raw runs with our store backups to get the format the chart expects
  const runs: RunData[] = useMemo(() => {
    const pastRuns = saveData.pastRunsData?.filter((run: any) => 
      selectedSources.includes(run._eGameOverSource)
    ) || [];

    return pastRuns.map((run: any) => {
      const runTime = run._statAggregators?._serializedList?.find((x: any) => x.Key === 'RunTime')?.Value || 0;
      const soulStones = run._statCounters?._serializedList?.find((x: any) => x.Key === 'SoulStonesCollected')?.Value || 0;
      const goldGained = run._statAggregators?._serializedList?.find((x: any) => x.Key === 'GoldGained')?.Value || 0;
      const goldPerSec = runTime > 0 ? Number((goldGained / runTime).toFixed(2)) : 0;
      const soulStonesPerSec = runTime > 0 ? Number((soulStones / runTime).toFixed(2)) : 0;

      return {
        id: run._runID,
        sourceId: run._dungeonID,
        currencies: runCurrencies[run._runID] || [],
        soulStones,
        soulStonesPerSec,
        goldGained,
        goldPerSec,
        runTime
      };
    });
  }, [saveData, selectedSources, runCurrencies]);

  // Set up the custom hook
  const { filters, setFilters, currencyChartData, statsChartData, filteredRuns } = useChartData(runs, {
    sources: [], // Empty means show all supported dungeons
    currencyIds: Object.keys(CURRENCY_MAPPINGS).map(Number), // Show all currencies by default
    runIdRange: null
  });

  // Sync external selectedDungeon with internal useChartData filter
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      sources: selectedDungeon !== '' ? [selectedDungeon] : []
    }));
  }, [selectedDungeon, setFilters]);

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
            <LineChart data={currencyChartData} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
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
                    const mins = Math.floor(Number(value) / 60);
                    const secs = Math.floor(Number(value) % 60);
                    return [`${mins}m ${secs}s`, name];
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