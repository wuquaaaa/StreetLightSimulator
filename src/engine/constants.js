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
