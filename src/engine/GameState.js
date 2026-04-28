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
import { NPC_NAMES, generateName, generateAppearance } from '../data/names';
import { getRoleName } from '../data/roles';
import { getPostInfo } from '../data/posts';
import { getGongfuInfo } from '../data/gongfu';
import { rollOriginTrait, rollGeneralTraits } from '../data/traits';
import { rollFate } from '../data/fates';
import {
  TICKS_PER_DAY, DAYS_PER_SEASON, SEASONS, WINTER_FREEZE_CHANCE,
  RECRUIT_TICKS_SELF, RECRUIT_TICKS_DELEGATE, RECRUIT_FOOD_COST, RECRUIT_POOL_SIZE,
  RECRUIT_RETURN_TICKS, HR_EXP_PER_TICK,
} from './constants';
import { getVehicleInfo, getNextVehicle, VEHICLES } from '../data/transport';
import { getHRLevel, getRecruitVisibility, pickBestByPreference, RECRUIT_PREFERENCES } from '../data/hr-levels';

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

    this.player = new Character({
      name: playerName, roles: ['farmer'], isPlayer: true,
      gender: 'male', age: 25,
    });
    this.characters = []; // NPC角色列表
    this.farm = new FarmSystem();
    this.warehouse = new WarehouseSystem();
    this.npcAI = new NPCAISystem();
    this.foodSystem = new FoodSystem();
    this.eventSystem = new EventSystem();
    this.researchSystem = new ResearchSystem();

    // 事件系统（委托给 EventSystem，保留引用兼容旧存档）
    this.triggeredEvents = this.eventSystem.triggeredEvents;

    // 初始物资
    this.warehouse.addItem('food', 'wheat', '小麦', 20);
    this.warehouse.addItem('seed', 'wheat_seed', '小麦种子', 10);

    // 招募系统：去村庄招募
    // recruitTask: { type, delegateId?, ticksRemaining, totalTicks, phase, vehicleId }
    //   - self: traveling(1天) → waiting_choice → returning(1天回程)
    //   - delegate: traveling(2天往返) → 自动带回
    // currentVehicle: 当前使用的交通工具 ID（驴车/马车/牛车）
    this.recruitTask = null;
    this.recruitCandidatePool = [];
    this.recruitSelectedCandidates = []; // 选中但尚未带回的候选人（回程中）
    this.recruitHiredCount = 0;
    this.currentVehicle = 'donkey_cart';

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

  // 招募状态查询
  get isRecruiting() {
    return this.recruitTask !== null;
  }

  get isPlayerAway() {
    return this.recruitTask !== null && this.recruitTask.type === 'self';
  }

  // 获取当前招募载量上限
  get maxRecruitHire() {
    return getVehicleInfo(this.currentVehicle).passengerCapacity;
  }

  // 获取当前HR等级（取队伍中最高）
  get currentHRLevel() {
    let maxExp = 0;
    for (const npc of this.characters) {
      if (npc.hrExp > maxExp) maxExp = npc.hrExp;
    }
    return getHRLevel(maxExp);
  }

  // 获取招募时候选人信息可见性
  get recruitVisibility() {
    return getRecruitVisibility(this.currentHRLevel.level);
  }

  // 获取正在招募中（外出）的 NPC id 列表
  get recruitingNPCIds() {
    const ids = new Set();
    if (this.recruitTask && this.recruitTask.type === 'delegate') {
      ids.add(this.recruitTask.delegateId);
    }
    return ids;
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

      // NPC 揭示进度更新（每天推进 TICKS_PER_DAY 个 tick）
      for (const npc of this.characters) {
        if (!npc.isRetired) {
          npc.updateRevealProgress(TICKS_PER_DAY);
        }
      }

      // 每年（28天）推进 NPC 年龄 + 退休检查
      if (this.day > 1 && (this.day - 1) % 28 === 0) {
        this._tickAging();
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

    // NPC农民自动劳作（排除正在招募中 + 已退休的 NPC）
    const recruitingIds = this.recruitingNPCIds;
    let availableNPCs = this.characters.filter(c => !c.isRetired);
    if (recruitingIds.size > 0) {
      availableNPCs = availableNPCs.filter(c => !recruitingIds.has(c.id));
    }
    this.npcAI.tickAutoWork(availableNPCs, this.farm, this.warehouse, (msg) => this.addLog(msg));

    // 司务堂（研究系统）tick
    if (this.researchSystem.unlocked) {
      const researchMsgs = this.researchSystem.tick(this.characters, this.farm);
      for (const msg of researchMsgs.messages) {
        this.addLog(msg);
      }
    }

    // 招募队列处理
    this._tickRecruit();

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

    // 纯委托：农田操作（需要检查玩家是否在场）
    const farmFn = FARM_DELEGATES[action];
    if (farmFn) {
      // 玩家亲自招募期间，禁止手动农田操作
      if (this.isPlayerAway) {
        result = { success: false, message: '你正在去村庄的路上，无法操作农田' };
      } else {
        result = farmFn(this, params);
      }
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
      case 'recruit_accept': {
        const { name } = this._createNPCFarmer();
        this.triggeredEvents['recruit'] = 'accepted';
        this.addLog(`${name}加入了你的队伍！他是一个农民。`);
        this._tryUnlockResearch();
        result = { success: true, message: `${name}加入了`, npcName: name };
        break;
      }
      case 'recruit_accept_with_promote': {
        const { name } = this._createNPCFarmer();
        this.triggeredEvents['recruit'] = 'accepted';
        this.addLog(`${name}加入了你的队伍！他是一个农民。`);
        this.player.roles = ['farmer_leader', 'farmer'];
        this.addLog('你现在的身份是：农民队长、农民');
        this._tryUnlockResearch();
        result = { success: true, message: `${name}加入了，你成为了农民队长`, npcName: name };
        break;
      }
      case 'recruit_reject':
        this.addLog('你拒绝了来访者的请求。也许过些天还会有人来。');
        result = { success: true, message: '拒绝了招工请求' };
        break;
      case 'leader_recruit': {
        // 亲自去村庄招募
        if (this.recruitTask) {
          result = { success: false, message: '已有招募任务进行中' };
          break;
        }
        // 每次出发都刷新候选人池
        this._refreshCandidatePool();
        const foodAmount = this.warehouse.getItemAmount('food', 'wheat');
        if (foodAmount < RECRUIT_FOOD_COST) {
          result = { success: false, message: `粮食不足！招募需要 ${RECRUIT_FOOD_COST} 单位小麦` };
          break;
        }
        this.warehouse.removeItem('food', 'wheat', RECRUIT_FOOD_COST);
        const vehicle = getVehicleInfo(this.currentVehicle);
        this.recruitTask = {
          type: 'self',
          ticksRemaining: RECRUIT_TICKS_SELF,
          totalTicks: RECRUIT_TICKS_SELF,
          phase: 'traveling',
          vehicleId: this.currentVehicle,
        };
        result = { success: true, message: `你赶着${vehicle.icon}${vehicle.name}出发去村庄招募...大约1天后到达` };
        break;
      }
      case 'delegate_recruit': {
        // 派 NPC 去村庄招募
        const { characterId, preference } = params;
        if (!characterId) {
          result = { success: false, message: '未指定派出的角色' };
          break;
        }
        if (this.recruitTask) {
          result = { success: false, message: '已有招募任务进行中' };
          break;
        }
        // 每次派出都刷新候选人池
        this._refreshCandidatePool();
        const foodAmount = this.warehouse.getItemAmount('food', 'wheat');
        if (foodAmount < RECRUIT_FOOD_COST) {
          result = { success: false, message: `粮食不足！招募需要 ${RECRUIT_FOOD_COST} 单位小麦` };
          break;
        }
        // 检查 NPC 是否在开垦
        if (this.farm.expandQueue.find(q => q.characterId === characterId)) {
          result = { success: false, message: '该角色正在开垦，无法派出' };
          break;
        }
        const delegate = this.characters.find(c => c.id === characterId);
        if (!delegate) {
          result = { success: false, message: '找不到该角色' };
          break;
        }
        this.warehouse.removeItem('food', 'wheat', RECRUIT_FOOD_COST);
        const vehicle = getVehicleInfo(this.currentVehicle);
        const delegateHrLevel = getHRLevel(delegate.hrExp || 0).level;
        this.recruitTask = {
          type: 'delegate',
          delegateId: characterId,
          delegateHrLevel,
          preference: preference || 'any',
          ticksRemaining: RECRUIT_TICKS_DELEGATE,
          totalTicks: RECRUIT_TICKS_DELEGATE,
          phase: 'traveling',
          vehicleId: this.currentVehicle,
        };
        const prefLabel = preference === 'any' ? '' : `，按你的要求尽量挑${RECRUIT_PREFERENCES.find(p => p.id === preference)?.label || ''}`;
        result = { success: true, message: `${delegate.name}赶着${vehicle.icon}${vehicle.name}出发去村庄招募了...约2天后带回${prefLabel}` };
        break;
      }
      case 'recruit_choose': {
        // 亲自招募：勾选/取消勾选候选人（暂存，不立即创建 NPC）
        if (!this.recruitTask || this.recruitTask.phase !== 'waiting_choice') {
          result = { success: false, message: '当前不在选择阶段' };
          break;
        }
        const { candidateIndex } = params;
        if (candidateIndex == null || candidateIndex < 0 || candidateIndex >= this.recruitCandidatePool.length) {
          result = { success: false, message: '无效的选择' };
          break;
        }
        const vehicle = getVehicleInfo(this.recruitTask.vehicleId);
        const maxHire = vehicle.passengerCapacity;

        // 检查候选人是否已被选中（通过 _selectedIdx 标记）
        const candidate = this.recruitCandidatePool[candidateIndex];
        if (candidate._selected) {
          // 取消选择
          candidate._selected = false;
          this.recruitHiredCount = Math.max(0, this.recruitHiredCount - 1);
          result = { success: true, message: `取消了 ${candidate.name} 的选择` };
        } else {
          // 选中
          if (this.recruitHiredCount >= maxHire) {
            result = { success: false, message: `${vehicle.name}已满，最多带 ${maxHire} 人` };
            break;
          }
          candidate._selected = true;
          this.recruitHiredCount++;
          result = { success: true, message: `选中了 ${candidate.name}（还能再选 ${maxHire - this.recruitHiredCount} 人）` };
        }
        break;
      }
      case 'recruit_confirm': {
        // 亲自招募：确认带走已选中的人，进入回程
        if (!this.recruitTask || this.recruitTask.phase !== 'waiting_choice') {
          result = { success: false, message: '当前不在选择阶段' };
          break;
        }
        const vehicle = getVehicleInfo(this.recruitTask.vehicleId);
        // 把选中的候选人存入 selectedCandidates，清理候选池
        this.recruitSelectedCandidates = this.recruitCandidatePool
          .filter(c => c._selected)
          .map(c => { const { _selected, ...rest } = c; return rest; });
        this.recruitCandidatePool = [];

        const count = this.recruitSelectedCandidates.length;
        const msg = count > 0
          ? `你带着 ${count} 位村民赶${vehicle.icon}${vehicle.name}回家！大约1天后到达。`
          : '你没有选任何人，空车回去了。';
        this.recruitTask.phase = 'returning';
        this.recruitTask.ticksRemaining = RECRUIT_RETURN_TICKS;
        this.recruitTask.totalTicks = RECRUIT_RETURN_TICKS;
        this.addLog(msg);
        result = { success: true, message: msg };
        break;
      }
      case 'recruit_skip': {
        // 亲自招募到达村庄后放弃选择，进入回程
        if (!this.recruitTask || this.recruitTask.phase !== 'waiting_choice') {
          result = { success: false, message: '当前不在选择阶段' };
          break;
        }
        // 空手回程
        this.recruitSelectedCandidates = [];
        this.recruitCandidatePool = [];
        this.recruitTask.phase = 'returning';
        this.recruitTask.ticksRemaining = RECRUIT_RETURN_TICKS;
        this.recruitTask.totalTicks = RECRUIT_RETURN_TICKS;
        this.addLog('你没有找到合适的人选，赶车回去了。');
        result = { success: true, message: '回程中...' };
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

      // ====== 司务堂（研究系统） actions ======
      case 'research_post': {
        // 研究解锁岗位
        if (!this.researchSystem.unlocked) {
          result = { success: false, message: '司务堂尚未开启' };
          break;
        }
        const { postId } = params;
        result = this.researchSystem.startPostResearch(postId);
        break;
      }
      case 'start_gongfu_research': {
        // 开始研究功法
        if (!this.researchSystem.unlocked) {
          result = { success: false, message: '司务堂尚未开启' };
          break;
        }
        const { gongfuId } = params;
        result = this.researchSystem.startGongfuResearch(gongfuId);
        break;
      }
      case 'cancel_gongfu_research': {
        // 取消功法研究（放弃当前进度）
        if (!this.researchSystem.currentGongfuResearch) {
          result = { success: false, message: '当前没有在研究功法' };
          break;
        }
        const canceledGongfu = getGongfuInfo(this.researchSystem.currentGongfuResearch.gongfuId);
        this.researchSystem.currentGongfuResearch = null;
        result = { success: true, message: `停止了参悟「${canceledGongfu?.name}」` };
        break;
      }
      case 'assign_post': {
        // 任命 NPC 到岗位
        if (!this.researchSystem.unlocked) {
          result = { success: false, message: '司务堂尚未开启' };
          break;
        }
        const { characterId, postId } = params;
        const targetChar = this._findCharacter(characterId);
        if (!targetChar) {
          result = { success: false, message: '找不到该角色' };
          break;
        }
        if (!this.researchSystem.isPostResearched(postId)) {
          result = { success: false, message: '该岗位尚未研究解锁' };
          break;
        }
        result = targetChar.assignPost(postId);
        break;
      }
      case 'remove_post': {
        // 移除 NPC 的岗位
        const { characterId: charId, postId: rmPostId } = params;
        const targetCharRm = this._findCharacter(charId);
        if (!targetCharRm) {
          result = { success: false, message: '找不到该角色' };
          break;
        }
        result = targetCharRm.removePost(rmPostId);
        break;
      }
      case 'start_learn_gongfu': {
        // NPC 开始学习功法
        if (!this.researchSystem.unlocked) {
          result = { success: false, message: '司务堂尚未开启' };
          break;
        }
        const { characterId: learnerId, gongfuId: learnGongfuId } = params;
        const learner = this._findCharacter(learnerId);
        if (!learner) {
          result = { success: false, message: '找不到该角色' };
          break;
        }
        const allChars = [this.player, ...this.characters];
        result = this.researchSystem.startLearning(learnerId, learnGongfuId, learner, allChars, this.farm);
        break;
      }
      case 'cancel_learn_gongfu': {
        // 取消 NPC 学习功法
        const { characterId: cancelLearnerId } = params;
        const cancelLearner = this._findCharacter(cancelLearnerId);
        if (!cancelLearner) {
          result = { success: false, message: '找不到该角色' };
          break;
        }
        result = this.researchSystem.cancelLearning(cancelLearnerId, cancelLearner);
        break;
      }

      // ====== 交通工具升级 ======
      case 'upgrade_vehicle': {
        if (this.recruitTask) {
          result = { success: false, message: '招募进行中，无法更换载具' };
          break;
        }
        const nextVehicle = getNextVehicle(this.currentVehicle);
        if (!nextVehicle) {
          result = { success: false, message: '已经是最好的载具了' };
          break;
        }
        // 检查前置
        if (nextVehicle.requires && this.currentVehicle !== nextVehicle.requires) {
          result = { success: false, message: `需要先拥有${getVehicleInfo(nextVehicle.requires).name}` };
          break;
        }
        // 检查材料
        const lacks = [];
        for (const cost of nextVehicle.upgradeCost) {
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
        for (const cost of nextVehicle.upgradeCost) {
          this.warehouse.removeItem(cost.category, cost.itemId, cost.amount);
        }
        const oldVehicle = getVehicleInfo(this.currentVehicle);
        this.currentVehicle = nextVehicle.id;
        this.addLog(`${oldVehicle.name}换成了${nextVehicle.icon}${nextVehicle.name}！一趟最多可招 ${nextVehicle.passengerCapacity} 人。`);
        result = { success: true, message: `升级为${nextVehicle.icon}${nextVehicle.name}！` };
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
   * 刷新候选人池（十选三模式）
   * 一次性生成 RECRUIT_POOL_SIZE 个候选人
   */
  _refreshCandidatePool() {
    const pool = [];
    const existing = new Set([this.player.name, ...this.characters.map(c => c.name)]);

    for (let i = 0; i < RECRUIT_POOL_SIZE; i++) {
      const gender = Math.random() < 0.55 ? 'male' : 'female';
      const name = generateName(gender, existing);
      existing.add(name);
      const age = 18 + Math.floor(Math.random() * 35);
      const originTrait = rollOriginTrait();
      const generalTraits = rollGeneralTraits(Math.random() < 0.3 ? 2 : 1);
      const fate = rollFate();
      const appearance = generateAppearance(gender, age);
      pool.push({ name, gender, age, originTrait, generalTraits, fate, appearance });
    }

    this.recruitCandidatePool = pool;
    this.recruitHiredCount = 0;
    const vehicle = getVehicleInfo(this.currentVehicle);
    this.addLog(`你赶着${vehicle.icon}${vehicle.name}来到村庄，有10位村民愿意跟随你。${vehicle.description}`);
  }

  /**
   * 每tick处理招募任务
   */
  _tickRecruit() {
    // 没有招募任务则跳过
    if (!this.recruitTask) return;

    this.recruitTask.ticksRemaining--;

    if (this.recruitTask.ticksRemaining > 0) return;

    // 时间到
    if (this.recruitTask.type === 'self') {
      if (this.recruitTask.phase === 'traveling') {
        // 亲自去：到达村庄，等待玩家选人
        this.recruitTask.phase = 'waiting_choice';
        this.addLog('你到达了附近的村庄，村长带你去见几位愿意跟随的村民...');
      } else if (this.recruitTask.phase === 'returning') {
        // 亲自去：回程完成，批量创建 NPC
        const vehicle = getVehicleInfo(this.recruitTask.vehicleId);
        const toCreate = this.recruitSelectedCandidates || [];
        if (toCreate.length > 0) {
          for (const candidateData of toCreate) {
            const { npc, name } = this._createNPCFarmer({ candidateData });
            this.addLog(`${name}（${candidateData.gender === 'male' ? '男' : '女'}，${candidateData.age}岁）加入了你的队伍！`);
          }
          this._tryUnlockResearch();
        }
        this.addLog(`你赶着${vehicle.icon}${vehicle.name}回到了家。${toCreate.length > 0 ? `带回了 ${toCreate.length} 位新村民！` : ''}`);
        this.recruitTask = null;
        this.recruitSelectedCandidates = [];
        this.recruitHiredCount = 0;
      }
    } else {
      // 派人去
      const vehicle = getVehicleInfo(this.recruitTask.vehicleId);
      const delegate = this.characters.find(c => c.id === this.recruitTask.delegateId);

      if (this.recruitTask.phase === 'traveling') {
        // 派人去：到达村庄，按偏好自动挑选，进入回程
        const preference = this.recruitTask.preference || 'any';
        const maxHire = vehicle.passengerCapacity;
        const selected = [];

        // 按偏好从候选池中依次挑最佳，直到坐满
        const pool = [...this.recruitCandidatePool];
        while (selected.length < maxHire && pool.length > 0) {
          const bestIdx = pickBestByPreference(pool, preference);
          if (bestIdx < 0) break;
          const [picked] = pool.splice(bestIdx, 1);
          selected.push(picked);
        }

        this.recruitSelectedCandidates = selected;
        this.recruitCandidatePool = [];

        const prefLabel = preference === 'any' ? '' : `（按要求挑了${RECRUIT_PREFERENCES.find(p => p.id === preference)?.label || ''}）`;
        const msg = selected.length > 0
          ? `${delegate ? delegate.name : '派出的人'}在村庄挑好了 ${selected.length} 位村民${prefLabel}，正赶${vehicle.icon}${vehicle.name}回来！`
          : `${delegate ? delegate.name : '派出的人'}没找到合适的人${prefLabel}，正空车赶${vehicle.icon}${vehicle.name}回来...`;
        this.addLog(msg);

        this.recruitTask.phase = 'returning';
        this.recruitTask.ticksRemaining = RECRUIT_RETURN_TICKS;
        this.recruitTask.totalTicks = RECRUIT_RETURN_TICKS;
      } else if (this.recruitTask.phase === 'returning') {
        // 派人去：回程完成，批量创建 NPC
        const toCreate = this.recruitSelectedCandidates || [];
        if (toCreate.length > 0) {
          for (const candidateData of toCreate) {
            const { npc, name } = this._createNPCFarmer({ candidateData });
            this.addLog(`${name}（${candidateData.gender === 'male' ? '男' : '女'}，${candidateData.age}岁）加入了你的队伍！`);
          }
          this._tryUnlockResearch();
        }
        this.addLog(`${delegate ? delegate.name : '派出的人'}赶着${vehicle.icon}${vehicle.name}回到了家。${toCreate.length > 0 ? `带回了 ${toCreate.length} 位新村民！` : ''}`);
        this.recruitTask = null;
        this.recruitSelectedCandidates = [];
        this.recruitHiredCount = 0;
      }
    }
  }

  /**
   * 尝试解锁研究系统（首次招募成功时调用）
   */
  _tryUnlockResearch() {
    if (this.researchSystem.unlocked) return;
    this.researchSystem.unlock();
    this.player.roles = ['farmer_leader', 'farmer'];
    this.addLog('你意识到只靠种地养不活这么多人。你开始思考分工与规矩……');
    this.addLog('司务堂开启！你可以任命知客管理人事，研究新的岗位和功法。');
    this.triggeredEvents['recruit'] = 'accepted';
  }

  /**
   * 每年推进 NPC 年龄 + 退休检查
   */
  _tickAging() {
    for (const npc of this.characters) {
      npc.age++;
      // 检查是否到达退休年龄
      if (npc.age >= npc.retireAge && !npc.isRetired) {
        this.addLog(`${npc.name}（${npc.gender === 'male' ? '男' : '女'}，${npc.age}岁）已经到了退休的年纪，不再参与劳作了。`);
        // 退休清除功法和岗位
        if (npc.learnedGongfu.length > 0) {
          this.addLog(`${npc.name}所学的功法随之消散...`);
        }
        npc.onRetire();
      }
    }
    // 玩家也 aging
    this.player.age++;
  }

  /**
   * 创建一个随机农民 NPC 并加入队伍
   * @param {{ minKnowledge?: number, avoidExistingNames?: boolean, candidateData?: object }} opts
   * @returns {{ npc: Character, name: string }}
   */
  _createNPCFarmer(opts = {}) {
    const { minKnowledge = 3, avoidExistingNames = false, candidateData } = opts;

    // 性别 & 名字
    const gender = candidateData?.gender || (Math.random() < 0.55 ? 'male' : 'female');
    let name;
    if (candidateData?.name) {
      name = candidateData.name;
    } else {
      const existing = new Set([this.player.name, ...this.characters.map(c => c.name)]);
      name = generateName(gender, existing);
    }

    // 年龄
    const age = candidateData?.age || (18 + Math.floor(Math.random() * 35));

    // 出身特质（必须有一个）
    const originTrait = candidateData?.originTrait || rollOriginTrait();

    // 通用特质（0-2个）
    const generalTraits = candidateData?.generalTraits || rollGeneralTraits(Math.random() < 0.4 ? 2 : 1);
    const allTraits = [originTrait, ...generalTraits];

    // 命格（隐藏）
    const fate = candidateData?.fate || rollFate();

    // 外貌
    const appearance = candidateData?.appearance || generateAppearance(gender, age);

    // 创建角色
    const npc = new Character({
      name, roles: ['farmer'], isPlayer: false,
      gender, age, originTrait, traits: allTraits, fate, appearance,
    });

    // 如果有候选人的耕种经验，覆盖
    if (candidateData?.farming) {
      npc.knowledgeAttributes.farming = candidateData.farming;
    } else {
      npc.knowledgeAttributes.farming = minKnowledge + Math.floor(Math.random() * 5);
    }

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
  static _researchFromJSON = ResearchSystem.fromJSON;
}
