/**
 * 游戏主状态 - 路灯计划
 * 时间自动流逝（定时器驱动），无体力系统
 */

import { Character } from './Character';
import { FarmSystem, FarmPlot } from './FarmSystem';
import { WarehouseSystem } from './WarehouseSystem';

const SAVE_KEY_PREFIX = 'streetlight_save_';
const SAVE_SLOTS = 5;

export class GameState {
  constructor(playerName = '旅人') {
    this.day = 1;
    this.tickCount = 0;
    this.season = '春';

    this.population = 1;
    this.foodPerPerson = 2;

    this.player = new Character({ name: playerName, roles: ['farmer'], isPlayer: true });
    this.characters = []; // NPC角色列表
    this.farm = new FarmSystem();
    this.warehouse = new WarehouseSystem();

    // 事件系统
    this.triggeredEvents = {}; // 已触发事件的记录

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

      // 每10天招工事件（如果从未接受过）
      if (this.day >= 10 && this.day % 10 === 0 && this.triggeredEvents['recruit'] !== 'accepted') {
        // 避免同一天重复触发
        if (this.triggeredEvents['recruit_last_day'] !== this.day) {
          this.triggeredEvents['recruit_last_day'] = this.day;
          this.addNotification('event:recruit');
        }
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

    // 开垦进度
    const expandDone = this.farm.tickExpand();
    for (const charId of expandDone) {
      const char = this._findCharacter(charId);
      const charName = char ? char.name : '未知';
      this.addLog(`${charName}开垦了一块新农田！`);
      if (char) char.gainKnowledge('farming', 5);
    }

    // 目标农田数自动开垦
    if (this.farm.plots.length + this.farm.expandQueue.length < this.farm.targetPlotCount) {
      // 找一个空闲农民去开垦
      const allFarmers = this._getAllFarmers();
      const busyIds = new Set(this.farm.expandQueue.map(q => q.characterId));
      const idle = allFarmers.find(f => !busyIds.has(f.id) && this.farm.getPlotsForCharacter(f.id).length === 0);
      if (idle) {
        this.farm.startExpand(idle.id);
        this.addLog(`${idle.name}开始开垦新农田...`);
      }
    }

    // NPC农民自动劳作
    this._autoFarmWork();

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
      case 'recruit_accept': {
        const CHINESE_NAMES = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十',
          '陈大壮', '刘小花', '杨铁柱', '黄翠兰', '马大力', '朱小妹', '林阿牛', '何秀英'];
        const name = CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)];
        const npc = new Character({ name, roles: ['farmer'], isPlayer: false });
        npc.knowledgeAttributes.farming = 3 + Math.floor(Math.random() * 5);
        this.characters.push(npc);
        this.population++;
        this.triggeredEvents['recruit'] = 'accepted';
        this.addLog(`${name}加入了你的队伍！他是一个农民。`);
        // 玩家身份变化的选择由UI触发
        result = { success: true, message: `${name}加入了`, npcName: name };
        break;
      }
      case 'recruit_reject':
        // 拒绝后不设置 'accepted'，下个10天还会来
        this.addLog('你拒绝了来访者的请求。也许过些天还会有人来。');
        result = { success: true, message: '拒绝了招工请求' };
        break;
      case 'assign_plot':
        result = this.farm.assignPlot(params.plotId, params.characterId);
        break;
      case 'unassign_plot':
        result = this.farm.unassignPlot(params.plotId);
        break;
      case 'set_target_plots':
        if (typeof params.count === 'number' && params.count >= this.farm.plots.length) {
          this.farm.targetPlotCount = params.count;
          result = { success: true, message: `目标农田数设为 ${params.count}` };
        } else {
          result = { success: false, message: '目标数不能小于当前农田数' };
        }
        break;
      case 'leader_recruit': {
        const CHINESE_NAMES = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十',
          '陈大壮', '刘小花', '杨铁柱', '黄翠兰', '马大力', '朱小妹', '林阿牛', '何秀英',
          '徐大宝', '宋小美', '冯铁蛋', '褚翠花', '卫大山', '蒋小龙', '沈秋菊', '韩冬梅'];
        // 避免重名
        const existing = new Set([this.player.name, ...this.characters.map(c => c.name)]);
        const available = CHINESE_NAMES.filter(n => !existing.has(n));
        const name = available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : `农民${this.characters.length + 2}号`;
        const npc = new Character({ name, roles: ['farmer'], isPlayer: false });
        npc.knowledgeAttributes.farming = 1 + Math.floor(Math.random() * 5);
        this.characters.push(npc);
        this.population++;
        result = { success: true, message: `${name}加入了你的队伍` };
        break;
      }
      case 'set_player_roles':
        if (params.roles && Array.isArray(params.roles)) {
          this.player.roles = params.roles;
          const roleNames = params.roles.map(r => {
            const map = { farmer: '农民', farmer_leader: '农民队长', scholar: '学者', trader: '商人' };
            return map[r] || r;
          }).join('、');
          this.addLog(`你现在的身份是：${roleNames}`);
          result = { success: true, message: `身份已更新` };
        } else {
          result = { success: false, message: '无效的角色参数' };
        }
        break;
      default:
        result = { success: false, message: '未知操作' };
    }
    if (result && result.message) this.addLog(result.message);
    return result;
  }

  _findCharacter(id) {
    if (this.player.id === id) return this.player;
    return this.characters.find(c => c.id === id) || null;
  }

  _getAllFarmers() {
    const all = [this.player, ...this.characters];
    return all.filter(c => c.hasRole('farmer'));
  }

  // NPC农民自动劳作：每tick根据工作速率执行操作
  _autoFarmWork() {
    const npcs = this.characters.filter(c => c.hasRole('farmer'));
    for (const npc of npcs) {
      // 检查是否在开垦
      if (this.farm.expandQueue.find(q => q.characterId === npc.id)) continue;

      const plots = this.farm.getPlotsForCharacter(npc.id);
      if (plots.length === 0) continue;

      const speed = npc.getFarmWorkSpeed();
      // 用累计器判断本tick执行几次操作
      // speed=1 → 每tick 1次, speed=2 → 每tick 2次
      const ops = Math.floor(speed);
      const remainder = speed - ops;
      let totalOps = ops + (Math.random() < remainder ? 1 : 0);

      for (let op = 0; op < totalOps; op++) {
        this._npcDoOneFarmAction(npc, plots);
      }
    }
  }

  _npcDoOneFarmAction(npc, plots) {
    // 优先级：除虫 > 收获 > 浇水(低于50) > 除草(高于50) > 施肥(低于50) > 翻地 > 播种
    for (const plot of plots) {
      if (plot.hasPest) {
        this.farm.removePest(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.state === 'ready') {
        const result = this.farm.harvest(plot.id, npc);
        if (result.success && result.yield) {
          this.warehouse.addItem(result.yield.category, result.yield.itemId, result.yield.name, result.yield.amount);
          if (result.seedBack) {
            this.warehouse.addItem('seed', result.seedBack.itemId, result.seedBack.name, result.seedBack.amount);
          }
        }
        return;
      }
    }
    for (const plot of plots) {
      if (plot.waterLevel < 50) {
        this.farm.water(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.weedGrowth > 50) {
        this.farm.removeWeeds(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.fertility < 50) {
        this.farm.fertilize(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.state === 'empty' || plot.state === 'withered') {
        this.farm.plow(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.state === 'plowed') {
        // 自动播种小麦（如果有种子）
        const seedAmt = this.warehouse.getItemAmount('seed', 'wheat_seed');
        if (seedAmt >= 1) {
          this.farm.plant(plot.id, 'wheat', npc, this.warehouse);
        }
        return;
      }
    }
  }

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 100) this.log.shift();
  }
  addNotification(msg) { this.notifications.push(msg); }
  clearNotifications() { this.notifications = []; }

  // ====== 存档系统（5个栏位）======
  _serializeData() {
    const data = {
      version: 2,
      timestamp: Date.now(),
      day: this.day,
      tickCount: this.tickCount,
      season: this.season,
      population: this.population,
      foodPerPerson: this.foodPerPerson,
      player: this.player.toJSON(),
      characters: this.characters.map(c => c.toJSON()),
      triggeredEvents: { ...this.triggeredEvents },
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
    for (const [key, cat] of Object.entries(this.warehouse.storage)) {
      data.warehouse.storage[key] = {
        items: { ...cat.items },
        capacity: cat.capacity,
        level: cat.level,
        unlocked: cat.unlocked,
      };
    }
    return data;
  }

  save(slot = 0) {
    const data = this._serializeData();
    try {
      localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  static _restoreFromData(data) {
    const game = new GameState();
    game.day = data.day;
    game.tickCount = data.tickCount;
    game.season = data.season;
    game.population = data.population;
    game.foodPerPerson = data.foodPerPerson;
    game.player = Character.fromJSON(data.player);
    game.characters = (data.characters || []).map(c => Character.fromJSON(c));
    game.triggeredEvents = data.triggeredEvents || {};
    game.farm = FarmSystem.fromJSON(data.farm);
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

    game.addLog('存档已加载');
    return game;
  }

  static load(slot = 0) {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || (data.version !== 1 && data.version !== 2)) return null;
      return GameState._restoreFromData(data);
    } catch {
      return null;
    }
  }

  // 获取所有栏位信息
  static getSaveSlots() {
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
  }

  static hasSave() {
    for (let i = 0; i < SAVE_SLOTS; i++) {
      if (localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`)) return true;
    }
    // 兼容旧存档
    return !!localStorage.getItem('streetlight_save');
  }

  static loadAny() {
    // 先尝试新格式
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const game = GameState.load(i);
      if (game) return game;
    }
    // 兼容旧存档
    try {
      const raw = localStorage.getItem('streetlight_save');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.version === 1) return GameState._restoreFromData(data);
      }
    } catch { /* ignore */ }
    return null;
  }
}
