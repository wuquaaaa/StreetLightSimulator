/**
 * 铁道采矿系统 - 路灯计划
 *
 * 核心机制：
 * - NPC 被任命为「铁道」岗位后，自动每天产出铁矿石
 * - 无需资源点——铁道 NPC 的产出是抽象的「采矿+冶炼」结果
 * - 产出 = 基础产量 × NPC效率
 * - 被动产出模式，不影响 NPCAISystem
 */

import { MINING_BASE_YIELD } from './constants';

// ======================================================
// MiningSystem — 采矿系统
// ======================================================

export class MiningSystem {
  constructor() {
    // 当前无额外状态——产出完全由 NPC 岗位决定
    // 预留扩展：矿脉等级、矿点等
  }

  /**
   * 每日 tick——对所有铁道 NPC 产出铁矿石
   * @param {boolean} isNewDay - 是否新的一天
   * @param {Character[]} allCharacters - 所有 NPC
   * @param {WarehouseSystem} warehouse - 仓库
   * @param {(msg:string)=>void} logFn - 日志函数
   */
  tick(isNewDay, allCharacters, warehouse, logFn) {
    if (!isNewDay) return;

    const miners = allCharacters.filter(c => !c.isRetired && c.hasPost('tiedao'));

    if (miners.length === 0) return;

    for (const miner of miners) {
      const efficiency = this._getMiningEfficiency(miner);
      const yield_ = Math.max(1, Math.floor(MINING_BASE_YIELD * efficiency));

      const result = warehouse.addItem('mineral', 'iron_ore', '铁矿石', yield_);

      const msg = `⛏${miner.name}冶炼出 ${yield_} 铁矿石`;
      logFn(msg);
      if (result.overflow > 0) {
        logFn(`仓库满了！${result.overflow}单位铁矿石丢失`);
      }

      // 铁道经验积累
      if (typeof miner.gainKnowledge === 'function') {
        miner.gainKnowledge('farming', 1); // 复用 farming 经验（铁道也是体力活）
      }
    }
  }

  /**
   * 计算 NPC 采矿效率
   * 采矿重体质 + 年龄 + 特质修正
   */
  _getMiningEfficiency(character) {
    let eff = 1.0;

    // 体质影响（采矿比采集更吃体质）
    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.5 + (constitution / 100) * 1.0; // 范围: 0.5 ~ 1.5

    // 年龄衰退
    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    // 特质 workSpeedBonus
    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) {
        eff *= (1 + trait.effects.workSpeedBonus);
      }
    }

    // 特质联动产出乘数
    if (typeof character.getSynergyOutputMultiplier === 'function') {
      eff *= character.getSynergyOutputMultiplier();
    }

    return Math.max(0.2, Math.min(3.0, eff));
  }

  toJSON() {
    return {};
  }

  static fromJSON(_data) {
    return new MiningSystem();
  }
}
