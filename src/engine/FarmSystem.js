/**
 * 农田系统 - 路灯计划
 *
 * 核心机制：
 * - 小麦10天（100 tick）长成
 * - 肥力基准60：<60减产，>60增产
 * - 水分<60：每天永久降低本次作物产量
 * - 杂草>40：每天永久降低本次作物产量
 * - 杂草生长值0-100，满100后保持100，点击除草减20（与浇水相同逻辑）
 * - 病虫害出现立即减产5%，之后每天持续减产
 * - 以上永久减产针对本次作物，重新播种后刷新
 * - 收获后根据产量随机获得1-2颗种子
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
  constructor(id, index) {
    this.id = id;
    this.name = `农田 ${index}`;
    this.state = FIELD_STATE.EMPTY;
    this.cropId = null;
    this.growthProgress = 0;
    this.waterLevel = 50;
    this.fertility = 60 + Math.floor(Math.random() * 30);

    // 本次作物的累计产量修正（播种时重置为1.0）
    this.cropYieldMod = 1.0;

    // 病虫害
    this.hasPest = false;
    this.pestSeverity = 0;      // 严重度 0-100，影响恶化速度
    this.pestClicks = 0;        // 剩余点击次数

    // 杂草：生长值 0-100，满后保持100
    this.weedGrowth = 0;
  }

  getCropDef() {
    if (!this.cropId) return null;
    return CROPS.find(c => c.id === this.cropId) || null;
  }

  getFertilityModifier() {
    if (this.fertility <= 60) {
      return 0.4 + (this.fertility / 60) * 0.6;
    } else {
      return 1.0 + ((this.fertility - 60) / 40) * 0.3;
    }
  }

  getYieldModifier() {
    return this.cropYieldMod * this.getFertilityModifier();
  }

  getYieldPercent() {
    return Math.round((this.getYieldModifier() - 1) * 100);
  }

  // 序列化
  toJSON() {
    return {
      id: this.id, name: this.name, state: this.state, cropId: this.cropId,
      growthProgress: this.growthProgress, waterLevel: this.waterLevel,
      fertility: this.fertility, cropYieldMod: this.cropYieldMod,
      hasPest: this.hasPest, pestSeverity: this.pestSeverity, pestClicks: this.pestClicks,
      weedGrowth: this.weedGrowth,
    };
  }

  static fromJSON(data) {
    const plot = new FarmPlot(data.id, 0);
    Object.assign(plot, data);
    return plot;
  }
}

export class FarmSystem {
  constructor() {
    this.plots = [
      new FarmPlot('plot_1', 1),
      new FarmPlot('plot_2', 2),
    ];
  }

  renamePlot(plotId, newName) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    const trimmed = newName.trim().slice(0, 10);
    if (!trimmed) return { success: false, message: '名字不能为空' };
    plot.name = trimmed;
    return { success: true, message: `已重命名为 ${trimmed}` };
  }

  plow(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.EMPTY && plot.state !== FIELD_STATE.WITHERED) {
      return { success: false, message: '这块地无法翻耕' };
    }
    plot.state = FIELD_STATE.PLOWED;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.cropYieldMod = 1.0;
    plot.hasPest = false;
    plot.pestSeverity = 0;
    plot.pestClicks = 0;
    character.gainKnowledge('farming', 1);
    return { success: true, message: '翻地完成' };
  }

  plant(plotId, cropId, character, warehouse) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.PLOWED) return { success: false, message: '需要先翻地' };
    const crop = CROPS.find(c => c.id === cropId);
    if (!crop) return { success: false, message: '未知作物' };
    const seedAmount = warehouse.getItemAmount('seed', crop.seedId);
    if (seedAmount < crop.seedCost) return { success: false, message: `${crop.seedName}不足！` };

    warehouse.removeItem('seed', crop.seedId, crop.seedCost);
    plot.state = FIELD_STATE.PLANTED;
    plot.cropId = cropId;
    plot.growthProgress = 0;
    plot.cropYieldMod = 1.0; // 播种重置
    character.gainKnowledge('farming', 2);
    return { success: true, message: `播种了${crop.name}` };
  }

  water(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    plot.waterLevel = Math.min(100, plot.waterLevel + 30);
    character.gainKnowledge('farming', 0.5);
    return { success: true, message: '浇水完成' };
  }

  fertilize(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.fertility >= 100) return { success: false, message: '肥力已满' };
    plot.fertility = Math.min(100, plot.fertility + 15);
    character.gainKnowledge('farming', 0.5);
    return { success: true, message: `施肥完成，肥力 ${Math.floor(plot.fertility)}` };
  }

  removePest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || !plot.hasPest) return { success: false, message: '没有病虫害' };
    plot.pestClicks--;
    character.gainKnowledge('farming', 0.3);
    if (plot.pestClicks <= 0) {
      plot.hasPest = false;
      plot.pestSeverity = 0;
      plot.pestClicks = 0;
      return { success: true, message: '病虫害已清除！', cleared: true };
    }
    return { success: true, message: `除虫中...还需${plot.pestClicks}次`, cleared: false };
  }

  // 除草：单次点击减少20杂草生长值（与浇水同逻辑）
  removeWeeds(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    plot.weedGrowth = Math.max(0, plot.weedGrowth - 20);
    character.gainKnowledge('farming', 0.2);
    return { success: true, message: `除草完成，杂草 ${Math.floor(plot.weedGrowth)}` };
  }

  harvest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.READY) return { success: false, message: '作物还没成熟' };
    const crop = plot.getCropDef();
    if (!crop) return { success: false, message: '没有种植作物' };

    const yieldMod = plot.getYieldModifier();
    const { amount: rawAmount, isHighQuality } = character.calculateOutput(
      crop.baseYield, 'farming', 'focus'
    );
    const actualYield = Math.max(1, Math.floor(rawAmount * yieldMod));
    const bonusYield = isHighQuality ? Math.ceil(actualYield * 0.3) : 0;
    const totalYield = actualYield + bonusYield;

    // 种子掉落：根据产量
    const baseYield = crop.baseYield || 5;
    const yieldRatio = totalYield / baseYield;
    let seedBack;
    if (yieldRatio >= 1.2) {
      seedBack = Math.random() < 0.6 ? 2 : 1;
    } else if (yieldRatio >= 0.8) {
      seedBack = Math.random() < 0.2 ? 2 : 1;
    } else {
      seedBack = Math.random() < 0.1 ? 2 : 1;
    }

    const yieldPct = Math.round((yieldMod - 1) * 100);

    // 重置
    plot.state = FIELD_STATE.EMPTY;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.fertility = Math.max(20, plot.fertility - 5);
    plot.cropYieldMod = 1.0;
    plot.hasPest = false;
    plot.pestSeverity = 0;
    plot.pestClicks = 0;
    // 杂草和水分保留

    character.gainKnowledge('farming', 3);

    let message = `收获了 ${totalYield} 单位${crop.name}`;
    if (yieldPct < -5) message += `（减产 ${Math.abs(yieldPct)}%）`;
    if (yieldPct > 5) message += `（增产 ${yieldPct}%）`;
    if (bonusYield > 0) message += `（丰收！+${bonusYield}）`;
    message += `，获得${seedBack}颗${crop.seedName}`;

    return {
      success: true, message, isHighQuality,
      yield: { itemId: crop.harvestItem, category: crop.category, amount: totalYield, name: crop.name },
      seedBack: { itemId: crop.seedId, amount: seedBack, name: crop.seedName },
    };
  }

  // ====== 每tick自动更新 ======
  tick() {
    const events = [];

    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];

      // --- 水分自然蒸发 ---
      plot.waterLevel = Math.max(0, plot.waterLevel - 1.5);

      // --- 有作物：肥力流失 ---
      if (plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) {
        plot.fertility = Math.max(10, plot.fertility - 0.2);
      }

      // 播种→生长
      if (plot.state === FIELD_STATE.PLANTED) {
        plot.state = FIELD_STATE.GROWING;
        plot.growthProgress = 1;
      }

      // --- 杂草生长（所有状态，上限100）---
      if (plot.weedGrowth < 100) {
        const weedFertMod = 0.5 + (plot.fertility / 100) * 0.8;
        const weedWaterMod = 0.5 + (plot.waterLevel / 100) * 0.8;
        plot.weedGrowth = Math.min(100, plot.weedGrowth + 2 * weedFertMod * weedWaterMod);
      }

      if (plot.state === FIELD_STATE.GROWING) {
        const crop = plot.getCropDef();
        if (!crop) continue;

        // === 作物生长 ===
        const waterGrowthMod = plot.waterLevel > 30 ? 1 : (plot.waterLevel > 10 ? 0.5 : 0.1);
        const pestGrowthMod = plot.hasPest ? 0.5 : 1;
        const weedGrowthMod = plot.weedGrowth > 40 ? (1 - (plot.weedGrowth - 40) / 200) : 1; // max 0.7
        const growthPerTick = 1 * waterGrowthMod * pestGrowthMod * weedGrowthMod;
        plot.growthProgress = Math.min(100, plot.growthProgress + growthPerTick);

        if (plot.growthProgress >= 100) {
          plot.state = FIELD_STATE.READY;
          events.push({ type: 'ready', plotId: plot.id, cropName: crop.name });
        }

        // === 每tick永久减产 ===
        // 水分<60
        if (plot.waterLevel < 60) {
          const waterDeficit = (60 - plot.waterLevel) / 60;
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - waterDeficit * 0.006);
        }
        // 杂草>40
        if (plot.weedGrowth > 40) {
          const weedSeverity = (plot.weedGrowth - 40) / 60; // 0~1
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - weedSeverity * 0.005);
        }
        // 病虫害
        if (plot.hasPest) {
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - (plot.pestSeverity / 100) * 0.008);
        }

        // === 缺水枯萎 ===
        if (plot.waterLevel <= 0 && Math.random() < 0.02) {
          plot.state = FIELD_STATE.WITHERED;
          events.push({ type: 'withered', plotId: plot.id });
          continue;
        }

        // === 病虫害随机出现（立即减产5%）===
        if (!plot.hasPest && Math.random() < 0.008) {
          plot.hasPest = true;
          plot.pestSeverity = 5;
          plot.pestClicks = 3 + Math.floor(Math.random() * 5); // 3-7次
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - 0.05);
          events.push({ type: 'pest', plotId: plot.id });
        }

        // 病虫害恶化
        if (plot.hasPest) {
          plot.pestSeverity = Math.min(100, plot.pestSeverity + 0.5);
        }
      }

      // 成熟后继续恶化
      if (plot.state === FIELD_STATE.READY) {
        if (plot.hasPest) {
          plot.pestSeverity = Math.min(100, plot.pestSeverity + 0.3);
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - (plot.pestSeverity / 100) * 0.005);
        }
        if (plot.weedGrowth > 40) {
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - 0.002);
        }
      }
    }

    // === 病虫害传染 ===
    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      if (!plot.hasPest || plot.pestSeverity < 30) continue;
      const neighbors = [this.plots[i - 1], this.plots[i + 1]].filter(Boolean);
      for (const neighbor of neighbors) {
        if (neighbor.hasPest) continue;
        if (neighbor.state !== FIELD_STATE.GROWING && neighbor.state !== FIELD_STATE.READY) continue;
        const spreadChance = (plot.pestSeverity / 100) * 0.01;
        if (Math.random() < spreadChance) {
          neighbor.hasPest = true;
          neighbor.pestSeverity = 5;
          neighbor.pestClicks = 3 + Math.floor(Math.random() * 4);
          neighbor.cropYieldMod = Math.max(0.1, neighbor.cropYieldMod - 0.05);
          events.push({ type: 'pest_spread', plotId: neighbor.id, fromPlotId: plot.id });
        }
      }
    }

    return events;
  }

  expandFarm() {
    const index = this.plots.length + 1;
    const newId = `plot_${index}`;
    this.plots.push(new FarmPlot(newId, index));
    return { success: true, message: '成功开垦了一块新农田' };
  }

  // 序列化
  toJSON() {
    return { plots: this.plots.map(p => p.toJSON()) };
  }

  static fromJSON(data) {
    const farm = new FarmSystem();
    farm.plots = data.plots.map(p => FarmPlot.fromJSON(p));
    return farm;
  }
}
