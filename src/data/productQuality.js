/**
 * 产品品质系统 - 路灯计划
 *
 * 核心机制：
 * - 收获的产品有品质（劣/良/优/极品），但仓库不显示
 * - 玩家只能看到总数量，看不到品质分布
 * - 需要「质检」岗位检测后才能看到品质
 * - 劣品卖低价，优品卖高价
 * - 劣品卖优品价 → 扣公司声誉
 * - 劣品放太久会进一步变质
 *
 * 品质分布：
 * - 普通农田：劣40% / 良40% / 优15% / 极品5%
 * - 灵田：劣20% / 良30% / 优35% / 极品15%
 * - 品质受NPC技能/特质/工时影响
 */

export const QUALITY_TIERS = {
  inferior: { id: 'inferior', name: '劣品', icon: '⬇', color: 'text-red-400', priceMod: 0.4, reputationPenalty: -5 },
  standard: { id: 'standard', name: '良品', icon: '➡', color: 'text-stone-400', priceMod: 1.0, reputationPenalty: 0 },
  premium:  { id: 'premium',  name: '优品', icon: '⬆', color: 'text-blue-400', priceMod: 1.8, reputationPenalty: 0 },
  supreme:  { id: 'supreme',  name: '极品', icon: '⭐', color: 'text-yellow-400', priceMod: 3.0, reputationPenalty: 0 },
};

// 普通农田品质分布权重
export const NORMAL_QUALITY_WEIGHTS = { inferior: 40, standard: 40, premium: 15, supreme: 5 };

// 灵田品质分布权重
export const SPIRIT_QUALITY_WEIGHTS = { inferior: 20, standard: 30, premium: 35, supreme: 15 };

/**
 * 根据权重随机生成品质
 */
export function rollQuality(weights = NORMAL_QUALITY_WEIGHTS) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (const [tier, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return tier;
  }
  return 'standard';
}

/**
 * 根据NPC技能修正品质权重
 * 专注力越高 → 劣品概率降低，优品概率升高
 */
export function getModifiedWeights(baseWeights, focusScore = 50) {
  const modifier = (focusScore - 50) / 200; // -0.25 ~ +0.25
  const modified = {};
  for (const [tier, weight] of Object.entries(baseWeights)) {
    if (tier === 'inferior') {
      modified[tier] = Math.max(5, Math.round(weight * (1 - modifier)));
    } else if (tier === 'premium' || tier === 'supreme') {
      modified[tier] = Math.round(weight * (1 + modifier));
    } else {
      modified[tier] = weight;
    }
  }
  return modified;
}

/**
 * 批次数据结构
 * 一个批次 = 一次收获的产物，有固定品质
 */
export class ProductBatch {
  constructor(itemId, name, amount, quality) {
    this.itemId = itemId;
    this.name = name;
    this.amount = amount;
    this.quality = quality;     // 品质等级
    this.inspected = false;     // 是否已检测
    this.createdAt = Date.now();
  }

  /** 检测品质（质检岗位执行） */
  inspect() {
    this.inspected = true;
    return this.quality;
  }

  /** 品质自然衰减（放置太久） */
  decay() {
    if (this.quality === 'supreme') {
      this.quality = 'premium';
    } else if (this.quality === 'premium') {
      this.quality = 'standard';
    } else if (this.quality === 'standard') {
      this.quality = 'inferior';
    }
  }
}
