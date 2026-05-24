import { watch, readTextFile } from '@tauri-apps/plugin-fs';
import { ProcessedCurrency } from '../types/gameData';
import { CURRENCY_MAPPINGS } from '../constants';
import { saveRunCurrencyBackup, saveRecyclingBackup, saveCraftingBackup } from './store';
import { getCurrencyTotal } from '../utils/formatters';

export function processSaveFileChange(oldSave: any, newSave: any) {
  const oldRuns = oldSave?.PastRuns || [];
  const newRuns = newSave?.PastRuns || [];
  const isNewRun = newRuns.length > oldRuns.length;
  
  const gainedCurrencies: ProcessedCurrency[] = [];
  const spentCurrencies: ProcessedCurrency[] = [];

  const oldCurrencies = oldSave?.currencySaveData?._persistentData || [];
  const newCurrencies = newSave?.currencySaveData?._persistentData || [];

  newCurrencies.forEach((newCurr: any) => {
    const oldCurr = oldCurrencies.find(
      (c: any) => c._currencyID === newCurr._currencyID
    ) || { _amount: 0, _fragmentAmount: 0 };

    const oldTotal = getCurrencyTotal(oldCurr._amount, oldCurr._fragmentAmount);
    const newTotal = getCurrencyTotal(newCurr._amount, newCurr._fragmentAmount);
    
    // Calculate the mathematical difference (delta)
    const delta = newTotal - oldTotal;
    
    if (delta !== 0) {
      const mapping = CURRENCY_MAPPINGS[newCurr._currencyID];
      const processed: ProcessedCurrency = {
        id: newCurr._currencyID,
        name: mapping ? mapping.name : `Currency ${newCurr._currencyID}`,
        texture: mapping ? mapping.texture : "",
        totalAmount: Math.abs(delta), // Store as absolute value
        rawAmount: newCurr._amount,
        rawFragments: newCurr._fragmentAmount,
      };

      if (delta > 0) {
        gainedCurrencies.push(processed);
      } else if (delta < 0) {
        spentCurrencies.push(processed);
      }
    }
  });

  return {
    isNewRun,
    latestRunId: isNewRun ? newRuns[newRuns.length - 1]._runID : null,
    gainedCurrencies,
    spentCurrencies
  };
}

export async function startSaveWatcher(saveFilePath: string) {
  let previousSaveData: any = null;
  
  try {
    const initialContent = await readTextFile(saveFilePath);
    previousSaveData = JSON.parse(initialContent);
  } catch (e) {
    console.warn("Could not read initial save file state, it might not exist yet.");
  }

  return await watch(saveFilePath, async (event) => {
    if (event.type === 'any' || (typeof event.type === 'object' && 'modify' in event.type)) {
      try {
        const newContent = await readTextFile(saveFilePath);
        const newSaveData = JSON.parse(newContent);

        if (previousSaveData) {
          const { isNewRun, latestRunId, gainedCurrencies, spentCurrencies } = processSaveFileChange(previousSaveData, newSaveData);
          
          if (isNewRun && latestRunId != null && gainedCurrencies.length > 0) {
            await saveRunCurrencyBackup(latestRunId, gainedCurrencies);
          } else if (!isNewRun) {
            const eventId = Date.now().toString(); // Timestamp identifier for out-of-run actions
            if (gainedCurrencies.length > 0) {
              await saveRecyclingBackup(eventId, gainedCurrencies);
            }
            if (spentCurrencies.length > 0) {
              await saveCraftingBackup(eventId, spentCurrencies);
            }
          }
        }

        previousSaveData = newSaveData;
      } catch (error) {
        console.error("Error processing save file change:", error);
      }
    }
  });
}