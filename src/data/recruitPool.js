/**
 * 招募候选人背景系统 - 路灯计划
 *
 * 属性生成逻辑：
 * - 背景决定属性的"均值倾向"（村民倾向于壮但笨）
 * - 年龄修正：年轻人方差大（什么都有可能），老年人方差小（趋于稳定）
 * - 概率分布：用正态分布生成，不是硬上限
 * - 结果：年轻村民完全可能学习快，年老学子体质也不会太差
 */

// 背景属性倾向（均值 + 标准差）
// 标准差越大，生成的属性越分散（不确定性越高）
const ATTR_TENDENCIES = {
  village_farmer: {
    constitution: { mean: 65, std: 12 },  // 倾向壮
    learning: { mean: 22, std: 10 },       // 倾向笨
    focus: { mean: 40, std: 12 },          // 中等
    cooperation: { mean: 50, std: 12 },    // 中等
    loyalty: { mean: 60, std: 12 },        // 倾向忠诚
  },
  village_worker: {
    constitution: { mean: 75, std: 10 },   // 最壮
    learning: { mean: 15, std: 8 },        // 最笨
    focus: { mean: 28, std: 10 },          // 低
    cooperation: { mean: 40, std: 12 },    // 独来独往
    loyalty: { mean: 45, std: 12 },        // 中等
  },
  city_youth: {
    constitution: { mean: 38, std: 12 },   // 弱
    learning: { mean: 50, std: 12 },       // 中上
    focus: { mean: 48, std: 12 },          // 中等
    cooperation: { mean: 42, std: 12 },    // 较自我
    loyalty: { mean: 35, std: 12 },        // 容易跳槽
  },
  city_scholar: {
    constitution: { mean: 22, std: 8 },    // 最弱
    learning: { mean: 80, std: 10 },       // 最聪明
    focus: { mean: 70, std: 10 },          // 高
    cooperation: { mean: 38, std: 10 },    // 文人相轻
    loyalty: { mean: 28, std: 10 },        // 心高气傲
  },
  cultivator: {
    constitution: { mean: 58, std: 10 },   // 不错
    learning: { mean: 85, std: 8 },        // 极高
    focus: { mean: 75, std: 8 },           // 高
    cooperation: { mean: 28, std: 10 },    // 独来独往
    loyalty: { mean: 20, std: 8 },         // 最不忠诚
  },
};

// 年龄对标准差的修正：年轻人方差大，老年人方差小
function getAgeVarianceModifier(age) {
  if (age < 25) return 1.4;   // 年轻人：不确定性高（天才/庸才都可能）
  if (age < 35) return 1.1;   // 壮年：略高于平均
  if (age < 45) return 0.9;   // 中年：趋于稳定
  return 0.7;                  // 老年：属性基本定型
}

// 正态分布随机数（Box-Muller）
function normalRandom(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.round(mean + z * std);
}

// 背景定义
export const RECRUIT_BACKGROUNDS = {
  village_farmer: {
    id: 'village_farmer',
    name: '村民',
    icon: '\u{1F3D8}\uFE0F',
    description: '朴实的农民，力气大但见识少',
    unlockCondition: null,
    weight: 40,
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

/**
 * 生成候选人属性（概率分布 + 年龄修正）
 * - 背景决定均值倾向
 * - 年龄决定方差（年轻=高方差=什么都有可能）
 * - 正态分布随机生成
 */
export function generateCandidateAttributes(background, age = 25) {
  const tendencies = ATTR_TENDENCIES[background.id] || ATTR_TENDENCIES.village_farmer;
  const ageMod = getAgeVarianceModifier(age);

  const attrs = {};
  for (const [key, { mean, std }] of Object.entries(tendencies)) {
    attrs[key] = Math.max(1, Math.min(100, normalRandom(mean, std * ageMod)));
  }
  return attrs;
}

export function generateSalaryDemand(background) {
  return Math.round((background.salaryDemand.min + Math.random() * (background.salaryDemand.max - background.salaryDemand.min)) * 10) / 10;
}

export function calculateSatisfaction(background, offeredSalary, workHours) {
  const salaryScore = Math.min(100, (offeredSalary / background.salaryDemand.max) * 100);
  const hoursScore = Math.min(100, ((background.maxWorkHours - workHours + 8) / background.maxWorkHours) * 100);
  const { salaryImportant, hoursImportant } = background.moodFactors;
  const total = salaryImportant + hoursImportant;
  return Math.round((salaryScore * salaryImportant + hoursScore * hoursImportant) / total);
}
