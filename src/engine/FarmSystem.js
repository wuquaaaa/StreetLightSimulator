/**
 * 农田系统 - 路灯计划
 *
 * 核心机制：
 * - 小麦10天（100 tick）长成
 * - 肥力基准60：<60减产，>60增产，可通过施肥提高
 * - 水分<60 开始减产
 * - 病虫害随机出现，会传染相邻农田，出现即减产，时间越久减产越多
 * - 杂草在有作物后积累生长值，正常50tick出现
 * - 减产是永久性的！问题出现后即使解决，减产系数不会恢复
 * - 除草按钮常驻：没杂草时减少杂草生长值，有杂草时清除杂草
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
    this.name = `农田 ${index}`;   // 可编辑名称
    this.state = FIELD_STATE.EMPTY;
    this.cropId = null;
    this.growthProgress = 0;   // 0-100
    this.waterLevel = 50;
    this.fertility = 60 + Math.floor(Math.random() * 30);

    // 永久增/减产系数：1.0=基础，只会因为事件而改变，不可恢复
    this.permanentYieldMod = 1.0;

    // 病虫害
    this.hasPest = false;
    this.pestSeverity = 0;      // 严重程度 0-100
    this.pestClicks = 0;        // 清除所需点击数
    this._pestPenaltyApplied = false; // 是否已施加永久减产

    // 杂草
    this.weedGrowth = 0;        // 杂草生长积累值 0-100
    this.hasWeeds = false;
    this.weedLevel = 0;
    this.weedClicks = 0;
    this._weedPenaltyApplied = false;
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
      // 0→0.4, 60→1.0
      return 0.4 + (this.fertility / 60) * 0.6;
    } else {
      // 60→1.0, 100→1.3
      return 1.0 + ((this.fertility - 60) / 40) * 0.3;
    }
  }

  /**
   * 当前临时减产系数（水分、病虫害、杂草的实时影响）
   * 这个不直接用于最终产量，而是用于UI显示当前状态
   */
  getCurrentPenalties() {
    let waterPenalty = 0;
    let pestPenalty = 0;
    let weedPenalty = 0;

    if (this.waterLevel < 60) {
      waterPenalty = (1 - this.waterLevel / 60) * 0.6; // 最多减60%
    }
    if (this.hasPest) {
      pestPenalty = this.pestSeverity / 100 * 0.8; // 最多减80%
    }
    if (this.hasWeeds) {
      weedPenalty = Math.min(this.weedLevel / 150, 1) * 0.7; // 最多减70%
    }

    return { waterPenalty, pestPenalty, weedPenalty };
  }

  /**
   * 综合产量系数 = 永久系数 × 肥力系数 × 当前临时系数
   */
  getYieldModifier() {
    const fertMod = this.getFertilityModifier();
    const penalties = this.getCurrentPenalties();
    const tempMod = Math.max(0.1, 1 - penalties.waterPenalty - penalties.pestPenalty - penalties.weedPenalty);
    return this.permanentYieldMod * fertMod * tempMod;
  }

  /**
   * 增/减产百分比显示值：正数=增产，负数=减产
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

  // 重命名农田
  renamePlot(plotId, newName) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    const trimmed = newName.trim().slice(0, 10);
    if (!trimmed) return { success: false, message: '名字不能为空' };
    plot.name = trimmed;
    return { success: true, message: `已重命名为 ${trimmed}` };
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
    plot._pestPenaltyApplied = false;
    plot.weedGrowth = 0;
    plot.hasWeeds = false;
    plot.weedLevel = 0;
    plot.weedClicks = 0;
    plot._weedPenaltyApplied = false;
    // permanentYieldMod 保留！不重置

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
    plot._weedPenaltyApplied = false;

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

  // 施肥
  fertilize(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state === FIELD_STATE.EMPTY) {
      return { success: false, message: '空地不需要施肥' };
    }
    if (plot.fertility >= 100) {
      return { success: false, message: '肥力已满' };
    }
    plot.fertility = Math.min(100, plot.fertility + 15);
    character.gainKnowledge('farming', 0.5);
    return { success: true, message: `施肥完成，肥力 ${Math.floor(plot.fertility)}` };
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

  // 除草（常驻按钮：有杂草时清除，没杂草时减少生长值）
  removeWeeds(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };

    character.gainKnowledge('farming', 0.2);

    if (plot.hasWeeds) {
      // 有杂草：点击清除
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
      // 没杂草：减少积累值
      plot.weedGrowth = Math.max(0, plot.weedGrowth - 20);
      return { success: true, message: `清理杂草萌芽，生长值 ${Math.floor(plot.weedGrowth)}%` };
    }
  }

  // 收获
  harvest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.READY) return { success: false, message: '作物还没成熟' };

    const crop = plot.getCropDef();
    if (!crop) return { success: false, message: '没有种植作物' };

    // 产出 = 基础产量 × 角色效率 × 综合增减产
    const yieldMod = plot.getYieldModifier();
    const { amount: rawAmount, isHighQuality } = character.calculateOutput(
      crop.baseYield, 'farming', 'focus'
    );
    const actualYield = Math.max(1, Math.floor(rawAmount * yieldMod));
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
    plot._pestPenaltyApplied = false;
    plot.weedGrowth = 0;
    plot.hasWeeds = false;
    plot.weedLevel = 0;
    plot.weedClicks = 0;
    plot._weedPenaltyApplied = false;
    // permanentYieldMod 不重置

    character.gainKnowledge('farming', 3);

    const yieldPct = plot.getYieldPercent !== undefined ? Math.round((yieldMod - 1) * 100) : 0;
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

        // === 作物生长（10天=100tick）===
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
          const weedFertMod = 0.5 + (plot.fertility / 100) * 0.8;
          const weedWaterMod = 0.5 + (plot.waterLevel / 100) * 0.8;
          plot.weedGrowth += 2 * weedFertMod * weedWaterMod;

          if (plot.weedGrowth >= 100) {
            plot.hasWeeds = true;
            plot.weedLevel = 1;
            plot.weedClicks = 3 + Math.floor(Math.random() * 3);
            // 杂草出现 → 永久减产
            if (!plot._weedPenaltyApplied) {
              plot.permanentYieldMod = Math.max(0.1, plot.permanentYieldMod - 0.05);
              plot._weedPenaltyApplied = true;
            }
            events.push({ type: 'weed', plotId: plot.id });
          }
        } else {
          plot.weedLevel = Math.min(150, plot.weedLevel + 0.5);
          // 杂草越严重，额外永久减产（每30级追加一次）
          if (plot.weedLevel > 0 && Math.floor(plot.weedLevel) % 30 === 0 && plot.weedLevel - Math.floor(plot.weedLevel) < 0.5) {
            plot.permanentYieldMod = Math.max(0.1, plot.permanentYieldMod - 0.02);
          }
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
          // 病虫害出现 → 永久减产
          if (!plot._pestPenaltyApplied) {
            plot.permanentYieldMod = Math.max(0.1, plot.permanentYieldMod - 0.05);
            plot._pestPenaltyApplied = true;
          }
          events.push({ type: 'pest', plotId: plot.id });
        }

        // 病虫害恶化
        if (plot.hasPest) {
          plot.pestSeverity = Math.min(100, plot.pestSeverity + 0.5);
          // 严重度每到达新的25，追加永久减产
          if (plot.pestSeverity > 0 && Math.floor(plot.pestSeverity) % 25 === 0 && plot.pestSeverity - Math.floor(plot.pestSeverity) < 0.5) {
            plot.permanentYieldMod = Math.max(0.1, plot.permanentYieldMod - 0.03);
          }
        }
      }

      // 成熟的作物也会受影响
      if (plot.state === FIELD_STATE.READY) {
        if (plot.hasPest) {
          plot.pestSeverity = Math.min(100, plot.pestSeverity + 0.3);
        }
        if (plot.hasWeeds) {
          plot.weedLevel = Math.min(150, plot.weedLevel + 0.3);
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
          if (!neighbor._pestPenaltyApplied) {
            neighbor.permanentYieldMod = Math.max(0.1, neighbor.permanentYieldMod - 0.05);
            neighbor._pestPenaltyApplied = true;
          }
          events.push({ type: 'pest_spread', plotId: neighbor.id, fromPlotId: plot.id });
        }
      }
    }

    return events;
  }

  // 开垦新田（无上限）
  expandFarm() {
    const index = this.plots.length + 1;
    const newId = `plot_${index}`;
    this.plots.push(new FarmPlot(newId, index));
    return { success: true, message: '成功开垦了一块新农田' };
  }
}
