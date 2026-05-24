import { GAME_OVER_SOURCES } from '../constants';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface ToolbarProps {
  fileMenuOpen: boolean;
  setFileMenuOpen: (open: boolean) => void;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  sourceFilterOpen: boolean;
  setSourceFilterOpen: (open: boolean) => void;
  recentFolders: string[];
  profiles: string[];
  selectedProfile: string | null;
  selectedSources: number[];
  setSelectedSources: React.Dispatch<React.SetStateAction<number[]>>;
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
  recentFolders,
  profiles,
  selectedProfile,
  selectedSources,
  setSelectedSources,
  handleSelectFolder,
  openFolder,
  handleSelectProfile,
}: ToolbarProps) {
  const appWindow = getCurrentWindow();

  return (
    <div className="toolbar" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="dropdown">
        <button className="toolbar-btn" onClick={() => { setFileMenuOpen(!fileMenuOpen); setProfileMenuOpen(false); setSourceFilterOpen(false); }}>
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
          onClick={() => { setProfileMenuOpen(!profileMenuOpen); setFileMenuOpen(false); setSourceFilterOpen(false); }}
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
        <button className="toolbar-btn" onClick={() => { setSourceFilterOpen(!sourceFilterOpen); setFileMenuOpen(false); setProfileMenuOpen(false); }}>
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