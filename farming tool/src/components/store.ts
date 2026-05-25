import { load } from '@tauri-apps/plugin-store';
import { ProcessedCurrency } from '../types/gameData';

// This creates a 'farming-data.json' file in the OS-specific app data directory
export const dataStore = await load('farming-data.json');

export async function saveRunCurrencyBackup(runId: number, currencies: ProcessedCurrency[]) {
  const existingBackups = await dataStore.get<Record<number, ProcessedCurrency[]>>('runCurrencies') || {};
  
  if (existingBackups[runId]) {
    currencies.forEach(newC => {
      const existing = existingBackups[runId].find(c => c.id === newC.id);
      if (existing) {
        existing.totalAmount += newC.totalAmount;
        existing.rawAmount = newC.rawAmount;
        existing.rawFragments = newC.rawFragments;
      } else {
        existingBackups[runId].push(newC);
      }
    });
  } else {
    existingBackups[runId] = currencies;
  }
  
  await dataStore.set('runCurrencies', existingBackups);
  await dataStore.save();
}

export async function saveRecyclingBackup(eventId: string, currencies: ProcessedCurrency[]) {
  const existingBackups = await dataStore.get<Record<string, ProcessedCurrency[]>>('recyclingEvents') || {};
  
  if (existingBackups[eventId]) {
    currencies.forEach(newC => {
      const existing = existingBackups[eventId].find(c => c.id === newC.id);
      if (existing) {
        existing.totalAmount += newC.totalAmount;
        existing.rawAmount = newC.rawAmount;
        existing.rawFragments = newC.rawFragments;
      } else {
        existingBackups[eventId].push(newC);
      }
    });
  } else {
    existingBackups[eventId] = currencies;
  }

  await dataStore.set('recyclingEvents', existingBackups);
  await dataStore.save();
}

export async function saveCraftingBackup(eventId: string, currencies: ProcessedCurrency[]) {
  const existingBackups = await dataStore.get<Record<string, ProcessedCurrency[]>>('craftingEvents') || {};
  
  if (existingBackups[eventId]) {
    currencies.forEach(newC => {
      const existing = existingBackups[eventId].find(c => c.id === newC.id);
      if (existing) {
        existing.totalAmount += newC.totalAmount;
        existing.rawAmount = newC.rawAmount;
        existing.rawFragments = newC.rawFragments;
      } else {
        existingBackups[eventId].push(newC);
      }
    });
  } else {
    existingBackups[eventId] = currencies;
  }

  await dataStore.set('craftingEvents', existingBackups);
  await dataStore.save();
}

export async function clearTotalAndDeltaGraphData() {
  await dataStore.set('runCurrencies', {});
  await dataStore.set('recyclingEvents', {});
  await dataStore.set('craftingEvents', {});
  await dataStore.save();
}