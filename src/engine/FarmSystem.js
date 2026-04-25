/**
 * 农田系统 - 路灯计划
 *
 * 核心机制：
 * - 小麦10天（100 tick）长成
 * - 肥力基准60：<60每天减产（0肥减更多），>60每天增产（60→100加速增产）
 * - 水分<60：每天永久降低本次作物产量
 * - 杂草>40：每天永久降低本次作物产量
 * - 杂草生长值0-100，满100后保持100，点击除草减20（与浇水相同逻辑）
 * - 病虫害出现立即减产5%，之后每天持续减产
 * - 以上永久减产针对本次作物，重新播种后刷新
 * - 收获后根据产量随机获得1-2颗种子
 */

import { CROPS } from '../data/crops';
import {
  TICKS_PER_DAY,
  FERTILITY_BASE, FERTILITY_INITIAL_MIN, FERTILITY_INITIAL_RANGE, FERTILITY_DRAIN_RATE,
  FERTILITY_ADD_AMOUNT, FERTILITY_HARVEST_COST, FERTILITY_MIN, FERTILITY_MIN_FOR_GROWTH,
  WATER_EVAPORATION_RATE, WATER_ADD_AMOUNT, WATER_LOW_THRESHOLD,
  WATER_CRITICAL_THRESHOLD, WATER_VERY_LOW_THRESHOLD,
  WEED_THRESHOLD, WEED_GROWTH_BASE, WEED_REMOVE_AMOUNT,
  YIELD_WATER_DEFICIT_RATE, YIELD_WEED_SEVERITY_RATE, YIELD_PEST_TICK_RATE,
  YIELD_PEST_IMMEDIATE, YIELD_READY_PEST_RATE, YIELD_READY_WEED_RATE,
  YIELD_FERTILITY_HIGH_BONUS, YIELD_FERTILITY_LOW_PENALTY,
  FARM_MAX_CROP_YIELD_MOD, FARM_MIN_CROP_YIELD_MOD,
  PEST_SPAWN_CHANCE, PEST_SPREAD_BASE, PEST_INITIAL_SEVERITY_MIN,
  PEST_INITIAL_SEVERITY_RANGE, PEST_SPREAD_SEVERITY_RANGE,
  PEST_SPREAD_MIN_SEVERITY, PEST_YIELD_PENALTY_SCALE,
  FARM_EXPAND_TICKS, FARM_INITIAL_PLOT_COUNT,
} from './constants';

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
    this.fertility = FERTILITY_INITIAL_MIN + Math.floor(Math.random() * FERTILITY_INITIAL_RANGE);

    // 本次作物的累计产量修正（播种时重置为1.0）
    this.cropYieldMod = 1.0;

    // 病虫害：severity 就是剩余点击次数
    this.hasPest = false;
    this.pestSeverity = 0;      // 需要点击的次数（也是进度条值）

    // 杂草：生长值 0-100，满后保持100
    this.weedGrowth = 0;

    // 分配给哪些角色管理（角色id数组，支持多人）
    this.assignedTo = [];
  }

  getCropDef() {
    if (!this.cropId) return null;
    return CROPS.find(c => c.id === this.cropId) || null;
  }

  getFertilityModifier() {
    if (this.fertility <= FERTILITY_BASE) {
      return 0.4 + (this.fertility / FERTILITY_BASE) * 0.6;
    } else {
      return 1.0 + ((this.fertility - FERTILITY_BASE) / 40) * 0.3;
    }
  }

  getYieldModifier() {
    // 产量只由 cropYieldMod 决定（肥力通过每日修正间接影响 cropYieldMod）
    return this.cropYieldMod;
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
      hasPest: this.hasPest, pestSeverity: this.pestSeverity,
      weedGrowth: this.weedGrowth, assignedTo: this.assignedTo,
    };
  }

  static fromJSON(data) {
    const plot = new FarmPlot(data.id, 0);
    Object.assign(plot, data);
    // 兼容旧存档：assignedTo 可能是 string/null
    if (!Array.isArray(plot.assignedTo)) {
      plot.assignedTo = plot.assignedTo ? [plot.assignedTo] : [];
    }
    return plot;
  }
}

export class FarmSystem {
  constructor() {
    this.plots = [
      new FarmPlot('plot_1', 1),
      new FarmPlot('plot_2', 2),
    ];
    this.targetPlotCount = 2; // 目标农田数
    // 开垦队列：{ characterId, ticksRemaining }
    this.expandQueue = [];
  }

  assignPlot(plotId, characterId) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    // 兼容：确保 assignedTo 是数组
    if (!Array.isArray(plot.assignedTo)) plot.assignedTo = plot.assignedTo ? [plot.assignedTo] : [];
    if (plot.assignedTo.includes(characterId)) return { success: false, message: '已分配过' };
    plot.assignedTo.push(characterId);
    return { success: true, message: '已分配' };
  }

  unassignPlot(plotId, characterId) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (!Array.isArray(plot.assignedTo)) plot.assignedTo = plot.assignedTo ? [plot.assignedTo] : [];
    if (characterId) {
      plot.assignedTo = plot.assignedTo.filter(id => id !== characterId);
    } else {
      plot.assignedTo = [];
    }
    return { success: true, message: '已取消分配' };
  }

  // 获取某角色负责的农田
  getPlotsForCharacter(characterId) {
    return this.plots.filter(p => {
      if (Array.isArray(p.assignedTo)) return p.assignedTo.includes(characterId);
      return p.assignedTo === characterId; // 兼容旧存档
    });
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
    plot.weedGrowth = 0; // 翻地清除杂草
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
    plot.waterLevel = Math.min(100, plot.waterLevel + WATER_ADD_AMOUNT);
    character.gainKnowledge('farming', 0.5);
    return { success: true, message: '浇水完成' };
  }

  fertilize(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.fertility >= 100) return { success: false, message: '肥力已满' };
    plot.fertility = Math.min(100, plot.fertility + FERTILITY_ADD_AMOUNT);
    character.gainKnowledge('farming', 0.5);
    return { success: true, message: `施肥完成，肥力 ${Math.floor(plot.fertility)}` };
  }

  removePest(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || !plot.hasPest) return { success: false, message: '没有病虫害' };
    plot.pestSeverity--;
    character.gainKnowledge('farming', 0.3);
    if (plot.pestSeverity <= 0) {
      plot.hasPest = false;
      plot.pestSeverity = 0;
      return { success: true, message: '病虫害已清除！', cleared: true };
    }
    return { success: true, message: `除虫中...还需${plot.pestSeverity}次`, cleared: false };
  }

  // 除草：单次点击减少20杂草生长值（与浇水同逻辑）
  removeWeeds(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    plot.weedGrowth = Math.max(0, plot.weedGrowth - WEED_REMOVE_AMOUNT);
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

    // 种子掉落：根据产量，保证种子数量可持续
    const baseYield = crop.baseYield || 5;
    const yieldRatio = totalYield / baseYield;
    let seedBack;
    if (yieldRatio >= 1.2) {
      seedBack = Math.random() < 0.5 ? 3 : 2;
    } else if (yieldRatio >= 0.8) {
      seedBack = Math.random() < 0.4 ? 3 : 2;
    } else {
      seedBack = Math.random() < 0.3 ? 2 : 1;
    }

    const yieldPct = Math.round((yieldMod - 1) * 100);

    // 重置
    plot.state = FIELD_STATE.EMPTY;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.fertility = Math.max(FERTILITY_MIN, plot.fertility - FERTILITY_HARVEST_COST);
    plot.cropYieldMod = 1.0;
    plot.hasPest = false;
    plot.pestSeverity = 0;
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
  tick(isNewDay = false) {
    const events = [];

    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];

      // --- 水分自然蒸发 ---
      plot.waterLevel = Math.max(0, plot.waterLevel - WATER_EVAPORATION_RATE);

      // --- 有作物：肥力流失 ---
      if (plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) {
        plot.fertility = Math.max(FERTILITY_MIN_FOR_GROWTH, plot.fertility - FERTILITY_DRAIN_RATE);
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
        plot.weedGrowth = Math.min(100, plot.weedGrowth + WEED_GROWTH_BASE * weedFertMod * weedWaterMod);
      }

      if (plot.state === FIELD_STATE.GROWING) {
        const crop = plot.getCropDef();
        if (!crop) continue;

        // === 作物生长 ===
        const waterGrowthMod = plot.waterLevel > WATER_CRITICAL_THRESHOLD ? 1 : (plot.waterLevel > WATER_VERY_LOW_THRESHOLD ? 0.5 : 0.1);
        const pestGrowthMod = plot.hasPest ? 0.5 : 1;
        const weedGrowthMod = plot.weedGrowth > WEED_THRESHOLD ? (1 - (plot.weedGrowth - WEED_THRESHOLD) / 200) : 1; // max 0.7
        const growthPerTick = 1 * waterGrowthMod * pestGrowthMod * weedGrowthMod;
        plot.growthProgress = Math.min(100, plot.growthProgress + growthPerTick);

        if (plot.growthProgress >= 100) {
          plot.state = FIELD_STATE.READY;
          events.push({ type: 'ready', plotId: plot.id, cropName: crop.name });
        }

        // === 每tick永久减产 ===
        // 水分<60
        if (plot.waterLevel < WATER_LOW_THRESHOLD) {
          const waterDeficit = (WATER_LOW_THRESHOLD - plot.waterLevel) / WATER_LOW_THRESHOLD;
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - waterDeficit * YIELD_WATER_DEFICIT_RATE);
        }
        // 杂草>40
        if (plot.weedGrowth > WEED_THRESHOLD) {
          const weedSeverity = (plot.weedGrowth - WEED_THRESHOLD) / 60; // 0~1
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - weedSeverity * YIELD_WEED_SEVERITY_RATE);
        }
        // 病虫害持续减产（严重度越高减产越快）
        if (plot.hasPest) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - YIELD_PEST_TICK_RATE * plot.pestSeverity);
        }

        // === 缺水枯萎 ===
        if (plot.waterLevel <= 0 && Math.random() < DRY_WITHER_CHANCE) {
          plot.state = FIELD_STATE.WITHERED;
          events.push({ type: 'withered', plotId: plot.id });
          continue;
        }

        // === 病虫害随机出现（立即减产5%）===
        if (!plot.hasPest && Math.random() < PEST_SPAWN_CHANCE) {
          plot.hasPest = true;
          plot.pestSeverity = PEST_INITIAL_SEVERITY_MIN + Math.floor(Math.random() * PEST_INITIAL_SEVERITY_RANGE);
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - YIELD_PEST_IMMEDIATE);
          events.push({ type: 'pest', plotId: plot.id });
        }
      }

      // 成熟后继续恶化
      if (plot.state === FIELD_STATE.READY) {
        if (plot.hasPest) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - YIELD_READY_PEST_RATE * plot.pestSeverity);
        }
        if (plot.weedGrowth > WEED_THRESHOLD) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - YIELD_READY_WEED_RATE);
        }
      }
    }

    // === 病虫害传染 ===
    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      if (!plot.hasPest || plot.pestSeverity < PEST_SPREAD_MIN_SEVERITY) continue;
      const neighbors = [this.plots[i - 1], this.plots[i + 1]].filter(Boolean);
      for (const neighbor of neighbors) {
        if (neighbor.hasPest) continue;
        if (neighbor.state !== FIELD_STATE.GROWING && neighbor.state !== FIELD_STATE.READY) continue;
        const spreadChance = PEST_SPREAD_BASE * plot.pestSeverity;
        if (Math.random() < spreadChance) {
          neighbor.hasPest = true;
          neighbor.pestSeverity = PEST_INITIAL_SEVERITY_MIN + Math.floor(Math.random() * PEST_SPREAD_SEVERITY_RANGE);
          neighbor.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, neighbor.cropYieldMod - PEST_YIELD_PENALTY_SCALE);
          events.push({ type: 'pest_spread', plotId: neighbor.id, fromPlotId: plot.id });
        }
      }
    }

    // === 每日肥力产量修正 ===
    if (isNewDay) {
      for (const plot of this.plots) {
        if (plot.state !== FIELD_STATE.GROWING && plot.state !== FIELD_STATE.READY) continue;
        if (plot.fertility > FERTILITY_BASE) {
          // 肥力>基准：每天增产，增量随肥力加速
          const ratio = (plot.fertility - FERTILITY_BASE) / 40; // 0~1
          const dailyBonus = YIELD_FERTILITY_HIGH_BONUS * ratio * ratio;
          plot.cropYieldMod = Math.min(FARM_MAX_CROP_YIELD_MOD, plot.cropYieldMod + dailyBonus);
        } else if (plot.fertility < FERTILITY_BASE) {
          // 肥力<基准：每天减产
          const ratio = (FERTILITY_BASE - plot.fertility) / FERTILITY_BASE; // 0~1
          const dailyPenalty = YIELD_FERTILITY_LOW_PENALTY * ratio;
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - dailyPenalty);
        }
      }
    }

    return events;
  }

  removePlot(plotId) {
    if (this.plots.length <= 1) return { success: false, message: '至少保留一块农田' };
    const idx = this.plots.findIndex(p => p.id === plotId);
    if (idx === -1) return { success: false, message: '找不到农田' };
    const plot = this.plots[idx];
    if (plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.PLANTED) {
      return { success: false, message: '正在种植的农田不能拆除' };
    }
    if (plot.state === FIELD_STATE.READY) {
      return { success: false, message: '请先收获再拆除' };
    }
    this.plots.splice(idx, 1);
    if (this.targetPlotCount > this.plots.length) {
      this.targetPlotCount = this.plots.length;
    }
    return { success: true, message: `已拆除 ${plot.name}` };
  }

  expandFarm() {
    const index = this.plots.length + 1;
    const newId = `plot_${index}`;
    this.plots.push(new FarmPlot(newId, index));
    return { success: true, message: '成功开垦了一块新农田' };
  }

  // 开始开垦任务（5天=50tick）
  startExpand(characterId) {
    // 检查此角色是否已在开垦
    if (this.expandQueue.find(q => q.characterId === characterId)) {
      return { success: false, message: '该角色已在开垦' };
    }
    this.expandQueue.push({ characterId, ticksRemaining: FARM_EXPAND_TICKS });
    return { success: true, message: `开始开垦新农田（预计${FARM_EXPAND_TICKS / TICKS_PER_DAY}天）` };
  }

  // 每tick推进开垦
  tickExpand() {
    const completed = [];
    this.expandQueue = this.expandQueue.filter(q => {
      q.ticksRemaining--;
      if (q.ticksRemaining <= 0) {
        completed.push(q.characterId);
        return false;
      }
      return true;
    });
    for (const charId of completed) {
      this.expandFarm();
    }
    return completed;
  }

  // 序列化
  toJSON() {
    return {
      plots: this.plots.map(p => p.toJSON()),
      targetPlotCount: this.targetPlotCount,
      expandQueue: this.expandQueue.map(q => ({ ...q })),
    };
  }

  static fromJSON(data) {
    const farm = new FarmSystem();
    farm.plots = data.plots.map(p => FarmPlot.fromJSON(p));
    farm.targetPlotCount = data.targetPlotCount ?? data.plots.length;
    farm.expandQueue = data.expandQueue || [];
    return farm;
  }
}
