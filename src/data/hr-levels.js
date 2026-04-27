/**
 * 知客等级（HR等级）定义 - 路灯计划
 *
 * NPC干活积累经验，提升知客等级。
 * 等级越高，招募时能看到的候选人信息越多。
 */

// 等级 → 经验阈值
export const HR_LEVEL_THRESHOLDS = [
  { level: 1, exp: 0,    name: '初识',   icon: '🌱', description: '刚来不久，只能看到基本信息' },
  { level: 2, exp: 100,  name: '熟络',   icon: '🌿', description: '相熟了一些，可以看出身来历' },
  { level: 3, exp: 300,  name: '精明',   icon: '🎋', description: '阅人不少，能看出通用特质' },
  { level: 4, exp: 600,  name: '老练',   icon: '🌳', description: '见多识广，能看出性格优缺点' },
  { level: 5, exp: 1000, name: '伯乐',   icon: '🏆', description: '慧眼识人，能看出隐藏潜力' },
];

/**
 * 根据经验值获取当前等级信息
 */
export function getHRLevel(exp) {
  let current = HR_LEVEL_THRESHOLDS[0];
  for (const lv of HR_LEVEL_THRESHOLDS) {
    if (exp >= lv.exp) current = lv;
    else break;
  }
  return current;
}

/**
 * 获取到下一级的进度百分比 (0~1)，满级返回 1
 */
export function getHRLevelProgress(exp) {
  const current = getHRLevel(exp);
  const currentIdx = HR_LEVEL_THRESHOLDS.findIndex(lv => lv.level === current.level);
  if (currentIdx >= HR_LEVEL_THRESHOLDS.length - 1) return 1;

  const next = HR_LEVEL_THRESHOLDS[currentIdx + 1];
  const range = next.exp - current.exp;
  if (range <= 0) return 1;
  return Math.min(1, (exp - current.exp) / range);
}

// ====== 等级解锁的招募可见性 ======
// 等级1：性别、年龄、外貌（默认可见）
// 等级2：+ 出身（originTrait）
// 等级3：+ 通用特质名称（generalTraits 的 name/icon）
// 等级4：+ 特质描述（description）
// 等级5：+ 特质效果提示（effects 概括）

/**
 * 根据HR等级判断招募时候选人的信息可见性
 * @param {number} hrLevel - 知客等级 1-5
 * @returns {{ showOrigin: boolean, showTraits: boolean, showTraitDesc: boolean, showTraitEffects: boolean }}
 */
export function getRecruitVisibility(hrLevel) {
  return {
    showOrigin: hrLevel >= 2,         // 等级2+：看出身
    showTraits: hrLevel >= 3,         // 等级3+：看通用特质名称
    showTraitDesc: hrLevel >= 4,       // 等级4+：看特质描述
    showTraitEffects: hrLevel >= 5,    // 等级5+：看特质效果提示
  };
}
