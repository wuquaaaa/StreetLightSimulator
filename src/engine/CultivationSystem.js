/**
 * 修炼系统 - 路灯计划
 *
 * 管理NPC的仙法修炼：
 * - 每个NPC可以同时修炼多门仙法（但有精力上限）
 * - 修炼需要消耗仙草+灵石
 * - 每天积累修炼进度，悟性越高越快
 * - 修炼到满级后解锁下一级
 * - 退休后仙法失效
 */

import { IMMORTAL_ARTS, getImmortalArtInfo, canLearnArt } from '../data/immortalArts';
import { TICKS_PER_DAY } from './constants';

// 每天修炼获得的基础进度
const BASE_CULTIVATION_PER_DAY = 1;

// 悟性对修炼速度的影响系数
const LEARNING_SPEED_FACTOR = 0.5; // 悟性50=1.0x，悟性100=1.5x

export class CultivationSystem {
  constructor() {
    // 已学会的仙法: { npcId: { artId: level } }
    this.learnedArts = {};

    // 正在修炼的仙法: { npcId: { artId, targetLevel, progress, totalTicks, herbId } }
    this.cultivating = {};
  }

  // ====== 玩家操作 ======

  /** 开始修炼仙法 */
  startCultivation(npcId, artId, character, warehouse) {
    const art = getImmortalArtInfo(artId);
    if (!art) return { success: false, message: '未知仙法' };

    // 检查是否已满级
    const currentLevel = this.learnedArts[npcId]?.[artId] || 0;
    if (currentLevel >= art.maxLevel) {
      return { success: false, message: `${art.name}已修炼至圆满` };
    }

    const targetLevel = currentLevel + 1;
    const levelData = art.levels[targetLevel];
    if (!levelData) return { success: false, message: '无法升级' };

    // 检查前置
    if (!canLearnArt(artId, new Set(Object.keys(this.learnedArts[npcId] || {})))) {
      return { success: false, message: `需要先修炼前置仙法` };
    }

    // 检查是否正在修炼
    if (this.cultivating[npcId]) {
      return { success: false, message: '该角色正在修炼中' };
    }

    // 检查仙草消耗
    const herbId = levelData.herbCost;
    const herbAmount = warehouse.getItemAmount('herb', herbId);
    if (herbAmount < 1) {
      return { success: false, message: `需要${herbId}进行修炼` };
    }

    // 消耗仙草
    const consumed = warehouse.removeItem('herb', herbId, 1).success;
    if (!consumed) {
      return { success: false, message: '消耗仙草失败' };
    }

    // 计算修炼时间（受悟性影响）
    const learning = character.baseAttributes?.learning || 50;
    const speedMod = 1 + (learning - 50) / 100 * LEARNING_SPEED_FACTOR;
    const totalTicks = Math.ceil(levelData.learnTime * TICKS_PER_DAY / speedMod);

    this.cultivating[npcId] = {
      artId,
      targetLevel,
      progress: 0,
      totalTicks,
      herbId,
    };

    return {
      success: true,
      message: `开始修炼「${art.name}·${levelData.name}」，预计需要${levelData.learnTime}天`,
    };
  }

  /** 取消修炼 */
  cancelCultivation(npcId) {
    if (!this.cultivating[npcId]) {
      return { success: false, message: '没有在修炼' };
    }
    const artId = this.cultivating[npcId].artId;
    delete this.cultivating[npcId];
    return { success: true, message: `停止了修炼「${getImmortalArtInfo(artId)?.name || artId}」` };
  }

  // ====== 查询 ======

  /** 获取NPC的仙法列表 */
  getNPCArts(npcId) {
    const learned = this.learnedArts[npcId] || {};
    const result = [];
    for (const [artId, level] of Object.entries(learned)) {
      const art = getImmortalArtInfo(artId);
      if (art) {
        result.push({ ...art, currentLevel: level });
      }
    }
    return result;
  }

  /** 获取NPC的属性加成总和 */
  getArtBonuses(npcId) {
    const learned = this.learnedArts[npcId] || {};
    const bonuses = {};

    for (const [artId, level] of Object.entries(learned)) {
      const art = getImmortalArtInfo(artId);
      if (!art || !art.levels[level]) continue;
      const effect = art.levels[level].effect;
      for (const [key, value] of Object.entries(effect)) {
        bonuses[key] = (bonuses[key] || 0) + value;
      }
    }

    return bonuses;
  }

  /** 检查NPC是否可以修炼某仙法 */
  canCultivate(npcId, artId) {
    const art = getImmortalArtInfo(artId);
    if (!art) return false;
    const currentLevel = this.learnedArts[npcId]?.[artId] || 0;
    if (currentLevel >= art.maxLevel) return false;
    if (this.cultivating[npcId]) return false;
    return canLearnArt(artId, new Set(Object.keys(this.learnedArts[npcId] || {})));
  }

  // ====== Tick ======

  tick(isNewDay, allCharacters, warehouse, logFn) {
    // 推进修炼进度
    for (const [npcId, cult] of Object.entries(this.cultivating)) {
      const character = allCharacters.find(c => c.id === npcId);
      if (!character || character.isRetired) {
        delete this.cultivating[npcId];
        continue;
      }

      const learning = character.baseAttributes?.learning || 50;
      const speedMod = 1 + (learning - 50) / 100 * LEARNING_SPEED_FACTOR;
      cult.progress += BASE_CULTIVATION_PER_DAY * speedMod;

      if (cult.progress >= cult.totalTicks) {
        // 修炼完成
        this._completeCultivation(npcId, cult, character, logFn);
        delete this.cultivating[npcId];
      }
    }
  }

  // ====== 内部方法 ======

  _completeCultivation(npcId, cult, character, logFn) {
    const art = getImmortalArtInfo(cult.artId);
    if (!art) return;

    // 初始化NPC仙法记录
    if (!this.learnedArts[npcId]) {
      this.learnedArts[npcId] = {};
    }

    // 升级
    this.learnedArts[npcId][cult.artId] = cult.targetLevel;

    const levelName = art.levels[cult.targetLevel]?.name || '';
    logFn(`✨${character.name}修炼「${art.name}·${levelName}」成功！`);

    // 经验
    if (typeof character.gainKnowledge === 'function') {
      character.gainKnowledge('farming', 3);
    }
  }

  // ====== 存档 ======

  toJSON() {
    return {
      learnedArts: JSON.parse(JSON.stringify(this.learnedArts)),
      cultivating: JSON.parse(JSON.stringify(this.cultivating)),
    };
  }

  static fromJSON(data) {
    const sys = new CultivationSystem();
    if (data) {
      sys.learnedArts = data.learnedArts || {};
      sys.cultivating = data.cultivating || {};
    }
    return sys;
  }
}
