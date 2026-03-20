/**
 * 农田系统 - 路灯计划
 *
 * 核心机制：
 * - 小麦10天（100 tick）长成，肥力和水分影响产量
 * - 水分<60 开始减产，越低减越多
 * - 病虫害随机出现，会传染相邻农田，出现即减产，时间越久减产越多
 * - 杂草在有作物后积累生长值，正常50 tick开始出现，肥力水分影响生长速度
 * - 杂草出现后也会减产
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
  constructor(id) {
    this.id = id;
    this.state = FIELD_STATE.EMPTY;
    this.cropId = null;
    this.growthProgress = 0;   // 0-100
    this.waterLevel = 50;
    this.fertility = 60 + Math.floor(Math.random() * 30);

    // 病虫害
    this.hasPest = false;       // 是否有病虫害
    this.pestSeverity = 0;      // 严重程度 0-100，随时间增加
    this.pestClicks = 0;        // 需要点击次数才能清除

    // 杂草
    this.weedGrowth = 0;        // 杂草生长积累值 0-100
    this.hasWeeds = false;      // 杂草是否已出现（weedGrowth >= 100）
    this.weedLevel = 0;         // 杂草茂盛程度，出现后持续增长
    this.weedClicks = 0;        // 清除所需点击数
  }

  getCropDef() {
    if (!this.cropId) return null;
    return CROPS.find(c => c.id === this.cropId) || null;
  }

  /**
   * 计算减产系数 (0~1, 1=无减产)
   */
  getYieldModifier() {
    let mod = 1.0;

    // 水分减产：<60开始，越低越严重
    if (this.waterLevel < 60) {
      mod *= 0.4 + (this.waterLevel / 60) * 0.6; // 水分0→0.4倍, 水分60→1.0倍
    }

    // 病虫害减产：出现即减产，severity越高减越多
    if (this.hasPest) {
      mod *= Math.max(0.2, 1 - this.pestSeverity / 100); // severity 0→1.0, 100→0.2
    }

    // 杂草减产
    if (this.hasWeeds) {
      mod *= Math.max(0.3, 1 - this.weedLevel / 150); // weedLevel 0→1.0, 150→0.3
    }

    return mod;
  }
}

export class FarmSystem {
  constructor() {
    this.plots = [
      new FarmPlot('plot_1'),
      new FarmPlot('plot_2'),
    ];
  }

  // 翻地
  plow(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.EMPTY && plot.state !== FIELD_STATE.WITHERED) {
      return { success: false, message: '这块地无法翻耕' };
    }

    plot.state = FIELD_STATE.PLOWED;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.hasPest = false;
    plot.pestSeverity = 0;
    plot.pestClicks = 0;
    plot.weedGrowth = 0;
    plot.hasWeeds = false;
    plot.weedLevel = 0;
    plot.weedClicks = 0;

    character.gainKnowledge('farming', 1);
    return { success: true, message: '翻地完成' };
  }

  // 播种
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
    plot.weedGrowth = 0;
    plot.hasWeeds = false;
    plot.weedLevel = 0;

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
    plot.waterLevel = Math.min(100, plot.waterLevel + 30);
    character.gainKnowledge('farming', 0.5);
    return { success: true, message: '浇水完成' };
  }

  // 除虫
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

  // 除草
  removeWeeds(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || !plot.hasWeeds) return { success: false, message: '没有杂草' };

    plot.weedClicks--;
    character.gainKnowledge('farming', 0.3);

    if (plot.weedClicks <= 0) {
      plot.hasWeeds = false;
      plot.weedGrowth = 0;
      plot.weedLevel = 0;
      plot.weedClicks = 0;
      return { success: true, message: '杂草已清除！', cleared: true };
    }
    return { success: true, message: `除草中...还需${plot.weedClicks}次`, cleared: false };
  }

  // 收获
  harvest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.READY) return { success: false, message: '作物还没成熟' };

    const crop = plot.getCropDef();
    if (!crop) return { success: false, message: '没有种植作物' };

    // 产出 = 基础产量 × 角色效率 × 肥力修正 × 减产系数
    const fertilityMod = 0.5 + (plot.fertility / 100) * 0.8;
    const yieldMod = plot.getYieldModifier();
    const { amount: rawAmount, isHighQuality } = character.calculateOutput(
      crop.baseYield, 'farming', 'focus'
    );
    const actualYield = Math.max(1, Math.floor(rawAmount * fertilityMod * yieldMod));
    const bonusYield = isHighQuality ? Math.ceil(actualYield * 0.3) : 0;
    const totalYield = actualYield + bonusYield;
    const seedBack = Math.random() < 0.6 ? crop.seedCost : 0;

    // 重置
    plot.state = FIELD_STATE.EMPTY;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.fertility = Math.max(20, plot.fertility - 5);
    plot.hasPest = false;
    plot.pestSeverity = 0;
    plot.pestClicks = 0;
    plot.weedGrowth = 0;
    plot.hasWeeds = false;
    plot.weedLevel = 0;
    plot.weedClicks = 0;

    character.gainKnowledge('farming', 3);

    let message = `收获了 ${actualYield} 单位${crop.name}`;
    if (yieldMod < 0.8) message += `（减产 ${Math.round((1 - yieldMod) * 100)}%）`;
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

    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];

      // 有作物的农田：水分和肥力流失
      if (plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) {
        plot.waterLevel = Math.max(0, plot.waterLevel - 2);
        plot.fertility = Math.max(10, plot.fertility - 0.2);
      }

      // 播种→生长
      if (plot.state === FIELD_STATE.PLANTED) {
        plot.state = FIELD_STATE.GROWING;
        plot.growthProgress = 1;
      }

      if (plot.state === FIELD_STATE.GROWING) {
        const crop = plot.getCropDef();
        if (!crop) continue;

        // === 作物生长（10天=100tick） ===
        const waterGrowthMod = plot.waterLevel > 30 ? 1 : (plot.waterLevel > 10 ? 0.5 : 0.1);
        const pestGrowthMod = plot.hasPest ? 0.5 : 1;
        const weedGrowthMod = plot.hasWeeds ? 0.7 : 1;
        const growthPerTick = 1 * waterGrowthMod * pestGrowthMod * weedGrowthMod;
        plot.growthProgress = Math.min(100, plot.growthProgress + growthPerTick);

        if (plot.growthProgress >= 100) {
          plot.state = FIELD_STATE.READY;
          events.push({ type: 'ready', plotId: plot.id, cropName: crop.name });
        }

        // === 杂草生长积累 ===
        if (!plot.hasWeeds) {
          // 正常50tick出现，肥力水分越高杂草越快（杂草也吃养分）
          const weedFertMod = 0.5 + (plot.fertility / 100) * 0.8;
          const weedWaterMod = 0.5 + (plot.waterLevel / 100) * 0.8;
          plot.weedGrowth += 2 * weedFertMod * weedWaterMod;

          if (plot.weedGrowth >= 100) {
            plot.hasWeeds = true;
            plot.weedLevel = 1;
            plot.weedClicks = 3 + Math.floor(Math.random() * 3); // 3-5次
            events.push({ type: 'weed', plotId: plot.id });
          }
        } else {
          // 杂草持续茂盛
          plot.weedLevel = Math.min(150, plot.weedLevel + 0.5);
        }

        // === 缺水枯萎 ===
        if (plot.waterLevel <= 0 && Math.random() < 0.02) {
          plot.state = FIELD_STATE.WITHERED;
          events.push({ type: 'withered', plotId: plot.id });
          continue;
        }

        // === 病虫害 ===
        if (!plot.hasPest && Math.random() < 0.008) {
          // 随机发病
          plot.hasPest = true;
          plot.pestSeverity = 5;
          plot.pestClicks = 3 + Math.floor(Math.random() * 5); // 3-7次
          events.push({ type: 'pest', plotId: plot.id });
        }

        // 病虫害恶化
        if (plot.hasPest) {
          plot.pestSeverity = Math.min(100, plot.pestSeverity + 0.5);
        }
      }

      // 成熟的作物也会受病虫害和杂草影响
      if (plot.state === FIELD_STATE.READY) {
        if (plot.hasPest) {
          plot.pestSeverity = Math.min(100, plot.pestSeverity + 0.3);
        }
        if (plot.hasWeeds) {
          plot.weedLevel = Math.min(150, plot.weedLevel + 0.3);
        }
      }
    }

    // === 病虫害传染：向相邻农田扩散 ===
    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      if (!plot.hasPest || plot.pestSeverity < 30) continue; // 严重度>30才传染

      // 传染相邻（前后）
      const neighbors = [this.plots[i - 1], this.plots[i + 1]].filter(Boolean);
      for (const neighbor of neighbors) {
        if (neighbor.hasPest) continue;
        if (neighbor.state !== FIELD_STATE.GROWING && neighbor.state !== FIELD_STATE.READY) continue;

        // 传染概率随严重度增加
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

  // 开垦新田（无上限）
  expandFarm() {
    const newId = `plot_${this.plots.length + 1}`;
    this.plots.push(new FarmPlot(newId));
    return { success: true, message: '成功开垦了一块新农田' };
  }
}
