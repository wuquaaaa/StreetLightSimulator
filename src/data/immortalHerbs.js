/**
 * 仙草定义 - 路灯计划
 *
 * 仙草是比灵草更稀有的修炼材料：
 * - 稀有度 4-5（灵草是 1-3）
 * - 种植条件更苛刻（灵气浓度/季节/特殊灌溉）
 * - 生长周期更长（20-50天）
 * - 用于修炼仙法和炼制仙丹
 *
 * 仙草专属机制：
 * - 灵气需求更高（低于阈值停止生长）
 * - 品质受灵气均值影响更大
 * - 部分仙草需要"丹液灌溉"才能发芽
 * - 收获后有概率获得种子（可再种）
 */

export const IMMORTAL_HERBS = {
  // ====== 稀有度 4 ======
  moonvine: {
    id: 'moonvine',
    name: '月藤',
    icon: '🌙',
    description: '只在月光下生长的藤蔓，需要夜间灵气充沛',
    rarity: 4,
    category: 'immortal_herb',
    harvestItem: 'moonvine',
    seedId: 'moonvine_seed',
    seedName: '月藤种子',
    seedCost: 1,
    growthTime: 25,          // 25天生长期
    baseYield: 3,
    season: ['秋', '冬'],    // 秋冬生长更好
    spiritCost: 1.2,         // 每tick消耗灵气（灵草的3-4倍）
    spiritAuraMin: 60,       // 灵气低于此值停止生长
    fertilityRequirement: 70,
    qualityWeights: { poor: 2, low: 15, medium: 35, high: 35, supreme: 13 },
    seedDropChance: 0.15,    // 收获时15%概率获得种子
    cultivationReq: 'spirit_gardening',  // 需要灵植术才能种植
    description: '藤身银白，叶片如月牙，夜间散发微光',
  },
  firelotus: {
    id: 'firelotus',
    name: '火莲',
    icon: '🔥',
    description: '生长在火山口附近的莲花，需要极高温度',
    rarity: 4,
    category: 'immortal_herb',
    harvestItem: 'firelotus',
    seedId: 'firelotus_seed',
    seedName: '火莲种子',
    seedCost: 1,
    growthTime: 30,
    baseYield: 2,
    season: ['夏'],           // 只有夏天能种
    spiritCost: 1.5,
    spiritAuraMin: 50,
    temperatureReq: 'hot',   // 需要"高温"环境（夏天自然满足）
    qualityWeights: { poor: 3, low: 18, medium: 38, high: 30, supreme: 11 },
    seedDropChance: 0.1,
    cultivationReq: 'spirit_focus',
    description: '花瓣赤红如焰，触之微烫，散发灼热灵气',
  },
  voidmoss: {
    id: 'voidmoss',
    name: '虚空苔',
    icon: '🕳️',
    description: '生长在虚空裂缝中的苔藓，需要极高灵气',
    rarity: 4,
    category: 'immortal_herb',
    harvestItem: 'voidmoss',
    seedId: 'voidmoss_seed',
    seedName: '虚空苔种子',
    seedCost: 1,
    growthTime: 20,
    baseYield: 4,
    season: ['春', '夏', '秋', '冬'],  // 四季可种
    spiritCost: 2.0,          // 极高灵气消耗
    spiritAuraMin: 80,        // 灵气80以上才能生长
    qualityWeights: { poor: 5, low: 20, medium: 40, high: 25, supreme: 10 },
    seedDropChance: 0.12,
    cultivationReq: 'spirit_focus',
    description: '通体半透明，仿佛来自另一个世界',
  },

  // ====== 稀有度 5 ======
  heavenfruit: {
    id: 'heavenfruit',
    name: '天结果',
    icon: '🌳',
    description: '传说中天界掉落的果实种子，需要百年灵气滋养',
    rarity: 5,
    category: 'immortal_herb',
    harvestItem: 'heavenfruit',
    seedId: 'heavenfruit_seed',
    seedName: '天结果种子',
    seedCost: 2,
    growthTime: 50,           // 极长生长期
    baseYield: 1,             // 极低产量
    season: ['春'],           // 只有春天
    spiritCost: 3.0,          // 极高灵气消耗
    spiritAuraMin: 90,        // 几乎需要满灵气
    fertilityRequirement: 90,
    qualityWeights: { poor: 1, low: 8, medium: 25, high: 40, supreme: 26 },
    seedDropChance: 0.05,     // 极低种子掉落
    cultivationReq: 'spirit_focus',
    legendaryReq: true,       // 需要"传说"级别的研究才能种植
    description: '果实金光流转，蕴含天地造化之力',
  },
  dragonblood_grass: {
    id: 'dragonblood_grass',
    name: '龙血草',
    icon: '🐉',
    description: '传说是龙血滴落处长出的草药，需要特殊丹液灌溉',
    rarity: 5,
    category: 'immortal_herb',
    harvestItem: 'dragonblood_grass',
    seedId: 'dragonblood_grass_seed',
    seedName: '龙血草种子',
    seedCost: 2,
    growthTime: 40,
    baseYield: 1,
    season: ['夏', '秋'],
    spiritCost: 2.5,
    spiritAuraMin: 75,
    requiresElixir: true,     // 需要丹液灌溉（消耗治愈丹/增益丹）
    qualityWeights: { poor: 2, low: 10, medium: 30, high: 38, supreme: 20 },
    seedDropChance: 0.08,
    cultivationReq: 'spirit_focus',
    description: '草叶殷红如血，散发龙威气息',
  },
};

// 仙草品质等级（与灵草共用品质系统，但显示不同）
export const IMMORTAL_HERB_QUALITY = {
  poor:    { id: 'poor',    label: '凡品', color: 'text-stone-400',  bg: 'bg-stone-700/50',   icon: '⬜', valueMod: 0.3 },
  low:     { id: 'low',     label: '灵品', color: 'text-green-400',  bg: 'bg-green-900/40',   icon: '🟢', valueMod: 0.6 },
  medium:  { id: 'medium',  label: '宝品', color: 'text-blue-400',   bg: 'bg-blue-900/40',    icon: '🔵', valueMod: 1.0 },
  high:    { id: 'high',    label: '仙品', color: 'text-yellow-400', bg: 'bg-yellow-900/40',  icon: '🟡', valueMod: 1.8 },
  supreme: { id: 'supreme', label: '神品', color: 'text-red-400',    bg: 'bg-red-900/40',     icon: '🔴', valueMod: 3.0 },
};

// 仙草种植条件
export const CULTIVATION_CONDITIONS = {
  hot: { name: '高温', icon: '🌡️', description: '需要炎热环境（夏季自然满足）' },
  cold: { name: '极寒', icon: '❄️', description: '需要寒冷环境（冬季自然满足）' },
  spirit_rain: { name: '灵气雨', icon: '🌧️', description: '需要灵气雨灌溉（特殊天气事件）' },
  moonlight: { name: '月光', icon: '🌙', description: '需要月光照射（夜间灵气充足时自动满足）' },
};

/**
 * 获取仙草信息
 */
export function getImmortalHerbInfo(herbId) {
  return IMMORTAL_HERBS[herbId] || null;
}

/**
 * 获取所有仙草列表
 */
export function getAllImmortalHerbs() {
  return Object.values(IMMORTAL_HERBS);
}

/**
 * 按稀有度获取仙草
 */
export function getImmortalHerbsByRarity(rarity) {
  return Object.values(IMMORTAL_HERBS).filter(h => h.rarity === rarity);
}
