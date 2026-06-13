/**
 * 冶炼系统 - 路灯计划
 *
 * 核心机制：
 * - 炼铁匠将原矿冶炼成金属锭
 * - 炉温控制：温度过高/过低影响产出和燃料消耗
 * - 燃料管理：煤炭消耗，需要补给
 * - 品质控制：专注力影响成品品质
 */

import { RAW_ORES, SMELTED_PRODUCTS } from '../data/materials';

// 炉温状态
const FURNACE_TEMP = {
  COLD: 'cold',       // < 200: 无法冶炼
  LOW: 'low',         // 200-400: 效率低，燃料浪费
  OPTIMAL: 'optimal', // 400-600: 最佳效率
  HIGH: 'high',       // 600-800: 效率高但风险增加
  OVERHEAT: 'overheat', // > 800: 有爆炸风险
};

export class SmeltingSystem {
  constructor() {
    this.furnaceTemp = 300;    // 当前炉温
    this.fuelLevel = 0;        // 燃料余量
    this.smeltingProgress = {}; // npcId → { oreId, progress, total }
    this.dailyStats = {};
  }

  // ====== 玩家操作 ======

  /** 添加燃料 */
  addFuel(amount = 1) {
    this.fuelLevel += amount;
    return { success: true, fuelLevel: this.fuelLevel, message: `添加了${amount}单位燃料` };
  }

  /** 调整炉温（需要操作） */
  adjustTemp(targetTemp) {
    const diff = Math.abs(targetTemp - this.furnaceTemp);
    this.furnaceTemp = Math.max(0, Math.min(1000, targetTemp));
    // 消耗燃料维持温度
    if (this.furnaceTemp > 200) {
      const fuelCost = Math.ceil(this.furnaceTemp / 500);
      this.fuelLevel = Math.max(0, this.fuelLevel - fuelCost);
    }
    return { success: true, temp: this.furnaceTemp, message: `炉温调整至${this.furnaceTemp}°` };
  }

  /** 投入矿石开始冶炼 */
  startSmelting(oreId, amount, character) {
    const oreDef = RAW_ORES[oreId];
    if (!oreDef || !oreDef.smeltYield) {
      return { success: false, message: `${oreId}不能冶炼` };
    }

    if (this.furnaceTemp < 200) {
      return { success: false, message: '炉温太低，无法冶炼' };
    }

    if (this.fuelLevel <= 0) {
      return { success: false, message: '没有燃料了' };
    }

    const key = character.id;
    this.smeltingProgress[key] = {
      oreId,
      amount,
      progress: 0,
      total: oreDef.smeltTime,
      yieldProduct: oreDef.smeltYield,
    };

    return {
      success: true,
      message: `开始冶炼${oreDef.name}，预计需要${oreDef.smeltTime}个周期`,
    };
  }

  // ====== Tick ======

  tick(isNewDay, allCharacters, warehouse, logFn) {
    // 炉温自然冷却
    if (this.furnaceTemp > 0) {
      this.furnaceTemp = Math.max(0, this.furnaceTemp - 5);
    }

    // 燃料消耗维持炉温
    if (this.furnaceTemp > 200 && this.fuelLevel > 0) {
      const fuelCost = Math.ceil(this.furnaceTemp / 500);
      this.fuelLevel = Math.max(0, this.fuelLevel - fuelCost);
      if (this.fuelLevel <= 0) {
        this.furnaceTemp = Math.max(0, this.furnaceTemp - 50);
      }
    }

    if (!isNewDay) return;

    // 炼铁匠自动冶炼
    const smelters = allCharacters.filter(c => !c.isRetired && c.hasPost('smelter'));
    for (const smelter of smelters) {
      const progress = this.smeltingProgress[smelter.id];

      if (!progress) {
        // 尝试自动开始冶炼
        this._autoStartSmelting(smelter, warehouse);
        continue;
      }

      // 推进冶炼进度
      const efficiency = this._getSmeltingEfficiency(smelter);
      const tempBonus = this._getTempBonus();
      progress.progress += efficiency * tempBonus;

      if (progress.progress >= progress.total) {
        // 冶炼完成
        const productDef = SMELTED_PRODUCTS[progress.yieldProduct];
        if (productDef) {
          const yieldAmount = Math.max(1, Math.floor(progress.amount * efficiency * tempBonus));
          warehouse.addItem(productDef.category, progress.yieldProduct, productDef.name, yieldAmount);
          logFn(`🔥${smelter.name}冶炼出 ${yieldAmount} ${productDef.name}`);
        }
        delete this.smeltingProgress[smelter.id];
      }
    }
  }

  // ====== 内部方法 ======

  _getSmeltingEfficiency(character) {
    let eff = 0.5;

    // 体质（体力活）
    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.5 + (constitution / 100) * 1.0;

    // 专注力（控制火候）
    const focus = character.baseAttributes?.focus || 50;
    eff *= 0.6 + (focus / 100) * 0.8;

    // 年龄
    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    // 特质
    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
    }

    return Math.max(0.2, Math.min(2.0, eff));
  }

  _getTempBonus() {
    if (this.furnaceTemp < 200) return 0;   // 无法冶炼
    if (this.furnaceTemp < 400) return 0.5;  // 效率低
    if (this.furnaceTemp <= 600) return 1.0;  // 最佳
    if (this.furnaceTemp <= 800) return 1.3;  // 效率高但有风险
    return 0.3; // 过热：效率极低且危险
  }

  _autoStartSmelting(character, warehouse) {
    // 自动从仓库取矿石冶炼
    for (const [oreId, oreDef] of Object.entries(RAW_ORES)) {
      if (!oreDef.smeltYield) continue;
      const amount = warehouse.getItemAmount(oreDef.category, oreId);
      if (amount > 0) {
        // 消耗矿石
        warehouse.removeItem(oreDef.category, oreId, Math.min(amount, 5));
        this.startSmelting(oreId, Math.min(amount, 5), character);
        break;
      }
    }
  }

  // ====== 存档 ======

  toJSON() {
    return {
      furnaceTemp: this.furnaceTemp,
      fuelLevel: this.fuelLevel,
      smeltingProgress: { ...this.smeltingProgress },
    };
  }

  static fromJSON(data) {
    const sys = new SmeltingSystem();
    if (data) {
      sys.furnaceTemp = data.furnaceTemp || 0;
      sys.fuelLevel = data.fuelLevel || 0;
      sys.smeltingProgress = data.smeltingProgress || {};
    }
    return sys;
  }
}
