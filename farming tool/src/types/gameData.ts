export interface RawCurrencyData {
  _currencyID: number;
  _amount: number;
  _fragmentAmount: number;
}

export interface ProcessedCurrency {
  id: number;
  name: string; // Mapped from ID (e.g., 1 -> "Gold", 2 -> "Gems")
  texture: string; // Path to the currency texture
  totalAmount: number; // A computed value, e.g., amount + (fragmentAmount / 100)
  rawAmount: number;
  rawFragments: number;
}

// Represents a single farming run or save state snapshot
export interface RunData {
  id: number;
  sourceId: number; // Matches your selectedSources
  
  // Focus on the most important data
  currencies: ProcessedCurrency[];
  soulStones: number;
  soulStonesPerSec: number;
  goldGained: number;
  goldPerSec: number;
  runTime: number; // in seconds
}

// Represents currency gained by recycling items outside of a run
export interface RecyclingData {
  eventId: string; // Generated internally by the app to track the event
  currenciesGained: ProcessedCurrency[];
}

// Represents currency spent on crafting outside of a run
export interface CraftingData {
  eventId: string; // Generated internally by the app to track the event
  currenciesSpent: ProcessedCurrency[];
}