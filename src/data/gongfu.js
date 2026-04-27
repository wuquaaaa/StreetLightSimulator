/**
 * 功法（技术）定义 - 司务堂功法帖
 *
 * 核心设计：
 * - 功法不是全局 buff，而是 NPC 个人技能
 * - NPC 学习后绑定到个人，只对他负责的地块生效
 * - 退休后失效（功法记录随NPC离开而消失）
 * - 新员工学习需要时间，有老员工（已学会该功法）在场时加速
 */

export const GONGFU = {
  tilling: {
    id: 'tilling',
    name: '翻土诀',
    icon: '🪣',
    description: '改良翻地手法，提升耕种速度',
    category: 'farming',
    researchCost: 3,           // 研究需要 3 天
    learnTime: 5,              // 学习需要 5 天（NPC）
    mentorBonus: 0.4,          // 有导师时学习速度 +40%
    effect: {
      type: 'farm_speed',
      value: 0.2,              // +20% 耕种速度
    },
    requires: [],              // 无前置
  },
  fertilizing: {
    id: 'fertilizing',
    name: '施肥术',
    icon: '🌿',
    description: '精准施肥，提升肥效利用率',
    category: 'farming',
    researchCost: 5,
    learnTime: 7,
    mentorBonus: 0.35,
    effect: {
      type: 'fertilize_efficiency',
      value: 0.3,              // +30% 施肥效率
    },
    requires: [],
  },
  pest_control: {
    id: 'pest_control',
    name: '驱虫阵',
    icon: '🛡',
    description: '布置驱虫阵法，降低虫害概率',
    category: 'farming',
    researchCost: 5,
    learnTime: 8,
    mentorBonus: 0.3,
    effect: {
      type: 'pest_resistance',
      value: 0.25,             // 虫害概率 -25%
    },
    requires: ['tilling'],
  },
  spirit_gardening: {
    id: 'spirit_gardening',
    name: '灵植术',
    icon: '✨',
    description: '操控灵气滋养灵草，提升灵气回复',
    category: 'herbalism',
    researchCost: 8,
    learnTime: 12,
    mentorBonus: 0.3,
    effect: {
      type: 'spirit_regen',
      value: 0.15,             // 灵气回复 +15%
    },
    requires: ['tilling'],
  },
  greenhouse: {
    id: 'greenhouse',
    name: '四季棚',
    icon: '🏠',
    description: '搭建灵气温室，冬季作物不受冻害',
    category: 'farming',
    researchCost: 10,
    learnTime: 15,
    mentorBonus: 0.25,
    effect: {
      type: 'winter_protection',
      value: 1.0,              // 冬季冻害免疫
    },
    requires: ['fertilizing'],
  },
  advanced_breeding: {
    id: 'advanced_breeding',
    name: '良种培育',
    icon: '🌱',
    description: '选育优良品种，提升作物产量',
    category: 'farming',
    researchCost: 12,
    learnTime: 18,
    mentorBonus: 0.25,
    effect: {
      type: 'yield_bonus',
      value: 0.15,             // 产量 +15%
    },
    requires: ['fertilizing', 'pest_control'],
  },
};

/**
 * 获取功法信息
 */
export function getGongfuInfo(gongfuId) {
  return GONGFU[gongfuId] || null;
}

/**
 * 获取所有功法列表
 */
export function getAllGongfu() {
  return Object.values(GONGFU);
}

/**
 * 获取分类下的功法
 */
export function getGongfuByCategory(category) {
  return Object.values(GONGFU).filter(g => g.category === category);
}

/**
 * 检查功法是否可以研究（前置已研究）
 */
export function canResearch(gongfuId, researchedSet) {
  const gongfu = GONGFU[gongfuId];
  if (!gongfu) return false;
  if (researchedSet.has(gongfuId)) return false;
  return gongfu.requires.every(req => researchedSet.has(req));
}
