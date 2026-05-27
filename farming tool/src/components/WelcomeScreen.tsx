import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onSelectFolder: () => void;
  error: string | null;
}

export function WelcomeScreen({ onSelectFolder, error }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <h1>Welcome to HellClock Farmer</h1>
      <p>Please select the folder containing your save files to get started.</p>
      <button className="btn-primary" onClick={onSelectFolder}>Select Game Data Folder</button>
      {error && <p style={{ color: '#ff6b6b', marginTop: 10 }}>Error: {error}</p>}
    </div>
  );
}