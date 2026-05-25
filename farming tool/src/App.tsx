import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { dataManager, SaveFile } from './dataManager';
import { Toolbar } from './components/Toolbar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { RunsTable } from './components/RunsTable';
import { startSaveWatcher } from './components/saveWatcher';
import './App.css';

export default function App() {
  const [recentFolders, setRecentFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recentFolders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [folder, setFolder] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [saveData, setSaveData] = useState<SaveFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sourceFilterOpen, setSourceFilterOpen] = useState(false);
  const [dungeonFilterOpen, setDungeonFilterOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<number[]>([0, 2, 3]);
  const [selectedDungeon, setSelectedDungeon] = useState<number | ''>('');
  const [runStats, setRunStats] = useState({ avgGoldPerMin: 0, avgSoulStonesPerMin: 0 });

  // Start the save file watcher whenever a profile is actively selected
  useEffect(() => {
    let stopWatcher: (() => void) | undefined;

    async function initWatcher() {
      if (folder && selectedProfile) {
        try {
          const fullPath = await join(folder, selectedProfile);
          stopWatcher = await startSaveWatcher(fullPath);
        } catch (error) {
          console.error("[SaveWatcher] Failed to start save watcher:", error);
        }
      }
    }

    initWatcher();

    return () => {
      if (stopWatcher) stopWatcher();
    };
  }, [folder, selectedProfile]);

  const openFolder = async (folderPath: string) => {
    setError(null);
    setFolder(folderPath);
    dataManager.setFolderPath(folderPath);
    setSaveData(null);
    setSelectedProfile(null);
    
    setRecentFolders(prev => {
      const updated = [folderPath, ...prev.filter(p => p !== folderPath)].slice(0, 5);
      localStorage.setItem('recentFolders', JSON.stringify(updated));
      return updated;
    });
    
    try {
      const profileList = await dataManager.getProfiles();
      setProfiles(profileList);
    } catch (err) {
      console.error("Failed to load profiles", err);
      setError(String(err));
    }
  };

  useEffect(() => {
    if (recentFolders.length > 0) {
      openFolder(recentFolders[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectFolder = async () => {
    setFileMenuOpen(false);
    setSourceFilterOpen(false);
    setError(null);
    const selected = await open({
      directory: true,
      multiple: false,
    });
    
    if (selected && typeof selected === 'string') {
      await openFolder(selected);
    }
  };

  const handleSelectProfile = async (fileName: string) => {
    setProfileMenuOpen(false);
    setSourceFilterOpen(false);
    setError(null);
    setSelectedProfile(fileName);
    try {
      const data = await dataManager.getProfileData(fileName);
      setSaveData(data);
    } catch (err) {
      console.error("Failed to load profile data", err);
      setError(String(err));
    }
  };

  const closeMenus = () => {
    setFileMenuOpen(false);
    setProfileMenuOpen(false);
    setSourceFilterOpen(false);
    setDungeonFilterOpen(false);
  };

  return (
    <div className="container">
      <Toolbar
        fileMenuOpen={fileMenuOpen}
        setFileMenuOpen={setFileMenuOpen}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        sourceFilterOpen={sourceFilterOpen}
        setSourceFilterOpen={setSourceFilterOpen}
        dungeonFilterOpen={dungeonFilterOpen}
        setDungeonFilterOpen={setDungeonFilterOpen}
        recentFolders={recentFolders}
        profiles={profiles}
        selectedProfile={selectedProfile}
        selectedSources={selectedSources}
        setSelectedSources={setSelectedSources}
        selectedDungeon={selectedDungeon}
        setSelectedDungeon={setSelectedDungeon}
        runStats={runStats}
        handleSelectFolder={handleSelectFolder}
        openFolder={openFolder}
        handleSelectProfile={handleSelectProfile}
      />

      <div className="content" onClick={closeMenus}>
        {!folder ? (
          <WelcomeScreen onSelectFolder={handleSelectFolder} error={error} />
        ) : (
          <>
            <div className="status-text">Active Directory: {folder}</div>
            {error && <p style={{ color: '#ff6b6b' }}>Error: {error}</p>}
            
            {saveData && (
              <RunsTable 
                saveData={saveData} 
                selectedSources={selectedSources} 
                selectedProfile={selectedProfile} 
                selectedDungeon={selectedDungeon}
                setRunStats={setRunStats}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}