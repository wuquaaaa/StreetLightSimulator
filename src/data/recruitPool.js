/**
 * 招募候选人背景系统 - 路灯计划
 *
 * 不同来源的候选人有不同的：
 * - 属性倾向（村庄人壮但笨，城市人聪明但弱）
 * - 薪资要求（村庄人要钱，城市人要闲）
 * - 特质概率（不同背景出不同特质）
 * - 解锁条件（需要知客等级/建筑才能招募城市人）
 */

export const RECRUIT_BACKGROUNDS = {
  village_farmer: {
    id: 'village_farmer',
    name: '村民',
    icon: '\u{1F3D8}\uFE0F',
    description: '朴实的农民，力气大但见识少',
    unlockCondition: null,
    weight: 40,
    attributes: {
      constitution: { min: 50, max: 80 },
      learning: { min: 10, max: 35 },
      focus: { min: 25, max: 55 },
      cooperation: { min: 35, max: 65 },
      loyalty: { min: 45, max: 75 },
    },
    salaryDemand: { min: 0.5, max: 1.5 },
    maxWorkHours: 14,
    traitWeights: { peasant: 50, hunter: 15, fisherman: 10, vagrant: 15, orphan: 10 },
    generalTraitChance: 0.3,
    moodFactors: { salaryImportant: 0.8, hoursImportant: 0.2 },
  },
  village_worker: {
    id: 'village_worker',
    name: '村工',
    icon: '\u26CF\uFE0F',
    description: '干过矿工/铁匠的壮劳力',
    unlockCondition: null,
    weight: 20,
    attributes: {
      constitution: { min: 60, max: 90 },
      learning: { min: 5, max: 25 },
      focus: { min: 15, max: 40 },
      cooperation: { min: 25, max: 55 },
      loyalty: { min: 30, max: 60 },
    },
    salaryDemand: { min: 1, max: 2.5 },
    maxWorkHours: 16,
    traitWeights: { miner: 30, blacksmith: 20, hunter: 15, peasant: 20, vagrant: 15 },
    generalTraitChance: 0.25,
    moodFactors: { salaryImportant: 0.7, hoursImportant: 0.3 },
  },
  city_youth: {
    id: 'city_youth',
    name: '城镇青年',
    icon: '\u{1F9D1}',
    description: '见过世面的年轻人，注重生活质量',
    unlockCondition: { type: 'hr_level', level: 1 },
    weight: 25,
    attributes: {
      constitution: { min: 25, max: 50 },
      learning: { min: 35, max: 65 },
      focus: { min: 35, max: 60 },
      cooperation: { min: 30, max: 55 },
      loyalty: { min: 20, max: 50 },
    },
    salaryDemand: { min: 2, max: 4 },
    maxWorkHours: 10,
    traitWeights: { merchant: 20, scholar_family: 15, fisherman: 10, orphan: 10, vagrant: 10 },
    generalTraitChance: 0.5,
    moodFactors: { salaryImportant: 0.5, hoursImportant: 0.5 },
  },
  city_scholar: {
    id: 'city_scholar',
    name: '城中学子',
    icon: '\u{1F4D6}',
    description: '读书人，悟性高但体力差，要求高',
    unlockCondition: { type: 'hr_level', level: 2 },
    weight: 10,
    attributes: {
      constitution: { min: 15, max: 30 },
      learning: { min: 65, max: 95 },
      focus: { min: 55, max: 85 },
      cooperation: { min: 25, max: 50 },
      loyalty: { min: 15, max: 40 },
    },
    salaryDemand: { min: 4, max: 8 },
    maxWorkHours: 8,
    traitWeights: { scholar_family: 40, merchant: 15, herb_apprentice: 15, fisherman: 5, orphan: 5 },
    generalTraitChance: 0.7,
    moodFactors: { salaryImportant: 0.4, hoursImportant: 0.6 },
  },
  cultivator: {
    id: 'cultivator',
    name: '修仙散人',
    icon: '\u2728',
    description: '有一定修为的散修，能力极强但要求苛刻',
    unlockCondition: { type: 'hr_level', level: 3, extra: 'cultivation_unlocked' },
    weight: 5,
    attributes: {
      constitution: { min: 45, max: 70 },
      learning: { min: 70, max: 100 },
      focus: { min: 60, max: 90 },
      cooperation: { min: 15, max: 40 },
      loyalty: { min: 10, max: 30 },
    },
    salaryDemand: { min: 8, max: 15 },
    maxWorkHours: 8,
    traitWeights: { herb_apprentice: 30, scholar_family: 20, orphan: 15, vagrant: 10 },
    generalTraitChance: 0.8,
    hasCultivation: true,
    moodFactors: { salaryImportant: 0.3, hoursImportant: 0.7 },
  },
};

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

export function generateCandidateAttributes(background) {
  const attrs = {};
  const allKeys = ['constitution', 'learning', 'focus', 'cooperation', 'loyalty'];
  for (const key of allKeys) {
    const range = background.attributes[key];
    if (range) {
      attrs[key] = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    } else {
      attrs[key] = 30 + Math.floor(Math.random() * 40);
    }
  }
  return attrs;
}

export function generateSalaryDemand(background) {
  return background.salaryDemand.min + Math.random() * (background.salaryDemand.max - background.salaryDemand.min);
}

export function calculateSatisfaction(background, offeredSalary, workHours) {
  const salaryScore = Math.min(100, (offeredSalary / background.salaryDemand.max) * 100);
  const hoursScore = Math.min(100, ((background.maxWorkHours - workHours + 8) / background.maxWorkHours) * 100);
  const { salaryImportant, hoursImportant } = background.moodFactors;
  const total = salaryImportant + hoursImportant;
  return Math.round((salaryScore * salaryImportant + hoursScore * hoursImportant) / total);
}
