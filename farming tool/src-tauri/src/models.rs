use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveFile {
    #[serde(rename = "pastRunsData")]
    pub past_runs_data: Vec<PastRun>,
    #[serde(rename = "currencySaveData")]
    pub currency_save_data: CurrencySaveData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PastRun {
    #[serde(rename = "_runID")]
    pub run_id: i32,
    #[serde(rename = "_dungeonID")]
    pub dungeon_id: i32,
    #[serde(rename = "_damageBySkill")]
    pub damage_by_skill: SerializedList<i32, f64>,
    #[serde(rename = "_damageByType")]
    pub damage_by_type: SerializedList<i32, f64>,
    #[serde(rename = "_statCounters")]
    pub stat_counters: SerializedList<String, i32>,
    #[serde(rename = "_statAggregators")]
    pub stat_aggregators: SerializedList<String, f64>,
    #[serde(rename = "_statBools")]
    pub stat_bools: SerializedList<String, bool>,
    #[serde(rename = "_relicsCollected")]
    pub relics_collected: SerializedList<String, Vec<Relic>>,
    #[serde(rename = "_banishedBlessings")]
    pub banished_blessings: Vec<i32>,
    #[serde(rename = "_lastDamageInstances")]
    pub last_damage_instances: Vec<DamageInstance>,
    #[serde(rename = "_eGameOverSource")]
    pub game_over_source: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SerializedList<K, V> {
    #[serde(rename = "_serializedList")]
    pub serialized_list: Vec<KeyValuePair<K, V>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KeyValuePair<K, V> {
    #[serde(rename = "Key")]
    pub key: K,
    #[serde(rename = "Value")]
    pub value: V,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Relic {
    #[serde(rename = "_relicBaseDefinitionID")]
    pub relic_base_definition_id: i32,
    #[serde(rename = "_eRelicRarity")]
    pub relic_rarity: i32,
    #[serde(rename = "_ascended")]
    pub ascended: bool,
    #[serde(rename = "_upgradeLevel")]
    pub upgrade_level: i32,
    #[serde(rename = "_tier")]
    pub tier: i32,
    #[serde(rename = "_affixesData")]
    pub affixes_data: Vec<RelicAffixData>,
    #[serde(rename = "_implicitAffixesData")]
    pub implicit_affixes_data: Vec<ImplicitAffixData>,
    #[serde(rename = "_position")]
    pub position: Position,
    #[serde(rename = "_isCorrupted")]
    pub is_corrupted: bool,
    #[serde(rename = "_isDivined")]
    pub is_divined: bool,
    #[serde(rename = "_showNotification")]
    pub show_notification: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RelicAffixData {
    #[serde(rename = "_relicAffixDefinitionId")]
    pub relic_affix_definition_id: i32,
    #[serde(rename = "_rollValue")]
    pub roll_value: f64,
    #[serde(rename = "_tier")]
    pub tier: i32,
    #[serde(rename = "_locked")]
    pub locked: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImplicitAffixData {
    #[serde(rename = "_eImplicitAffixCategory")]
    pub implicit_affix_category: i32,
    #[serde(rename = "_relicAffixData")]
    pub relic_affix_data: RelicAffixData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DamageInstance {
    #[serde(rename = "_damageBases")]
    pub damage_bases: Vec<serde_json::Value>,
    #[serde(rename = "_totalDamage")]
    pub total_damage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CurrencySaveData {
    #[serde(rename = "_persistentData")]
    pub persistent_data: Vec<CurrencyPersistentData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CurrencyPersistentData {
    #[serde(rename = "_currencyID")]
    pub currency_id: i32,
    #[serde(rename = "_amount")]
    pub amount: i32,
    #[serde(rename = "_fragmentAmount")]
    pub fragment_amount: i32,
}