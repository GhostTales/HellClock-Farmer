import { readTextFile } from '@tauri-apps/plugin-fs';
import { ProcessedCurrency } from '../types/gameData';
import { CURRENCY_MAPPINGS } from '../constants';
import { saveRunCurrencyBackup, saveRecyclingBackup, saveCraftingBackup } from './store';
import { getCurrencyTotal } from '../utils/formatters';

export function processSaveFileChange(oldSave: any, newSave: any) {
  const oldRuns = oldSave?.pastRunsData || oldSave?.PastRuns || [];
  const newRuns = newSave?.pastRunsData || newSave?.PastRuns || [];
  const isNewRun = newRuns.length > oldRuns.length;
  
  const gainedCurrencies: ProcessedCurrency[] = [];
  const spentCurrencies: ProcessedCurrency[] = [];

  const oldCurrencyData = oldSave?.currencySaveData || oldSave?.CurrencySaveData;
  const newCurrencyData = newSave?.currencySaveData || newSave?.CurrencySaveData;
  const oldCurrencies = oldCurrencyData?._persistentData || [];
  const newCurrencies = newCurrencyData?._persistentData || [];

  let isOngoingRunUpdate = false;

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
      const name = mapping ? mapping.name : `Currency ${newCurr._currencyID}`;

      const processed: ProcessedCurrency = {
        id: newCurr._currencyID,
        name,
        texture: mapping ? mapping.texture : "",
        totalAmount: Math.abs(delta), // Store as absolute value
        rawAmount: newCurr._amount,
        rawFragments: newCurr._fragmentAmount,
      };

      if (delta > 0) {
        gainedCurrencies.push(processed);

        // Heuristic to detect if this save update happened *during* an ongoing run
        // Recycling only gives fragments (except Tinkering).
        // Divine currency cannot be gained from recycling at all.
        const nameLower = name.toLowerCase();
        const isDivine = nameLower.includes('divine');
        const isTinkering = nameLower.includes('tinkering')
        
        // We can lower this to >= 1 since recycling non-tinkering items only gives fragments
        if (isDivine || (!isTinkering && delta >= 1)) {
          isOngoingRunUpdate = true;
        }
      } else if (delta < 0) {
        spentCurrencies.push(processed);
      }
    }
  });

  return {
    isNewRun,
    latestRunId: newRuns.length > 0 ? newRuns[newRuns.length - 1]._runID : 0,
    gainedCurrencies,
    spentCurrencies,
    isOngoingRunUpdate
  };
}

export async function startSaveWatcher(saveFilePath: string) {
  console.log(`[SaveWatcher] Initializing watcher for path: ${saveFilePath}`);
  if (!saveFilePath) {
    console.warn("[SaveWatcher] Watcher started with no profile selected.");
    return () => {};
  }

  let previousSaveData: any = {
    pastRunsData: [],
    currencySaveData: { _persistentData: [] }
  };
  let lastContent: string = "";
  let lastError: string | null = null;
  
  let ongoingRunGainedBuffer: ProcessedCurrency[] = [];
  let ongoingRunSpentBuffer: ProcessedCurrency[] = [];
  
  try {
    lastContent = await readTextFile(saveFilePath);
    if (lastContent.trim() !== '') {
      previousSaveData = JSON.parse(lastContent);
      console.log(`[SaveWatcher] Initial save file loaded successfully. Runs: ${previousSaveData.pastRunsData?.length || previousSaveData.PastRuns?.length || 0}`);
    }
  } catch (e) {
    console.warn("[SaveWatcher] Could not read initial save file state, it might not exist yet. Baseline set at 0.");
    lastContent = "";
  }

  console.log("[SaveWatcher] Starting polling interval...");

  // Using a polling mechanism with readTextFile since native OS file watching via Tauri
  // and stat() mtime can be highly unreliable with atomic file replacements under Wine/Proton.
  const intervalId = setInterval(async () => {
    try {
      const currentContent = await readTextFile(saveFilePath);

      if (lastError !== null) {
        console.log("[SaveWatcher] Successfully read file after previous errors.");
        lastError = null;
      }

      // If the file is unreadable, empty, or hasn't changed at all, skip.
      if (!currentContent || currentContent.trim() === '' || currentContent === lastContent) {
        return;
      }

      console.log("[SaveWatcher] Save file change detected, processing...");
      lastContent = currentContent;
      
      const newSaveData = JSON.parse(currentContent);

      // Update lastContent AFTER parsing successfully to prevent a corrupted read from breaking future reads
      lastContent = currentContent;

      const { isNewRun, latestRunId, gainedCurrencies, spentCurrencies, isOngoingRunUpdate } = processSaveFileChange(previousSaveData, newSaveData);

      console.log(`[SaveWatcher] Change analysis - isNewRun: ${isNewRun}, latestRunId: ${latestRunId}, gained: ${gainedCurrencies.length}, spent: ${spentCurrencies.length}, isOngoingRunUpdate: ${isOngoingRunUpdate}`);
      
      // Buffer ongoing run updates so they don't get logged as recycling
      if (!isNewRun && isOngoingRunUpdate) {
        console.log("[SaveWatcher] Detected ongoing run currency update, buffering...");
        
        gainedCurrencies.forEach(gc => {
          const existing = ongoingRunGainedBuffer.find(c => c.id === gc.id);
          if (existing) {
            existing.totalAmount += gc.totalAmount;
            existing.rawAmount = gc.rawAmount;
            existing.rawFragments = gc.rawFragments;
          } else {
            ongoingRunGainedBuffer.push({ ...gc });
          }
        });
        
        spentCurrencies.forEach(sc => {
          const existing = ongoingRunSpentBuffer.find(c => c.id === sc.id);
          if (existing) {
            existing.totalAmount += sc.totalAmount;
            existing.rawAmount = sc.rawAmount;
            existing.rawFragments = sc.rawFragments;
          } else {
            ongoingRunSpentBuffer.push({ ...sc });
          }
        });
        
        previousSaveData = newSaveData;
        return;
      }

      let combinedGained = [...gainedCurrencies];

      if (isNewRun && latestRunId != null) {
        // If a new run just finished, merge any buffered currencies into this run's total
        if (ongoingRunGainedBuffer.length > 0) {
          ongoingRunGainedBuffer.forEach(bgc => {
            const existing = combinedGained.find(c => c.id === bgc.id);
            if (existing) {
              existing.totalAmount += bgc.totalAmount;
              // rawAmount and rawFragments from combinedGained (latest tick) are preserved
            } else {
              combinedGained.push({ ...bgc });
            }
          });
          ongoingRunGainedBuffer = [];
          ongoingRunSpentBuffer = [];
        }

        if (combinedGained.length > 0) {
          console.log(`[SaveWatcher] Saving run backup for run ID ${latestRunId}`, combinedGained);
          await saveRunCurrencyBackup(latestRunId, combinedGained);
        }
      } else if (!isNewRun && latestRunId != null) {
        const eventId = latestRunId.toString(); // Group out-of-run actions by the run they follow
        if (combinedGained.length > 0) {
          console.log(`[SaveWatcher] Saving recycling backup for event ${eventId}`, combinedGained);
          await saveRecyclingBackup(eventId, combinedGained);
        }
        if (spentCurrencies.length > 0) {
          console.log(`[SaveWatcher] Saving crafting backup for event ${eventId}`, spentCurrencies);
          await saveCraftingBackup(eventId, spentCurrencies);
        }
      }

      previousSaveData = newSaveData;
    } catch (error: any) {
      // File might be temporarily unavailable during atomic saves
      const errMsg = error?.toString() || "Unknown error";
      if (lastError !== errMsg) {
        console.error("[SaveWatcher] Polling read/parse error:", error);
        lastError = errMsg;
      }
    }
  }, 1000);

   return () => {
    console.log("[SaveWatcher] Stopping watcher interval.");
    clearInterval(intervalId);
  };
}