/**
 * 游戏主状态 - 路灯计划
 * 时间自动流逝（定时器驱动），无体力系统
 */

import { Character } from './Character';
import { FarmSystem, FarmPlot } from './FarmSystem';
import { WarehouseSystem } from './WarehouseSystem';

const SAVE_KEY = 'streetlight_save';

export class GameState {
  constructor(playerName = '旅人') {
    this.day = 1;
    this.tickCount = 0;
    this.season = '春';

    this.population = 1;
    this.foodPerPerson = 2;

    this.player = new Character({ name: playerName, role: 'farmer', isPlayer: true });
    this.farm = new FarmSystem();
    this.warehouse = new WarehouseSystem();

    // 初始物资
    this.warehouse.addItem('food', 'wheat', '小麦', 20);
    this.warehouse.addItem('seed', 'wheat_seed', '小麦种子', 10);

    this.log = [
      '你来到了一片陌生的土地。',
      '这里有几块空闲的农田和一间公共仓库。',
      '仓库里有一些小麦和小麦种子，够你起步了。',
    ];
    this.notifications = [];
  }

  get tickProgress() {
    return (this.tickCount % 10) / 10;
  }

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
        // 吃饱了心情自然恢复
        this.player.changeMood(1);
      } else if (wheatAmount > 0) {
        this.warehouse.removeItem('food', 'wheat', wheatAmount);
        this.addLog(`食物不足！只够吃${wheatAmount}单位...`);
        this.addNotification('警告：食物不足！');
        // 食物不足减少心情
        this.player.changeMood(-5);
      } else {
        this.addLog('完全没有食物了！你正在挨饿...');
        this.addNotification('警告：食物耗尽！');
        // 饥饿大幅减少心情
        this.player.changeMood(-10);
      }
    }

    // 农田tick
    const farmEvents = this.farm.tick();
    for (const evt of farmEvents) {
      if (evt.type === 'ready') {
        this.addLog(`${evt.cropName}已成熟，可以收获了！`);
      } else if (evt.type === 'withered') {
        this.addLog('一块农田的作物因缺水枯萎了...');
        this.player.changeMood(-3);
      } else if (evt.type === 'pest') {
        this.addLog('病虫害出现了！请及时除虫！');
      } else if (evt.type === 'pest_spread') {
        this.addLog(`病虫害传染到了邻田！`);
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
      case 'remove_weeds':
        result = this.farm.removeWeeds(params.plotId, this.player);
        break;
      case 'fertilize':
        result = this.farm.fertilize(params.plotId, this.player);
        break;
      case 'rename_plot':
        result = this.farm.renamePlot(params.plotId, params.newName);
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
          // 收获增加心情
          this.player.changeMood(3);
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

  // ====== 存档系统 ======
  save() {
    const data = {
      version: 1,
      timestamp: Date.now(),
      day: this.day,
      tickCount: this.tickCount,
      season: this.season,
      population: this.population,
      foodPerPerson: this.foodPerPerson,
      player: this.player.toJSON(),
      farm: this.farm.toJSON(),
      warehouse: {
        common: {
          items: { ...this.warehouse.common.items },
          capacity: this.warehouse.common.capacity,
          level: this.warehouse.common.level,
        },
        storage: {},
      },
      log: this.log.slice(-50),
    };
    // 保存仓库专用仓库状态
    for (const [key, cat] of Object.entries(this.warehouse.storage)) {
      data.warehouse.storage[key] = {
        items: { ...cat.items },
        capacity: cat.capacity,
        level: cat.level,
        unlocked: cat.unlocked,
      };
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;

      const game = new GameState();
      game.day = data.day;
      game.tickCount = data.tickCount;
      game.season = data.season;
      game.population = data.population;
      game.foodPerPerson = data.foodPerPerson;
      game.player = Character.fromJSON(data.player);
      game.farm = FarmSystem.fromJSON(data.farm);
      game.log = data.log || [];

      // 恢复仓库
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

      game.addLog('存档已加载');
      return game;
    } catch {
      return null;
    }
  }

  static hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }
}
