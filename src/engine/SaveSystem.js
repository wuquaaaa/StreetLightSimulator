/**
 * 存档系统 - 路灯计划
 *
 * 从 GameState 中提取，负责序列化/反序列化、存取档位管理。
 */

import { RECRUIT_POOL_MAX, RECRUIT_POOL_REFRESH_TICKS } from './constants';
import { ResearchSystem } from './ResearchSystem';

const SAVE_KEY_PREFIX = 'streetlight_save_';
const SAVE_SLOTS = 5;

export const SaveSystem = {
  /**
   * 序列化游戏状态
   * @param {import('./GameState').GameState} game
   */
  serialize(game) {
    const data = {
      version: 2,
      timestamp: Date.now(),
      day: game.day,
      tickCount: game.tickCount,
      season: game.season,
      population: game.population,
      foodPerPerson: game.foodPerPerson,
      player: game.player.toJSON(),
      characters: game.characters.map(c => c.toJSON()),
      triggeredEvents: { ...game.triggeredEvents },
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
      recruitTask: game.recruitTask ? { ...game.recruitTask } : null,
      recruitPool: game.recruitPool,
      recruitPoolRefreshTicks: game.recruitPoolRefreshTicks,
      recruitCandidates: game.recruitCandidates || [],
      // 研究系统
      researchSystem: game.researchSystem.toJSON(),
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
    // 触发事件状态：重新绑定引用，确保 game.triggeredEvents 与 eventSystem.triggeredEvents 指向同一对象
    const restoredEvents = data.triggeredEvents || {};
    game.triggeredEvents = restoredEvents;
    game.eventSystem.triggeredEvents = restoredEvents;
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
    game.recruitTask = data.recruitTask || null;
    game.recruitCandidates = data.recruitCandidates || [];
    game.recruitPool = data.recruitPool ?? RECRUIT_POOL_MAX;
    game.recruitPoolRefreshTicks = data.recruitPoolRefreshTicks ?? RECRUIT_POOL_REFRESH_TICKS;

    // 研究系统
    if (data.researchSystem) {
      game.researchSystem = ResearchSystem.fromJSON(data.researchSystem);
    }

    game.addLog('存档已加载');
    return game;
  },

  load(slot = 0, GameState) {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || (data.version !== 1 && data.version !== 2)) return null;
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
