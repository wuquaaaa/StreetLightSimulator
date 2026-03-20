/**
 * 游戏主状态 - 路灯计划
 * 时间自动流逝（定时器驱动），无体力系统
 */

import { Character } from './Character';
import { FarmSystem } from './FarmSystem';
import { WarehouseSystem } from './WarehouseSystem';

export class GameState {
  constructor(playerName = '旅人') {
    this.day = 1;
    this.tickCount = 0;
    this.season = '春';

    // 人口
    this.population = 1; // 初始1人（玩家自己）
    this.foodPerPerson = 2; // 每人每天消耗食物

    this.player = new Character({ name: playerName, role: 'farmer', isPlayer: true });
    this.farm = new FarmSystem();
    this.warehouse = new WarehouseSystem();

    // 初始物资（全部存入公共仓库）
    this.warehouse.addItem('food', 'wheat', '小麦', 20);
    this.warehouse.addItem('seed', 'wheat_seed', '小麦种子', 10);

    this.log = [
      '你来到了一片陌生的土地。',
      '这里有几块空闲的农田和一间公共仓库。',
      '仓库里有一些小麦和小麦种子，够你起步了。',
    ];
    this.notifications = [];
  }

  // tick进度（0~9），用于日月动画
  get tickProgress() {
    return (this.tickCount % 10) / 10;
  }

  // 每天粮食消耗
  get dailyFoodConsumption() {
    return this.population * this.foodPerPerson;
  }

  tick() {
    this.tickCount++;

    // 每10个tick算一天
    if (this.tickCount % 10 === 0) {
      this.day++;

      // 季节
      const seasonIndex = Math.floor((this.day - 1) / 7) % 4;
      const seasons = ['春', '夏', '秋', '冬'];
      const newSeason = seasons[seasonIndex];
      if (newSeason !== this.season) {
        this.season = newSeason;
        this.addLog(`季节变化：进入了${this.season}季`);
      }

      // 消耗食物
      const needed = this.dailyFoodConsumption;
      const wheatAmount = this.warehouse.getItemAmount('food', 'wheat');
      if (wheatAmount >= needed) {
        this.warehouse.removeItem('food', 'wheat', needed);
      } else if (wheatAmount > 0) {
        this.warehouse.removeItem('food', 'wheat', wheatAmount);
        this.addLog(`食物不足！只够吃${wheatAmount}单位...`);
        this.addNotification('警告：食物不足！');
      } else {
        this.addLog('完全没有食物了！你正在挨饿...');
        this.addNotification('警告：食物耗尽！');
      }

      // 检查仓库解锁
      const newUnlocks = this.warehouse.checkUnlocks(this.day);
      for (const name of newUnlocks) {
        this.addLog(`${name}仓库已解锁！`);
        this.addNotification(`新仓库解锁：${name}仓库`);
      }
    }

    // 农田tick
    const farmEvents = this.farm.tick();
    for (const evt of farmEvents) {
      if (evt.type === 'ready') {
        this.addLog(`${evt.cropName}已成熟，可以收获了！`);
        this.addNotification(`${evt.cropName}已成熟！`);
      } else if (evt.type === 'withered') {
        this.addLog('一块农田的作物因缺水枯萎了...');
      } else if (evt.type === 'pest') {
        this.addLog(`病虫害出现了！需要点击${evt.severity}次来清除`);
        this.addNotification('病虫害出现了！');
      }
    }

    // 冬天冻害
    if (this.season === '冬' && this.tickCount % 10 === 0) {
      for (const plot of this.farm.plots) {
        if (plot.state === 'growing' && Math.random() < 0.1) {
          plot.state = 'withered';
          this.addLog('严寒使一块作物冻死了');
        }
      }
    }
  }

  doAction(action, params = {}) {
    let result;
    switch (action) {
      case 'plow':
        result = this.farm.plow(params.plotId, this.player);
        break;
      case 'plant':
        result = this.farm.plant(params.plotId, params.cropId, this.player, this.warehouse);
        break;
      case 'water':
        result = this.farm.water(params.plotId, this.player);
        break;
      case 'remove_pest':
        result = this.farm.removePest(params.plotId, this.player);
        break;
      case 'harvest':
        result = this.farm.harvest(params.plotId, this.player);
        if (result.success && result.yield) {
          const storeResult = this.warehouse.addItem(
            result.yield.category, result.yield.itemId, result.yield.name, result.yield.amount
          );
          if (storeResult.overflow > 0) {
            this.addLog(`仓库满了！${storeResult.overflow}单位${result.yield.name}丢失`);
          }
          if (result.seedBack) {
            this.warehouse.addItem('seed', result.seedBack.itemId, result.seedBack.name, result.seedBack.amount);
          }
        }
        break;
      case 'expand_farm':
        result = this.farm.expandFarm();
        break;
      case 'upgrade_common':
        result = this.warehouse.upgradeCommon();
        break;
      case 'upgrade_warehouse':
        result = this.warehouse.upgradeWarehouse(params.category);
        break;
      default:
        result = { success: false, message: '未知操作' };
    }
    if (result && result.message) this.addLog(result.message);
    return result;
  }

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 100) this.log.shift();
  }
  addNotification(msg) { this.notifications.push(msg); }
  clearNotifications() { this.notifications = []; }
}
