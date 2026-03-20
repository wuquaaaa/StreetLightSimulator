/**
 * 农田系统 - 路灯计划
 * 时间自动流逝，水分和肥力自然流失，作物自动生长
 * 病虫害随机出现，需要玩家多次点击消除
 */

import { CROPS } from '../data/crops';

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

    // 病虫害系统
    this.pest = false;        // 是否有病虫害
    this.pestLevel = 0;       // 病虫害严重程度（需要点击这么多次才能清除）
    this.pestClicksNeeded = 0; // 总共需要点击次数
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

  // 翻地（无体力消耗）
  plow(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.EMPTY && plot.state !== FIELD_STATE.WITHERED) {
      return { success: false, message: '这块地无法翻耕' };
    }

    plot.state = FIELD_STATE.PLOWED;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.pest = false;
    plot.pestLevel = 0;

    character.gainKnowledge('farming', 1);
    return { success: true, message: '翻地完成' };
  }

  // 播种（通过弹窗选择种子后调用）
  plant(plotId, cropId, character, warehouse) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.PLOWED) {
      return { success: false, message: '需要先翻地' };
    }

    const crop = CROPS.find(c => c.id === cropId);
    if (!crop) return { success: false, message: '未知作物' };

    // 检查种子是否足够
    const seedId = crop.seedId;
    const seedAmount = warehouse.getItemAmount('seed', seedId);
    if (seedAmount < crop.seedCost) {
      return { success: false, message: `${crop.seedName}不足！需要${crop.seedCost}个` };
    }

    // 消耗种子
    warehouse.removeItem('seed', seedId, crop.seedCost);

    plot.state = FIELD_STATE.PLANTED;
    plot.cropId = cropId;
    plot.growthProgress = 0;

    character.gainKnowledge('farming', 2);
    return { success: true, message: `播种了${crop.name}，消耗了${crop.seedCost}个${crop.seedName}` };
  }

  // 浇水
  water(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.PLANTED && plot.state !== FIELD_STATE.GROWING) {
      return { success: false, message: '这块地不需要浇水' };
    }

    plot.waterLevel = Math.min(100, plot.waterLevel + 30);
    character.gainKnowledge('farming', 0.5);
    return { success: true, message: '浇水完成' };
  }

  // 除虫 — 每次点击减少1级，到0时清除
  removePest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (!plot.pest) return { success: false, message: '没有病虫害' };

    plot.pestLevel--;
    character.gainKnowledge('farming', 0.3);

    if (plot.pestLevel <= 0) {
      plot.pest = false;
      plot.pestLevel = 0;
      plot.pestClicksNeeded = 0;
      return { success: true, message: '病虫害已清除！', cleared: true };
    }

    return {
      success: true,
      message: `正在除虫...还需要${plot.pestLevel}次`,
      cleared: false,
    };
  }

  // 收获
  harvest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.READY) {
      return { success: false, message: '作物还没成熟' };
    }

    const crop = plot.getCropDef();
    if (!crop) return { success: false, message: '没有种植作物' };

    // 产出计算：基础属性 × 知识属性 联合影响
    const fertilityMod = 0.5 + (plot.fertility / 100) * 0.8;
    const { amount: rawAmount, isHighQuality } = character.calculateOutput(
      crop.baseYield, 'farming', 'focus'
    );
    const actualYield = Math.max(1, Math.floor(rawAmount * fertilityMod));
    const bonusYield = isHighQuality ? Math.ceil(actualYield * 0.3) : 0;
    const totalYield = actualYield + bonusYield;

    // 收获有概率获得种子返还
    const seedBack = Math.random() < 0.6 ? crop.seedCost : 0;

    // 重置农田
    plot.state = FIELD_STATE.EMPTY;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.fertility = Math.max(20, plot.fertility - 5);

    character.gainKnowledge('farming', 3);

    let message = `收获了 ${actualYield} 单位${crop.name}`;
    if (bonusYield > 0) message += `（丰收！+${bonusYield}）`;
    if (seedBack > 0) message += `，获得${seedBack}个${crop.seedName}`;

    return {
      success: true,
      message,
      isHighQuality,
      yield: { itemId: crop.harvestItem, category: crop.category, amount: totalYield, name: crop.name },
      seedBack: seedBack > 0 ? { itemId: crop.seedId, amount: seedBack, name: crop.seedName } : null,
    };
  }

  // ====== 每个tick自动更新（由定时器驱动） ======
  tick() {
    const events = []; // 收集本次tick产生的事件

    for (const plot of this.plots) {
      // 所有已种植的农田：水分和肥力自然流失
      if (plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) {
        plot.waterLevel = Math.max(0, plot.waterLevel - 3);
        plot.fertility = Math.max(10, plot.fertility - 0.3);
      }

      // 播种后开始生长
      if (plot.state === FIELD_STATE.PLANTED) {
        plot.state = FIELD_STATE.GROWING;
        plot.growthProgress = 5;
      }

      // 生长中的作物
      if (plot.state === FIELD_STATE.GROWING) {
        const crop = plot.getCropDef();
        if (!crop) continue;

        // 水分影响生长速度
        const waterMod = plot.waterLevel > 30 ? 1 : (plot.waterLevel > 10 ? 0.5 : 0.1);
        // 病虫害减缓生长
        const pestMod = plot.pest ? 0.3 : 1;
        const growthPerTick = (100 / (crop.growthTime * 10)) * waterMod * pestMod;
        plot.growthProgress = Math.min(100, plot.growthProgress + growthPerTick);

        // 生长完成
        if (plot.growthProgress >= 100) {
          plot.state = FIELD_STATE.READY;
          events.push({ type: 'ready', plotId: plot.id, cropName: crop.name });
        }

        // 缺水可能枯萎
        if (plot.waterLevel <= 0 && Math.random() < 0.03) {
          plot.state = FIELD_STATE.WITHERED;
          events.push({ type: 'withered', plotId: plot.id });
        }

        // 随机病虫害（只在没有病虫害时触发）
        if (!plot.pest && Math.random() < 0.02) {
          const severity = 3 + Math.floor(Math.random() * 5); // 需要3-7次点击
          plot.pest = true;
          plot.pestLevel = severity;
          plot.pestClicksNeeded = severity;
          events.push({ type: 'pest', plotId: plot.id, severity });
        }
      }
    }

    return events;
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
