/**
 * 招募候选人背景系统 - 路灯计划
 *
 * 不同来源的候选人有不同的：
 * - 属性倾向（村庄人壮但笨，城市人聪明但弱）
 * - 薪资要求（村庄人要钱，城市人要闲）
 * - 特质概率（不同背景出不同特质）
 * - 解锁条件（需要知客等级/建筑才能招募城市人）
 */

// 候选人背景定义
export const RECRUIT_BACKGROUNDS = {
  // ====== 村庄（默认，一开始就能招） ======
  village_farmer: {
    id: 'village_farmer',
    name: '村民',
    icon: '🏘️',
    description: '朴实的农民，力气大但见识少',
    unlockCondition: null,
    weight: 40,
    attributes: {
      constitution: { min: 40, max: 80 },
      learning: { min: 10, max: 40 },
      focus: { min: 20, max: 60 },
    },
    // 期望月薪（银两，明朝参考：农夫约0.5-1两/月）
    salaryDemand: { min: 0.5, max: 1.5 },
    maxWorkHours: 14,
    traitWeights: {
      peasant: 50,
      hunter: 15,
      fisherman: 10,
      vagrant: 15,
      orphan: 10,
    },
    generalTraitChance: 0.3,
    moodFactors: {
      salaryImportant: 0.8,
      hoursImportant: 0.2,
    },
  },
  village_worker: {
    id: 'village_worker',
    name: '村工',
    icon: '⛏️',
    description: '干过矿工/铁匠的壮劳力',
    unlockCondition: null,
    weight: 20,
    attributes: {
      constitution: { min: 50, max: 90 },
      learning: { min: 5, max: 30 },
      focus: { min: 15, max: 45 },
    },
    // 期望月薪（明朝参考：工匠约1-2两/月）
    salaryDemand: { min: 1, max: 2.5 },
    maxWorkHours: 16,
    traitWeights: {
      miner: 30,
      blacksmith: 20,
      hunter: 15,
      peasant: 20,
      vagrant: 15,
    },
    generalTraitChance: 0.25,
    moodFactors: {
      salaryImportant: 0.7,
      hoursImportant: 0.3,
    },
  },

  // ====== 城镇（知客Lv1+解锁） ======
  city_youth: {
    id: 'city_youth',
    name: '城镇青年',
    icon: '🧑',
    description: '见过世面的年轻人，注重生活质量',
    unlockCondition: { type: 'hr_level', level: 1 },
    weight: 25,
    attributes: {
      constitution: { min: 25, max: 55 },
      learning: { min: 30, max: 70 },
      focus: { min: 30, max: 65 },
    },
    // 期望月薪（城镇青年要求更高，约2-4两/月）
    salaryDemand: { min: 2, max: 4 },
    maxWorkHours: 10,
    traitWeights: {
      merchant: 20,
      scholar_family: 15,
      fisherman: 10,
      orphan: 10,
      vagrant: 10,
    },
    generalTraitChance: 0.5,
    moodFactors: {
      salaryImportant: 0.5,
      hoursImportant: 0.5,
    },
  },

  city_scholar: {
    id: 'city_scholar',
    name: '城中学子',
    icon: '📖',
    description: '读书人，悟性高但体力差，要求高',
    unlockCondition: { type: 'hr_level', level: 2 },
    weight: 10,
    attributes: {
      constitution: { min: 15, max: 35 },
      learning: { min: 60, max: 95 },
      focus: { min: 50, max: 85 },
    },
    // 期望月薪（读书人要求高，约4-8两/月）
    salaryDemand: { min: 4, max: 8 },
    maxWorkHours: 8,
    traitWeights: {
      scholar_family: 40,
      merchant: 15,
      herb_apprentice: 15,
      fisherman: 5,
      orphan: 5,
    },
    generalTraitChance: 0.7,
    moodFactors: {
      salaryImportant: 0.4,
      hoursImportant: 0.6,
    },
  },

  cultivator: {
    id: 'cultivator',
    name: '修仙散人',
    icon: '✨',
    description: '有一定修为的散修，能力极强但要求苛刻',
    unlockCondition: { type: 'hr_level', level: 3, extra: 'cultivation_unlocked' },
    weight: 5,
    attributes: {
      constitution: { min: 40, max: 70 },
      learning: { min: 70, max: 100 },
      focus: { min: 60, max: 95 },
    },
    // 期望月薪（修仙者要求最高，约8-15两/月）
    salaryDemand: { min: 8, max: 15 },
    maxWorkHours: 8,
    traitWeights: {
      herb_apprentice: 30,
      scholar_family: 20,
      orphan: 15,
      vagrant: 10,
    },
    generalTraitChance: 0.8,
    hasCultivation: true,
    moodFactors: {
      salaryImportant: 0.3,
      hoursImportant: 0.7,
    },
  },
};

/**
 * 根据条件获取可用的招募背景
 */
export function getAvailableBackgrounds(hrLevel, hasCultivation = false) {
  return Object.values(RECRUIT_BACKGROUNDS).filter(bg => {
    if (!bg.unlockCondition) return true;
    if (bg.unlockCondition.type === 'hr_level') {
      if (hrLevel < bg.unlockCondition.level) return false;
      if (bg.unlockCondition.extra === 'cultivation_unlocked' && !hasCultivation) return false;
    }
    return true;
  });
}

/**
 * 按权重随机选择背景
 */
export function rollBackground(hrLevel, hasCultivation = false) {
  const available = getAvailableBackgrounds(hrLevel, hasCultivation);
  const totalWeight = available.reduce((s, bg) => s + bg.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const bg of available) {
    roll -= bg.weight;
    if (roll <= 0) return bg;
  }
  return available[available.length - 1];
}

/**
 * 根据背景生成候选人属性
 */
export function generateCandidateAttributes(background) {
  const attrs = {};
  for (const [key, range] of Object.entries(background.attributes)) {
    attrs[key] = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
  }
  return attrs;
}

/**
 * 根据背景生成薪资要求
 */
export function generateSalaryDemand(background) {
  return background.salaryDemand.min + Math.floor(Math.random() * (background.salaryDemand.max - background.salaryDemand.min + 1));
}

/**
 * 计算候选人对给定薪资/工时的满意度 (0-100)
 */
export function calculateSatisfaction(background, offeredSalary, workHours) {
  const salaryScore = Math.min(100, (offeredSalary / background.salaryDemand.max) * 100);
  const hoursScore = Math.min(100, ((background.maxWorkHours - workHours + 8) / background.maxWorkHours) * 100);

  const { salaryImportant, hoursImportant } = background.moodFactors;
  const total = salaryImportant + hoursImportant;

  return Math.round((salaryScore * salaryImportant + hoursScore * hoursImportant) / total);
}
