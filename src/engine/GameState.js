/**
 * 游戏主状态 - 路灯计划
 * 时间自动流逝（定时器驱动），无体力系统
 */

import { Character } from './Character';
import { FarmSystem, FarmPlot } from './FarmSystem';
import { WarehouseSystem } from './WarehouseSystem';
import { SaveSystem } from './SaveSystem';
import { NPCAISystem } from './NPCAISystem';
import { FoodSystem } from './FoodSystem';
import { EventSystem } from './EventSystem';
import { NPC_NAMES } from '../data/names';
import { getRoleName } from '../data/roles';
import {
  TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS, WINTER_FREEZE_CHANCE,
} from './constants';

// 纯委托映射：action → { target, method }
// 15 个不需要 GameState 介入的 case，统一处理 result.message 日志
const FARM_DELEGATES = {
  plow:          (g, p) => g.farm.plow(p.plotId, g.player),
  plant:         (g, p) => g.farm.plant(p.plotId, p.cropId, g.player, g.warehouse),
  water:         (g, p) => g.farm.water(p.plotId, g.player),
  remove_pest:   (g, p) => g.farm.removePest(p.plotId, g.player),
  remove_weeds:      (g, p) => g.farm.removeWeeds(p.plotId, g.player),
  fertilize:         (g, p) => g.farm.fertilize(p.plotId, g.player),
  remove_spirit_bug: (g, p) => g.farm.removeSpiritBug(p.plotId, g.player),
  rename_plot:   (g, p) => g.farm.renamePlot(p.plotId, p.newName),
  expand_farm:   (g)    => g.farm.expandFarm(),
  remove_plot:   (g, p) => g.farm.removePlot(p.plotId),
  assign_plot:   (g, p) => g.farm.assignPlot(p.plotId, p.characterId),
  unassign_plot: (g, p) => g.farm.unassignPlot(p.plotId, p.characterId),
  set_target_plots: (g, p) => g.farm.setTargetPlots(p.count),
};
const WAREHOUSE_DELEGATES = {
  upgrade_common:    (g) => g.warehouse.upgradeCommon(),
  upgrade_warehouse: (g, p) => g.warehouse.upgradeWarehouse(p.category),
};

export class GameState {
  constructor(playerName = '旅人') {
    this.day = 1;
    this.tickCount = 0;
    this.season = '春';

    this.player = new Character({ name: playerName, roles: ['farmer'], isPlayer: true });
    this.characters = []; // NPC角色列表
    this.farm = new FarmSystem();
    this.warehouse = new WarehouseSystem();
    this.npcAI = new NPCAISystem();
    this.foodSystem = new FoodSystem();
    this.eventSystem = new EventSystem();

    // 事件系统（委托给 EventSystem，保留引用兼容旧存档）
    this.triggeredEvents = this.eventSystem.triggeredEvents;

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
    return this.foodSystem.dailyConsumption;
  }

  get population() {
    return this.foodSystem.population;
  }

  set population(val) {
    this.foodSystem.population = val;
  }

  get foodPerPerson() {
    return this.foodSystem.foodPerPerson;
  }

  set foodPerPerson(val) {
    this.foodSystem.foodPerPerson = val;
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

      // 事件检查
      const eventNotifs = this.eventSystem.checkEvents(this.day);
      eventNotifs.forEach(n => this.addNotification(n));

      // 食物消耗
      const foodResult = this.foodSystem.consumeDaily(this.warehouse, this.player);
      foodResult.logs.forEach(msg => this.addLog(msg));
      foodResult.notifications.forEach(msg => this.addNotification(msg));
      if (foodResult.moodDelta !== 0) {
        this.player.changeMood(foodResult.moodDelta);
      }
    }

    // 农田tick（传入是否新的一天 + 当前季节）
    const isNewDay = this.tickCount % TICKS_PER_DAY === 0;
    const farmEvents = this.farm.tick(isNewDay, this.season);
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
      } else if (evt.type === 'spirit_bug') {
        this.addLog('灵蛊入侵了灵草！需要及时驱蛊，否则品质大降！');
        this.player.changeMood(-2);
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
    this.npcAI.tickAutoWork(this.characters, this.farm, this.warehouse, (msg) => this.addLog(msg));

    // 冬天冻害
    if (this.season === '冬' && this.tickCount % TICKS_PER_DAY === 0) {
      const damagedCount = this.farm.applyWinterDamage(WINTER_FREEZE_CHANCE);
      for (let i = 0; i < damagedCount; i++) {
        this.addLog('严寒使一块作物冻死了');
      }
    }
  }

  doAction(action, params = {}) {
    let result;

    // 纯委托：农田操作（12 个）
    const farmFn = FARM_DELEGATES[action];
    if (farmFn) {
      result = farmFn(this, params);
      if (result && result.message) this.addLog(result.message);
      return result;
    }

    // 纯委托：仓库操作（2 个）
    const warehouseFn = WAREHOUSE_DELEGATES[action];
    if (warehouseFn) {
      result = warehouseFn(this, params);
      if (result && result.message) this.addLog(result.message);
      return result;
    }

    // 带副作用的操作（6 个）
    switch (action) {
      case 'harvest':
        result = this.farm.harvest(params.plotId, this.player, this.warehouse);
        if (result.success && result.yield) {
          this.player.changeMood(3);
          result.overflowWarnings?.forEach(msg => this.addLog(msg));
        }
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
        this.player.roles = ['farmer_leader', 'farmer'];
        this.addLog('你现在的身份是：农民队长、农民');
        result = { success: true, message: `${name}加入了，你成为了农民队长`, npcName: name };
        break;
      }
      case 'recruit_reject':
        this.addLog('你拒绝了来访者的请求。也许过些天还会有人来。');
        result = { success: true, message: '拒绝了招工请求' };
        break;
      case 'leader_recruit': {
        const { name } = this._createNPCFarmer({ minKnowledge: 1, avoidExistingNames: true });
        result = { success: true, message: `${name}加入了你的队伍` };
        break;
      }
      case 'set_player_roles':
        if (params.roles && Array.isArray(params.roles)) {
          this.player.roles = params.roles;
          const roleNames = params.roles.map(r => getRoleName(r)).join('、');
          this.addLog(`你现在的身份是：${roleNames}`);
          result = { success: true, message: `身份已更新` };
        } else {
          result = { success: false, message: '无效的角色参数' };
        }
        break;
      case 'upgrade_spirit_plot': {
        // 灵田升级：检查材料 → 消耗 → 执行升级
        const targetLevel = params.level || 1;
        const costs = FarmSystem.getUpgradeCost(targetLevel);
        if (costs.length === 0) {
          result = { success: false, message: '无效的升级目标' };
          break;
        }
        // 检查材料是否足够
        const lacks = [];
        for (const cost of costs) {
          const have = this.warehouse.getItemAmount(cost.category, cost.itemId);
          if (have < cost.amount) {
            lacks.push(`${cost.name}(${have}/${cost.amount})`);
          }
        }
        if (lacks.length > 0) {
          result = { success: false, message: `材料不足：${lacks.join('、')}` };
          break;
        }
        // 消耗材料
        for (const cost of costs) {
          this.warehouse.removeItem(cost.category, cost.itemId, cost.amount);
        }
        // 执行升级
        result = this.farm.upgradeToSpirit(params.plotId, targetLevel);
        break;
      }
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
