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
import { ResearchSystem } from './ResearchSystem';
import { GatherSystem } from './GatherSystem';
import { MiningSystem } from './MiningSystem';
import { AlchemySystem } from './AlchemySystem';
import { RecruitSystem } from './RecruitSystem';
import { SmeltingSystem } from './SmeltingSystem';
import { HerbPrepSystem } from './HerbPrepSystem';
import { RepairSystem } from './RepairSystem';
import { SalesSystem } from './SalesSystem';
import { TransportSystem } from './TransportSystem';
import { FinanceSystem } from './FinanceSystem';
import { WorkerSystem } from './WorkerSystem';
import { CultivationSystem } from './CultivationSystem';
import { getRoleName } from '../data/roles';
import { getPostInfo } from '../data/posts';
import { getGongfuInfo } from '../data/gongfu';
import { generateName, generateAppearance } from '../data/names';
import { rollOriginTrait, rollGeneralTraits } from '../data/traits';
import { rollFate } from '../data/fates';
import { BUILDING_DEFS } from '../data/buildings';
import {
  TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS, WINTER_FREEZE_CHANCE,
  HR_EXP_PER_TICK,
  TRAIT_INSIGHT_PER_DAY,
  FANGSHI_CONSUMPTION_REDUCTION,
} from './constants';
import { getVehicleInfo } from '../data/transport';
import { getHRLevel, getRecruitVisibility } from '../data/hr-levels';

// 纯委托映射：action → 函数
const FARM_DELEGATES = {
  water:         (g, p) => g.farm.water(p.plotId, g.player),
  remove_pest:   (g, p) => g.farm.removePest(p.plotId, g.player),
  remove_weeds:      (g, p) => g.farm.removeWeeds(p.plotId, g.player),
  fertilize:         (g, p) => g.farm.fertilize(p.plotId, g.player),
  remove_spirit_bug: (g, p) => g.farm.removeSpiritBug(p.plotId, g.player),
  rename_plot:   (g, p) => g.farm.renamePlot(p.plotId, p.newName),
  remove_plot:   (g, p) => g.farm.removePlot(p.plotId),
  assign_plot:   (g, p) => g.farm.assignPlot(p.plotId, p.characterId),
  unassign_plot: (g, p) => g.farm.unassignPlot(p.plotId, p.characterId),
  set_target_plots: (g, p) => g.farm.setTargetPlots(p.count),
};
const WAREHOUSE_DELEGATES = {
  upgrade_common:    (g) => g.warehouse.upgradeCommon(),
  upgrade_warehouse: (g, p) => g.warehouse.upgradeWarehouse(p.category),
  move_item:         (g, p) => g.warehouse.moveItem(p.fromShelfId, p.toShelfId, p.itemId, p.amount),
};
const GATHER_DELEGATES = {
  assign_gather_node:   (g, p) => g.gatherSystem.assignNode(p.nodeId, p.characterId),
  unassign_gather_node: (g, p) => g.gatherSystem.unassignNode(p.nodeId, p.characterId),
};
const RECRUIT_ACTIONS = new Set([
  'leader_recruit', 'delegate_recruit', 'recruit_choose', 'recruit_confirm',
  'recruit_skip', 'upgrade_vehicle',
]);
const RESEARCH_ACTIONS = new Set([
  'research_post', 'start_gongfu_research', 'cancel_gongfu_research',
  'assign_post', 'remove_post', 'start_learn_gongfu', 'cancel_learn_gongfu',
]);
const BUILD_ACTIONS = new Set(['start_build', 'build_hall']);

export class GameState {
  constructor(playerName = '旅人') {
    this.day = 1;
    this.tickCount = 0;
    this.season = '春';

    this.player = new Character({
      name: playerName, roles: ['farmer'], isPlayer: true,
      gender: 'male', age: 25,
    });
    this.characters = [];
    this.farm = new FarmSystem();
    this.warehouse = new WarehouseSystem();
    this.npcAI = new NPCAISystem();
    this.foodSystem = new FoodSystem();
    this.eventSystem = new EventSystem();

    this._seasonBuff = 1;
    this._freeRecruitAvailable = false;
    this.statsHistory = [];

    this.researchSystem = new ResearchSystem();
    this.gatherSystem = new GatherSystem();
    this.miningSystem = new MiningSystem();
    this.alchemySystem = new AlchemySystem();
    this.recruitSystem = new RecruitSystem();
    this.smeltingSystem = new SmeltingSystem();
    this.herbPrepSystem = new HerbPrepSystem();
    this.repairSystem = new RepairSystem();
    this.salesSystem = new SalesSystem();
    this.transportSystem = new TransportSystem();
    this.financeSystem = new FinanceSystem();
    this.workerSystem = new WorkerSystem();
    this.cultivationSystem = new CultivationSystem();

    // 初始化矿脉
    this.miningSystem.init();
    this.repairSystem.init();

    this.triggeredEvents = this.eventSystem.triggeredEvents;

    this.warehouse.addItem('food', 'wheat', '小麦', 20);
    this.warehouse.addItem('seed', 'wheat_seed', '小麦种子', 10);
    this.warehouse.addItem('currency', 'silver', '银两', 200);
    this.financeSystem.treasury = 200;

    this.tutorialStep = 0;
    this.buildings = [];
    this.buildQueue = [];
    this.hallBuilt = false;

    // 岗位解锁系统
    this.unlockedJobs = new Set(['farmer']);  // 初始只有农夫
    this.currentJob = 'farmer';              // 玩家当前岗位

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

  get dailyFoodConsumption() { return this.foodSystem.dailyConsumption; }
  get population() { return this.foodSystem.population; }
  set population(val) { this.foodSystem.population = val; }
  get foodPerPerson() { return this.foodSystem.foodPerPerson; }
  set foodPerPerson(val) { this.foodSystem.foodPerPerson = val; }

  // 招募状态代理
  get isRecruiting() { return this.recruitSystem.isRecruiting; }
  get isPlayerAway() { return this.recruitSystem.isPlayerAway; }
  get maxRecruitHire() { return this.recruitSystem.maxRecruitHire; }
  get recruitingNPCIds() { return this.recruitSystem.recruitingNPCIds; }

  // 兼容旧存档：直接访问招募属性
  get recruitTask() { return this.recruitSystem.recruitTask; }
  set recruitTask(val) { this.recruitSystem.recruitTask = val; }
  get recruitCandidatePool() { return this.recruitSystem.recruitCandidatePool; }
  set recruitCandidatePool(val) { this.recruitSystem.recruitCandidatePool = val; }
  get recruitHiredCount() { return this.recruitSystem.recruitHiredCount; }
  set recruitHiredCount(val) { this.recruitSystem.recruitHiredCount = val; }
  get currentVehicle() { return this.recruitSystem.currentVehicle; }
  set currentVehicle(val) { this.recruitSystem.currentVehicle = val; }

  get currentHRLevel() {
    let maxExp = 0;
    for (const npc of this.characters) {
      if (npc.hrExp > maxExp) maxExp = npc.hrExp;
    }
    return getHRLevel(maxExp);
  }

  get recruitVisibility() {
    return getRecruitVisibility(this.currentHRLevel.level);
  }

  // ====== 材料/前置检查（复用方法）======

  _checkMaterials(costs) {
    const lacks = [];
    for (const cost of costs) {
      const have = this.warehouse.getItemAmount(cost.category, cost.itemId);
      if (have < cost.amount) {
        lacks.push(`${cost.name}(${have}/${cost.amount})`);
      }
    }
    return lacks.length > 0 ? `材料不足：${lacks.join('、')}` : null;
  }

  _consumeMaterials(costs) {
    for (const cost of costs) {
      this.warehouse.removeItem(cost.category, cost.itemId, cost.amount);
    }
  }

  // ====== Tick ======

  tick() {
    this.tickCount++;
    const isNewDay = this.tickCount % TICKS_PER_DAY === 0;

    if (isNewDay) {
      this._tickDay();
    }

    this._tickPerTick(isNewDay);
  }

  _tickDay() {
    this.day++;
    this.recordStats();

    // 季节
    const seasonIndex = Math.floor((this.day - 1) / DAYS_PER_SEASON) % SEASONS.length;
    const newSeason = SEASONS[seasonIndex];
    if (newSeason !== this.season) {
      this.season = newSeason;
      this.addLog(`季节变化：进入了${this.season}季`);
    }

    // 事件检查 → 事件效果委托给 EventSystem
    const wheatCount = this.warehouse.getItemAmount('food', 'wheat');
    const { notifications: eventNotifs, effects: eventEffects } = this.eventSystem.checkEvents(
      this.day, this.season, this.population, wheatCount
    );
    eventNotifs.forEach(n => this.addNotification(n));
    this._applyEventEffects(eventEffects);

    // 教程延迟触发
    if (this.tutorialStep === 4 && this.day >= 3) {
      this.tutorialStep = 5;
      this.addNotification('tutorial:recruit');
    }
    // step 10 不再自动触发，由教程按钮手动推进

    // 食物消耗（仅玩家）
    const consumptionMul = this.warehouse.fangshiActive ? (1 - FANGSHI_CONSUMPTION_REDUCTION) : 1;
    const foodResult = this.foodSystem.consumeDaily(this.warehouse, this.player, consumptionMul);
    foodResult.logs.forEach(msg => this.addLog(msg));
    foodResult.notifications.forEach(msg => this.addNotification(msg));
    if (foodResult.moodDelta !== 0) {
      this.player.changeMood(foodResult.moodDelta);
    }

    // 每月发薪（每30天）
    if (this.day % 30 === 0 && this.characters.length > 0) {
      this.financeSystem.processMonthlyPayroll(this.characters, (msg) => this.addLog(msg));
    }

    // NPC 揭示进度
    for (const npc of this.characters) {
      if (!npc.isRetired) {
        npc.updateRevealProgress(TICKS_PER_DAY);
      }
    }

    // 特质揭示
    this._tickTraitInsight();

    // 每年推进年龄 + 退休
    if (this.day > 1 && (this.day - 1) % 28 === 0) {
      this._tickAging();
    }

    // 检查岗位解锁
    this._checkJobUnlocks();

    // 冬天冻害
    if (this.season === '冬') {
      const damagedCount = this.farm.applyWinterDamage(WINTER_FREEZE_CHANCE);
      for (let i = 0; i < damagedCount; i++) {
        this.addLog('严寒使一块作物冻死了');
      }
    }
  }

  _applyEventEffects(eventEffects) {
    for (const eff of eventEffects) {
      this.addLog(eff.message);
      if (eff.type === 'pest_outbreak') {
        for (const plot of this.farm.plots) {
          if (plot.state === 'growing' && Math.random() < 0.3) {
            plot.spawnPest?.();
          }
        }
      } else if (eff.type === 'cold_snap') {
        const extra = this.farm.applyWinterDamage(eff.freezeChance);
        if (extra > 0) this.addLog(`寒潮冻死了${extra}块作物...`);
      } else if (eff.type === 'food_bonus') {
        this._seasonBuff = eff.multiplier;
      } else if (eff.type === 'free_recruit') {
        this._freeRecruitAvailable = true;
      }
    }
  }

  _tickPerTick(isNewDay) {
    // 农田 tick
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
      const allFarmers = this._getAllFarmers();
      const busyIds = new Set(this.farm.expandQueue.map(q => q.characterId));
      const idle = allFarmers.find(f => !busyIds.has(f.id) && this.farm.getPlotsForCharacter(f.id).length === 0);
      if (idle) {
        this.farm.startExpand(idle.id);
        this.addLog(`${idle.name}开始开垦新农田...`);
      }
    }

    // NPC 自动劳作
    const recruitingIds = this.recruitingNPCIds;
    let availableNPCs = this.characters.filter(c => !c.isRetired);
    if (recruitingIds.size > 0) {
      availableNPCs = availableNPCs.filter(c => !recruitingIds.has(c.id));
    }
    this.npcAI.tickAutoWork(availableNPCs, this.farm, this.warehouse, (msg) => this.addLog(msg));

    // 房事 NPC
    const fangshiNPC = this.characters.find(c => !c.isRetired && c.hasPost('fangshi'));
    this.warehouse.fangshiActive = !!fangshiNPC;
    if (fangshiNPC) {
      const speed = fangshiNPC.getFarmWorkSpeed?.() || 1;
      const result = this.warehouse.tickFangshi(speed);
      if (result && result.success) {
        this.addLog(`[房事] ${result.message}`);
      }
    }

    // 后山采集
    if (this.gatherSystem.unlocked) {
      const allChars = [this.player, ...this.characters];
      this.gatherSystem.tick(isNewDay, allChars, this.warehouse, (msg) => this.addLog(msg));
    }

    // 铁道采矿
    this.miningSystem.tick(isNewDay, this.characters, this.warehouse, (msg) => this.addLog(msg));

    // 冶炼
    this.smeltingSystem.tick(isNewDay, this.characters, this.warehouse, (msg) => this.addLog(msg));

    // 药材处理
    this.herbPrepSystem.tick(isNewDay, this.characters, this.warehouse, (msg) => this.addLog(msg));

    // 炼丹
    this.alchemySystem.tick(isNewDay, this.characters, this.warehouse, (msg) => this.addLog(msg));

    // 炉工维修
    this.repairSystem.tick(isNewDay, this.characters, this.warehouse, (msg) => this.addLog(msg));

    // 销售
    this.salesSystem.tick(isNewDay, this.characters, this.warehouse, (msg) => this.addLog(msg));

    // 运输
    this.transportSystem.tick(isNewDay, this.characters, this.warehouse, (msg) => this.addLog(msg));

    // 工人权益
    this.workerSystem.tick(isNewDay, this.characters, this.financeSystem, (msg) => this.addLog(msg));

    // 仙法修炼
    this.cultivationSystem.tick(isNewDay, [this.player, ...this.characters], this.warehouse, (msg) => this.addLog(msg));

    // 建筑建造队列
    if (this.buildQueue.length > 0) {
      const currentBuild = this.buildQueue[0];
      currentBuild.progress++;
      if (currentBuild.progress >= currentBuild.totalTicks) {
        const def = BUILDING_DEFS.find(d => d.id === currentBuild.buildingId);
        if (def) {
          this.buildings.push(currentBuild.buildingId);
          if (def.onBuilt) def.onBuilt(this);
          this.addLog(`${def.icon}${def.name}建造完成！`);
          this.addNotification(`${def.icon}${def.name}建造完成！`);
          if (this.tutorialStep === 10) {
            this.tutorialStep = 11;
          }
        }
        this.buildQueue.shift();
      }
    }

    // 司务堂研究
    if (this.researchSystem.unlocked) {
      const researchMsgs = this.researchSystem.tick(this.characters, this.farm);
      for (const msg of researchMsgs.messages) {
        this.addLog(msg);
      }
    }

    // 招募 tick
    this._tickRecruit();
  }

  // ====== DoAction ======

  doAction(action, params = {}) {
    let result;

    // 纯委托：农田
    const farmFn = FARM_DELEGATES[action];
    if (farmFn) {
      if (this.isPlayerAway) {
        result = { success: false, message: '你正在去村庄的路上，无法操作农田' };
      } else {
        result = farmFn(this, params);
      }
      if (result?.message) this.addLog(result.message);
      return result;
    }

    // 纯委托：后山采集
    const gatherFn = GATHER_DELEGATES[action];
    if (gatherFn) {
      result = gatherFn(this, params);
      if (result?.message) this.addLog(result.message);
      return result;
    }

    // 纯委托：仓库
    const warehouseFn = WAREHOUSE_DELEGATES[action];
    if (warehouseFn) {
      result = warehouseFn(this, params);
      if (result?.message) this.addLog(result.message);
      return result;
    }

    // 招募 actions → RecruitSystem
    if (RECRUIT_ACTIONS.has(action)) {
      result = this._dispatchRecruitAction(action, params);
      if (result?.message) this.addLog(result.message);
      return result;
    }

    // 建筑 actions
    if (BUILD_ACTIONS.has(action)) {
      result = this._dispatchBuildAction(action, params);
      if (result?.message) this.addLog(result.message);
      return result;
    }

    // 研究 actions
    if (RESEARCH_ACTIONS.has(action)) {
      result = this._dispatchResearchAction(action, params);
      if (result?.message) this.addLog(result.message);
      return result;
    }

    // 其他 actions
    switch (action) {
      case 'harvest':
        if (this.isPlayerAway) {
          result = { success: false, message: '你正在去村庄的路上，无法收获' };
        } else {
          result = this.farm.harvest(params.plotId, this.player, this.warehouse);
        }
        if (result.success && result.yield) {
          this.player.changeMood(3);
          result.overflowWarnings?.forEach(msg => this.addLog(msg));
        }
        break;
      case 'plant':
        result = this.farm.plant(params.plotId, params.cropId, this.player, this.warehouse);
        if (result.success && this.tutorialStep === 3) {
          this.tutorialStep = 4;
        }
        break;
      case 'recruit_accept': {
        const npc = this._createNPCFromRandom();
        this.characters.push(npc);
        this.population++;
        this.triggeredEvents['recruit'] = 'accepted';
        this.addLog(`${npc.name}加入了你的队伍！他是一个农民。`);
        this._tryUnlockResearch();
        result = { success: true, message: `${npc.name}加入了`, npcName: npc.name };
        break;
      }
      case 'recruit_accept_with_promote': {
        const npc = this._createNPCFromRandom();
        this.characters.push(npc);
        this.population++;
        this._tryUnlockResearch();
        result = { success: true, message: `${npc.name}加入了，你成为了农民队长`, npcName: npc.name };
        break;
      }
      case 'recruit_reject':
        this.triggeredEvents['recruit_cooldown_until'] = this.day + 30;
        this.addLog('你拒绝了来访者的请求。大约30天后才会再有人来。');
        result = { success: true, message: '拒绝了招工请求' };
        break;
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
      case 'dismiss_character': {
        const char = this.characters.find(c => c.id === params.characterId);
        if (!char) {
          result = { success: false, message: '找不到该角色' };
          break;
        }
        const charName = char.name;
        for (const plot of this.farm.plots) {
          if (Array.isArray(plot.assignedTo)) {
            plot.assignedTo = plot.assignedTo.filter(id => id !== char.id);
          } else if (plot.assignedTo === char.id) {
            plot.assignedTo = [];
          }
        }
        this.farm.expandQueue = this.farm.expandQueue.filter(q => q.characterId !== char.id);
        if (this.gatherSystem) {
          for (const node of this.gatherSystem.nodes || []) {
            node.assignedTo = node.assignedTo.filter(id => id !== char.id);
          }
        }
        this.characters = this.characters.filter(c => c.id !== char.id);
        this.addLog(`${charName}已被遣散。`);
        this.player.changeMood(-3);
        result = { success: true, message: `${charName}已遣散` };
        break;
      }
      case 'plow': {
        if (this.isPlayerAway) {
          result = { success: false, message: '你正在去村庄的路上，无法翻地' };
          break;
        }
        result = this.farm.plow(params.plotId, this.player);
        if (result.success && result.seedFound) {
          const seed = result.seedFound;
          const addResult = this.warehouse.addItem('seed', seed.seedId, seed.seedName, seed.amount);
          let msg = `翻地完成！意外翻出了${seed.amount}颗${seed.seedName}！`;
          if (addResult.overflow > 0) {
            msg += `（仓库满了！${addResult.overflow}颗${seed.seedName}丢失）`;
          }
          result.message = msg;
        }
        if (result.success && this.tutorialStep === 2) {
          this.tutorialStep = 3;
        }
        break;
      }
      case 'expand_farm': {
        if (this.player.hasRole('farmer_leader')) {
          const allFarmers = this._getAllFarmers();
          const busyIds = new Set(this.farm.expandQueue.map(q => q.characterId));
          const idleNPC = allFarmers.find(f =>
            !f.isPlayer && !f.isRetired && !busyIds.has(f.id)
            && this.farm.getPlotsForCharacter(f.id).length === 0
            && !this.recruitingNPCIds.has(f.id)
          );
          if (idleNPC) {
            result = this.farm.startExpand(idleNPC.id);
            if (result.success) {
              this.addLog(`${idleNPC.name}开始开垦新农田……`);
            }
            break;
          }
          if (this.isPlayerAway) {
            result = { success: false, message: '没有空闲农民，你又在路上，暂时无法开垦' };
            break;
          }
        }
        if (this.isPlayerAway) {
          result = { success: false, message: '你正在去村庄的路上，无法开垦' };
          break;
        }
        const existingPlayerExpand = this.farm.expandQueue.find(q => q.characterId === this.player.id);
        if (existingPlayerExpand) {
          result = { success: false, message: '你已在开垦中，增加目标农田数后可自动指派 NPC' };
          break;
        }
        result = this.farm.startExpand(this.player.id);
        if (result.success) {
          this.addLog('你开始开垦新农田……');
        }
        break;
      }
      case 'upgrade_spirit_plot': {
        if (!this.researchSystem.isGongfuResearched('spirit_focus')) {
          result = { success: false, message: '需要先在司务堂研究「聚灵术」才能升级灵田' };
          break;
        }
        const targetLevel = params.level || 1;
        const costs = FarmSystem.getUpgradeCost(targetLevel);
        if (costs.length === 0) {
          result = { success: false, message: '无效的升级目标' };
          break;
        }
        const matError = this._checkMaterials(costs);
        if (matError) {
          result = { success: false, message: matError };
          break;
        }
        this._consumeMaterials(costs);
        result = this.farm.upgradeToSpirit(params.plotId, targetLevel);
        break;
      }
      case 'set_wage_settings': {
        const { postId, settings } = params;
        if (!postId || !settings) {
          result = { success: false, message: '参数错误' };
          break;
        }
        this.financeSystem.setWageSettings(postId, settings);
        result = { success: true, message: `${postId}岗位工资设置已更新` };
        break;
      }
      case 'switch_job': {
        result = this.switchJob(params.jobId);
        break;
      }
      case 'start_herb_prep': {
        const npc = this._findCharacter(this.player.id);
        result = this.herbPrepSystem.startProcessing(params.herbId, npc);
        break;
      }
      case 'rush_herb_prep': {
        const npcRush = this._findCharacter(this.player.id);
        result = this.herbPrepSystem.rushStage(npcRush);
        break;
      }
      case 'adjust_alchemy_temp': {
        result = this.alchemySystem.adjustTemp(params.temp);
        break;
      }
      case 'add_alchemy_fuel': {
        const coalAmt = this.warehouse.getItemAmount('fuel', 'coal');
        const addAmt = Math.min(params.amount || 1, coalAmt);
        if (addAmt > 0) {
          this.warehouse.removeItem('fuel', 'coal', addAmt);
          result = this.alchemySystem.addFuel(addAmt);
        } else {
          result = { success: false, message: '没有煤炭了' };
        }
        break;
      }
      case 'start_alchemy': {
        const npcAlchemy = this._findCharacter(this.player.id);
        result = this.alchemySystem.startCrafting(params.recipeId, npcAlchemy, this.warehouse);
        break;
      }
      case 'set_item_price': {
        result = this.salesSystem.setPrice(params.itemId, params.price);
        break;
      }
      case 'stock_shop_item': {
        const stockAmt = this.warehouse.getItemAmount(params.category, params.itemId);
        if (stockAmt <= 0) {
          result = { success: false, message: '仓库没有该物品' };
          break;
        }
        this.warehouse.removeItem(params.category, params.itemId, 1);
        result = this.salesSystem.stockItem(params.itemId, params.itemId, 1, 10);
        break;
      }
      case 'haggle_customer': {
        result = this.salesSystem.haggle(params.customerIndex, params.offerPrice);
        if (result.sold) {
          this.warehouse.addItem('currency', 'silver', '银两', result.price);
        }
        break;
      }
      case 'start_transport': {
        const npcPorter = this._findCharacter(this.player.id);
        result = this.transportSystem.startTrip(params.routeId, npcPorter, params.cargo || 'materials', params.amount || 10);
        break;
      }
      case 'start_cultivation': {
        const targetChar = this._findCharacter(params.npcId);
        if (!targetChar) {
          result = { success: false, message: '找不到该角色' };
          break;
        }
        result = this.cultivationSystem.startCultivation(params.npcId, params.artId, targetChar, this.warehouse);
        break;
      }
      case 'cancel_cultivation': {
        result = this.cultivationSystem.cancelCultivation(params.npcId);
        break;
      }
      case 'mine_ore': {
        const { veinId } = params;
        result = this.miningSystem.mine(veinId, this.player);
        if (result.success && result.oreId) {
          const oreDef = { iron_ore: '铁矿石', copper_ore: '铜矿石', coal: '煤炭', spirit_stone_ore: '灵石原矿' };
          const name = oreDef[result.oreId] || result.oreId;
          this.warehouse.addItem('mineral', result.oreId, name, result.yield);
        }
        if (result.accident) {
          this.player.changeMood(-5);
        }
        break;
      }
      case 'repair_tool': {
        const { toolId } = params;
        const materials = {};
        for (const [cat, items] of Object.entries(this.warehouse.storage)) {
          for (const [itemId, item] of Object.entries(items.items || {})) {
            materials[itemId] = (materials[itemId] || 0) + item.amount;
          }
        }
        result = this.miningSystem.repairTool(toolId, materials);
        break;
      }
      case 'adjust_smelt_temp': {
        result = this.smeltingSystem.adjustTemp(params.temp);
        break;
      }
      case 'add_smelt_fuel': {
        const coalAmt = this.warehouse.getItemAmount('fuel', 'coal');
        const addAmt = Math.min(params.amount || 1, coalAmt);
        if (addAmt > 0) {
          this.warehouse.removeItem('fuel', 'coal', addAmt);
          result = this.smeltingSystem.addFuel(addAmt);
        } else {
          result = { success: false, message: '没有煤炭了' };
        }
        break;
      }
      case 'repair_equipment': {
        const { equipId } = params;
        const equipDef = this.repairSystem.equipment?.[equipId];
        if (!equipDef) {
          result = { success: false, message: '未知设备' };
          break;
        }
        const repairDef = { alchemy_furnace: { iron_ingot: 2, stone: 3 }, smelting_furnace: { iron_ingot: 3, stone: 5 } }[equipId];
        if (!repairDef) {
          result = { success: false, message: '无维修配方' };
          break;
        }
        let canRepair = true;
        for (const [itemId, amount] of Object.entries(repairDef)) {
          if ((this.warehouse.getItemAmount('mineral', itemId) || 0) < amount) {
            canRepair = false;
            break;
          }
        }
        if (!canRepair) {
          result = { success: false, message: '维修材料不足' };
          break;
        }
        for (const [itemId, amount] of Object.entries(repairDef)) {
          this.warehouse.removeItem('mineral', itemId, amount);
        }
        const equip = this.repairSystem.equipment[equipId];
        const repairAmount = Math.floor(equipDef.maxDurability * 0.4);
        equip.durability = Math.min(equipDef.maxDurability, equip.durability + repairAmount);
        result = { success: true, message: `维修完成，耐久度恢复${repairAmount}` };
        break;
      }
      default:
        result = { success: false, message: '未知操作' };
    }
    if (result?.message) this.addLog(result.message);
    return result;
  }

  // ====== 招募 action 分发 ======

  _dispatchRecruitAction(action, params) {
    const rs = this.recruitSystem;

    switch (action) {
      case 'leader_recruit': {
        // 招募需要知客岗位或农民队长身份
        if (!this.player.posts.includes('zhike') && !this.player.roles.includes('farmer_leader')) {
          return { success: false, message: '招募需要「知客」身份，请先切换岗位' };
        }
        const existingNames = [this.player.name, ...this.characters.map(c => c.name)];
        const hrLv = this.currentHRLevel.level;
        const hasCult = this.cultivationSystem && Object.keys(this.cultivationSystem.learnedArts).length > 0;
        rs.refreshCandidatePool(existingNames, hrLv, hasCult);
        const result = rs.handleLeaderRecruit(this.warehouse, this.currentVehicle);
        if (result.success) {
          const vehicle = getVehicleInfo(this.currentVehicle);
          this.addLog(`你赶着${vehicle.icon}${vehicle.name}出发去招募...${vehicle.description}`);
        }
        return result;
      }
      case 'delegate_recruit': {
        // 派人招募也需要知客岗位（但可以是NPC知客）
        const existingNames = [this.player.name, ...this.characters.map(c => c.name)];
        const hrLv = this.currentHRLevel.level;
        const hasCult = this.cultivationSystem && Object.keys(this.cultivationSystem.learnedArts).length > 0;
        rs.refreshCandidatePool(existingNames, hrLv, hasCult);
        return rs.handleDelegateRecruit(params, this.warehouse, this.currentVehicle, this.characters, this.farm);
      }
      case 'recruit_choose':
        return rs.handleRecruitChoose(params.candidateIndex);
      case 'recruit_confirm': {
        const result = rs.handleRecruitConfirm();
        if (result.tutorialStep) {
          this.tutorialStep = Math.max(this.tutorialStep, result.tutorialStep);
        }
        return result;
      }
      case 'recruit_skip': {
        const result = rs.handleRecruitSkip();
        if (result.tutorialStep) {
          this.tutorialStep = Math.max(this.tutorialStep, result.tutorialStep);
        }
        return result;
      }
      case 'upgrade_vehicle': {
        const result = rs.handleUpgradeVehicle(this.warehouse, this.currentVehicle);
        if (result.success && result.logMessage) {
          this.addLog(result.logMessage);
          this.currentVehicle = result.newVehicle;
        }
        return result;
      }
      default:
        return { success: false, message: '未知招募操作' };
    }
  }

  // ====== 建筑 action 分发 ======

  _dispatchBuildAction(action, params) {
    if (action === 'build_hall') {
      params = { ...params, buildingId: 'research_hall' };
    }
    const { buildingId } = params;
    const def = BUILDING_DEFS.find(d => d.id === buildingId);
    if (!def) return { success: false, message: '未知建筑' };
    if (this.buildings.includes(buildingId)) {
      return { success: false, message: `${def.name}已经建好了` };
    }
    if (this.buildQueue.length > 0) {
      return { success: false, message: '已有建筑正在建造中' };
    }
    if (!def.requires(this)) {
      return { success: false, message: def.lockedReason || '建造条件不满足' };
    }
    const matError = this._checkMaterials(def.costs);
    if (matError) return { success: false, message: matError };
    this._consumeMaterials(def.costs);
    const buildTicks = def.buildDays * TICKS_PER_DAY;
    this.buildQueue.push({ buildingId, progress: 0, totalTicks: buildTicks, story: def.story || '' });
    this.addLog(`你开始建造${def.icon}${def.name}……预计需要 ${def.buildDays} 天。`);
    if (def.story) this.addLog(def.story);
    return { success: true, message: `开始建造${def.name}` };
  }

  // ====== 研究 action 分发 ======

  _dispatchResearchAction(action, params) {
    if (!this.researchSystem.unlocked) {
      return { success: false, message: '司务堂尚未开启' };
    }

    switch (action) {
      case 'research_post':
        return this.researchSystem.startPostResearch(params.postId);
      case 'start_gongfu_research':
        return this.researchSystem.startGongfuResearch(params.gongfuId);
      case 'cancel_gongfu_research': {
        if (!this.researchSystem.currentGongfuResearch) {
          return { success: false, message: '当前没有在研究功法' };
        }
        const canceledGongfu = getGongfuInfo(this.researchSystem.currentGongfuResearch.gongfuId);
        this.researchSystem.currentGongfuResearch = null;
        return { success: true, message: `停止了参悟「${canceledGongfu?.name}」` };
      }
      case 'assign_post': {
        const targetChar = this._findCharacter(params.characterId);
        if (!targetChar) return { success: false, message: '找不到该角色' };
        if (!this.researchSystem.isPostResearched(params.postId)) {
          return { success: false, message: '该岗位尚未研究解锁' };
        }
        const result = targetChar.assignPost(params.postId);
        if (result.success) {
          const postInfo = getPostInfo(params.postId);
          if (postInfo?.exclusive && postInfo?.category === 'production') {
            const plots = this.farm.getPlotsForCharacter(params.characterId);
            for (const p of plots) {
              this.farm.unassignPlot(p.id, params.characterId);
            }
            for (const node of this.gatherSystem.nodes || []) {
              this.gatherSystem.unassignNode(node.id, params.characterId);
            }
            if (plots.length > 0) {
              this.addLog(`${targetChar.name}不再耕种，转为${postInfo.name}`);
            }
          }
        }
        return result;
      }
      case 'remove_post': {
        const targetCharRm = this._findCharacter(params.characterId);
        if (!targetCharRm) return { success: false, message: '找不到该角色' };
        return targetCharRm.removePost(params.postId);
      }
      case 'start_learn_gongfu': {
        const learner = this._findCharacter(params.characterId);
        if (!learner) return { success: false, message: '找不到该角色' };
        const allChars = [this.player, ...this.characters];
        return this.researchSystem.startLearning(params.characterId, params.gongfuId, learner, allChars, this.farm);
      }
      case 'cancel_learn_gongfu': {
        const cancelLearner = this._findCharacter(params.characterId);
        if (!cancelLearner) return { success: false, message: '找不到该角色' };
        return this.researchSystem.cancelLearning(params.characterId, cancelLearner);
      }
      default:
        return { success: false, message: '未知研究操作' };
    }
  }

  // ====== 内部辅助 ======

  _tickRecruit() {
    const rs = this.recruitSystem;
    if (!rs.isRecruiting) return;

    const result = rs.tick(this.characters, (msg) => this.addLog(msg), this.tutorialStep);
    if (!result) return;

    if (result.tutorialStep != null) {
      this.tutorialStep = Math.max(this.tutorialStep, result.tutorialStep);
    }
    if (result.createdNpcs) {
      for (const npc of result.createdNpcs) {
        this.characters.push(npc);
        this.population++;
      }
      this._tryUnlockResearch();
    }
  }

  _findCharacter(id) {
    if (this.player.id === id) return this.player;
    return this.characters.find(c => c.id === id) || null;
  }

  _getAllFarmers() {
    const all = [this.player, ...this.characters];
    return all.filter(c => c.hasRole('farmer'));
  }

  _tryUnlockResearch() {
    if (this.triggeredEvents['recruit'] === 'accepted') return;
    this.player.roles = ['farmer_leader', 'farmer'];
    this.addLog('你意识到只靠种地养不活这么多人。你开始思考分工与规矩……');
    this.addLog('也许该建造一间司务堂来统筹事务……');
    this.triggeredEvents['recruit'] = 'accepted';
  }

  _tickTraitInsight() {
    const playerRoles = new Set(this.player.roles);
    const hasQualifiedZhike = this.characters.some(
      npc => !npc.isRetired && npc.hasPost('zhike') && getHRLevel(npc.hrExp || 0).level >= 2
    );
    for (const npc of this.characters) {
      if (npc.isRetired) continue;
      if (hasQualifiedZhike || npc.roles.some(r => playerRoles.has(r))) {
        npc.playerTraitInsight = (npc.playerTraitInsight || 0) + TRAIT_INSIGHT_PER_DAY;
      }
    }
  }

  _tickAging() {
    for (const npc of this.characters) {
      npc.age++;
      if (npc.age >= npc.retireAge && !npc.isRetired) {
        this.addLog(`${npc.name}（${npc.gender === 'male' ? '男' : '女'}，${npc.age}岁）已经到了退休的年纪，不再参与劳作了。`);
        if (npc.learnedGongfu.length > 0) {
          this.addLog(`${npc.name}所学的功法随之消散...`);
        }
        npc.onRetire();
      }
    }
    this.player.age++;
  }

  /** 创建随机 NPC（事件系统使用） */
  _createNPCFromRandom() {
    const gender = Math.random() < 0.55 ? 'male' : 'female';
    const existing = new Set([this.player.name, ...this.characters.map(c => c.name)]);
    const name = generateName(gender, existing);
    const age = 18 + Math.floor(Math.random() * 35);
    const originTrait = rollOriginTrait();
    const generalTraits = rollGeneralTraits(Math.random() < 0.4 ? 2 : 1);
    const allTraits = [originTrait, ...generalTraits];
    const fate = rollFate();
    const appearance = generateAppearance(gender, age);

    const npc = new Character({
      name, roles: ['farmer'], isPlayer: false,
      gender, age, originTrait, traits: allTraits, fate, appearance,
    });
    npc.knowledgeAttributes.farming = 3 + Math.floor(Math.random() * 5);
    return npc;
  }

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 100) this.log.shift();
  }
  addNotification(msg) { this.notifications.push(msg); }
  clearNotifications() { this.notifications = []; }

  recordStats() {
    const plots = this.farm.plots;
    if (plots.length === 0) return;
    const snap = {
      day: this.day,
      tick: this.tickCount,
      season: this.season,
      population: this.population,
      food: this.warehouse.getItemAmount('food', 'wheat'),
      plots: plots.length,
      avgWater: Math.round(plots.reduce((s, p) => s + p.waterLevel, 0) / plots.length),
      avgFertility: Math.round(plots.reduce((s, p) => s + p.fertility, 0) / plots.length),
      avgWeeds: Math.round(plots.reduce((s, p) => s + p.weedGrowth, 0) / plots.length),
      pestCount: plots.filter(p => p.hasPest).length,
      growingCount: plots.filter(p => p.state === 'growing' || p.state === 'planted').length,
      readyCount: plots.filter(p => p.state === 'ready').length,
      emptyCount: plots.filter(p => p.state === 'empty' || p.state === 'plowed' || p.state === 'withered').length,
      spiritCount: plots.filter(p => p.isSpiritPlot()).length,
      chars: this.characters.length,
      avgMood: this.characters.length > 0
        ? Math.round(this.characters.reduce((s, c) => s + c.mood, 0) / this.characters.length)
        : 0,
      avgFarming: this.characters.length > 0
        ? Math.round(this.characters.reduce((s, c) => s + (c.knowledgeAttributes?.farming || 0), 0) / this.characters.length)
        : 0,
    };
    this.statsHistory.push(snap);
  }

  // ====== 岗位解锁系统 ======

  /** 解锁新岗位 */
  unlockJob(jobId) {
    if (this.unlockedJobs.has(jobId)) return false;
    this.unlockedJobs.add(jobId);
    const jobNames = {
      miner: '矿工', smelter: '炼铁匠', herb_prepper: '药童',
      alchemist: '炼丹师', furnace_tender: '炉工', trader: '贩子', porter: '运工',
    };
    this.addLog(`🔓 新岗位解锁: ${jobNames[jobId] || jobId}`);
    this.addNotification(`新岗位解锁: ${jobNames[jobId] || jobId}`);
    return true;
  }

  /** 切换玩家当前岗位 */
  switchJob(jobId) {
    if (!this.unlockedJobs.has(jobId)) {
      return { success: false, message: '该岗位尚未解锁' };
    }
    if (this.currentJob === jobId) {
      return { success: false, message: '你已经在该岗位上了' };
    }
    const oldJob = this.currentJob;
    this.currentJob = jobId;
    // 更新玩家角色和岗位
    const jobToRole = {
      farmer: 'farmer', miner: 'farmer', smelter: 'farmer',
      herb_prepper: 'farmer', alchemist: 'farmer', furnace_tender: 'farmer',
      trader: 'farmer', porter: 'farmer',
    };
    const jobToPost = {
      farmer: [],
      miner: ['tiedao'],
      smelter: ['tiedao'],
      herb_prepper: [],
      alchemist: ['miaoshou'],
      furnace_tender: [],
      trader: [],
      porter: [],
    };
    // 保留农民队长身份（如果有NPC加入过）
    const hadLeader = this.player.roles?.includes('farmer_leader');
    this.player.roles = [jobToRole[jobId] || 'farmer'];
    if (hadLeader && jobId === 'farmer') {
      this.player.roles.push('farmer_leader');
    }
    this.player.posts = jobToPost[jobId] || [];

    const jobNames = {
      farmer: '农夫', miner: '矿工', smelter: '炼铁匠',
      herb_prepper: '药童', alchemist: '炼丹师', furnace_tender: '炉工',
      trader: '贩子', porter: '运工',
    };
    this.addLog(`你转换到了「${jobNames[jobId]}」岗位`);
    return { success: true, message: `已切换到${jobNames[jobId]}` };
  }

  /** 检查是否应该解锁新岗位（每日检查） */
  _checkJobUnlocks() {
    const npcCount = this.characters.length;

    // 矿工: 3个NPC + 研究系统解锁
    if (npcCount >= 3 && this.researchSystem?.unlocked && !this.unlockedJobs.has('miner')) {
      this.unlockJob('miner');
    }
    // 炼铁匠: 矿工解锁 + 建造矿场
    if (this.unlockedJobs.has('miner') && this.buildings.includes('mine') && !this.unlockedJobs.has('smelter')) {
      this.unlockJob('smelter');
    }
    // 炉工: 炼铁匠解锁 + 建造冶炼炉
    if (this.unlockedJobs.has('smelter') && this.buildings.includes('smelter_build') && !this.unlockedJobs.has('furnace_tender')) {
      this.unlockJob('furnace_tender');
    }
    // 药童: 研究系统 + 建造药圃
    if (this.researchSystem?.unlocked && this.buildings.includes('herb_garden') && !this.unlockedJobs.has('herb_prepper')) {
      this.unlockJob('herb_prepper');
    }
    // 炼丹师: 药童解锁 + 建造丹房
    if (this.unlockedJobs.has('herb_prepper') && this.buildings.includes('alchemy_room') && !this.unlockedJobs.has('alchemist')) {
      this.unlockJob('alchemist');
    }
    // 贩子: 建造商铺
    if (this.buildings.includes('shop') && !this.unlockedJobs.has('trader')) {
      this.unlockJob('trader');
    }
    // 运工: 建造后山小径
    if (this.buildings.includes('mountain_trail') && !this.unlockedJobs.has('porter')) {
      this.unlockJob('porter');
    }
  }

  // ====== 存档系统 ======
  save(slot = 0) { return SaveSystem.save(this, slot); }
  static load(slot = 0) { return SaveSystem.load(slot, GameState); }
  static loadAny() { return SaveSystem.loadAny(GameState); }
  static getSaveSlots() { return SaveSystem.getSaveSlots(); }
  static hasSave() { return SaveSystem.hasSave(); }

  static _charFromJSON = Character.fromJSON;
  static _farmFromJSON = FarmSystem.fromJSON;
  static _researchFromJSON = ResearchSystem.fromJSON;
}
