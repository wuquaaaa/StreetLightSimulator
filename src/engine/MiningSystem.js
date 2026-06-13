/**
 * 采矿系统 - 路灯计划（迷你玩法版）
 *
 * 核心机制：
 * - 矿工分配到矿脉后，每次操作消耗体力开采
 * - 矿脉有耐久度，开采后需要恢复
 * - 开采产出受体质/工具/特质/工时影响
 * - 矿脉会枯竭，需要等恢复或换矿脉
 * - 危险矿脉有事故概率（需要炉工维修设备降低风险）
 */

import { ORE_VEINS, RAW_ORES, TOOLS } from '../data/materials';

// 事故类型
const ACCIDENT_TYPES = {
  cave_in: { name: '塌方', damage: 15, lostOre: 0.5 },
  gas: { name: '瓦斯泄漏', damage: 10, lostOre: 0 },
  equipment: { name: '工具损坏', damage: 5, lostOre: 0 },
};

export class MiningSystem {
  constructor() {
    this.veins = {};        // veinId → { durability, depleted, accidentChance }
    this.toolDurability = {};  // toolId → 当前耐久
    this.dailyStats = {};   // npcId → { mined, accidents, efficiency }
  }

  init() {
    // 初始化矿脉
    for (const [id, vein] of Object.entries(ORE_VEINS)) {
      this.veins[id] = {
        id,
        durability: vein.maxDurability,
        depleted: false,
        accidentModifier: 1.0,  // 事故修正（炉工维修可降低）
      };
    }
    // 初始化工具
    this.toolDurability = { pickaxe: TOOLS.pickaxe.durability };
  }

  // ====== 玩家操作 ======

  /** 采矿（每次操作） */
  mine(veinId, character, toolId = 'pickaxe') {
    const vein = this.veins[veinId];
    if (!vein) return { success: false, message: '找不到矿脉' };

    const veinDef = ORE_VEINS[veinId];
    if (!veinDef) return { success: false, message: '未知矿脉' };

    if (vein.depleted) {
      return { success: false, message: `${veinDef.name}已枯竭，需要时间恢复` };
    }

    // 检查工具耐久
    const toolDur = this.toolDurability[toolId] || 0;
    if (toolDur <= 0) {
      return { success: false, message: '工具已损坏，需要维修' };
    }

    // 计算产出
    const efficiency = this._getMiningEfficiency(character, toolId);
    const baseYield = veinDef.baseYield.min + Math.random() * (veinDef.baseYield.max - veinDef.baseYield.min);
    const yield_ = Math.max(1, Math.floor(baseYield * efficiency));

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

    // 经验积累
    if (typeof character.gainKnowledge === 'function') {
      character.gainKnowledge('farming', 1);
    }

    return {
      success: true,
      yield: yield_,
      oreId: veinDef.id.replace('_vein', ''),
      efficiency: Math.round(efficiency * 100),
      accident,
      veinDurability: Math.round(vein.durability),
      toolDurability: this.toolDurability[toolId],
      message: accident
        ? `开采${accident.name}！获得${yield_}矿石，但受到了伤害`
        : `开采成功，获得${yield_}矿石`,
    };
  }

  /** 维修工具 */
  repairTool(toolId, materials) {
    const toolDef = TOOLS[toolId];
    if (!toolDef) return { success: false, message: '未知工具' };

    const currentDur = this.toolDurability[toolId] || 0;
    if (currentDur >= toolDef.durability) {
      return { success: false, message: '工具完好，无需维修' };
    }

    // 检查材料
    for (const [itemId, amount] of Object.entries(toolDef.repairCost)) {
      if ((materials[itemId] || 0) < amount) {
        return { success: false, message: `材料不足：需要${amount}个${itemId}` };
      }
    }

    // 消耗材料
    for (const [itemId, amount] of Object.entries(toolDef.repairCost)) {
      materials[itemId] -= amount;
    }

    // 恢复耐久
    this.toolDurability[toolId] = toolDef.durability;

    return { success: true, message: `${toolDef.name}维修完成` };
  }

  // ====== Tick ======

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

    // 矿工自动采矿（如果有分配的话）
    if (!isNewDay) return;

    const miners = allCharacters.filter(c => !c.isRetired && c.hasPost('tiedao'));
    for (const miner of miners) {
      // 自动选择最佳矿脉
      const bestVein = this._findBestVein(miner);
      if (!bestVein) continue;

      const result = this.mine(bestVein.id, miner);
      if (result.success) {
        const veinDef = ORE_VEINS[bestVein.id];
        const oreId = veinDef.id.replace('_vein', '');
        const oreDef = RAW_ORES[oreId];
        if (oreDef) {
          warehouse.addItem(oreDef.category, oreId, oreDef.name, result.yield);
          logFn(`⛏${miner.name}开采了 ${result.yield} ${oreDef.name}`);
        }
      }

      if (result.accident) {
        logFn(`⚠️ ${miner.name}遭遇${result.accident.name}！`);
        miner.changeMood(-5);
      }
    }
  }

  // ====== 内部方法 ======

  _getMiningEfficiency(character, toolId) {
    let eff = 1.0;

    // 体质影响
    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.5 + (constitution / 100) * 1.0;

    // 工具加成
    const toolDef = TOOLS[toolId];
    if (toolDef) {
      eff *= toolDef.miningBonus;
      // 工具耐久影响
      const durRatio = (this.toolDurability[toolId] || 0) / toolDef.durability;
      eff *= 0.5 + durRatio * 0.5;
    }

    // 年龄衰退
    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    // 特质加成
    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
      if (trait.effects?.constitutionBonus) eff *= (1 + trait.effects.constitutionBonus / 100);
    }

    // 联动
    if (typeof character.getSynergyOutputMultiplier === 'function') {
      eff *= character.getSynergyOutputMultiplier();
    }

    return Math.max(0.2, Math.min(3.0, eff));
  }

  _checkAccident(veinDef, vein, character) {
    const baseChance = veinDef.dangerLevel * 0.02 * vein.accidentModifier;
    const constitution = character.baseAttributes?.constitution || 50;
    const chance = baseChance * (1 - constitution / 200);

    if (Math.random() > chance) return null;

    // 随机选择事故类型
    const types = Object.values(ACCIDENT_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return { ...type };
  }

  _findBestVein(character) {
    const available = Object.values(this.veins).filter(v => !v.depleted && v.durability > 10);
    if (available.length === 0) return null;

    // 按耐久度排序，选最充裕的
    available.sort((a, b) => b.durability - a.durability);
    return available[0];
  }

  // ====== 存档 ======

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
