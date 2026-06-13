/**
 * 炼丹系统 - 路灯计划（迷你玩法版）
 *
 * 核心机制：
 * - 炼丹师操控丹炉，将处理好的材料炼制成丹药
 * - 炉温控制：不同丹药需要不同温度区间
 * - 配方组合：不同材料配比影响丹药类型和品质
 * - 炼制过程：投入材料后需要持续关注炉温
 * - 品质分级：残次/下品/中品/上品/极品
 */

import { PREPARED_HERBS, PILL_RECIPES } from '../data/materials';

// 炉温区间
const TEMP_RANGES = {
  LOW: { min: 100, max: 300, name: '文火', qualityMod: 0.8 },
  MED: { min: 300, max: 500, name: '中火', qualityMod: 1.0 },
  HIGH: { min: 500, max: 700, name: '武火', qualityMod: 1.2 },
  EXTREME: { min: 700, max: 900, name: '猛火', qualityMod: 0.6 },
};

// 品质等级
const QUALITY_LEVELS = {
  poor:    { id: 'poor',    label: '残次', color: 'text-stone-400', valueMod: 0.3 },
  low:     { id: 'low',     label: '下品', color: 'text-green-400', valueMod: 0.6 },
  medium:  { id: 'medium',  label: '中品', color: 'text-blue-400',  valueMod: 1.0 },
  high:    { id: 'high',    label: '上品', color: 'text-yellow-400', valueMod: 1.8 },
  supreme: { id: 'supreme', label: '极品', color: 'text-red-400',   valueMod: 3.0 },
};

export class AlchemySystem {
  constructor() {
    this.furnaceTemp = 300;
    this.fuelLevel = 0;
    this.crafting = {};      // npcId → { recipeId, ingredients, progress, total, quality }
    this.outputBuffer = {};  // recipeId → { amount, quality }
    this.dailyStats = {};
  }

  // ====== 玩家操作 ======

  /** 添加燃料 */
  addFuel(amount = 1) {
    this.fuelLevel += amount;
    return { success: true, fuelLevel: this.fuelLevel };
  }

  /** 调整炉温 */
  adjustTemp(targetTemp) {
    this.furnaceTemp = Math.max(0, Math.min(1000, targetTemp));
    if (this.furnaceTemp > 200) {
      const fuelCost = Math.ceil(this.furnaceTemp / 400);
      this.fuelLevel = Math.max(0, this.fuelLevel - fuelCost);
    }
    return { success: true, temp: this.furnaceTemp };
  }

  /** 选择配方开始炼制 */
  startCrafting(recipeId, character, warehouse) {
    const recipe = PILL_RECIPES[recipeId];
    if (!recipe) return { success: false, message: '未知配方' };

    // 检查材料
    for (const ing of recipe.ingredients) {
      const have = warehouse.getItemAmount('herb', ing.id);
      if (have < ing.amount) {
        const preparedDef = PREPARED_HERBS[ing.id];
        return { success: false, message: `${preparedDef?.name || ing.id}不足` };
      }
    }

    // 检查炉温
    if (this.furnaceTemp < 100) {
      return { success: false, message: '炉温太低，请先升温' };
    }

    // 消耗材料
    for (const ing of recipe.ingredients) {
      warehouse.removeItem('herb', ing.id, ing.amount);
    }

    const key = character.id;
    this.crafting[key] = {
      recipeId,
      progress: 0,
      total: recipe.craftTime,
      baseQuality: recipe.baseQuality,
    };

    return { success: true, message: `开始炼制${recipe.name}` };
  }

  // ====== Tick ======

  tick(isNewDay, allCharacters, warehouse, logFn) {
    // 炉温自然冷却
    if (this.furnaceTemp > 0) {
      this.furnaceTemp = Math.max(0, this.furnaceTemp - 3);
    }

    // 燃料消耗
    if (this.furnaceTemp > 200 && this.fuelLevel > 0) {
      this.fuelLevel = Math.max(0, this.fuelLevel - 1);
      if (this.fuelLevel <= 0) {
        this.furnaceTemp = Math.max(0, this.furnaceTemp - 30);
      }
    }

    // 推进炼制进度
    for (const [npcId, craft] of Object.entries(this.crafting)) {
      const character = allCharacters.find(c => c.id === npcId);
      if (!character || character.isRetired) {
        delete this.crafting[npcId];
        continue;
      }

      const efficiency = this._getCraftingEfficiency(character);
      const tempMod = this._getTempModifier();
      craft.progress += efficiency * tempMod;

      if (craft.progress >= craft.total) {
        // 炼制完成
        this._completeCrafting(craft, character);
        delete this.crafting[npcId];

        if (typeof character.gainKnowledge === 'function') {
          character.gainKnowledge('farming', 2);
        }
      }
    }

    if (!isNewDay) return;

    // 炼丹师自动炼制
    const alchemists = allCharacters.filter(c => !c.isRetired && c.hasPost('miaoshou'));
    for (const alchemist of alchemists) {
      if (this.crafting[alchemist.id]) continue;

      // 尝试自动选择配方
      for (const [recipeId, recipe] of Object.entries(PILL_RECIPES)) {
        let canCraft = true;
        for (const ing of recipe.ingredients) {
          if (warehouse.getItemAmount('herb', ing.id) < ing.amount) {
            canCraft = false;
            break;
          }
        }
        if (canCraft) {
          this.startCrafting(recipeId, alchemist, warehouse);
          break;
        }
      }
    }
  }

  // ====== 内部方法 ======

  _completeCrafting(craft, character) {
    const recipe = PILL_RECIPES[craft.recipeId];
    if (!recipe) return;

    // 计算品质
    const quality = this._calculateQuality(craft, character);

    // 产出
    if (!this.outputBuffer[craft.recipeId]) {
      this.outputBuffer[craft.recipeId] = { amount: 0, quality: 0 };
    }
    const buffer = this.outputBuffer[craft.recipeId];
    buffer.amount += 1;
    buffer.quality = (buffer.quality + quality) / 2;
  }

  _calculateQuality(craft, character) {
    let qualityScore = 50; // 基础分

    // 专注力
    const focus = character.baseAttributes?.focus || 50;
    qualityScore += (focus - 50) * 0.5;

    // 学习天赋
    const learning = character.baseAttributes?.learningTalent || 50;
    qualityScore += (learning - 50) * 0.3;

    // 炉温匹配
    const tempMod = this._getTempModifier();
    qualityScore *= tempMod;

    // 特质
    for (const trait of (character.traits || [])) {
      if (trait.effects?.herbQualityBonus) qualityScore *= (1 + trait.effects.herbQualityBonus);
    }

    // 联动
    if (typeof character.getSynergyOutputMultiplier === 'function') {
      qualityScore *= character.getSynergyOutputMultiplier();
    }

    // 映射到品质等级
    if (qualityScore >= 80) return 'supreme';
    if (qualityScore >= 60) return 'high';
    if (qualityScore >= 40) return 'medium';
    if (qualityScore >= 20) return 'low';
    return 'poor';
  }

  _getCraftingEfficiency(character) {
    let eff = 0.4;

    const focus = character.baseAttributes?.focus || 50;
    eff *= 0.5 + (focus / 100) * 1.0;

    const learning = character.baseAttributes?.learningTalent || 50;
    eff *= 0.6 + (learning / 100) * 0.8;

    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
    }

    return Math.max(0.2, Math.min(2.0, eff));
  }

  _getTempModifier() {
    if (this.furnaceTemp < 100) return 0;
    if (this.furnaceTemp < 300) return 0.6;
    if (this.furnaceTemp <= 500) return 1.0;
    if (this.furnaceTemp <= 700) return 1.2;
    return 0.5; // 过热
  }

  // ====== 存档 ======

  toJSON() {
    return {
      furnaceTemp: this.furnaceTemp,
      fuelLevel: this.fuelLevel,
      crafting: { ...this.crafting },
      outputBuffer: { ...this.outputBuffer },
    };
  }

  static fromJSON(data) {
    const sys = new AlchemySystem();
    if (data) {
      sys.furnaceTemp = data.furnaceTemp || 0;
      sys.fuelLevel = data.fuelLevel || 0;
      sys.crafting = data.crafting || {};
      sys.outputBuffer = data.outputBuffer || {};
    }
    return sys;
  }
}
