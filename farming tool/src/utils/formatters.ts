import { PastRun } from '../dataManager';

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

export const calculatePerSec = (amount: number, time: number): number => {
  return time > 0 ? Number((amount / time).toFixed(2)) : 0;
};

export const getCurrencyTotal = (amount: number, fragments: number): number => {
  return amount + (fragments / 6);
};

export const extractStat = (run: PastRun, listName: '_statAggregators' | '_statCounters', key: string): number => {
  return run[listName]?._serializedList?.find(x => x.Key === key)?.Value || 0;
};