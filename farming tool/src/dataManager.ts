import { invoke } from '@tauri-apps/api/core';

export interface KeyValuePair<K, V> {
  Key: K;
  Value: V;
}

export interface SerializedList<K, V> {
  _serializedList: KeyValuePair<K, V>[];
}

export interface Position {
  x: number;
  y: number;
}

export interface RelicAffixData {
  _relicAffixDefinitionId: number;
  _rollValue: number;
  _tier: number;
  _locked: boolean;
}

export interface ImplicitAffixData {
  _eImplicitAffixCategory: number;
  _relicAffixData: RelicAffixData;
}

export interface Relic {
  _relicBaseDefinitionID: number;
  _eRelicRarity: number;
  _ascended: boolean;
  _upgradeLevel: number;
  _tier: number;
  _affixesData: RelicAffixData[];
  _implicitAffixesData: ImplicitAffixData[];
  _position: Position;
  _isCorrupted: boolean;
  _isDivined: boolean;
  _showNotification: boolean;
}

export interface DamageInstance {
  _damageBases: any[];
  _totalDamage: number;
}

export interface PastRun {
  _runID: number;
  _dungeonID: number;
  _damageBySkill: SerializedList<number, number>;
  _damageByType: SerializedList<number, number>;
  _statCounters: SerializedList<string, number>;
  _statAggregators: SerializedList<string, number>;
  _statBools: SerializedList<string, boolean>;
  _relicsCollected: SerializedList<string, Relic[]>;
  _banishedBlessings: number[];
  _lastDamageInstances: DamageInstance[];
  _eGameOverSource: number;
}

export interface CurrencyPersistentData {
  _currencyID: number;
  _amount: number;
  _fragmentAmount: number;
}

export interface CurrencySaveData {
  _persistentData: CurrencyPersistentData[];
}

export interface SaveFile {
  pastRunsData: PastRun[];
  currencySaveData: CurrencySaveData;
}

export class DataManager {
  private folderPath: string | null = null;

  setFolderPath(path: string) {
    this.folderPath = path;
  }

  getFolderPath(): string | null {
    return this.folderPath;
  }

  async getProfiles(): Promise<string[]> {
    if (!this.folderPath) return [];
    try {
      return await invoke<string[]>('get_profiles', { folderPath: this.folderPath });
    } catch (e) {
      console.error("Error getting profiles:", e);
      throw e;
    }
  }

  async getProfileData(fileName: string): Promise<SaveFile | null> {
    if (!this.folderPath) return null;
    try {
      return await invoke<SaveFile>('get_profile_data', { folderPath: this.folderPath, fileName });
    } catch (e) {
      console.error(`Error reading profile data for ${fileName}:`, e);
      throw e;
    }
  }
}

// Export a singleton instance so you can interact with it across the application
export const dataManager = new DataManager();