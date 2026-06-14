/**
 * 质检系统 - 路灯计划
 *
 * 质检员检测仓库中未检测的商品批次：
 * - 揭示品质（劣/良/优/极品）
 * - 检测精度受专注力+学习影响
 * - 专注力低的质检员可能误判（把劣品判为良品）
 * - 每天自动检测一批
 */

import { QUALITY_TIERS } from '../data/productQuality';

// 检测精度：专注力越高，误判概率越低
function getInspectionAccuracy(focus) {
  // focus 50 → 85%准确, focus 80 → 95%准确, focus 20 → 65%准确
  return 0.5 + (focus / 100) * 0.5;
}

// 品质等级顺序（用于误判偏移）
const QUALITY_ORDER = ['inferior', 'standard', 'premium', 'supreme'];

export class InspectorSystem {
  constructor() {
    this.inspectedCount = {};  // npcId → 已检测数量
  }

  /**
   * 检测仓库中的一个未检测批次
   * @returns {{ success, itemId, trueQuality, reportedQuality, isMisjudged }}
   */
  inspectBatch(shelf, itemId, character) {
    const item = shelf.items[itemId];
    if (!item || item.amount <= 0) return { success: false, message: '无此商品' };
    if (item.meta?.inspected) return { success: false, message: '已检测过' };

    const trueQuality = item.meta?.quality || 'standard';
    const focus = character.baseAttributes?.focus || 50;
    const accuracy = getInspectionAccuracy(focus);

    // 检测：有概率误判
    let reportedQuality = trueQuality;
    let isMisjudged = false;

    if (Math.random() > accuracy) {
      // 误判：偏移一个等级
      const idx = QUALITY_ORDER.indexOf(trueQuality);
      if (idx > 0 && Math.random() < 0.5) {
        reportedQuality = QUALITY_ORDER[idx - 1]; // 把好的判成差的（保守）
      } else if (idx < QUALITY_ORDER.length - 1) {
        reportedQuality = QUALITY_ORDER[idx + 1]; // 把差的判成好的（危险）
        isMisjudged = true;
      }
    }

    // 标记为已检测
    item.meta = { ...item.meta, inspected: true, reportedQuality };

    // 经验
    if (typeof character.gainKnowledge === 'function') {
      character.gainKnowledge('farming', 2);
    }

    // 记录检测数
    this.inspectedCount[character.id] = (this.inspectedCount[character.id] || 0) + 1;

    return {
      success: true,
      itemId,
      trueQuality,
      reportedQuality,
      isMisjudged,
    };
  }

  /**
   * 自动检测仓库中所有未检测的批次
   */
  autoInspect(warehouse, character, logFn) {
    let inspected = 0;
    const categories = Object.keys(warehouse.storage || {});
    categories.push('common');

    for (const cat of categories) {
      const shelves = cat === 'common'
        ? (warehouse.common?.shelves || [])
        : (warehouse.storage[cat]?.shelves || []);

      for (const shelf of shelves) {
        for (const [itemId, item] of Object.entries(shelf.items)) {
          if (!item.meta || item.meta.inspected || item.amount <= 0) continue;
          if (!itemId.match(/_(inferior|standard|premium|supreme)$/)) continue;

          const result = this.inspectBatch(shelf, itemId, character);
          if (result.success) {
            inspected++;
            const qualityLabel = QUALITY_TIERS[result.reportedQuality]?.name || '未知';
            const baseName = itemId.replace(/_(inferior|standard|premium|supreme)$/, '');
            logFn(`🔍${character.name}检测了${baseName}: ${qualityLabel}${result.isMisjudged ? ' (误判)' : ''}`);
          }
        }
      }
    }

    return inspected;
  }

  // ====== 存档 ======

  toJSON() {
    return { inspectedCount: { ...this.inspectedCount } };
  }

  static fromJSON(data) {
    const sys = new InspectorSystem();
    if (data) {
      sys.inspectedCount = data.inspectedCount || {};
    }
    return sys;
  }
}
