/**
 * 游戏主状态 - 路灯计划
 */

import { Character } from './Character';
import { FarmSystem } from './FarmSystem';
import { WarehouseSystem } from './WarehouseSystem';

export class GameState {
  constructor(playerName = '旅人') {
    // 回合
    this.turn = 1;
    this.season = '春'; // 春夏秋冬
    this.day = 1;

    // 玩家角色
    this.player = new Character({
      name: playerName,
      role: 'farmer',
      isPlayer: true,
    });

    // 系统
    this.farm = new FarmSystem();
    this.warehouse = new WarehouseSystem();

    // 游戏日志
    this.log = ['你来到了一片陌生的土地。这里有几块空闲的农田和一间简陋的食物仓库。'];
    this.log.push('作为一名农民，你需要耕种农田来维持生计。');

    // 通知队列（UI弹出用）
    this.notifications = [];
  }

  // 下一回合
  nextTurn() {
    this.turn++;
    this.day++;

    // 每7天换季
    const seasonIndex = Math.floor((this.day - 1) / 7) % 4;
    const seasons = ['春', '夏', '秋', '冬'];
    const newSeason = seasons[seasonIndex];
    if (newSeason !== this.season) {
      this.season = newSeason;
      this.addLog(`季节变化：进入了${this.season}季`);
    }

    // 恢复体力
    this.player.restoreStamina(30);

    // 更新农田
    this.farm.updatePlots();

    // 检查是否有作物成熟
    for (const plot of this.farm.plots) {
      if (plot.state === 'ready') {
        const crop = plot.getCropDef();
        if (crop) {
          this.addNotification(`${crop.name}已经成熟，可以收获了！`);
        }
      }
    }

    // 冬天作物可能受冻
    if (this.season === '冬') {
      for (const plot of this.farm.plots) {
        if (plot.state === 'growing' && Math.random() < 0.15) {
          plot.state = 'withered';
          this.addLog('寒冬使一块农田的作物冻死了');
        }
      }
    }

    // 每天消耗食物
    const foodNeeded = 2;
    const wheatAmount = this.warehouse.getItemAmount('food', 'wheat');
    if (wheatAmount >= foodNeeded) {
      this.warehouse.removeItem('food', 'wheat', foodNeeded);
      this.addLog(`消耗了${foodNeeded}单位小麦作为口粮`);
    } else {
      // 饥饿，体力恢复减少
      this.player.stamina = Math.max(0, this.player.stamina - 20);
      this.addLog('没有足够的食物！你感到饥饿，体力大幅下降。');
      this.addNotification('警告：食物不足，你正在挨饿！');
    }

    this.addLog(`第${this.turn}天（${this.season}季）`);
  }

  // 执行耕种动作
  doAction(action, params = {}) {
    let result;

    switch (action) {
      case 'plow':
        result = this.farm.plow(params.plotId, this.player);
        break;
      case 'plant':
        result = this.farm.plant(params.plotId, params.cropId, this.player);
        break;
      case 'water':
        result = this.farm.water(params.plotId, this.player);
        break;
      case 'harvest':
        result = this.farm.harvest(params.plotId, this.player);
        if (result.success && result.yield) {
          // 收获物存入仓库
          const storeResult = this.warehouse.addItem(
            result.yield.category,
            result.yield.itemId,
            result.yield.name,
            result.yield.amount
          );
          this.addLog(storeResult.message);
        }
        break;
      case 'expand_farm':
        result = this.farm.expandFarm();
        break;
      case 'build_warehouse':
        result = this.warehouse.buildWarehouse(params.category);
        break;
      case 'rest':
        this.player.restoreStamina(20);
        result = { success: true, message: '你休息了一会，恢复了一些体力' };
        break;
      default:
        result = { success: false, message: '未知操作' };
    }

    if (result.message) {
      this.addLog(result.message);
    }

    return result;
  }

  addLog(message) {
    this.log.push(message);
    if (this.log.length > 100) {
      this.log.shift();
    }
  }

  addNotification(message) {
    this.notifications.push(message);
  }

  clearNotifications() {
    this.notifications = [];
  }
}
