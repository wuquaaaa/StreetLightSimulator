/**
 * 农田系统 - 路灯计划
 * 管理农田、耕种、收获
 * 产出和良率受角色的 基础属性 × 知识属性 联合影响
 */

import { CROPS } from '../data/crops';

// 农田状态
export const FIELD_STATE = {
  EMPTY: 'empty',
  PLOWED: 'plowed',
  PLANTED: 'planted',
  GROWING: 'growing',
  READY: 'ready',
  WITHERED: 'withered',
};

export class FarmPlot {
  constructor(id) {
    this.id = id;
    this.state = FIELD_STATE.EMPTY;
    this.cropId = null;
    this.growthProgress = 0;
    this.waterLevel = 50;
    this.fertility = 60 + Math.floor(Math.random() * 30);
  }

  getCropDef() {
    if (!this.cropId) return null;
    return CROPS.find(c => c.id === this.cropId) || null;
  }
}

export class FarmSystem {
  constructor() {
    this.plots = [
      new FarmPlot('plot_1'),
      new FarmPlot('plot_2'),
    ];
    this.maxPlots = 6;
  }

  // 翻地
  plow(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.EMPTY && plot.state !== FIELD_STATE.WITHERED) {
      return { success: false, message: '这块地无法翻耕' };
    }

    const staminaCost = 15;
    if (!character.useStamina(staminaCost)) {
      return { success: false, message: '体力不足！' };
    }

    plot.state = FIELD_STATE.PLOWED;
    plot.cropId = null;
    plot.growthProgress = 0;

    // 耕种经验微量成长（学习能力影响成长速度）
    character.gainKnowledge('farming', 1);

    return { success: true, message: '翻地完成' };
  }

  // 播种
  plant(plotId, cropId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.PLOWED) {
      return { success: false, message: '需要先翻地' };
    }

    const crop = CROPS.find(c => c.id === cropId);
    if (!crop) return { success: false, message: '未知作物' };

    const staminaCost = 10;
    if (!character.useStamina(staminaCost)) {
      return { success: false, message: '体力不足！' };
    }

    plot.state = FIELD_STATE.PLANTED;
    plot.cropId = cropId;
    plot.growthProgress = 0;

    // 播种获得耕种经验
    character.gainKnowledge('farming', 2);

    return { success: true, message: `播种了${crop.name}` };
  }

  // 浇水
  water(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.PLANTED && plot.state !== FIELD_STATE.GROWING) {
      return { success: false, message: '这块地不需要浇水' };
    }

    const staminaCost = 5;
    if (!character.useStamina(staminaCost)) {
      return { success: false, message: '体力不足！' };
    }

    plot.waterLevel = Math.min(100, plot.waterLevel + 30);
    character.gainKnowledge('farming', 0.5);

    return { success: true, message: '浇水完成' };
  }

  // 收获 — 核心产出计算
  harvest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.READY) {
      return { success: false, message: '作物还没成熟' };
    }

    const crop = plot.getCropDef();
    if (!crop) return { success: false, message: '没有种植作物' };

    const staminaCost = 10;
    if (!character.useStamina(staminaCost)) {
      return { success: false, message: '体力不足！' };
    }

    // ====== 产出计算：基础属性 × 知识属性 联合影响 ======
    // 产量 = 基础产量 × 综合效率 × 肥力修正
    //   综合效率由 character.calculateOutput 计算
    //   同时受 focus(专注→良率) 和 farming(耕种经验→产量) 影响
    const fertilityMod = 0.5 + (plot.fertility / 100) * 0.8;
    const { amount: rawAmount, isHighQuality } = character.calculateOutput(
      crop.baseYield,
      'farming', // 知识属性：耕种经验
      'focus'    // 基础属性：专注能力
    );
    const actualYield = Math.max(1, Math.floor(rawAmount * fertilityMod));

    // 高品质会额外产出
    const bonusYield = isHighQuality ? Math.ceil(actualYield * 0.3) : 0;
    const totalYield = actualYield + bonusYield;

    // 重置农田
    plot.state = FIELD_STATE.EMPTY;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.fertility = Math.max(20, plot.fertility - 5);

    // 收获获得较多耕种经验
    character.gainKnowledge('farming', 3);

    // 构建消息
    let message = `收获了 ${actualYield} 单位${crop.name}`;
    if (bonusYield > 0) {
      message += `（丰收！额外 +${bonusYield}）`;
    }

    return {
      success: true,
      message,
      isHighQuality,
      yield: {
        itemId: crop.harvestItem,
        category: crop.category,
        amount: totalYield,
        name: crop.name,
      }
    };
  }

  // 每回合更新
  updatePlots() {
    for (const plot of this.plots) {
      if (plot.state === FIELD_STATE.PLANTED) {
        plot.state = FIELD_STATE.GROWING;
        plot.growthProgress = 10;
      } else if (plot.state === FIELD_STATE.GROWING) {
        const crop = plot.getCropDef();
        if (!crop) continue;

        const waterMod = plot.waterLevel > 30 ? 1 : 0.3;
        const growthPerTurn = (100 / crop.growthTime) * waterMod;
        plot.growthProgress = Math.min(100, plot.growthProgress + growthPerTurn);

        plot.waterLevel = Math.max(0, plot.waterLevel - 15);

        if (plot.growthProgress >= 100) {
          plot.state = FIELD_STATE.READY;
        }

        if (plot.waterLevel <= 0 && Math.random() < 0.2) {
          plot.state = FIELD_STATE.WITHERED;
        }
      }
    }
  }

  expandFarm() {
    if (this.plots.length >= this.maxPlots) {
      return { success: false, message: '农田数量已达上限' };
    }
    const newId = `plot_${this.plots.length + 1}`;
    this.plots.push(new FarmPlot(newId));
    return { success: true, message: '成功开垦了一块新农田' };
  }
}
