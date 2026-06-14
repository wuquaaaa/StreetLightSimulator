/**
 * 采矿系统 - 路灯计划（迷你玩法版）
 *
 * 核心机制：
 * - 矿工每次操作消耗体力开采
 * - 开采产出带品质（劣/良/优/极品）
 * - 矿脉有耐久度，开采后需要恢复
 * - 工具有耐久度，用坏需要维修
 * - 危险矿脉有事故概率
 * - 体质越高产出越多，专注力越高品质越好
 */

import { ORE_VEINS, RAW_ORES, TOOLS } from '../data/materials';
import { NORMAL_QUALITY_WEIGHTS, rollQuality, getModifiedWeights } from '../data/productQuality';

const ACCIDENT_TYPES = {
  cave_in: { name: '塌方', damage: 15, lostOre: 0.5 },
  gas: { name: '瓦斯泄漏', damage: 10, lostOre: 0 },
  equipment: { name: '工具损坏', damage: 5, lostOre: 0 },
};

// 矿石品质权重（专注力影响）
const ORE_QUALITY_WEIGHTS = { inferior: 30, standard: 45, premium: 20, supreme: 5 };

export class MiningSystem {
  constructor() {
    this.veins = {};
    this.toolDurability = {};
    this.dailyStats = {};
  }

  init() {
    for (const [id, vein] of Object.entries(ORE_VEINS)) {
      this.veins[id] = {
        id,
        durability: vein.maxDurability,
        depleted: false,
        accidentModifier: 1.0,
      };
    }
    this.toolDurability = { pickaxe: TOOLS.pickaxe.durability };
  }

  /** 采矿（每次操作） */
  mine(veinId, character, toolId = 'pickaxe') {
    const vein = this.veins[veinId];
    if (!vein) return { success: false, message: '找不到矿脉' };

    const veinDef = ORE_VEINS[veinId];
    if (!veinDef) return { success: false, message: '未知矿脉' };

    if (vein.depleted) {
      return { success: false, message: `${veinDef.name}已枯竭，需要时间恢复` };
    }

    const toolDur = this.toolDurability[toolId] || 0;
    if (toolDur <= 0) {
      return { success: false, message: '工具已损坏，需要维修' };
    }

    // 计算产出数量
    const efficiency = this._getMiningEfficiency(character, toolId);
    const baseYield = veinDef.baseYield.min + Math.random() * (veinDef.baseYield.max - veinDef.baseYield.min);
    const totalYield = Math.max(1, Math.floor(baseYield * efficiency));

    // 生成品质批次
    const focus = character.baseAttributes?.focus || 50;
    const weights = getModifiedWeights(ORE_QUALITY_WEIGHTS, focus);
    const qualityBatches = {};
    for (let i = 0; i < totalYield; i++) {
      const q = rollQuality(weights);
      qualityBatches[q] = (qualityBatches[q] || 0) + 1;
    }

    // 消耗矿脉耐久
    vein.durability -= veinDef.depletionRate * 100;
    if (vein.durability <= 0) {
      vein.durability = 0;
      vein.depleted = true;
    }

    // 消耗工具耐久
    this.toolDurability[toolId] = Math.max(0, toolDur - 1);

    // 检查事故
    const accident = this._checkAccident(veinDef, vein, character);

    // 经验
    if (typeof character.gainKnowledge === 'function') {
      character.gainKnowledge('farming', 1);
    }

    // 品质摘要
    const qualitySummary = Object.entries(qualityBatches)
      .filter(([_, amt]) => amt > 0)
      .map(([q, amt]) => {
        const label = q === 'inferior' ? '劣' : q === 'standard' ? '良' : q === 'premium' ? '优' : '极品';
        return `${label}×${amt}`;
      }).join(' ');

    return {
      success: true,
      totalYield,
      qualityBatches,
      oreId: veinDef.id.replace('_vein', ''),
      efficiency: Math.round(efficiency * 100),
      accident,
      veinDurability: Math.round(vein.durability),
      toolDurability: this.toolDurability[toolId],
      qualitySummary,
      message: accident
        ? `开采${accident.name}！获得${totalYield}矿石 [${qualitySummary}]`
        : `开采成功，获得${totalYield}矿石 [${qualitySummary}]`,
    };
  }

  repairTool(toolId, materials) {
    const toolDef = TOOLS[toolId];
    if (!toolDef) return { success: false, message: '未知工具' };

    const currentDur = this.toolDurability[toolId] || 0;
    if (currentDur >= toolDef.durability) {
      return { success: false, message: '工具完好，无需维修' };
    }

    for (const [itemId, amount] of Object.entries(toolDef.repairCost)) {
      if ((materials[itemId] || 0) < amount) {
        return { success: false, message: `材料不足：需要${amount}个${itemId}` };
      }
    }

    for (const [itemId, amount] of Object.entries(toolDef.repairCost)) {
      materials[itemId] -= amount;
    }

    this.toolDurability[toolId] = toolDef.durability;
    return { success: true, message: `${toolDef.name}维修完成` };
  }

  tick(isNewDay, allCharacters, warehouse, logFn) {
    // 矿脉自然恢复
    for (const [id, vein] of Object.entries(this.veins)) {
      const def = ORE_VEINS[id];
      if (vein.depleted) {
        vein.durability += def.respawnRate * 100;
        if (vein.durability >= def.maxDurability * 0.3) {
          vein.depleted = false;
          vein.durability = Math.max(vein.durability, def.maxDurability * 0.3);
        }
      } else {
        vein.durability = Math.min(def.maxDurability, vein.durability + def.respawnRate * 50);
      }
    }

    if (!isNewDay) return;

    // 矿工自动采矿
    const miners = allCharacters.filter(c => !c.isRetired && c.hasPost('tiedao'));
    for (const miner of miners) {
      const bestVein = this._findBestVein(miner);
      if (!bestVein) continue;

      const result = this.mine(bestVein.id, miner);
      if (result.success) {
        const veinDef = ORE_VEINS[bestVein.id];
        const oreId = veinDef.id.replace('_vein', '');
        // 按品质批次存储
        for (const [quality, amount] of Object.entries(result.qualityBatches)) {
          if (amount <= 0) continue;
          const batchId = `${oreId}_${quality}`;
          const oreDef = RAW_ORES[oreId];
          const qualityLabel = quality === 'inferior' ? '劣' : quality === 'standard' ? '良' : quality === 'premium' ? '优' : '极品';
          warehouse.addItem(oreDef?.category || 'mineral', batchId, `${oreDef?.name || oreId}(${qualityLabel})`, amount);
        }
        logFn(`⛏${miner.name}开采了 ${result.totalYield} 矿石 [${result.qualitySummary}]`);
      }

      if (result.accident) {
        logFn(`⚠️ ${miner.name}遭遇${result.accident.name}！`);
        miner.changeMood(-5);
      }
    }
  }

  _getMiningEfficiency(character, toolId) {
    let eff = 1.0;
    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.5 + (constitution / 100) * 1.0;

    const toolDef = TOOLS[toolId];
    if (toolDef) {
      eff *= toolDef.miningBonus;
      const durRatio = (this.toolDurability[toolId] || 0) / toolDef.durability;
      eff *= 0.5 + durRatio * 0.5;
    }

    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
      if (trait.effects?.constitutionBonus) eff *= (1 + trait.effects.constitutionBonus / 100);
    }

    if (typeof character.getSynergyOutputMultiplier === 'function') {
      eff *= character.getSynergyOutputMultiplier();
    }

    // 疲劳修正
    if (character._fatigueModifier) eff *= character._fatigueModifier;

    return Math.max(0.2, Math.min(3.0, eff));
  }

  _checkAccident(veinDef, vein, character) {
    const baseChance = veinDef.dangerLevel * 0.02 * vein.accidentModifier;
    const constitution = character.baseAttributes?.constitution || 50;
    const chance = baseChance * (1 - constitution / 200);

    if (Math.random() > chance) return null;

    const types = Object.values(ACCIDENT_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return { ...type };
  }

  _findBestVein(character) {
    const available = Object.values(this.veins).filter(v => !v.depleted && v.durability > 10);
    if (available.length === 0) return null;
    available.sort((a, b) => b.durability - a.durability);
    return available[0];
  }

  toJSON() {
    return {
      veins: { ...this.veins },
      toolDurability: { ...this.toolDurability },
    };
  }

  static fromJSON(data) {
    const sys = new MiningSystem();
    if (data?.veins) sys.veins = data.veins;
    if (data?.toolDurability) sys.toolDurability = data.toolDurability;
    return sys;
  }
}
