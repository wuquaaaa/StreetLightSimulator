/**
 * 游戏主状态 - 路灯计划
 * 时间自动流逝（定时器驱动），无体力系统
 */

import { Character } from './Character';
import { FarmSystem, FarmPlot } from './FarmSystem';
import { WarehouseSystem } from './WarehouseSystem';
import { SaveSystem } from './SaveSystem';
import {
  TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS, FOOD_PER_PERSON, WINTER_FREEZE_CHANCE,
  NPC_WATER_THRESHOLD, NPC_WEED_THRESHOLD, NPC_FERTILITY_THRESHOLD,
} from './constants';

// NPC 名字池（统一管理，避免重复定义）
const NPC_NAMES = [
  '张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十',
  '陈大壮', '刘小花', '杨铁柱', '黄翠兰', '马大力', '朱小妹', '林阿牛', '何秀英',
  '徐大宝', '宋小美', '冯铁蛋', '褚翠花', '卫大山', '蒋小龙', '沈秋菊', '韩冬梅',
];

// 角色名称映射（统一管理，避免分散在多个文件）
export const ROLE_DISPLAY_NAMES = {
  farmer: '农民',
  farmer_leader: '农民队长',
  scholar: '学者',
  trader: '商人',
};

export class GameState {
  constructor(playerName = '旅人') {
    this.day = 1;
    this.tickCount = 0;
    this.season = '春';

    this.population = 1;
    this.foodPerPerson = FOOD_PER_PERSON;

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
    return (this.tickCount % TICKS_PER_DAY) / TICKS_PER_DAY;
  }

  get dailyFoodConsumption() {
    return this.population * this.foodPerPerson;
  }

  tick() {
    this.tickCount++;

    // 每 TICKS_PER_DAY 个 tick 算一天
    if (this.tickCount % TICKS_PER_DAY === 0) {
      this.day++;

      // 季节
      const seasonIndex = Math.floor((this.day - 1) / DAYS_PER_SEASON) % SEASONS.length;
      const newSeason = SEASONS[seasonIndex];
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

    // 农田tick（传入是否新的一天）
    const isNewDay = this.tickCount % TICKS_PER_DAY === 0;
    const farmEvents = this.farm.tick(isNewDay);
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
    if (this.season === '冬' && this.tickCount % TICKS_PER_DAY === 0) {
      for (const plot of this.farm.plots) {
        if (plot.state === 'growing' && Math.random() < WINTER_FREEZE_CHANCE) {
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
          this._processHarvestResult(result);
          this.player.changeMood(3);
        }
        break;
      case 'expand_farm':
        result = this.farm.expandFarm();
        break;
      case 'remove_plot':
        result = this.farm.removePlot(params.plotId);
        break;
      case 'upgrade_common':
        result = this.warehouse.upgradeCommon();
        break;
      case 'upgrade_warehouse':
        result = this.warehouse.upgradeWarehouse(params.category);
        break;
      case 'recruit_accept': {
        const { name } = this._createNPCFarmer();
        this.triggeredEvents['recruit'] = 'accepted';
        this.addLog(`${name}加入了你的队伍！他是一个农民。`);
        result = { success: true, message: `${name}加入了`, npcName: name };
        break;
      }
      case 'recruit_accept_with_promote': {
        const { name } = this._createNPCFarmer();
        this.triggeredEvents['recruit'] = 'accepted';
        this.addLog(`${name}加入了你的队伍！他是一个农民。`);
        // 自动成为农民队长+农民
        this.player.roles = ['farmer_leader', 'farmer'];
        this.addLog('你现在的身份是：农民队长、农民');
        result = { success: true, message: `${name}加入了，你成为了农民队长`, npcName: name };
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
        result = this.farm.unassignPlot(params.plotId, params.characterId);
        break;
      case 'set_target_plots':
        result = this.farm.setTargetPlots(params.count);
        break;
      case 'leader_recruit': {
        const { name } = this._createNPCFarmer({ minKnowledge: 1, avoidExistingNames: true });
        result = { success: true, message: `${name}加入了你的队伍` };
        break;
      }
      case 'set_player_roles':
        if (params.roles && Array.isArray(params.roles)) {
          this.player.roles = params.roles;
          const roleNames = params.roles.map(r => ROLE_DISPLAY_NAMES[r] || r).join('、');
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

  /**
   * 创建一个随机农民 NPC 并加入队伍
   * @param {{ minKnowledge?: number, avoidExistingNames?: boolean }} opts
   * @returns {{ npc: Character, name: string }}
   */
  _createNPCFarmer(opts = {}) {
    const { minKnowledge = 3, avoidExistingNames = false } = opts;
    let name;
    if (avoidExistingNames) {
      const existing = new Set([this.player.name, ...this.characters.map(c => c.name)]);
      const available = NPC_NAMES.filter(n => !existing.has(n));
      name = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : `农民${this.characters.length + 2}号`;
    } else {
      name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
    }
    const npc = new Character({ name, roles: ['farmer'], isPlayer: false });
    npc.knowledgeAttributes.farming = minKnowledge + Math.floor(Math.random() * 5);
    this.characters.push(npc);
    this.population++;
    return { npc, name };
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

  /**
   * 统一处理收获结果：入库（种子+产物），检查溢出
   * @param {object} result - FarmSystem.harvest() 的返回值
   * @param {boolean} isPlayer - 是否是玩家操作（玩家会恢复心情）
   */
  _processHarvestResult(result) {
    if (!result.success || !result.yield) return;
    // 优先存入种子
    if (result.seedBack) {
      const seedResult = this.warehouse.addItem('seed', result.seedBack.itemId, result.seedBack.name, result.seedBack.amount);
      if (seedResult.overflow > 0) {
        this.addLog(`仓库满了！${seedResult.overflow}颗${result.seedBack.name}丢失`);
      }
    }
    const storeResult = this.warehouse.addItem(
      result.yield.category, result.yield.itemId, result.yield.name, result.yield.amount
    );
    if (storeResult.overflow > 0) {
      this.addLog(`仓库满了！${storeResult.overflow}单位${result.yield.name}丢失`);
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
          this._processHarvestResult(result);
        }
        return;
      }
    }
    for (const plot of plots) {
      if (plot.waterLevel < NPC_WATER_THRESHOLD) {
        this.farm.water(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.weedGrowth > NPC_WEED_THRESHOLD) {
        this.farm.removeWeeds(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.fertility < NPC_FERTILITY_THRESHOLD) {
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

  // ====== 存档系统（委托给 SaveSystem）======
  save(slot = 0) { return SaveSystem.save(this, slot); }
  static load(slot = 0) { return SaveSystem.load(slot, GameState); }
  static loadAny() { return SaveSystem.loadAny(GameState); }
  static getSaveSlots() { return SaveSystem.getSaveSlots(); }
  static hasSave() { return SaveSystem.hasSave(); }

  // 暴露给 SaveSystem 使用的反序列化辅助方法
  static _charFromJSON = Character.fromJSON;
  static _farmFromJSON = FarmSystem.fromJSON;
}
