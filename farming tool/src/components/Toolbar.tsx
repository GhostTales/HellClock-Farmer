import { GAME_OVER_SOURCES, DUNGEON_NAMES } from '../constants';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface ToolbarProps {
  fileMenuOpen: boolean;
  setFileMenuOpen: (open: boolean) => void;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  sourceFilterOpen: boolean;
  setSourceFilterOpen: (open: boolean) => void;
  dungeonFilterOpen: boolean;
  setDungeonFilterOpen: (open: boolean) => void;
  recentFolders: string[];
  profiles: string[];
  selectedProfile: string | null;
  selectedSources: number[];
  setSelectedSources: React.Dispatch<React.SetStateAction<number[]>>;
  selectedDungeon: number | '';
  setSelectedDungeon: React.Dispatch<React.SetStateAction<number | ''>>;
  runStats: { avgGoldPerSec: number; avgSoulStonesPerSec: number };
  handleSelectFolder: () => void;
  openFolder: (folderPath: string) => void;
  handleSelectProfile: (fileName: string) => void;
}

export function Toolbar({
  fileMenuOpen,
  setFileMenuOpen,
  profileMenuOpen,
  setProfileMenuOpen,
  sourceFilterOpen,
  setSourceFilterOpen,
  dungeonFilterOpen,
  setDungeonFilterOpen,
  recentFolders,
  profiles,
  selectedProfile,
  selectedSources,
  setSelectedSources,
  selectedDungeon,
  setSelectedDungeon,
  runStats,
  handleSelectFolder,
  openFolder,
  handleSelectProfile,
}: ToolbarProps) {
  const appWindow = getCurrentWindow();

  return (
    <div className="toolbar" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="dropdown">
        <button className="toolbar-btn" onClick={() => { setFileMenuOpen(!fileMenuOpen); setProfileMenuOpen(false); setSourceFilterOpen(false); setDungeonFilterOpen(false); }}>
          File
        </button>
        {fileMenuOpen && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleSelectFolder}>Open Folder...</button>
            {recentFolders.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #444', margin: '4px 0' }} />
                <div style={{ padding: '4px 8px', color: '#888', fontSize: '0.9em', cursor: 'default' }}>Recent Folders</div>
                {recentFolders.map((recentPath) => (
                  <button
                    key={recentPath}
                    className="dropdown-item"
                    title={recentPath}
                    onClick={() => {
                      setFileMenuOpen(false);
                      openFolder(recentPath);
                    }}
                    style={{
                      paddingLeft: '16px',
                      fontSize: '0.9em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '300px'
                    }}
                  >
                    {recentPath}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="dropdown">
        <button 
          className="toolbar-btn" 
          disabled={profiles.length === 0} 
          onClick={() => { setProfileMenuOpen(!profileMenuOpen); setFileMenuOpen(false); setSourceFilterOpen(false); setDungeonFilterOpen(false); }}
        >
          Profile: {selectedProfile || (profiles.length > 0 ? 'Select a profile' : 'None')}
        </button>
        {profileMenuOpen && (
          <div className="dropdown-menu">
            {profiles.map(profile => (
              <button
                key={profile}
                className="dropdown-item"
                onClick={() => handleSelectProfile(profile)}
                style={{ fontWeight: selectedProfile === profile ? 'bold' : 'normal', color: selectedProfile === profile ? '#fff' : '#ccc' }}
              >
                {profile}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="dropdown">
        <button className="toolbar-btn" onClick={() => { setSourceFilterOpen(!sourceFilterOpen); setFileMenuOpen(false); setProfileMenuOpen(false); setDungeonFilterOpen(false); }}>
          Filter: Game Over Source
        </button>
        {sourceFilterOpen && (
          <div className="dropdown-menu">
            {GAME_OVER_SOURCES.map(source => (
              <button
                key={source.id}
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent the menu from closing when a checkbox is clicked
                  setSelectedSources(prev => 
                    prev.includes(source.id) 
                      ? prev.filter(id => id !== source.id)
                      : [...prev, source.id]
                  );
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <input 
                  type="checkbox" 
                  checked={selectedSources.includes(source.id)} 
                  readOnly
                />
                {source.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dungeon Select */}
      <div className="dropdown">
        <button className="toolbar-btn" onClick={() => { setDungeonFilterOpen(!dungeonFilterOpen); setFileMenuOpen(false); setProfileMenuOpen(false); setSourceFilterOpen(false); }}>
          Dungeon: {selectedDungeon !== '' ? DUNGEON_NAMES[selectedDungeon] : 'All Dungeons'}
        </button>
        {dungeonFilterOpen && (
          <div className="dropdown-menu" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <button
              className="dropdown-item"
              onClick={() => { setSelectedDungeon(''); setDungeonFilterOpen(false); }}
              style={{ fontWeight: selectedDungeon === '' ? 'bold' : 'normal', color: selectedDungeon === '' ? '#fff' : '#ccc' }}
            >
              All Dungeons
            </button>
            {Object.entries(DUNGEON_NAMES)
              .filter(([id]) => parseInt(id) !== -1)
              .map(([idStr, name]) => (
                <button
                  key={idStr}
                  className="dropdown-item"
                  onClick={() => { setSelectedDungeon(parseInt(idStr, 10)); setDungeonFilterOpen(false); }}
                  style={{ fontWeight: selectedDungeon === parseInt(idStr, 10) ? 'bold' : 'normal', color: selectedDungeon === parseInt(idStr, 10) ? '#fff' : '#ccc' }}
                >
                  {name}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Run Stats */}
      {runStats.avgGoldPerSec > 0 || runStats.avgSoulStonesPerSec > 0 ? (
        <div style={{ marginLeft: '20px', color: '#ccc', fontSize: '13px', display: 'flex', gap: '15px', pointerEvents: 'none' }}>
          <span>Avg Gold/s: <b style={{ color: '#ffd700' }}>{runStats.avgGoldPerSec.toLocaleString()}</b></span>
          <span>Avg Souls/s: <b style={{ color: '#00C49F' }}>{runStats.avgSoulStonesPerSec.toLocaleString()}</b></span>
        </div>
      ) : null}

      {/* Spacer to push controls to the right and provide a large draggable area */}
      <div data-tauri-drag-region style={{ flexGrow: 1, height: '100%', minHeight: '30px' }}></div>

      {/* Window Controls */}
      <div className="window-controls" style={{ display: 'flex' }}>
        <button className="toolbar-btn" onClick={() => appWindow.minimize()} title="Minimize">
          —
        </button>
        <button className="toolbar-btn" onClick={() => appWindow.toggleMaximize()} title="Maximize">
          ☐
        </button>
        <button className="toolbar-btn close-btn" onClick={() => appWindow.close()} title="Close">
          ✕
        </button>
      </div>
    </div>
  );
}