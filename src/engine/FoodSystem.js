/**
 * 食物消耗系统 - 路灯计划
 *
 * 管理每日食物消耗、饥饿惩罚和心情影响。
 */

import { FOOD_PER_PERSON } from './constants';

export class FoodSystem {
  constructor() {
    this.population = 1;
    this.foodPerPerson = FOOD_PER_PERSON;
  }

  get dailyConsumption() {
    return this.population * this.foodPerPerson;
  }

  /**
   * 每日食物消耗
   * @param {WarehouseSystem} warehouse - 仓库系统
   * @param {Character} player - 玩家角色
   * @returns {{ logs: string[], notifications: string[], moodDelta: number }}
   */
  consumeDaily(warehouse, player) {
    const logs = [];
    const notifications = [];
    let moodDelta = 0;

    const needed = this.dailyConsumption;
    const wheatAmount = warehouse.getItemAmount('food', 'wheat');

    if (wheatAmount >= needed) {
      warehouse.removeItem('food', 'wheat', needed);
      moodDelta = 1; // 吃饱了心情恢复
    } else if (wheatAmount > 0) {
      warehouse.removeItem('food', 'wheat', wheatAmount);
      logs.push(`食物不足！只够吃${wheatAmount}单位...`);
      notifications.push('警告：食物不足！');
      moodDelta = -5;
    } else {
      logs.push('完全没有食物了！你正在挨饿...');
      notifications.push('警告：食物耗尽！');
      moodDelta = -10;
    }

    return { logs, notifications, moodDelta };
  }
}
