import { SaveFile } from '../dataManager';
import { DUNGEON_NAMES } from '../constants';

interface RunsTableProps {
  saveData: SaveFile;
  selectedSources: number[];
  selectedProfile: string | null;
}

export function RunsTable({ saveData, selectedSources, selectedProfile }: RunsTableProps) {
  const filteredRuns = saveData.pastRunsData?.filter(run => 
    selectedSources.includes(run._eGameOverSource)
  ) || [];
  
  const groupedRuns = filteredRuns.reduce((acc, run) => {
    const dId = run._dungeonID;
    if (!acc[dId]) acc[dId] = [];
    acc[dId].push(run);
    return acc;
  }, {} as Record<number, typeof filteredRuns>);

  const groups = Object.entries(groupedRuns);
  
  return (
    <div style={{ marginTop: 20 }}>
      <h2>Past Runs ({selectedProfile})</h2>
      {groups.length === 0 ? (
        <p style={{ color: '#888' }}>No valid runs found.</p>
      ) : (
        groups.map(([dungeonIdStr, runs]) => {
          const dungeonId = parseInt(dungeonIdStr, 10);
          const dungeonName = DUNGEON_NAMES[dungeonId] || dungeonId.toString();

          return (
            <div key={dungeonId} className="table-container">
              <h3 style={{ margin: '0 0 10px 0', color: '#ccc' }}>{dungeonName}</h3>
              <table className="runs-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Time</th>
                    <th>Soul Stones</th>
                    <th>Gold</th>
                    <th>Gold/Sec</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, index) => {
                    const runTime = run._statAggregators?._serializedList?.find((x: any) => x.Key === 'RunTime')?.Value || 0;
                    const soulStones = run._statCounters?._serializedList?.find((x: any) => x.Key === 'SoulStonesCollected')?.Value || 0;
                    const goldGained = run._statAggregators?._serializedList?.find((x: any) => x.Key === 'GoldGained')?.Value || 0;
                    const goldPerSec = runTime > 0 ? (goldGained / runTime).toFixed(2) : '0.00';
                    const minutes = Math.floor(runTime / 60);
                    const seconds = Math.floor(runTime % 60);
                    const formattedTime = `${minutes}m ${seconds}s`;
                    return (
                      <tr key={run._runID || index}>
                        <td>{run._runID || index + 1}</td>
                        <td>{formattedTime}</td>
                        <td>{soulStones.toLocaleString()}</td>
                        <td>{Math.floor(goldGained).toLocaleString()}</td>
                        <td>{goldPerSec}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}