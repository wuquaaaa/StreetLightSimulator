/**
 * 职业适配度系统 - 路灯计划
 *
 * 根据NPC的5项属性计算各岗位适配度。
 * 信息可见性受知客等级限制：
 * - Lv1（初识）：只能看年龄/性别/背景 → 粗略判断
 * - Lv2（熟络）：看到模糊适配度范围
 * - Lv3（伯乐）：看到精确适配度数值
 */

// 每个岗位对属性的权重
const JOB_AFFINITY_WEIGHTS = {
  farmer:         { constitution: 0.4, focus: 0.3, learning: 0.1, cooperation: 0.1, loyalty: 0.1 },
  miner:          { constitution: 0.6, focus: 0.2, learning: 0.05, cooperation: 0.1, loyalty: 0.05 },
  smelter:        { constitution: 0.3, focus: 0.5, learning: 0.1, cooperation: 0.05, loyalty: 0.05 },
  alchemist:      { constitution: 0.05, focus: 0.4, learning: 0.45, cooperation: 0.05, loyalty: 0.05 },
  herb_prepper:   { constitution: 0.1, focus: 0.6, learning: 0.2, cooperation: 0.05, loyalty: 0.05 },
  furnace_tender: { constitution: 0.4, focus: 0.4, learning: 0.1, cooperation: 0.05, loyalty: 0.05 },
  trader:         { constitution: 0.05, focus: 0.2, learning: 0.1, cooperation: 0.5, loyalty: 0.15 },
  porter:         { constitution: 0.7, focus: 0.1, learning: 0.05, cooperation: 0.1, loyalty: 0.05 },
  inspector:      { constitution: 0.05, focus: 0.6, learning: 0.3, cooperation: 0.05, loyalty: 0.05 },
};

/**
 * 计算NPC对某岗位的适配度 (0-100)
 */
export function getJobAffinity(character, jobId) {
  const weights = JOB_AFFINITY_WEIGHTS[jobId];
  if (!weights) return 50;

  let score = 0;
  for (const [attr, weight] of Object.entries(weights)) {
    score += (character.baseAttributes?.[attr] || 50) * weight;
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * 获取适配度等级描述
 */
export function getAffinityLabel(score) {
  if (score >= 80) return { text: '极适合', color: 'text-green-400', bg: 'bg-green-900/30' };
  if (score >= 60) return { text: '适合', color: 'text-blue-400', bg: 'bg-blue-900/30' };
  if (score >= 40) return { text: '一般', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
  return { text: '不适合', color: 'text-red-400', bg: 'bg-red-900/30' };
}

/**
 * 知客等级决定能看到什么信息
 * Lv1: 只能看基础信息（年龄/性别/背景）→ 粗略判断
 * Lv2: 看到模糊适配度范围
 * Lv3: 看到精确适配度
 */
export function getAffinityVisibility(hrLevel) {
  return {
    showBasic: hrLevel >= 1,        // 基础信息（总是可见）
    showRange: hrLevel >= 2,        // 模糊适配度范围
    showExact: hrLevel >= 3,        // 精确适配度数值
    showAttributes: hrLevel >= 3,   // 精确属性值
  };
}

/**
 * 根据知客等级获取适配度显示文本
 */
export function getAffinityDisplay(character, jobId, hrLevel) {
  const score = getJobAffinity(character, jobId);
  const vis = getAffinityVisibility(hrLevel);
  const label = getAffinityLabel(score);

  if (vis.showExact) {
    return { ...label, display: `${score}分`, score };
  }
  if (vis.showRange) {
    // 模糊范围：±15
    const low = Math.max(0, score - 15);
    const high = Math.min(100, score + 15);
    return { ...label, display: `${low}-${high}分`, score };
  }
  // Lv1: 只能根据背景猜
  return { ...label, display: '未知', score };
}

/**
 * 获取NPC最擅长的岗位（按适配度排序）
 */
export function getBestJobs(character, topN = 3) {
  const jobs = Object.keys(JOB_AFFINITY_WEIGHTS);
  const scored = jobs.map(job => ({
    job,
    score: getJobAffinity(character, job),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
