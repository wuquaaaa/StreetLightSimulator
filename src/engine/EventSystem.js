/**
 * 事件触发系统 - 路灯计划 v2
 *
 * 管理游戏事件的触发条件和状态记录。
 * 新增事件只需在此注册，无需修改 GameState 的 tick/doAction。
 */

import { SEASONS } from './constants';

export class EventSystem {
  constructor() {
    this.triggeredEvents = {};
    this.lastEventDay = 0; // 上一次事件触发的天数，防止同一天多次触发
  }

  /**
   * 每 tick 检查是否触发事件
   * @param {number} day - 当前天数
   * @param {string} season - 当前季节
   * @param {number} population - 当前人口
   * @param {number} foodStock - 食物库存
   * @returns {{ notifications: string[], effects: object[] }}
   */
  checkEvents(day, season, population, foodStock) {
    const notifications = [];
    const effects = [];

    // === 招募事件（每10天，直到接受；拒绝后冷却30天） ===
    if (day >= 10 && day % 10 === 0 && this.triggeredEvents['recruit'] !== 'accepted') {
      const cooldown = this.triggeredEvents['recruit_cooldown_until'] || 0;
      if (day < cooldown) return { notifications, effects };
      if (this.triggeredEvents['recruit_last_day'] !== day) {
        this.triggeredEvents['recruit_last_day'] = day;
        notifications.push('event:recruit');
      }
    }

    // === 随机事件（每天最多1个，冷却3天） ===
    if (day - this.lastEventDay < 3) return { notifications, effects };
    if (day < 10) return { notifications, effects }; // 前10天新手保护期

    const rng = Math.random();

    // 丰收季（春秋有概率，食物 +10%~20%）
    if ((season === '春' || season === '秋') && rng < 0.04) {
      if (this.lastEventDay !== day) {
        this.lastEventDay = day;
        const bonus = 0.1 + Math.random() * 0.1;
        notifications.push('event:bumper_harvest');
        effects.push({ type: 'food_bonus', multiplier: 1 + bonus, message: `🌾 丰收的季节！作物长势喜人。` });
      }
    }

    // 虫灾（夏季高概率）
    if (season === '夏' && rng < 0.06 && !this.triggeredEvents['pest_outbreak_today']) {
      this.lastEventDay = day;
      this.triggeredEvents['pest_outbreak_today'] = day;
      notifications.push('event:pest_outbreak');
      effects.push({ type: 'pest_outbreak', multiplier: 3, message: `🐛 虫灾来袭！虫害概率大幅上升。` });
    }

    // 寒潮（冬季）
    if (season === '冬' && rng < 0.05 && !this.triggeredEvents['cold_snap_today']) {
      this.lastEventDay = day;
      this.triggeredEvents['cold_snap_today'] = day;
      notifications.push('event:cold_snap');
      effects.push({ type: 'cold_snap', freezeChance: 0.25, message: `❄️ 寒潮来袭！作物冻伤风险增加。` });
    }

    // 行商来访（人口>3时，低概率）
    if (population >= 3 && rng < 0.03 && this.triggeredEvents['merchant_day'] !== day) {
      this.lastEventDay = day;
      this.triggeredEvents['merchant_day'] = day;
      notifications.push('event:merchant');
      effects.push({ type: 'merchant_visit', message: `🧳 一位行商路过村庄，可以买卖物资。` });
    }

    // 旅人投靠（食物充足时小概率）
    if (foodStock > 30 && rng < 0.02 && population < 10) {
      this.lastEventDay = day;
      notifications.push('event:wanderer');
      effects.push({ type: 'free_recruit', message: `🧑 一位旅人想在你的村庄落脚，可以免费招募！` });
    }

    return { notifications, effects };
  }

  isEventTriggered(eventId) {
    return this.triggeredEvents[eventId] || null;
  }

  setEventState(eventId, state) {
    this.triggeredEvents[eventId] = state;
  }

  toJSON() {
    return {
      triggeredEvents: { ...this.triggeredEvents },
      lastEventDay: this.lastEventDay,
    };
  }

  static fromJSON(data) {
    const sys = new EventSystem();
    if (data) {
      sys.triggeredEvents = data.triggeredEvents || {};
      sys.lastEventDay = data.lastEventDay || 0;
    }
    return sys;
  }
}
