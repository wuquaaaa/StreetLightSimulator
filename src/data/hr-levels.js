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
  { level: 3, exp: 500,  name: '伯乐',   icon: '🏆', description: '慧眼识人，能看出特质与潜力' },
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
// 等级3：+ 通用特质（名称 + 描述 + 效果），全部可见

/**
 * 根据HR等级判断招募时候选人的信息可见性
 * @param {number} hrLevel - 知客等级 1-3
 * @returns {{ showOrigin: boolean, showTraits: boolean, showTraitDesc: boolean, showTraitEffects: boolean }}
 */
export function getRecruitVisibility(hrLevel) {
  return {
    showOrigin: hrLevel >= 2,         // 等级2+：看出身
    showTraits: hrLevel >= 3,         // 等级3：看通用特质名称
    showTraitDesc: hrLevel >= 3,       // 等级3：看特质描述
    showTraitEffects: hrLevel >= 3,    // 等级3：看特质效果提示
  };
}

// ====== 招募偏好（NPC出发前询问玩家） ======
// 每个偏好根据知客等级可见，NPC会根据偏好筛选候选人
export const RECRUIT_PREFERENCES = [
  { id: 'any',        label: '随便挑',  desc: '带谁回来都行', minLevel: 1 },
  { id: 'young',      label: '年轻人',  desc: '尽量挑年轻的（30岁以下）', minLevel: 1 },
  { id: 'male',       label: '壮劳力',  desc: '尽量挑身强力壮的男丁', minLevel: 1 },
  { id: 'female',     label: '姑娘',    desc: '尽量挑年轻女子', minLevel: 1 },
  { id: 'good_origin', label: '好出身', desc: '尽量挑出身好的（需要知客 Lv2）', minLevel: 2 },
  { id: 'good_trait',  label: '好特质', desc: '尽量挑有利的特质（需要知客 Lv3）', minLevel: 3 },
];

/**
 * 获取某知客等级可用的招募偏好列表
 */
export function getAvailablePreferences(hrLevel) {
  return RECRUIT_PREFERENCES.filter(p => p.minLevel <= hrLevel);
}

/**
 * NPC根据偏好从候选人池中筛选最佳候选人
 * @param {Array} candidates - 候选人数组
 * @param {string} preferenceId - 偏好ID
 * @returns {number} 推荐的候选人索引
 */
export function pickBestByPreference(candidates, preferenceId) {
  if (!candidates || candidates.length === 0) return -1;
  if (preferenceId === 'any') return Math.floor(Math.random() * candidates.length);

  let scored = candidates.map((c, i) => ({ idx: i, score: 0 }));

  switch (preferenceId) {
    case 'young':
      scored.forEach((s, i) => { s.score = -(candidates[i].age || 30); });
      break;
    case 'male':
      scored.forEach((s, i) => {
        if (candidates[i].gender === 'male') s.score += 100;
        s.score -= (candidates[i].age || 30) * 0.5;
      });
      break;
    case 'female':
      scored.forEach((s, i) => {
        if (candidates[i].gender === 'female') s.score += 100;
        s.score -= (candidates[i].age || 30) * 0.5;
      });
      break;
    case 'good_origin':
      // 出身好 = 有些出身自带加成（这里简单按有出身特质就加分）
      scored.forEach((s, i) => {
        if (candidates[i].originTrait) s.score += 50;
      });
      break;
    case 'good_trait':
      // 有通用特质的优先，特质多的更优先
      scored.forEach((s, i) => {
        const traits = candidates[i].generalTraits || [];
        s.score += traits.length * 30;
      });
      break;
  }

  // 同分随机，按分数排序取第一个
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  // 如果最高分太低（都不符合偏好），随机选一个
  if (scored[0].score <= 0 && preferenceId !== 'any') {
    return Math.floor(Math.random() * candidates.length);
  }
  return scored[0].idx;
}
