/**
 * 仙法定义 - 路灯计划
 *
 * 仙法是修炼法诀，与功法（农耕技巧）不同：
 * - 功法：影响地块产出，绑定工作地点
 * - 仙法：影响角色属性，绑定角色本人
 *
 * 仙法体系：
 * - 每个NPC可以学习多门仙法（但有精力上限）
 * - 仙法需要悟性+仙草+修炼时间
 * - 仙法有等级（入门→小成→大成→圆满）
 * - 退休后仙法失效（与功法相同）
 *
 * 修炼资源：
 * - 悟性：角色基础属性，影响修炼速度
 * - 仙草：修炼消耗品，品质越高修炼越快
 * - 灵石：通用修炼货币
 * - 修炼时间：每天积累修炼进度
 */

export const IMMORTAL_ARTS = {
  // ====== 基础仙法（稀有度 1-2，较易获得） ======
  body_refining: {
    id: 'body_refining',
    name: '淬体术',
    icon: '💪',
    description: '淬炼肉身，增强体质和耐力',
    rarity: 1,
    category: 'body',
    maxLevel: 4,              // 入门/小成/大成/圆满
    levels: {
      1: { name: '入门', effect: { constitution: 5 }, learnTime: 10, herbCost: 'spirit_grass' },
      2: { name: '小成', effect: { constitution: 12 }, learnTime: 20, herbCost: 'spirit_grass' },
      3: { name: '大成', effect: { constitution: 22 }, learnTime: 35, herbCost: 'moonvine' },
      4: { name: '圆满', effect: { constitution: 35 }, learnTime: 50, herbCost: 'moonvine' },
    },
    requires: [],             // 无前置
    description: '以灵气淬炼筋骨，百病不侵',
  },
  spirit_sight: {
    id: 'spirit_sight',
    name: '灵目术',
    icon: '👁️',
    description: '开启灵眼，增强洞察力和专注力',
    rarity: 1,
    category: 'perception',
    maxLevel: 4,
    levels: {
      1: { name: '入门', effect: { focus: 5 }, learnTime: 10, herbCost: 'spirit_grass' },
      2: { name: '小成', effect: { focus: 12 }, learnTime: 20, herbCost: 'spirit_grass' },
      3: { name: '大成', effect: { focus: 22 }, learnTime: 35, herbCost: 'voidmoss' },
      4: { name: '圆满', effect: { focus: 35 }, learnTime: 50, herbCost: 'voidmoss' },
    },
    requires: [],
    description: '目能视灵气，洞察万物本质',
  },
  spirit_gathering: {
    id: 'spirit_gathering',
    name: '聚灵诀',
    icon: '🔮',
    description: '汇聚天地灵气，提升灵气回复速度',
    rarity: 2,
    category: 'spirit',
    maxLevel: 4,
    levels: {
      1: { name: '入门', effect: { spiritRegen: 0.1 }, learnTime: 15, herbCost: 'spirit_grass' },
      2: { name: '小成', effect: { spiritRegen: 0.25 }, learnTime: 30, herbCost: 'moonvine' },
      3: { name: '大成', effect: { spiritRegen: 0.45 }, learnTime: 45, herbCost: 'voidmoss' },
      4: { name: '圆满', effect: { spiritRegen: 0.7 }, learnTime: 60, herbCost: 'heavenfruit' },
    },
    requires: ['body_refining'],
    description: '引天地灵气入体，源源不绝',
  },

  // ====== 中级仙法（稀有度 3，需要一定基础） ======
  alchemy_mastery: {
    id: 'alchemy_mastery',
    name: '炼丹术',
    icon: '⚗️',
    description: '精通丹道，提升炼丹品质和效率',
    rarity: 3,
    category: 'crafting',
    maxLevel: 4,
    levels: {
      1: { name: '入门', effect: { alchemyBonus: 0.1 }, learnTime: 20, herbCost: 'moonvine' },
      2: { name: '小成', effect: { alchemyBonus: 0.25 }, learnTime: 35, herbCost: 'firelotus' },
      3: { name: '大成', effect: { alchemyBonus: 0.45 }, learnTime: 50, herbCost: 'voidmoss' },
      4: { name: '圆满', effect: { alchemyBonus: 0.7 }, learnTime: 70, herbCost: 'heavenfruit' },
    },
    requires: ['spirit_gathering', 'spirit_sight'],
    description: '丹道通神，炼出的丹药品质非凡',
  },
  herb_sensitivity: {
    id: 'herb_sensitivity',
    name: '草木感应',
    icon: '🌿',
    description: '感应草木灵性，提升药材处理品质',
    rarity: 3,
    category: 'perception',
    maxLevel: 4,
    levels: {
      1: { name: '入门', effect: { herbQuality: 0.1 }, learnTime: 15, herbCost: 'spirit_grass' },
      2: { name: '小成', effect: { herbQuality: 0.25 }, learnTime: 30, herbCost: 'moonvine' },
      3: { name: '大成', effect: { herbQuality: 0.45 }, learnTime: 45, herbCost: 'voidmoss' },
      4: { name: '圆满', effect: { herbQuality: 0.7 }, learnTime: 60, herbCost: 'heavenfruit' },
    },
    requires: ['spirit_sight'],
    description: '一草一木皆有灵，善待之则回报丰',
  },
  earth_tuning: {
    id: 'earth_tuning',
    name: '地脉感应',
    icon: '🌍',
    description: '感应地脉灵气，提升矿脉产出',
    rarity: 3,
    category: 'perception',
    maxLevel: 4,
    levels: {
      1: { name: '入门', effect: { miningBonus: 0.1 }, learnTime: 15, herbCost: 'spirit_grass' },
      2: { name: '小成', effect: { miningBonus: 0.25 }, learnTime: 30, herbCost: 'moonvine' },
      3: { name: '大成', effect: { miningBonus: 0.45 }, learnTime: 45, herbCost: 'voidmoss' },
      4: { name: '圆满', effect: { miningBonus: 0.7 }, learnTime: 60, herbCost: 'heavenfruit' },
    },
    requires: ['body_refining'],
    description: '地脉之中蕴藏天材地宝，善采者富',
  },

  // ====== 高级仙法（稀有度 4-5，极难获得） ======
  heaven_defiance: {
    id: 'heaven_defiance',
    name: '逆天改命',
    icon: '⚡',
    description: '逆天而行，突破凡人极限',
    rarity: 4,
    category: 'advanced',
    maxLevel: 3,
    levels: {
      1: { name: '入门', effect: { allStats: 5 }, learnTime: 40, herbCost: 'firelotus' },
      2: { name: '小成', effect: { allStats: 12 }, learnTime: 70, herbCost: 'heavenfruit' },
      3: { name: '大成', effect: { allStats: 20 }, learnTime: 100, herbCost: 'dragonblood_grass' },
    },
    requires: ['body_refining', 'spirit_gathering', 'spirit_sight'],
    description: '天命可违，我命由我不由天',
  },
  dragon_blood_body: {
    id: 'dragon_blood_body',
    name: '龙血淬体',
    icon: '🐉',
    description: '以龙血草淬体，获得龙族体质',
    rarity: 5,
    category: 'body',
    maxLevel: 3,
    levels: {
      1: { name: '入门', effect: { constitution: 15, maxHP: 20 }, learnTime: 50, herbCost: 'dragonblood_grass' },
      2: { name: '小成', effect: { constitution: 30, maxHP: 50 }, learnTime: 80, herbCost: 'dragonblood_grass' },
      3: { name: '圆满', effect: { constitution: 50, maxHP: 100 }, learnTime: 120, herbCost: 'heavenfruit' },
    },
    requires: ['heaven_defiance'],
    legendaryReq: true,       // 需要传说级研究
    description: '龙血入体，脱胎换骨',
  },
};

// 仙法修炼阶段名称
export const ART_LEVEL_NAMES = {
  1: '入门',
  2: '小成',
  3: '大成',
  4: '圆满',
};

// 仙法分类
export const ART_CATEGORIES = {
  body: { name: '体修', icon: '💪', description: '淬炼肉身，增强体质' },
  perception: { name: '感知', icon: '👁️', description: '增强洞察力和感知能力' },
  spirit: { name: '灵气', icon: '🔮', description: '操控灵气，增强灵力' },
  crafting: { name: '技艺', icon: '⚗️', description: '提升炼丹/锻造等技艺' },
  advanced: { name: '高级', icon: '⚡', description: '突破极限的高深法诀' },
};

/**
 * 获取仙法信息
 */
export function getImmortalArtInfo(artId) {
  return IMMORTAL_ARTS[artId] || null;
}

/**
 * 获取所有仙法列表
 */
export function getAllImmortalArts() {
  return Object.values(IMMORTAL_ARTS);
}

/**
 * 按分类获取仙法
 */
export function getImmortalArtsByCategory(category) {
  return Object.values(IMMORTAL_ARTS).filter(a => a.category === category);
}

/**
 * 按稀有度获取仙法
 */
export function getImmortalArtsByRarity(rarity) {
  return Object.values(IMMORTAL_ARTS).filter(a => a.rarity === rarity);
}

/**
 * 检查仙法是否可以学习（前置已满足）
 */
export function canLearnArt(artId, learnedArts) {
  const art = IMMORTAL_ARTS[artId];
  if (!art) return false;
  return art.requires.every(req => learnedArts.has(req));
}
