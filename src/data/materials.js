/**
 * 矿石/材料定义 - 路灯计划
 *
 * 矿工开采 → 炼铁匠冶炼 → 产出可用金属
 */

// 矿脉定义（矿工开采的目标）
export const ORE_VEINS = {
  iron_vein: {
    id: 'iron_vein',
    name: '铁矿脉',
    icon: '🪨',
    baseYield: { min: 2, max: 5 },
    depletionRate: 0.08,      // 每次开采消耗耐久
    respawnRate: 0.02,        // 每tick自然恢复
    maxDurability: 100,
    requiredTool: 'pickaxe',  // 需要镐子
    dangerLevel: 1,           // 危险等级（影响事故概率）
  },
  copper_vein: {
    id: 'copper_vein',
    name: '铜矿脉',
    icon: '🟤',
    baseYield: { min: 3, max: 6 },
    depletionRate: 0.05,
    respawnRate: 0.03,
    maxDurability: 120,
    requiredTool: 'pickaxe',
    dangerLevel: 0,
  },
  coal_vein: {
    id: 'coal_vein',
    name: '煤矿脉',
    icon: '⚫',
    baseYield: { min: 4, max: 8 },
    depletionRate: 0.04,
    respawnRate: 0.04,
    maxDurability: 150,
    requiredTool: 'pickaxe',
    dangerLevel: 2,           // 煤矿危险（瓦斯）
  },
  spirit_stone_vein: {
    id: 'spirit_stone_vein',
    name: '灵石矿脉',
    icon: '💎',
    baseYield: { min: 1, max: 2 },
    depletionRate: 0.15,
    respawnRate: 0.01,
    maxDurability: 60,
    requiredTool: 'spirit_pickaxe',
    dangerLevel: 3,
  },
};

// 原矿定义（开采获得）
export const RAW_ORES = {
  iron_ore: {
    id: 'iron_ore',
    name: '铁矿石',
    icon: '🪨',
    category: 'mineral',
    smeltYield: 'iron_ingot',    // 冶炼产出
    smeltTime: 2,                // 冶炼需要2个周期
    smeltFuelCost: 1,            // 消耗燃料
  },
  copper_ore: {
    id: 'copper_ore',
    name: '铜矿石',
    icon: '🟤',
    category: 'mineral',
    smeltYield: 'copper_ingot',
    smeltTime: 1,
    smeltFuelCost: 1,
  },
  coal: {
    id: 'coal',
    name: '煤炭',
    icon: '⚫',
    category: 'fuel',           // 燃料，不是冶炼原料
    fuelValue: 2,                // 每单位煤炭提供2点燃料
  },
  spirit_stone_ore: {
    id: 'spirit_stone_ore',
    name: '灵石原矿',
    icon: '💎',
    category: 'mineral',
    smeltYield: 'spirit_stone',
    smeltTime: 4,
    smeltFuelCost: 2,
  },
};

// 冶炼产出（炼铁匠产出）
export const SMELTED_PRODUCTS = {
  iron_ingot: {
    id: 'iron_ingot',
    name: '铁锭',
    icon: '🔩',
    category: 'mineral',
    sellPrice: 30,
  },
  copper_ingot: {
    id: 'copper_ingot',
    name: '铜锭',
    icon: '🟠',
    category: 'mineral',
    sellPrice: 20,
  },
  spirit_stone: {
    id: 'spirit_stone',
    name: '灵石',
    icon: '💎',
    category: 'mineral',
    sellPrice: 100,
  },
};

// 草药材料定义
export const HERB_MATERIALS = {
  herb_root: {
    id: 'herb_root',
    name: '草药根',
    icon: '🌱',
    category: 'herb',
    prepTime: 1,               // 分拣需要1个周期
    qualityDecay: 0.02,        // 每tick品质下降
  },
  herb_leaf: {
    id: 'herb_leaf',
    name: '草药叶',
    icon: '🍃',
    category: 'herb',
    prepTime: 1,
    qualityDecay: 0.03,
  },
  herb_flower: {
    id: 'herb_flower',
    name: '草药花',
    icon: '🌸',
    category: 'herb',
    prepTime: 2,               // 花更精细，需要更长时间
    qualityDecay: 0.04,
  },
  herb_mineral: {
    id: 'herb_mineral',
    name: '矿石粉',
    icon: '✨',
    category: 'herb',
    prepTime: 1,
    qualityDecay: 0.01,
  },
};

// 加工后的草药材料（药童产出）
export const PREPARED_HERBS = {
  herb_root_prepared: {
    id: 'herb_root_prepared',
    name: '处理好的草药根',
    icon: '🌱',
    category: 'herb',
    quality: 'normal',
  },
  herb_leaf_prepared: {
    id: 'herb_leaf_prepared',
    name: '处理好的草药叶',
    icon: '🍃',
    category: 'herb',
    quality: 'normal',
  },
  herb_flower_prepared: {
    id: 'herb_flower_prepared',
    name: '处理好的草药花',
    icon: '🌸',
    category: 'herb',
    quality: 'normal',
  },
  herb_mineral_prepared: {
    id: 'herb_mineral_prepared',
    name: '精磨矿石粉',
    icon: '✨',
    category: 'herb',
    quality: 'normal',
  },
};

// 丹药定义（炼丹师产出）
export const PILL_RECIPES = {
  pill_heal: {
    id: 'pill_heal',
    name: '治愈丹',
    icon: '💊',
    category: 'herb',
    ingredients: [
      { id: 'herb_root_prepared', amount: 2 },
      { id: 'herb_leaf_prepared', amount: 1 },
    ],
    craftTime: 3,
    baseQuality: 'normal',
    effects: { mood: 15 },
  },
  pill_buff: {
    id: 'pill_buff',
    name: '增益丹',
    icon: '🧪',
    category: 'herb',
    ingredients: [
      { id: 'herb_flower_prepared', amount: 2 },
      { id: 'herb_mineral_prepared', amount: 1 },
    ],
    craftTime: 4,
    baseQuality: 'normal',
    effects: { efficiency: 0.2, duration: 3 },
  },
  pill_fortune: {
    id: 'pill_fortune',
    name: '幸运丹',
    icon: '🍀',
    category: 'herb',
    ingredients: [
      { id: 'herb_root_prepared', amount: 1 },
      { id: 'herb_flower_prepared', amount: 2 },
      { id: 'herb_mineral_prepared', amount: 1 },
    ],
    craftTime: 5,
    baseQuality: 'rare',
    effects: { luck: 0.3, duration: 5 },
  },
};

// 工具定义
export const TOOLS = {
  pickaxe: {
    id: 'pickaxe',
    name: '铁镐',
    icon: '⛏️',
    durability: 100,
    repairCost: { iron_ingot: 2 },
    miningBonus: 1.0,
  },
  spirit_pickaxe: {
    id: 'spirit_pickaxe',
    name: '灵镐',
    icon: '⛏️',
    durability: 80,
    repairCost: { spirit_stone: 1, iron_ingot: 3 },
    miningBonus: 1.5,
  },
};
