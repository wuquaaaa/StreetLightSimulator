/**
 * 农田系统 - 路灯计划
 *
 * 核心机制：
 * - 食物作物：水分/肥力/杂草/虫害 → 影响产量修正
 * - 灵草作物：在食物规则基础上，额外有灵气值消耗
 *   · 灵气不足时停止生长
 *   · 收获时根据灵气均值 + 病害状态计算品质
 *   · 灵蛊（专属病害）比普通虫害更难处理
 * - 特殊作物属性（growthTimeMod、waterCostMod、waterRequirement 等）
 *
 * 灵田升级系统：
 * - 普通田（plotType: 'normal', plotLevel: 0）→ 灵田（'spirit', 1-3）
 * - 灵田等级越高：灵气回复更快、灵草产量加成、灵蛊概率降低、灵气消耗减免
 * - 升级需消耗材料（木材/石材/矿石/灵石），不可降级
 */

import { CROPS, HERB_QUALITY } from '../data/crops';
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
  DRY_WITHER_CHANCE,
  SPIRIT_AURA_INITIAL_MIN, SPIRIT_AURA_INITIAL_RANGE,
  SPIRIT_AURA_REGEN_RATE, SPIRIT_AURA_REGEN_IDLE,
  SPIRIT_AURA_MAX, SPIRIT_AURA_MIN, SPIRIT_AURA_LOW_THRESHOLD,
  SPIRIT_BUG_SPAWN_CHANCE, SPIRIT_BUG_INITIAL_SEVERITY_MIN,
  SPIRIT_BUG_INITIAL_SEVERITY_RANGE, SPIRIT_BUG_YIELD_PENALTY, SPIRIT_BUG_TICK_RATE,
  // 灵田升级
  PLOT_TYPE_NORMAL, PLOT_TYPE_SPIRIT,
  SPIRIT_PLOT_MAX_LEVEL, SPIRIT_PLOT_UPGRADE_COSTS,
  SPIRIT_PLOT_LEVEL_BONUSES,
} from './constants';

export const FIELD_STATE = {
  EMPTY: 'empty',
  PLOWED: 'plowed',
  PLANTED: 'planted',
  GROWING: 'growing',
  READY: 'ready',
  WITHERED: 'withered',
};

// 灵田等级名称映射
export const SPIRIT_LEVEL_NAMES = {
  0: '普通农田',
  1: '灵田·初阶',
  2: '灵田·中阶',
  3: '灵田·高阶',
};

// 农田状态显示映射（统一管理，供所有组件使用）
export const FIELD_DISPLAY = {
  [FIELD_STATE.EMPTY]:    { text: '空地', color: 'text-stone-500', bg: 'bg-stone-700', border: 'border-stone-600', label: '空' },
  [FIELD_STATE.PLOWED]:   { text: '已翻地', color: 'text-amber-600', bg: 'bg-amber-900/60', border: 'border-amber-700/50', label: '翻' },
  [FIELD_STATE.PLANTED]:  { text: '已播种', color: 'text-green-600', bg: 'bg-green-900/60', border: 'border-green-700/50', label: '种' },
  [FIELD_STATE.GROWING]:  { text: '生长中', color: 'text-green-400', bg: 'bg-green-800/60', border: 'border-green-600/50', label: null },
  [FIELD_STATE.READY]:    { text: '可收获', color: 'text-yellow-400', bg: 'bg-yellow-800/60', border: 'border-yellow-600/50', label: '收' },
  [FIELD_STATE.WITHERED]: { text: '已枯萎', color: 'text-red-500', bg: 'bg-red-900/60', border: 'border-red-700/50', label: '枯' },
};

// ======================================================
// 品质计算工具函数
// ======================================================

/**
 * 根据灵气均值、灵蛊状态、产量修正 计算灵草品质
 */
function rollHerbQuality(crop, spiritAuraAvg, hadSpiritBug, yieldMod) {
  const base = { ...crop.qualityWeights };

  // 灵气加成
  const auraMod = Math.max(0, (spiritAuraAvg - 50) / 50);
  base.supreme  = Math.round(base.supreme  * (1 + auraMod * 3));
  base.high     = Math.round(base.high     * (1 + auraMod * 2));
  base.medium   = Math.round(base.medium   * (1 + auraMod * 1));

  // 灵气不足惩罚
  if (spiritAuraAvg < 30) {
    base.poor   = Math.round(base.poor * 2.5);
    base.low    = Math.round(base.low  * 1.5);
    base.medium = Math.round(base.medium * 0.5);
    base.high   = Math.round(base.high   * 0.2);
    base.supreme = 0;
  }

  // 灵蛊惩罚
  if (hadSpiritBug) {
    base.poor   = Math.round(base.poor   * 3);
    base.low    = Math.round(base.low    * 1.5);
    base.high   = Math.round(base.high   * 0.3);
    base.supreme = 0;
  }

  // 产量修正 < 0.5
  if (yieldMod < 0.5) {
    base.poor = Math.round(base.poor * 2);
    base.supreme = 0;
  }

  const total = Object.values(base).reduce((s, v) => s + v, 0);
  if (total <= 0) return 'poor';

  let roll = Math.random() * total;
  for (const [quality, weight] of Object.entries(base)) {
    roll -= weight;
    if (roll <= 0) return quality;
  }
  return 'low';
}

// ======================================================
// FarmPlot
// ======================================================

export class FarmPlot {
  constructor(id, index) {
    this.id = id;
    this.name = `农田 ${index}`;
    this.state = FIELD_STATE.EMPTY;
    this.cropId = null;
    this.growthProgress = 0;
    this.waterLevel = 50;
    this.fertility = FERTILITY_INITIAL_MIN + Math.floor(Math.random() * FERTILITY_INITIAL_RANGE);

    this.cropYieldMod = 1.0;

    this.hasPest = false;
    this.pestSeverity = 0;
    this.weedGrowth = 0;
    this.assignedTo = [];

    // ===== 灵草系统 =====
    this.spiritAura = SPIRIT_AURA_INITIAL_MIN + Math.floor(Math.random() * SPIRIT_AURA_INITIAL_RANGE);
    this._spiritAuraAccum = 0;
    this._spiritAuraTickCount = 0;
    this.hadSpiritBug = false;
    this.hasSpiritBug = false;
    this.spiritBugSeverity = 0;

    // ===== 灵田升级 =====
    this.plotType = PLOT_TYPE_NORMAL;   // 'normal' | 'spirit'
    this.plotLevel = 0;                  // 0=普通, 1-3=灵田等级
    this.hasEverHarvested = false;       // 是否至少收获过一次（限制新田升级灵田）
  }

  getCropDef() {
    if (!this.cropId) return null;
    return CROPS.find(c => c.id === this.cropId) || null;
  }

  isSpiritPlot() {
    return this.plotType === PLOT_TYPE_SPIRIT;
  }

  getLevelBonus() {
    return SPIRIT_PLOT_LEVEL_BONUSES[this.plotLevel] || SPIRIT_PLOT_LEVEL_BONUSES[0];
  }

  getFertilityModifier() {
    if (this.fertility <= FERTILITY_BASE) {
      return 0.4 + (this.fertility / FERTILITY_BASE) * 0.6;
    } else {
      return 1.0 + ((this.fertility - FERTILITY_BASE) / 40) * 0.3;
    }
  }

  getYieldModifier() {
    // 灵田灵草产量加成
    const crop = this.getCropDef();
    const bonus = (crop?.isHerb && this.isSpiritPlot())
      ? this.getLevelBonus().herbYieldBonus
      : 0;
    return this.cropYieldMod + bonus;
  }

  getYieldPercent() {
    return Math.round((this.getYieldModifier() - 1) * 100);
  }

  isHerbPlot() {
    const crop = this.getCropDef();
    return !!(crop && crop.isHerb);
  }

  calculateHerbQuality() {
    const crop = this.getCropDef();
    if (!crop || !crop.isHerb) return null;
    const avgAura = this._spiritAuraTickCount > 0
      ? this._spiritAuraAccum / this._spiritAuraTickCount
      : this.spiritAura;
    return rollHerbQuality(crop, avgAura, this.hadSpiritBug, this.cropYieldMod);
  }

  toJSON() {
    return {
      id: this.id, name: this.name, state: this.state, cropId: this.cropId,
      growthProgress: this.growthProgress, waterLevel: this.waterLevel,
      fertility: this.fertility, cropYieldMod: this.cropYieldMod,
      hasPest: this.hasPest, pestSeverity: this.pestSeverity,
      weedGrowth: this.weedGrowth, assignedTo: this.assignedTo,
      spiritAura: this.spiritAura,
      _spiritAuraAccum: this._spiritAuraAccum,
      _spiritAuraTickCount: this._spiritAuraTickCount,
      hadSpiritBug: this.hadSpiritBug,
      hasSpiritBug: this.hasSpiritBug,
      spiritBugSeverity: this.spiritBugSeverity,
      // 灵田升级字段
      plotType: this.plotType,
      plotLevel: this.plotLevel,
      hasEverHarvested: this.hasEverHarvested,
    };
  }

  static fromJSON(data) {
    const plot = new FarmPlot(data.id, 0);
    Object.assign(plot, data);
    if (!Array.isArray(plot.assignedTo)) {
      plot.assignedTo = plot.assignedTo ? [plot.assignedTo] : [];
    }
    // 兼容旧存档：灵草字段
    if (plot.spiritAura === undefined) plot.spiritAura = SPIRIT_AURA_INITIAL_MIN + Math.floor(Math.random() * SPIRIT_AURA_INITIAL_RANGE);
    if (plot.hadSpiritBug === undefined)    plot.hadSpiritBug = false;
    if (plot.hasSpiritBug === undefined)    plot.hasSpiritBug = false;
    if (plot.spiritBugSeverity === undefined) plot.spiritBugSeverity = 0;
    if (plot._spiritAuraAccum === undefined) plot._spiritAuraAccum = 0;
    if (plot._spiritAuraTickCount === undefined) plot._spiritAuraTickCount = 0;
    // 兼容旧存档：灵田升级字段
    if (plot.plotType === undefined) plot.plotType = PLOT_TYPE_NORMAL;
    if (plot.plotLevel === undefined) plot.plotLevel = 0;
    if (plot.hasEverHarvested === undefined) plot.hasEverHarvested = true; // 旧存档默认视为已收获
    return plot;
  }
}

// ======================================================
// FarmSystem
// ======================================================

export class FarmSystem {
  constructor() {
    this.plots = [
      new FarmPlot('plot_1', 1),
      new FarmPlot('plot_2', 2),
    ];
    this.targetPlotCount = 2;
    this.expandQueue = [];
  }

  // ====== 灵田升级 ======

  /**
   * 检查升级到目标等级需要的材料
   * @param {number} targetLevel  1-3
   * @returns {Array<{category,itemId,name,amount}>} 材料列表
   */
  static getUpgradeCost(targetLevel) {
    return SPIRIT_PLOT_UPGRADE_COSTS[targetLevel] || [];
  }

  /**
   * 升级地块为灵田（不检查材料，由 GameState 检查并消耗）
   * @param {string} plotId
   * @param {number} targetLevel  升到几级（1-3）
   * @returns {{success, message}}
   */
  upgradeToSpirit(plotId, targetLevel) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };

    // 不能升级正在种植的地块
    if (plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) {
      return { success: false, message: '种植中的农田无法改造' };
    }

    // 已成熟的需要先收获
    if (plot.state === FIELD_STATE.READY) {
      return { success: false, message: '请先收获作物再改造' };
    }

    // 新开垦的田需要至少收获过一次才能升级
    if (!plot.hasEverHarvested) {
      return { success: false, message: '新开的田需要先种一轮作物才能改造' };
    }

    // 普通田 → 灵田1级，灵田1级 → 2级，以此类推
    const expectedNext = plot.plotLevel + 1;
    if (targetLevel !== expectedNext) {
      return { success: false, message: `当前${SPIRIT_LEVEL_NAMES[plot.plotLevel]}，需要先升到${SPIRIT_LEVEL_NAMES[expectedNext]}` };
    }

    if (targetLevel > SPIRIT_PLOT_MAX_LEVEL) {
      return { success: false, message: '已达最高等级' };
    }

    // 执行升级
    plot.plotType = PLOT_TYPE_SPIRIT;
    plot.plotLevel = targetLevel;
    // 升级时灵气值提升
    plot.spiritAura = Math.min(SPIRIT_AURA_MAX, plot.spiritAura + 20 + targetLevel * 10);

    return {
      success: true,
      message: `${plot.name}已升级为${SPIRIT_LEVEL_NAMES[targetLevel]}！灵气+${20 + targetLevel * 10}`,
    };
  }

  // ====== 原有方法 ======

  assignPlot(plotId, characterId) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
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

  getPlotsForCharacter(characterId) {
    return this.plots.filter(p => {
      if (Array.isArray(p.assignedTo)) return p.assignedTo.includes(characterId);
      return p.assignedTo === characterId;
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
    plot.hasSpiritBug = false;
    plot.spiritBugSeverity = 0;
    plot.hadSpiritBug = false;
    plot.weedGrowth = 0;
    plot._spiritAuraAccum = 0;
    plot._spiritAuraTickCount = 0;
    character.gainKnowledge('farming', 1);

    // 翻地有概率发现随机种子
    const result = { success: true, message: '翻地完成' };

    // 灵草种子概率：基础5%，灵田额外+5%/级
    const herbChance = 0.05 + (plot.isSpiritPlot() ? plot.plotLevel * 0.05 : 0);
    if (Math.random() < herbChance) {
      const herbs = CROPS.filter(c => c.isHerb);
      // 越稀有的概率越低
      const weighted = herbs.flatMap(c => Array(Math.max(1, 6 - (c.rarity || 1))).fill(c));
      const seed = weighted[Math.floor(Math.random() * weighted.length)];
      result.seedFound = { seedId: seed.seedId, seedName: seed.seedName, amount: 1 };
      return result;
    }

    // 食物种子概率：15%
    if (Math.random() < 0.15) {
      const foodCrops = CROPS.filter(c => !c.isHerb);
      if (foodCrops.length > 0) {
        const seed = foodCrops[Math.floor(Math.random() * foodCrops.length)];
        result.seedFound = { seedId: seed.seedId, seedName: seed.seedName, amount: 1 };
      }
    }

    return result;
  }

  plant(plotId, cropId, character, warehouse) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    if (plot.state !== FIELD_STATE.PLOWED) return { success: false, message: '需要先翻地' };
    const crop = CROPS.find(c => c.id === cropId);
    if (!crop) return { success: false, message: '未知作物' };

    // 灵草必须在灵田种植
    if (crop.isHerb && !plot.isSpiritPlot()) {
      return { success: false, message: '灵草需要种植在灵田中！请先将地块升级为灵田' };
    }

    const seedAmount = warehouse.getItemAmount('seed', crop.seedId);
    if (seedAmount < crop.seedCost) return { success: false, message: `${crop.seedName}不足！` };

    warehouse.removeItem('seed', crop.seedId, crop.seedCost);
    plot.state = FIELD_STATE.PLANTED;
    plot.cropId = cropId;
    plot.growthProgress = 0;
    plot.cropYieldMod = 1.0;
    plot.hadSpiritBug = false;
    plot._spiritAuraAccum = 0;
    plot._spiritAuraTickCount = 0;
    character.gainKnowledge('farming', crop.isHerb ? 3 : 2);
    return { success: true, message: `播种了${crop.name}${crop.isHerb ? '（灵草）' : ''}` };
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

  removeSpiritBug(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || !plot.hasSpiritBug) return { success: false, message: '没有灵蛊' };
    plot.spiritBugSeverity--;
    character.gainKnowledge('farming', 0.5);
    if (plot.spiritBugSeverity <= 0) {
      plot.hasSpiritBug = false;
      plot.spiritBugSeverity = 0;
      return { success: true, message: '灵蛊已驱除！', cleared: true };
    }
    return { success: true, message: `驱蛊中...还需${plot.spiritBugSeverity}次`, cleared: false };
  }

  removeWeeds(plotId, character) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return { success: false, message: '找不到农田' };
    plot.weedGrowth = Math.max(0, plot.weedGrowth - WEED_REMOVE_AMOUNT);
    character.gainKnowledge('farming', 0.2);
    return { success: true, message: `除草完成，杂草 ${Math.floor(plot.weedGrowth)}` };
  }

  harvest(plotId, character, warehouse) {
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

    // 种子掉落
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

    // 灵草品质计算
    let herbQuality = null;
    if (crop.isHerb) {
      herbQuality = plot.calculateHerbQuality();
    }

    const yieldPct = Math.round((yieldMod - 1) * 100);

    // 重置地块
    plot.state = FIELD_STATE.EMPTY;
    plot.cropId = null;
    plot.growthProgress = 0;
    plot.fertility = Math.max(FERTILITY_MIN, plot.fertility - FERTILITY_HARVEST_COST);
    plot.cropYieldMod = 1.0;
    plot.hasPest = false;
    plot.pestSeverity = 0;
    plot.hasSpiritBug = false;
    plot.spiritBugSeverity = 0;
    plot.hadSpiritBug = false;
    plot._spiritAuraAccum = 0;
    plot._spiritAuraTickCount = 0;
    plot.hasEverHarvested = true;  // 标记已收获过

    character.gainKnowledge('farming', crop.isHerb ? 5 : 3);

    let message = `收获了 ${totalYield} 单位${crop.name}`;
    if (yieldPct < -5) message += `（减产 ${Math.abs(yieldPct)}%）`;
    if (yieldPct > 5)  message += `（增产 ${yieldPct}%）`;
    if (bonusYield > 0) message += `（丰收！+${bonusYield}）`;
    if (herbQuality) {
      const qDef = HERB_QUALITY[herbQuality];
      message += `【${qDef.label}】`;
    }
    // 灵田产量加成提示
    if (crop.isHerb && plot.isSpiritPlot()) {
      const levelBonus = plot.getLevelBonus().herbYieldBonus;
      if (levelBonus > 0) {
        message += `（灵田加成+${Math.round(levelBonus * 100)}%）`;
      }
    }
    message += `，获得${seedBack}颗${crop.seedName}`;

    const overflowWarnings = [];
    if (warehouse) {
      if (seedBack) {
        const seedResult = warehouse.addItem('seed', crop.seedId, crop.seedName, seedBack);
        if (seedResult.overflow > 0) {
          overflowWarnings.push(`仓库满了！${seedResult.overflow}颗${crop.seedName}丢失`);
        }
      }
      const storeResult = warehouse.addItem(
        crop.category,
        crop.harvestItem,
        crop.name,
        totalYield,
        herbQuality ? { quality: herbQuality } : undefined
      );
      if (storeResult.overflow > 0) {
        overflowWarnings.push(`仓库满了！${storeResult.overflow}单位${crop.name}丢失`);
      }
    }

    return {
      success: true, message, isHighQuality,
      herbQuality,
      yield: { itemId: crop.harvestItem, category: crop.category, amount: totalYield, name: crop.name },
      seedBack: { itemId: crop.seedId, amount: seedBack, name: crop.seedName },
      overflowWarnings,
    };
  }

  // ====== 每tick自动更新 ======
  tick(isNewDay = false, currentSeason = '春') {
    const events = [];

    for (let i = 0; i < this.plots.length; i++) {
      const plot = this.plots[i];
      const crop = plot.getCropDef();
      const levelBonus = plot.getLevelBonus();

      // --- 水分自然蒸发 ---
      const waterCostMod = crop?.waterCostMod ?? 1;
      plot.waterLevel = Math.max(0, plot.waterLevel - WATER_EVAPORATION_RATE * waterCostMod);

      // --- 灵气自然恢复（灵田加成）---
      const isIdle = (plot.state === FIELD_STATE.EMPTY || plot.state === FIELD_STATE.PLOWED);
      const auraBase = isIdle ? SPIRIT_AURA_REGEN_IDLE : SPIRIT_AURA_REGEN_RATE;
      const auraRegenMul = isIdle ? levelBonus.auraRegenIdleMul : levelBonus.auraRegenMul;
      plot.spiritAura = Math.min(SPIRIT_AURA_MAX, plot.spiritAura + auraBase * auraRegenMul);

      // --- 有作物：肥力流失 ---
      if (plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) {
        plot.fertility = Math.max(FERTILITY_MIN_FOR_GROWTH, plot.fertility - FERTILITY_DRAIN_RATE);

        // 灵草消耗灵气（灵田等级减免）
        if (crop?.isHerb && crop.spiritCost) {
          const costReduction = levelBonus.spiritCostReduction;
          const actualCost = crop.spiritCost * (1 - costReduction);
          plot.spiritAura = Math.max(SPIRIT_AURA_MIN, plot.spiritAura - actualCost);
          plot._spiritAuraAccum += plot.spiritAura;
          plot._spiritAuraTickCount++;
        }
      }

      // 播种→生长
      if (plot.state === FIELD_STATE.PLANTED) {
        plot.state = FIELD_STATE.GROWING;
        plot.growthProgress = 1;
      }

      // --- 杂草生长 ---
      if (plot.weedGrowth < 100) {
        const weedFertMod = 0.5 + (plot.fertility / 100) * 0.8;
        const weedWaterMod = 0.5 + (plot.waterLevel / 100) * 0.8;
        plot.weedGrowth = Math.min(100, plot.weedGrowth + WEED_GROWTH_BASE * weedFertMod * weedWaterMod);
      }

      if (plot.state === FIELD_STATE.GROWING) {
        if (!crop) continue;

        // 血莲：水分不足
        if (crop.waterRequirement && plot.waterLevel < crop.waterRequirement) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - 0.01);
          continue;
        }

        // 天根草：肥力不足
        const fertilityMod = (crop.fertilityRequirement && plot.fertility < crop.fertilityRequirement) ? 0.5 : 1;

        // 灵气不足：灵草停止生长
        const auraGrowthMod = (crop.isHerb && plot.spiritAura < SPIRIT_AURA_LOW_THRESHOLD) ? 0 : 1;

        // 霜花冬天加速
        const seasonMod = (crop.winterBonus && currentSeason === '冬') ? 1.4 : 1;

        // === 作物生长 ===
        const waterGrowthMod = plot.waterLevel > WATER_CRITICAL_THRESHOLD ? 1
          : (plot.waterLevel > WATER_VERY_LOW_THRESHOLD ? 0.5 : 0.1);
        const pestGrowthMod = plot.hasPest ? 0.5 : 1;
        const spiritBugMod  = plot.hasSpiritBug ? 0.4 : 1;
        const weedGrowthMod = plot.weedGrowth > WEED_THRESHOLD
          ? (1 - (plot.weedGrowth - WEED_THRESHOLD) / 200) : 1;

        const growthTimeMod = crop.growthTimeMod ?? 1;
        const growthPerTick = (1 / growthTimeMod)
          * waterGrowthMod * pestGrowthMod * spiritBugMod
          * weedGrowthMod * auraGrowthMod * fertilityMod * seasonMod;

        plot.growthProgress = Math.min(100, plot.growthProgress + growthPerTick);

        if (plot.growthProgress >= 100) {
          plot.state = FIELD_STATE.READY;
          events.push({ type: 'ready', plotId: plot.id, cropName: crop.name });
        }

        // === 每tick永久减产 ===
        if (plot.waterLevel < WATER_LOW_THRESHOLD) {
          const waterDeficit = (WATER_LOW_THRESHOLD - plot.waterLevel) / WATER_LOW_THRESHOLD;
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - waterDeficit * YIELD_WATER_DEFICIT_RATE);
        }
        if (plot.weedGrowth > WEED_THRESHOLD) {
          const weedSeverity = (plot.weedGrowth - WEED_THRESHOLD) / 60;
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - weedSeverity * YIELD_WEED_SEVERITY_RATE);
        }
        if (plot.hasPest) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - YIELD_PEST_TICK_RATE * plot.pestSeverity);
        }
        if (plot.hasSpiritBug) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - SPIRIT_BUG_TICK_RATE * plot.spiritBugSeverity);
        }

        // === 缺水枯萎 ===
        if (plot.waterLevel <= 0 && Math.random() < DRY_WITHER_CHANCE) {
          plot.state = FIELD_STATE.WITHERED;
          events.push({ type: 'withered', plotId: plot.id });
          continue;
        }

        // === 病虫害 ===
        if (crop.isHerb) {
          // 灵草：灵蛊（灵田等级降低出现概率）
          if (!plot.hasSpiritBug) {
            const bugChance = SPIRIT_BUG_SPAWN_CHANCE * (1 - levelBonus.spiritBugReduction);
            if (Math.random() < bugChance) {
              plot.hasSpiritBug = true;
              plot.hadSpiritBug = true;
              plot.spiritBugSeverity = SPIRIT_BUG_INITIAL_SEVERITY_MIN + Math.floor(Math.random() * SPIRIT_BUG_INITIAL_SEVERITY_RANGE);
              plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - SPIRIT_BUG_YIELD_PENALTY);
              events.push({ type: 'spirit_bug', plotId: plot.id });
            }
          }
        } else {
          // 食物：普通虫害
          if (!plot.hasPest && Math.random() < PEST_SPAWN_CHANCE) {
            plot.hasPest = true;
            plot.pestSeverity = PEST_INITIAL_SEVERITY_MIN + Math.floor(Math.random() * PEST_INITIAL_SEVERITY_RANGE);
            plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - YIELD_PEST_IMMEDIATE);
            events.push({ type: 'pest', plotId: plot.id });
          }
        }
      }

      // 成熟后继续恶化
      if (plot.state === FIELD_STATE.READY) {
        if (plot.hasPest) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - YIELD_READY_PEST_RATE * plot.pestSeverity);
        }
        if (plot.hasSpiritBug) {
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - SPIRIT_BUG_TICK_RATE * plot.spiritBugSeverity);
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
          const ratio = (plot.fertility - FERTILITY_BASE) / 40;
          const dailyBonus = YIELD_FERTILITY_HIGH_BONUS * ratio * ratio;
          plot.cropYieldMod = Math.min(FARM_MAX_CROP_YIELD_MOD, plot.cropYieldMod + dailyBonus);
        } else if (plot.fertility < FERTILITY_BASE) {
          const ratio = (FERTILITY_BASE - plot.fertility) / FERTILITY_BASE;
          const dailyPenalty = YIELD_FERTILITY_LOW_PENALTY * ratio;
          plot.cropYieldMod = Math.max(FARM_MIN_CROP_YIELD_MOD, plot.cropYieldMod - dailyPenalty);
        }
      }
    }

    return events;
  }

  applyWinterDamage(freezeChance) {
    let damaged = 0;
    for (const plot of this.plots) {
      if (plot.state !== FIELD_STATE.GROWING) continue;
      const crop = plot.getCropDef();
      if (crop?.winterBonus) continue;
      const actualChance = crop?.isHerb ? freezeChance * 0.5 : freezeChance;
      if (Math.random() < actualChance) {
        plot.state = FIELD_STATE.WITHERED;
        damaged++;
      }
    }
    return damaged;
  }

  setTargetPlots(count) {
    if (typeof count !== 'number' || count < 0) {
      return { success: false, message: '无效的目标数' };
    }
    this.targetPlotCount = count;
    let removed = 0;
    while (this.plots.length > count && this.plots.length > 1) {
      const removableIdx = [...this.plots].reverse().findIndex(p =>
        p.state === FIELD_STATE.EMPTY || p.state === FIELD_STATE.WITHERED || p.state === FIELD_STATE.PLOWED
      );
      if (removableIdx === -1) break;
      const actualIdx = this.plots.length - 1 - removableIdx;
      this.plots.splice(actualIdx, 1);
      removed++;
    }
    let msg = `目标农田数设为 ${count}`;
    if (removed > 0) msg += `，已拆除 ${removed} 块空闲农田`;
    return { success: true, message: msg };
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

  startExpand(characterId) {
    if (this.expandQueue.find(q => q.characterId === characterId)) {
      return { success: false, message: '该角色已在开垦' };
    }
    this.expandQueue.push({ characterId, ticksRemaining: FARM_EXPAND_TICKS });
    return { success: true, message: `开始开垦新农田（预计${FARM_EXPAND_TICKS / TICKS_PER_DAY}天）` };
  }

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
