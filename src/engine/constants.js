/**
 * 游戏数值常量 - 路灯计划
 *
 * 集中管理所有可调参数，方便后续数值平衡。
 */

// ====== 时间系统 ======
export const TICKS_PER_DAY = 10;
export const DAYS_PER_SEASON = 7;
export const SEASONS = ['春', '夏', '秋', '冬'];

// ====== 食物消耗 ======
export const FOOD_PER_PERSON = 2;

// ====== 农田系统 ======
export const FARM_INITIAL_PLOT_COUNT = 2;
export const FARM_EXPAND_TICKS = 50;           // 开垦耗时：5天 = 50 tick
export const FARM_MAX_CROP_YIELD_MOD = 2.0;    // 产量修正上限
export const FARM_MIN_CROP_YIELD_MOD = 0.1;    // 产量修正下限

// 水分
export const WATER_EVAPORATION_RATE = 1.5;      // 每 tick 蒸发
export const WATER_ADD_AMOUNT = 30;             // 每次浇水增加
export const WATER_LOW_THRESHOLD = 60;          // 低于此值开始影响产量
export const WATER_CRITICAL_THRESHOLD = 30;     // 低于此值生长大幅减速
export const WATER_VERY_LOW_THRESHOLD = 10;     // 低于此值几乎不生长

// 肥力
export const FERTILITY_BASE = 60;               // 肥力基准线
export const FERTILITY_INITIAL_MIN = 60;
export const FERTILITY_INITIAL_RANGE = 30;
export const FERTILITY_DRAIN_RATE = 0.2;       // 种植中每 tick 消耗
export const FERTILITY_ADD_AMOUNT = 15;         // 每次施肥增加
export const FERTILITY_HARVEST_COST = 5;        // 收获后肥力下降
export const FERTILITY_MIN = 20;                // 肥力绝对下限
export const FERTILITY_MIN_FOR_GROWTH = 10;     // 农田可持续的最低肥力

// 产量修正（每 tick/每天）
export const YIELD_WATER_DEFICIT_RATE = 0.006;  // 水分不足每 tick 减产系数
export const YIELD_WEED_SEVERITY_RATE = 0.005;  // 杂草严重每 tick 减产系数
export const YIELD_PEST_TICK_RATE = 0.003;      // 病虫害每 tick 持续减产
export const YIELD_PEST_IMMEDIATE = 0.05;       // 病虫害出现时立即减产
export const YIELD_READY_PEST_RATE = 0.002;     // 成熟后病虫害持续减产
export const YIELD_READY_WEED_RATE = 0.002;     // 成熟后杂草持续减产
export const YIELD_FERTILITY_HIGH_BONUS = 0.02; // 肥力>60每天最大增产
export const YIELD_FERTILITY_LOW_PENALTY = 0.03;// 肥力<60每天最大减产

// 病虫害
export const PEST_SPAWN_CHANCE = 0.008;         // 每 tick 出现概率
export const PEST_SPREAD_BASE = 0.005;          // 传染基础概率
export const PEST_INITIAL_SEVERITY_MIN = 3;     // 初始严重度最小值
export const PEST_INITIAL_SEVERITY_RANGE = 5;   // 初始严重度随机范围
export const PEST_SPREAD_SEVERITY_RANGE = 3;    // 传染后严重度随机范围
export const PEST_SPREAD_MIN_SEVERITY = 3;      // 可传染的最低严重度
export const PEST_YIELD_PENALTY_SCALE = 0.05;   // 传染时立即减产

// 杂草
export const WEED_THRESHOLD = 40;              // 杂草开始影响产量的阈值
export const WEED_GROWTH_BASE = 2;             // 杂草基础生长速率
export const WEED_REMOVE_AMOUNT = 20;          // 每次除草减少

// NPC 自动劳作阈值
export const NPC_WATER_THRESHOLD = 50;         // NPC 自动浇水的水分阈值
export const NPC_WEED_THRESHOLD = 50;          // NPC 自动除草的杂草阈值
export const NPC_FERTILITY_THRESHOLD = 50;     // NPC 自动施肥的肥力阈值

// 冬天冻害
export const WINTER_FREEZE_CHANCE = 0.1;

// 缺水枯萎
export const DRY_WITHER_CHANCE = 0.02;

// ====== 灵草系统 ======
export const SPIRIT_AURA_INITIAL_MIN = 30;    // 地块初始灵气最小值
export const SPIRIT_AURA_INITIAL_RANGE = 40;  // 地块初始灵气随机范围
export const SPIRIT_AURA_REGEN_RATE = 0.2;    // 每 tick 灵气自然恢复（空地更快）
export const SPIRIT_AURA_REGEN_IDLE = 0.5;    // 空置地块灵气恢复（每 tick）
export const SPIRIT_AURA_MAX = 100;
export const SPIRIT_AURA_MIN = 0;
// 灵气不足时草药停止生长的阈值
export const SPIRIT_AURA_LOW_THRESHOLD = 20;

// 灵蛊（草药专属病害，比普通虫害难处理）
export const SPIRIT_BUG_SPAWN_CHANCE = 0.005;      // 每 tick 出现概率（略低于普通虫害）
export const SPIRIT_BUG_INITIAL_SEVERITY_MIN = 4;
export const SPIRIT_BUG_INITIAL_SEVERITY_RANGE = 4;
export const SPIRIT_BUG_YIELD_PENALTY = 0.08;      // 灵蛊出现立即减产（比普通虫害重）
export const SPIRIT_BUG_TICK_RATE = 0.004;         // 灵蛊每 tick 持续减产

// 草药品质判定加成（基于灵气值的品质权重乘数）
export const HERB_QUALITY_AURA_BONUS = 0.8;   // 灵气每+10点，品质权重整体上移系数
// NPC 灵气补充阈值（低于此值时 NPC 会优先补充灵气）
export const NPC_SPIRIT_AURA_THRESHOLD = 40;

// ====== 招募系统 ======
// 农民队长去附近村庄招募普通农民
export const RECRUIT_TICKS = 30;              // 招募耗时：3天 = 30 tick
export const RECRUIT_FOOD_COST = 10;          // 每次招募消耗食物（路费+饭钱）
export const RECRUIT_POOL_MAX = 3;            // 村庄可招募上限（招完需等待刷新）
export const RECRUIT_POOL_REFRESH_TICKS = 100;// 招募池刷新：10天 = 100 tick

// ====== 灵田升级系统 ======
// 灵田类型
export const PLOT_TYPE_NORMAL  = 'normal';   // 普通农田
export const PLOT_TYPE_SPIRIT  = 'spirit';   // 灵田

// 灵田等级上限
export const SPIRIT_PLOT_MAX_LEVEL = 3;

// 各等级升级所需材料（从 level-1 升到 level）
// material = { category, itemId, name, amount }
export const SPIRIT_PLOT_UPGRADE_COSTS = {
  1: [  // 普通田 → 灵田1级
    { category: 'material', itemId: 'lumber', name: '木材', amount: 20 },
    { category: 'material', itemId: 'stone',  name: '石材', amount: 10 },
  ],
  2: [  // 灵田1级 → 2级
    { category: 'material', itemId: 'lumber', name: '木材', amount: 40 },
    { category: 'material', itemId: 'stone',  name: '石材', amount: 30 },
    { category: 'mineral',  itemId: 'iron_ore', name: '铁矿石', amount: 5 },
  ],
  3: [  // 灵田2级 → 3级
    { category: 'material', itemId: 'lumber', name: '木材', amount: 80 },
    { category: 'material', itemId: 'stone',  name: '石材', amount: 60 },
    { category: 'mineral',  itemId: 'iron_ore', name: '铁矿石', amount: 15 },
    { category: 'mineral',  itemId: 'spirit_stone', name: '灵石', amount: 5 },
  ],
};

// 灵田等级效果（index 0 = 普通田，1-3 = 灵田1-3级）
// auraRegenMultiplier: 灵气回复速率乘数（基于 SPIRIT_AURA_REGEN_RATE）
// auraRegenIdleMultiplier: 空置灵气回复乘数
// spiritCostReduction: 灵草灵气消耗减免（0 = 不减免，0.3 = 减少30%）
// herbYieldBonus: 灵草产量加成（0.1 = +10%）
// spiritBugReduction: 灵蛊出现概率减免（0 = 不减免，0.3 = 减少30%）
export const SPIRIT_PLOT_LEVEL_BONUSES = {
  0: { auraRegenMul: 1.0, auraRegenIdleMul: 1.0, spiritCostReduction: 0,    herbYieldBonus: 0,    spiritBugReduction: 0    },
  1: { auraRegenMul: 2.0, auraRegenIdleMul: 2.0, spiritCostReduction: 0,    herbYieldBonus: 0.1,  spiritBugReduction: 0.2  },
  2: { auraRegenMul: 3.0, auraRegenIdleMul: 2.5, spiritCostReduction: 0.15, herbYieldBonus: 0.2,  spiritBugReduction: 0.4  },
  3: { auraRegenMul: 5.0, auraRegenIdleMul: 3.5, spiritCostReduction: 0.3,  herbYieldBonus: 0.35, spiritBugReduction: 0.6  },
};
