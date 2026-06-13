/**
 * 药材处理系统 - 路灯计划
 *
 * 核心机制：
 * - 药童将原始草药处理成可用的炼丹材料
 * - 流程：分拣 → 清洗 → 晾晒/研磨
 * - 处理品质受专注力/经验/工时影响
 * - 处理好的材料有保质期，放置太久会变质
 */

import { HERB_MATERIALS, PREPARED_HERBS } from '../data/materials';

// 处理阶段
const PREP_STAGES = {
  SORTING: 'sorting',     // 分拣
  WASHING: 'washing',     // 清洗
  DRYING: 'drying',       // 晾晒/研磨
  DONE: 'done',           // 完成
};

export class HerbPrepSystem {
  constructor() {
    this.processing = {};  // npcId → { herbId, stage, progress, quality }
    this.preparedStock = {}; // preparedId → { amount, quality, createdAt }
    this.dailyStats = {};
  }

  // ====== 玩家操作 ======

  /** 开始处理草药 */
  startProcessing(herbId, character) {
    const herbDef = HERB_MATERIALS[herbId];
    if (!herbDef) return { success: false, message: `未知草药：${herbId}` };

    const key = character.id;
    if (this.processing[key]) {
      return { success: false, message: '正在处理其他材料，请先完成' };
    }

    this.processing[key] = {
      herbId,
      stage: PREP_STAGES.SORTING,
      progress: 0,
      total: herbDef.prepTime,
      quality: 100, // 品质初始100，处理过程中可能下降
    };

    return { success: true, message: `开始分拣${herbDef.name}` };
  }

  /** 跳过当前阶段（加速但降低品质） */
  rushStage(character) {
    const key = character.id;
    const proc = this.processing[key];
    if (!proc) return { success: false, message: '没有在处理材料' };

    proc.progress = proc.total;
    proc.quality = Math.max(0, proc.quality - 20); // 加速降低品质

    return { success: true, message: '跳过了当前步骤，但品质降低了' };
  }

  // ====== Tick ======

  tick(isNewDay, allCharacters, warehouse, logFn) {
    // 处理中的草药推进
    for (const [npcId, proc] of Object.entries(this.processing)) {
      const character = allCharacters.find(c => c.id === npcId);
      if (!character || character.isRetired) {
        delete this.processing[npcId];
        continue;
      }

      const efficiency = this._getPrepEfficiency(character);
      proc.progress += efficiency;

      // 品质随时间缓慢下降
      const herbDef = HERB_MATERIALS[proc.herbId];
      if (herbDef) {
        proc.quality = Math.max(0, proc.quality - herbDef.qualityDecay * 10);
      }

      if (proc.progress >= proc.total) {
        // 阶段完成，进入下一阶段
        this._advanceStage(proc, character);
      }
    }

    // 已处理材料变质
    if (isNewDay) {
      for (const [id, stock] of Object.entries(this.preparedStock)) {
        const daysOld = (Date.now() - stock.createdAt) / (1000 * 60 * 60 * 24);
        if (daysOld > 7) {
          stock.quality = Math.max(0, stock.quality - 10);
        }
      }
    }

    // 药童自动处理
    if (!isNewDay) return;

    const preppers = allCharacters.filter(c => !c.isRetired && c.hasPost('herb_prepper'));
    for (const prepper of preppers) {
      const proc = this.processing[prepper.id];
      if (proc) continue; // 还在处理中

      // 自动从仓库取草药处理
      for (const [herbId, herbDef] of Object.entries(HERB_MATERIALS)) {
        const amount = warehouse.getItemAmount(herbDef.category, herbId);
        if (amount > 0) {
          warehouse.removeItem(herbDef.category, herbId, 1);
          this.startProcessing(herbId, prepper);
          break;
        }
      }
    }
  }

  // ====== 内部方法 ======

  _advanceStage(proc, character) {
    const stages = [PREP_STAGES.SORTING, PREP_STAGES.WASHING, PREP_STAGES.DRYING, PREP_STAGES.DONE];
    const currentIdx = stages.indexOf(proc.stage);

    if (currentIdx >= stages.length - 1) {
      // 全部完成，产出处理好的材料
      this._produceResult(proc);
      delete this.processing[character.id];

      // 经验
      if (typeof character.gainKnowledge === 'function') {
        character.gainKnowledge('farming', 1);
      }
      return;
    }

    // 进入下一阶段
    proc.stage = stages[currentIdx + 1];
    proc.progress = 0;
    proc.total = 1; // 每个阶段固定1个周期
  }

  _produceResult(proc) {
    const preparedId = `${proc.herbId}_prepared`;
    const preparedDef = PREPARED_HERBS[preparedId];
    if (!preparedDef) return;

    if (!this.preparedStock[preparedId]) {
      this.preparedStock[preparedId] = { amount: 0, quality: 0, createdAt: Date.now() };
    }

    const stock = this.preparedStock[preparedId];
    stock.amount += 1;
    // 平均品质
    stock.quality = (stock.quality + proc.quality) / 2;
  }

  _getPrepEfficiency(character) {
    let eff = 0.5;

    // 专注力（精细活）
    const focus = character.baseAttributes?.focus || 50;
    eff *= 0.5 + (focus / 100) * 1.0;

    // 学习天赋
    const learning = character.baseAttributes?.learning || 50;
    eff *= 0.7 + (learning / 100) * 0.6;

    // 年龄
    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    // 特质
    for (const trait of (character.traits || [])) {
      if (trait.effects?.herbQualityBonus) eff *= (1 + trait.effects.herbQualityBonus);
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
    }

    return Math.max(0.2, Math.min(2.0, eff));
  }

  // ====== 存档 ======

  toJSON() {
    return {
      processing: { ...this.processing },
      preparedStock: { ...this.preparedStock },
    };
  }

  static fromJSON(data) {
    const sys = new HerbPrepSystem();
    if (data) {
      sys.processing = data.processing || {};
      sys.preparedStock = data.preparedStock || {};
    }
    return sys;
  }
}
