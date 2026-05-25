import { useState } from 'react';
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
  runStats: { avgGoldPerMin: number; avgSoulStonesPerMin: number };
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
  const [activeDungeonGroup, setActiveDungeonGroup] = useState<string | null>(null);

  // Map the group name to an array of Dungeon IDs.
  const DUNGEON_GROUPS: Record<string, number[]> = {
    'Endless Nightmares': [23, 26, 27, 25, 24, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
    'Oblivion': [15, 16, 17, 18],
    'Abyss': [11, 12, 13, 14],
    'Campaign': [1,2,3,9],
    'Ascension': [6,7,8,10],
    'Void': [19,20,21,22],
  };

  const toggleMenu = (menuName: 'file' | 'profile' | 'source' | 'dungeon') => {
    setFileMenuOpen(menuName === 'file' ? !fileMenuOpen : false);
    setProfileMenuOpen(menuName === 'profile' ? !profileMenuOpen : false);
    setSourceFilterOpen(menuName === 'source' ? !sourceFilterOpen : false);
    setDungeonFilterOpen(menuName === 'dungeon' ? !dungeonFilterOpen : false);
  };

  const groupedDungeonIds = Object.values(DUNGEON_GROUPS).flat();
  const filteredProfiles = profiles.filter(profile => /PlayerSave\d+\.json/.test(profile));

  return (
    <div className="toolbar" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="dropdown">
        <button className="toolbar-btn" onClick={() => toggleMenu('file')}>
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
          disabled={filteredProfiles.length === 0} 
          onClick={() => toggleMenu('profile')}
        >
          Profile: {selectedProfile || (filteredProfiles.length > 0 ? 'Select a profile' : 'None')}
        </button>
        {profileMenuOpen && (
          <div className="dropdown-menu">
            {filteredProfiles.map(profile => (
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
        <button className="toolbar-btn" onClick={() => toggleMenu('source')}>
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
        <button className="toolbar-btn" onClick={() => toggleMenu('dungeon')}>
          Dungeon: {selectedDungeon !== '' ? DUNGEON_NAMES[selectedDungeon] : 'All Dungeons'}
        </button>
        {dungeonFilterOpen && (
          <div className="dropdown-menu">
            <button
              className="dropdown-item"
              onClick={() => { setSelectedDungeon(''); setDungeonFilterOpen(false); }}
              style={{ fontWeight: selectedDungeon === '' ? 'bold' : 'normal', color: selectedDungeon === '' ? '#fff' : '#ccc' }}
            >
              All Dungeons
            </button>

            {/* Grouped Dungeons */}
            {Object.entries(DUNGEON_GROUPS).map(([groupName, dungeonIds]) => (
              <div 
                key={groupName}
                className="dropdown-item"
                onMouseEnter={() => setActiveDungeonGroup(groupName)}
                onMouseLeave={() => setActiveDungeonGroup(null)}
                style={{ position: 'relative', cursor: 'default' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{groupName}</span>
                  <span style={{ fontSize: '0.8em' }}>▶</span>
                </div>
                
                {activeDungeonGroup === groupName && (
                  <div 
                    className="dropdown-menu"
                    style={{ 
                      position: 'absolute', 
                      left: '100%', 
                      top: 0, 
                      marginTop: '-4px', 
                      marginLeft: '-1px'
                    }}
                  >
                    {dungeonIds.map(id => (
                      <button
                        key={id}
                        className="dropdown-item"
                        onClick={(e) => { 
                          e.stopPropagation();
                          setSelectedDungeon(id); 
                          setDungeonFilterOpen(false);
                          setActiveDungeonGroup(null);
                        }}
                        style={{ 
                          fontWeight: selectedDungeon === id ? 'bold' : 'normal', 
                          color: selectedDungeon === id ? '#fff' : '#ccc' 
                        }}
                      >
                        {DUNGEON_NAMES[id] || `Unknown (${id})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Ungrouped Dungeons */}
            {Object.entries(DUNGEON_NAMES)
              .filter(([id]) => parseInt(id, 10) !== -1 && !groupedDungeonIds.includes(parseInt(id, 10)))
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
      {runStats.avgGoldPerMin > 0 || runStats.avgSoulStonesPerMin > 0 ? (
        <div style={{ marginLeft: '20px', color: '#ccc', fontSize: '13px', display: 'flex', gap: '15px', pointerEvents: 'none' }}>
          <span>Avg Gold/m: <b style={{ color: '#ffd700' }}>{runStats.avgGoldPerMin.toLocaleString()}</b></span>
          <span>Avg Souls/m: <b style={{ color: '#8884d8' }}>{runStats.avgSoulStonesPerMin.toLocaleString()}</b></span>
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