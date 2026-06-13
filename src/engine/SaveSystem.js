/**
 * 存档系统 - 路灯计划
 *
 * 从 GameState 中提取，负责序列化/反序列化、存取档位管理。
 */

import { ResearchSystem } from './ResearchSystem';
import { GatherSystem } from './GatherSystem';
import { MiningSystem } from './MiningSystem';
import { AlchemySystem } from './AlchemySystem';
import { EventSystem } from './EventSystem';
import { RecruitSystem } from './RecruitSystem';
import { SmeltingSystem } from './SmeltingSystem';
import { HerbPrepSystem } from './HerbPrepSystem';
import { RepairSystem } from './RepairSystem';
import { SalesSystem } from './SalesSystem';
import { TransportSystem } from './TransportSystem';
import { FinanceSystem } from './FinanceSystem';
import { WorkerSystem } from './WorkerSystem';

const SAVE_KEY_PREFIX = 'streetlight_save_';
const SAVE_SLOTS = 5;

export const SaveSystem = {
  /**
   * 序列化游戏状态
   * @param {import('./GameState').GameState} game
   */
  serialize(game) {
    const data = {
      version: 5,
      timestamp: Date.now(),
      day: game.day,
      tickCount: game.tickCount,
      season: game.season,
      population: game.population,
      foodPerPerson: game.foodPerPerson,
      player: game.player.toJSON(),
      characters: game.characters.map(c => c.toJSON()),
      eventSystem: game.eventSystem.toJSON(),
      farm: game.farm.toJSON(),
      warehouse: {
        common: {
          items: { ...game.warehouse.common.items },
          capacity: game.warehouse.common.capacity,
          level: game.warehouse.common.level,
        },
        storage: {},
      },
      log: game.log.slice(-50),
      // 招募系统
      recruitTask: game.recruitSystem.recruitTask ? { ...game.recruitSystem.recruitTask } : null,
      recruitCandidatePool: game.recruitSystem.recruitCandidatePool || [],
      recruitHiredCount: game.recruitSystem.recruitHiredCount || 0,
      currentVehicle: game.recruitSystem.currentVehicle || 'donkey_cart',
      // 新手教程
      tutorialStep: game.tutorialStep ?? 0,
      // 建筑系统
      buildings: game.buildings || [],
      buildQueue: game.buildQueue || [],
      // 司务堂
      hallBuilt: game.hallBuilt || false,
      // 岗位系统
      unlockedJobs: [...(game.unlockedJobs || ['farmer'])],
      currentJob: game.currentJob || 'farmer',
      // 研究系统
      researchSystem: game.researchSystem.toJSON(),
      // 后山采集系统
      gatherSystem: game.gatherSystem.toJSON(),
      // 铁道采矿系统
      miningSystem: game.miningSystem.toJSON(),
      // 妙手炼丹系统
      alchemySystem: game.alchemySystem.toJSON(),
      // 新增系统
      smeltingSystem: game.smeltingSystem.toJSON(),
      herbPrepSystem: game.herbPrepSystem.toJSON(),
      repairSystem: game.repairSystem.toJSON(),
      salesSystem: game.salesSystem.toJSON(),
      transportSystem: game.transportSystem.toJSON(),
      financeSystem: game.financeSystem.toJSON(),
      workerSystem: game.workerSystem.toJSON(),
      // 统计快照
      statsHistory: game.statsHistory || [],
    };
    for (const [key, cat] of Object.entries(game.warehouse.storage)) {
      data.warehouse.storage[key] = {
        items: { ...cat.items },
        capacity: cat.capacity,
        level: cat.level,
        unlocked: cat.unlocked,
      };
    }
    return data;
  },

  save(game, slot = 0) {
    const data = SaveSystem.serialize(game);
    try {
      localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },

  restoreFromData(data, GameState) {
    const game = new GameState();
    game.day = data.day;
    game.tickCount = data.tickCount;
    game.season = data.season;
    game.population = data.population;
    game.foodPerPerson = data.foodPerPerson;
    game.player = GameState._charFromJSON(data.player);
    game.characters = (data.characters || []).map(c => GameState._charFromJSON(c));
    // 事件系统
    if (data.eventSystem) {
      game.eventSystem = EventSystem.fromJSON(data.eventSystem);
    } else if (data.triggeredEvents) {
      // 兼容旧存档
      game.eventSystem.triggeredEvents = data.triggeredEvents || {};
    }
    game.triggeredEvents = game.eventSystem.triggeredEvents;
    game.farm = GameState._farmFromJSON(data.farm);
    game.log = data.log || [];

    if (data.warehouse) {
      game.warehouse.common.items = data.warehouse.common.items || {};
      game.warehouse.common.capacity = data.warehouse.common.capacity || 300;
      game.warehouse.common.level = data.warehouse.common.level || 1;
      for (const [key, cat] of Object.entries(data.warehouse.storage || {})) {
        if (game.warehouse.storage[key]) {
          game.warehouse.storage[key].items = cat.items || {};
          game.warehouse.storage[key].capacity = cat.capacity || 200;
          game.warehouse.storage[key].level = cat.level || 0;
          game.warehouse.storage[key].unlocked = cat.unlocked || false;
        }
      }
    }

    // 招募系统（兼容旧存档）
    game.recruitSystem.recruitTask = data.recruitTask || null;
    game.recruitSystem.recruitCandidatePool = data.recruitCandidatePool || [];
    game.recruitSystem.recruitHiredCount = data.recruitHiredCount || 0;
    game.recruitSystem.currentVehicle = data.currentVehicle || 'donkey_cart';
    // 新手教程（旧存档兼容）
    // 旧6步(0-5) → 中9步(0-8) → 新12步(0-11)
    if (data.tutorialStep != null) {
      // 先映射最老的6步制
      const V1_TO_V2 = { 1: 5, 2: 6, 3: 6, 4: 7, 5: 8 };
      const v2Step = V1_TO_V2[data.tutorialStep] ?? data.tutorialStep;
      // 再映射9步制到12步制（招募阶段+1，增加延迟步骤5）
      const V2_TO_V3 = { 5: 6, 6: 7, 7: 8, 8: 9 };
      game.tutorialStep = V2_TO_V3[v2Step] ?? v2Step;
      // -1 和 0-4 不变
    } else {
      game.tutorialStep = -1;
    }

    // 建筑系统
    game.buildings = data.buildings || [];
    game.buildQueue = data.buildQueue || [];

    // 司务堂（旧存档如果研究已解锁则视为已建好）
    game.hallBuilt = data.hallBuilt || false;
    if (data.researchSystem && data.researchSystem.unlocked) {
      game.hallBuilt = true;
    }

    // 岗位系统（兼容旧存档）
    game.unlockedJobs = new Set(data.unlockedJobs || ['farmer']);
    game.currentJob = data.currentJob || 'farmer';

    // 研究系统
    if (data.researchSystem) {
      game.researchSystem = ResearchSystem.fromJSON(data.researchSystem);
    }

    // 后山采集系统
    if (data.gatherSystem) {
      game.gatherSystem = GatherSystem.fromJSON(data.gatherSystem);
    }
    // 兼容旧存档：如果已建造 mountain_trail 但没有 gatherSystem 数据，解锁采集
    if (game.buildings.includes('mountain_trail') && !game.gatherSystem.unlocked) {
      game.gatherSystem.unlocked = true;
    }

    // 铁道采矿系统
    if (data.miningSystem) {
      game.miningSystem = MiningSystem.fromJSON(data.miningSystem);
    }

    // 妙手炼丹系统
    if (data.alchemySystem) {
      game.alchemySystem = AlchemySystem.fromJSON(data.alchemySystem);
    }

    // 新增系统（兼容旧存档：如果没有数据则使用默认值）
    if (data.smeltingSystem) {
      game.smeltingSystem = SmeltingSystem.fromJSON(data.smeltingSystem);
    }
    if (data.herbPrepSystem) {
      game.herbPrepSystem = HerbPrepSystem.fromJSON(data.herbPrepSystem);
    }
    if (data.repairSystem) {
      game.repairSystem = RepairSystem.fromJSON(data.repairSystem);
    }
    if (data.salesSystem) {
      game.salesSystem = SalesSystem.fromJSON(data.salesSystem);
    }
    if (data.transportSystem) {
      game.transportSystem = TransportSystem.fromJSON(data.transportSystem);
    }
    if (data.financeSystem) {
      game.financeSystem = FinanceSystem.fromJSON(data.financeSystem);
    }
    if (data.workerSystem) {
      game.workerSystem = WorkerSystem.fromJSON(data.workerSystem);
    }

    // 统计快照
    game.statsHistory = data.statsHistory || [];

    // v4 迁移：统一 itemId 'wood' → 'lumber'
    if (data.version < 4) {
      const migrateItems = (items) => {
        if (items && items['wood']) {
          items['lumber'] = items['wood'];
          delete items['wood'];
        }
      };
      migrateItems(game.warehouse.common.items);
      if (game.warehouse.storage['material']?.items) {
        migrateItems(game.warehouse.storage['material'].items);
      }
    }

    game.addLog('存档已加载');
    return game;
  },

  load(slot = 0, GameState) {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || ![1, 2, 3, 4, 5].includes(data.version)) return null;
      return SaveSystem.restoreFromData(data, GameState);
    } catch {
      return null;
    }
  },

  getSaveSlots() {
    const slots = [];
    for (let i = 0; i < SAVE_SLOTS; i++) {
      try {
        const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`);
        if (raw) {
          const data = JSON.parse(raw);
          slots.push({
            slot: i,
            occupied: true,
            day: data.day,
            season: data.season,
            timestamp: data.timestamp,
            playerName: data.player?.name || '未知',
          });
        } else {
          slots.push({ slot: i, occupied: false });
        }
      } catch {
        slots.push({ slot: i, occupied: false });
      }
    }
    return slots;
  },

  hasSave() {
    for (let i = 0; i < SAVE_SLOTS; i++) {
      if (localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`)) return true;
    }
    return !!localStorage.getItem('streetlight_save');
  },

  loadAny(GameState) {
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const game = SaveSystem.load(i, GameState);
      if (game) return game;
    }
    try {
      const raw = localStorage.getItem('streetlight_save');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.version === 1) return SaveSystem.restoreFromData(data, GameState);
      }
    } catch { /* ignore */ }
    return null;
  },
};
