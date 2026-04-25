/**
 * 事件触发系统 - 路灯计划
 *
 * 管理游戏事件的触发条件和状态记录。
 * 新增事件只需在此注册，无需修改 GameState 的 tick/doAction。
 */

export class EventSystem {
  constructor() {
    this.triggeredEvents = {};
  }

  /**
   * 每 tick 检查是否触发事件
   * @param {number} day - 当前天数
   * @returns {{ notifications: string[] }}
   */
  checkEvents(day) {
    const notifications = [];

    // 每10天招工事件（如果从未接受过）
    if (day >= 10 && day % 10 === 0 && this.triggeredEvents['recruit'] !== 'accepted') {
      if (this.triggeredEvents['recruit_last_day'] !== day) {
        this.triggeredEvents['recruit_last_day'] = day;
        notifications.push('event:recruit');
      }
    }

    return notifications;
  }

  isEventTriggered(eventId) {
    return this.triggeredEvents[eventId] || null;
  }

  setEventState(eventId, state) {
    this.triggeredEvents[eventId] = state;
  }
}
