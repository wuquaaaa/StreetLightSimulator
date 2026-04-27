/**
 * 农作物定义 - 路灯计划
 *
 * category:
 *   'food'  — 普通粮食/蔬果，入仓后用于人口消耗
 *   'herb'  — 灵草药材，入仓后保留品质信息，用于炼丹
 *
 * 灵草专属字段：
 *   isHerb: true          — 是否为灵草（影响 FarmSystem 计算逻辑）
 *   spiritCost: 每 tick 消耗的灵气值
 *   qualityWeights: { poor, low, medium, high, supreme }  — 品质权重基础值
 */

export const CROPS = [
  // ============================================================
  // 食物类
  // ============================================================
  {
    id: 'wheat',
    name: '小麦',
    description: '最基础的粮食作物，适应性强',
    category: 'food',
    harvestItem: 'wheat',
    seedId: 'wheat_seed',
    seedName: '小麦种子',
    seedCost: 1,
    growthTime: 3,    // 天（仅描述用，实际由 growthProgress 控制）
    baseYield: 16,
    season: ['春', '夏', '秋'],
    icon: '🌾',
    isHerb: false,
  },
  {
    id: 'corn',
    name: '玉米',
    description: '夏季高产作物，耗水量大但产量丰厚',
    category: 'food',
    harvestItem: 'corn',
    seedId: 'corn_seed',
    seedName: '玉米种子',
    seedCost: 1,
    growthTime: 5,
    baseYield: 28,
    season: ['夏'],
    icon: '🌽',
    // 特性：生长速度较慢（growthPerTick 修正在 FarmSystem 通过 growthTimeMod 实现）
    growthTimeMod: 1.6,   // 生长需要更多 tick
    waterCostMod: 1.4,    // 蒸发更快（耗水）
    isHerb: false,
  },
  {
    id: 'turnip',
    name: '萝卜',
    description: '秋冬皆可种植，生长迅速，适合补仓',
    category: 'food',
    harvestItem: 'turnip',
    seedId: 'turnip_seed',
    seedName: '萝卜种子',
    seedCost: 1,
    growthTime: 2,
    baseYield: 10,
    season: ['秋', '冬'],
    icon: '🥕',
    growthTimeMod: 0.7,   // 生长更快
    isHerb: false,
  },

  // ============================================================
  // 灵草类（isHerb: true）
  // ============================================================
  {
    id: 'spirit_grass',
    name: '灵草',
    description: '最基础的修炼草药，生命力顽强，四季皆可种植',
    category: 'herb',
    harvestItem: 'spirit_grass',
    seedId: 'spirit_grass_seed',
    seedName: '灵草种子',
    seedCost: 1,
    growthTime: 5,
    baseYield: 6,
    season: ['春', '夏', '秋', '冬'],
    icon: '🌿',
    isHerb: true,
    spiritCost: 0.3,       // 每 tick 消耗灵气
    // 品质权重（灵气充足 + 无病害 时各等级基础概率）
    qualityWeights: { poor: 10, low: 50, medium: 30, high: 9, supreme: 1 },
    rarity: 1,             // 稀有度（1-5）
  },
  {
    id: 'blood_lotus',
    name: '血莲',
    description: '需要大量水分滋养，水分低于80时停止生长',
    category: 'herb',
    harvestItem: 'blood_lotus',
    seedId: 'blood_lotus_seed',
    seedName: '血莲种子',
    seedCost: 1,
    growthTime: 8,
    baseYield: 4,
    season: ['春', '夏'],
    icon: '🪷',
    isHerb: true,
    spiritCost: 0.5,
    waterRequirement: 80,   // 水分低于此值则停止生长（特殊规则）
    qualityWeights: { poor: 5, low: 35, medium: 40, high: 16, supreme: 4 },
    rarity: 2,
  },
  {
    id: 'frost_flower',
    name: '霜花',
    description: '秋冬独有，寒意越盛越旺，夏季无法种植',
    category: 'herb',
    harvestItem: 'frost_flower',
    seedId: 'frost_flower_seed',
    seedName: '霜花种子',
    seedCost: 1,
    growthTime: 6,
    baseYield: 5,
    season: ['秋', '冬'],
    icon: '❄️',
    isHerb: true,
    spiritCost: 0.4,
    winterBonus: true,      // 冬天生长速度加成
    qualityWeights: { poor: 5, low: 30, medium: 40, high: 20, supreme: 5 },
    rarity: 2,
  },
  {
    id: 'sky_root',
    name: '天根草',
    description: '极其敏感的稀有灵草，需要极高肥力才能生长',
    category: 'herb',
    harvestItem: 'sky_root',
    seedId: 'sky_root_seed',
    seedName: '天根草种子',
    seedCost: 2,
    growthTime: 12,
    baseYield: 3,
    season: ['春', '秋'],
    icon: '🌱',
    isHerb: true,
    spiritCost: 0.8,
    fertilityRequirement: 80, // 肥力低于此值则生长速率减半
    qualityWeights: { poor: 2, low: 18, medium: 35, high: 30, supreme: 15 },
    rarity: 3,
  },
];

// 品质等级定义（供 FarmSystem 和 UI 使用）
export const HERB_QUALITY = {
  poor:    { id: 'poor',    label: '残次', color: 'text-stone-400',  bg: 'bg-stone-700/50',   icon: '⬜' },
  low:     { id: 'low',     label: '下品', color: 'text-green-400',  bg: 'bg-green-900/40',   icon: '🟢' },
  medium:  { id: 'medium',  label: '中品', color: 'text-blue-400',   bg: 'bg-blue-900/40',    icon: '🔵' },
  high:    { id: 'high',    label: '上品', color: 'text-yellow-400', bg: 'bg-yellow-900/40',  icon: '🟡' },
  supreme: { id: 'supreme', label: '极品', color: 'text-red-400',    bg: 'bg-red-900/40',     icon: '🔴' },
};

// 按分类分组（供 UI 使用）
export const FOOD_CROPS = CROPS.filter(c => c.category === 'food');
export const HERB_CROPS  = CROPS.filter(c => c.isHerb);
