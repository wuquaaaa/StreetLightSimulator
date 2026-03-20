/**
 * 农田系统 - 路灯计划
 *
 * 核心机制：
 * - 小麦10天（100 tick）长成
 * - 肥力基准60：<60减产，>60增产，可通过施肥提高
 * - 水分<60：每天永久降低本次作物产量，越低降越多
 * - 杂草>40：每天永久降低本次作物产量，越高降越多
 * - 病虫害出现即永久降产，严重度越高每天降越多
 * - 以上永久减产针对本次种植的作物，重新播种后刷新
 * - 除草按钮常驻：没杂草时减少生长值，有杂草时点击清除
 * - 水分和杂草在未播种时也展示
 * - 开垦农田无上限
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
    this.pestSeverity = 0;
    this.pestClicks = 0;

    // 杂草（任何状态都会积累）
    this.weedGrowth = 0;
    this.hasWeeds = false;
    this.weedLevel = 0;
    this.weedClicks = 0;
  }

  getCropDef() {
    if (!this.cropId) return null;
    return CROPS.find(c => c.id === this.cropId) || null;
  }

  /**
   * 肥力增/减产系数：60为基准(1.0)，<60减产，>60增产
   */
  getFertilityModifier() {
    if (this.fertility <= 60) {
      return 0.4 + (this.fertility / 60) * 0.6;
    } else {
      return 1.0 + ((this.fertility - 60) / 40) * 0.3;
    }
  }

  /**
   * 综合产量系数 = 本次作物累计修正 × 肥力系数
   */
  getYieldModifier() {
    return this.cropYieldMod * this.getFertilityModifier();
  }

  /**
   * 增/减产百分比（用于UI产量条）
   */
  getYieldPercent() {
    return Math.round((this.getYieldModifier() - 1) * 100);
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
    // 杂草和水分保留，不因翻地重置

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
    if (seedAmount < crop.seedCost) {
      return { success: false, message: `${crop.seedName}不足！` };
    }

    warehouse.removeItem('seed', crop.seedId, crop.seedCost);
    plot.state = FIELD_STATE.PLANTED;
    plot.cropId = cropId;
    plot.growthProgress = 0;
    // 播种时产量修正重置
    plot.cropYieldMod = 1.0;

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
    if (plot.fertility >= 100) {
      return { success: false, message: '肥力已满' };
    }
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

  // 除草（常驻按钮）
  removeWeeds(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };

    character.gainKnowledge('farming', 0.2);

    if (plot.hasWeeds) {
      plot.weedClicks--;
      if (plot.weedClicks <= 0) {
        plot.hasWeeds = false;
        plot.weedGrowth = 0;
        plot.weedLevel = 0;
        plot.weedClicks = 0;
        return { success: true, message: '杂草已清除！', cleared: true };
      }
      return { success: true, message: `除草中...还需${plot.weedClicks}次`, cleared: false };
    } else {
      plot.weedGrowth = Math.max(0, plot.weedGrowth - 20);
      return { success: true, message: `清理杂草萌芽，生长值 ${Math.floor(plot.weedGrowth)}%` };
    }
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
    const seedBack = Math.random() < 0.6 ? crop.seedCost : 0;

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
    if (seedBack > 0) message += `，获得${seedBack}个${crop.seedName}`;

    return {
      success: true, message, isHighQuality,
      yield: { itemId: crop.harvestItem, category: crop.category, amount: totalYield, name: crop.name },
      seedBack: seedBack > 0 ? { itemId: crop.seedId, amount: seedBack, name: crop.seedName } : null,
    };
  }

  // ====== 每tick自动更新 ======
  tick() {
    const events = [];
    const isNewDay = false; // caller tells us via tickCount, but we handle daily penalty here

    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];

      // --- 所有非空地状态：水分自然蒸发 ---
      if (plot.state !== FIELD_STATE.EMPTY) {
        plot.waterLevel = Math.max(0, plot.waterLevel - 1.5);
      }

      // --- 有作物的农田：肥力流失 ---
      if (plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) {
        plot.fertility = Math.max(10, plot.fertility - 0.2);
      }

      // 播种→生长
      if (plot.state === FIELD_STATE.PLANTED) {
        plot.state = FIELD_STATE.GROWING;
        plot.growthProgress = 1;
      }

      // --- 杂草积累（所有非空地状态）---
      if (plot.state !== FIELD_STATE.EMPTY && !plot.hasWeeds) {
        const weedFertMod = 0.5 + (plot.fertility / 100) * 0.8;
        const weedWaterMod = 0.5 + (plot.waterLevel / 100) * 0.8;
        plot.weedGrowth += 2 * weedFertMod * weedWaterMod;

        if (plot.weedGrowth >= 100) {
          plot.hasWeeds = true;
          plot.weedLevel = 1;
          plot.weedClicks = 3 + Math.floor(Math.random() * 3);
          events.push({ type: 'weed', plotId: plot.id });
        }
      } else if (plot.hasWeeds) {
        plot.weedLevel = Math.min(150, plot.weedLevel + 0.5);
      }

      if (plot.state === FIELD_STATE.GROWING) {
        const crop = plot.getCropDef();
        if (!crop) continue;

        // === 作物生长 ===
        const waterGrowthMod = plot.waterLevel > 30 ? 1 : (plot.waterLevel > 10 ? 0.5 : 0.1);
        const pestGrowthMod = plot.hasPest ? 0.5 : 1;
        const weedGrowthMod = plot.hasWeeds ? 0.7 : 1;
        const growthPerTick = 1 * waterGrowthMod * pestGrowthMod * weedGrowthMod;
        plot.growthProgress = Math.min(100, plot.growthProgress + growthPerTick);

        if (plot.growthProgress >= 100) {
          plot.state = FIELD_STATE.READY;
          events.push({ type: 'ready', plotId: plot.id, cropName: crop.name });
        }

        // === 每tick的永久减产（模拟每天） ===
        // 水分<60：每tick减 0.1%~0.6%（10tick=1天，每天减1%~6%）
        if (plot.waterLevel < 60) {
          const waterDeficit = (60 - plot.waterLevel) / 60; // 0~1
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - waterDeficit * 0.006);
        }

        // 杂草>40：每tick减 0~0.5%（每天减0~5%）
        if (plot.weedGrowth > 40 || plot.hasWeeds) {
          const weedSeverity = plot.hasWeeds
            ? 0.4 + (plot.weedLevel / 150) * 0.6  // 0.4~1.0
            : (plot.weedGrowth - 40) / 60 * 0.4;   // 0~0.4
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - weedSeverity * 0.005);
        }

        // 病虫害：每tick减产
        if (plot.hasPest) {
          const pestPenalty = (plot.pestSeverity / 100) * 0.008;
          plot.cropYieldMod = Math.max(0.1, plot.cropYieldMod - pestPenalty);
        }

        // === 缺水枯萎 ===
        if (plot.waterLevel <= 0 && Math.random() < 0.02) {
          plot.state = FIELD_STATE.WITHERED;
          events.push({ type: 'withered', plotId: plot.id });
          continue;
        }

        // === 病虫害随机出现 ===
        if (!plot.hasPest && Math.random() < 0.008) {
          plot.hasPest = true;
          plot.pestSeverity = 5;
          plot.pestClicks = 3 + Math.floor(Math.random() * 5);
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
        if (plot.hasWeeds) {
          plot.weedLevel = Math.min(150, plot.weedLevel + 0.3);
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
}
