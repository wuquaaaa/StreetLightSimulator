/**
 * 招募系统 - 路灯计划
 *
 * 管理招募流程：候选人池、亲自/派人招募、交通工具升级。
 * 从 GameState.doAction 中拆出，降低 GameState 的职责。
 */

import { Character } from './Character';
import { generateName, generateAppearance } from '../data/names';
import { rollOriginTrait, rollGeneralTraits } from '../data/traits';
import { rollFate } from '../data/fates';
import { getVehicleInfo, getNextVehicle } from '../data/transport';
import { getHRLevel, pickBestByPreference, RECRUIT_PREFERENCES } from '../data/hr-levels';
import { rollBackground, generateCandidateAttributes, generateSalaryDemand } from '../data/recruitPool';
import {
  RECRUIT_TICKS_SELF, RECRUIT_TICKS_DELEGATE, RECRUIT_FOOD_COST, RECRUIT_POOL_SIZE,
  RECRUIT_RETURN_TICKS,
} from './constants';

export class RecruitSystem {
  constructor() {
    this.recruitTask = null;
    this.recruitCandidatePool = [];
    this.recruitSelectedCandidates = [];
    this.recruitHiredCount = 0;
    this.currentVehicle = 'donkey_cart';
  }

  get isRecruiting() { return this.recruitTask !== null; }
  get isPlayerAway() { return this.recruitTask?.type === 'self'; }
  get maxRecruitHire() { return getVehicleInfo(this.currentVehicle).passengerCapacity; }
  get recruitingNPCIds() {
    const ids = new Set();
    if (this.recruitTask?.type === 'delegate') {
      ids.add(this.recruitTask.delegateId);
    }
    return ids;
  }

  // ====== 候选人池 ======

  refreshCandidatePool(existingNames, hrLevel = 1, hasCultivation = false) {
    const pool = [];
    const existing = new Set(existingNames);

    for (let i = 0; i < RECRUIT_POOL_SIZE; i++) {
      const gender = Math.random() < 0.55 ? 'male' : 'female';
      const name = generateName(gender, existing);
      existing.add(name);
      const age = 18 + Math.floor(Math.random() * 35);

      // 按背景生成候选人
      const background = rollBackground(hrLevel, hasCultivation);
      const attrs = generateCandidateAttributes(background);
      const salaryDemand = generateSalaryDemand(background);

      const originTrait = rollOriginTrait();
      const generalTraits = rollGeneralTraits(Math.random() < background.generalTraitChance ? 2 : 1);
      const fate = rollFate();
      const appearance = generateAppearance(gender, age);

      pool.push({
        name, gender, age, originTrait, generalTraits, fate, appearance,
        background: background.id,
        backgroundName: background.name,
        backgroundIcon: background.icon,
        salaryDemand,
        maxWorkHours: background.maxWorkHours,
        attributes: attrs,
      });
    }

    this.recruitCandidatePool = pool;
    this.recruitHiredCount = 0;
  }

  // ====== Action 处理 ======

  /** 亲自去招募 */
  handleLeaderRecruit(warehouse, currentVehicle) {
    if (this.recruitTask) {
      return { success: false, message: '已有招募任务进行中' };
    }
    const foodAmount = warehouse.getItemAmount('food', 'wheat');
    if (foodAmount < RECRUIT_FOOD_COST) {
      return { success: false, message: `粮食不足！招募需要 ${RECRUIT_FOOD_COST} 单位小麦` };
    }
    warehouse.removeItem('food', 'wheat', RECRUIT_FOOD_COST);
    const vehicle = getVehicleInfo(currentVehicle);
    this.recruitTask = {
      type: 'self',
      ticksRemaining: RECRUIT_TICKS_SELF,
      totalTicks: RECRUIT_TICKS_SELF,
      phase: 'traveling',
      vehicleId: currentVehicle,
    };
    return { success: true, message: `你赶着${vehicle.icon}${vehicle.name}出发去村庄招募...大约1天后到达` };
  }

  /** 派 NPC 去招募 */
  handleDelegateRecruit(params, warehouse, currentVehicle, characters, farm) {
    const { characterId, preference } = params;
    if (!characterId) {
      return { success: false, message: '未指定派出的角色' };
    }
    if (this.recruitTask) {
      return { success: false, message: '已有招募任务进行中' };
    }
    const delegate = characters.find(c => c.id === characterId);
    if (!delegate) {
      return { success: false, message: '找不到该角色' };
    }
    // 检查 NPC 是否在开垦
    if (farm.expandQueue.find(q => q.characterId === characterId)) {
      return { success: false, message: '该角色正在开垦，无法派出' };
    }
    const foodAmount = warehouse.getItemAmount('food', 'wheat');
    if (foodAmount < RECRUIT_FOOD_COST) {
      return { success: false, message: `粮食不足！招募需要 ${RECRUIT_FOOD_COST} 单位小麦` };
    }
    warehouse.removeItem('food', 'wheat', RECRUIT_FOOD_COST);
    const vehicle = getVehicleInfo(currentVehicle);
    const delegateHrLevel = getHRLevel(delegate.hrExp || 0).level;
    this.recruitTask = {
      type: 'delegate',
      delegateId: characterId,
      delegateHrLevel,
      preference: preference || 'any',
      ticksRemaining: RECRUIT_TICKS_DELEGATE,
      totalTicks: RECRUIT_TICKS_DELEGATE,
      phase: 'traveling',
      vehicleId: currentVehicle,
    };
    const prefLabel = preference === 'any' ? '' : `，按你的要求尽量挑${RECRUIT_PREFERENCES.find(p => p.id === preference)?.label || ''}`;
    return { success: true, message: `${delegate.name}赶着${vehicle.icon}${vehicle.name}出发去村庄招募了...约2天后带回${prefLabel}` };
  }

  /** 亲自招募：勾选/取消候选人 */
  handleRecruitChoose(candidateIndex) {
    if (!this.recruitTask || this.recruitTask.phase !== 'waiting_choice') {
      return { success: false, message: '当前不在选择阶段' };
    }
    if (candidateIndex == null || candidateIndex < 0 || candidateIndex >= this.recruitCandidatePool.length) {
      return { success: false, message: '无效的选择' };
    }
    const vehicle = getVehicleInfo(this.recruitTask.vehicleId);
    const maxHire = vehicle.passengerCapacity;
    const candidate = this.recruitCandidatePool[candidateIndex];

    if (candidate._selected) {
      candidate._selected = false;
      this.recruitHiredCount = Math.max(0, this.recruitHiredCount - 1);
      return { success: true, message: `取消了 ${candidate.name} 的选择` };
    } else {
      if (this.recruitHiredCount >= maxHire) {
        return { success: false, message: `${vehicle.name}已满，最多带 ${maxHire} 人` };
      }
      candidate._selected = true;
      this.recruitHiredCount++;
      return { success: true, message: `选中了 ${candidate.name}（还能再选 ${maxHire - this.recruitHiredCount} 人）` };
    }
  }

  /** 亲自招募：确认带走 */
  handleRecruitConfirm() {
    if (!this.recruitTask || this.recruitTask.phase !== 'waiting_choice') {
      return { success: false, message: '当前不在选择阶段' };
    }
    const vehicle = getVehicleInfo(this.recruitTask.vehicleId);
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
    return { success: true, message: msg, count, tutorialStep: 9 };
  }

  /** 亲自招募：放弃选择 */
  handleRecruitSkip() {
    if (!this.recruitTask || this.recruitTask.phase !== 'waiting_choice') {
      return { success: false, message: '当前不在选择阶段' };
    }
    this.recruitSelectedCandidates = [];
    this.recruitCandidatePool = [];
    this.recruitTask.phase = 'returning';
    this.recruitTask.ticksRemaining = RECRUIT_RETURN_TICKS;
    this.recruitTask.totalTicks = RECRUIT_RETURN_TICKS;
    return { success: true, message: '你没有找到合适的人选，赶车回去了。', count: 0, tutorialStep: 9 };
  }

  /** 拒绝来访者 */
  handleRecruitReject(currentDay) {
    return {
      success: true,
      message: '你拒绝了来访者的请求。大约30天后才会再有人来。',
      cooldownUntil: currentDay + 30,
    };
  }

  /** 升级交通工具 */
  handleUpgradeVehicle(warehouse, currentVehicle) {
    if (this.recruitTask) {
      return { success: false, message: '招募进行中，无法更换载具' };
    }
    const nextVehicle = getNextVehicle(currentVehicle);
    if (!nextVehicle) {
      return { success: false, message: '已经是最好的载具了' };
    }
    if (nextVehicle.requires && currentVehicle !== nextVehicle.requires) {
      return { success: false, message: `需要先拥有${getVehicleInfo(nextVehicle.requires).name}` };
    }
    const lacks = [];
    for (const cost of nextVehicle.upgradeCost) {
      const have = warehouse.getItemAmount(cost.category, cost.itemId);
      if (have < cost.amount) {
        lacks.push(`${cost.name}(${have}/${cost.amount})`);
      }
    }
    if (lacks.length > 0) {
      return { success: false, message: `材料不足：${lacks.join('、')}` };
    }
    for (const cost of nextVehicle.upgradeCost) {
      warehouse.removeItem(cost.category, cost.itemId, cost.amount);
    }
    const oldVehicle = getVehicleInfo(currentVehicle);
    return {
      success: true,
      message: `升级为${nextVehicle.icon}${nextVehicle.name}！`,
      logMessage: `${oldVehicle.name}换成了${nextVehicle.icon}${nextVehicle.name}！一趟最多可招 ${nextVehicle.passengerCapacity} 人。`,
      newVehicle: nextVehicle.id,
    };
  }

  // ====== Tick ======

  tick(characters, addLog, tutorialStep) {
    if (!this.recruitTask) return null;

    this.recruitTask.ticksRemaining--;
    if (this.recruitTask.ticksRemaining > 0) return null;

    const vehicle = getVehicleInfo(this.recruitTask.vehicleId);

    if (this.recruitTask.type === 'self') {
      return this._tickSelfRecruit(vehicle, characters, addLog, tutorialStep);
    } else {
      return this._tickDelegateRecruit(vehicle, characters, addLog, tutorialStep);
    }
  }

  _tickSelfRecruit(vehicle, characters, addLog, tutorialStep) {
    if (this.recruitTask.phase === 'traveling') {
      this.recruitTask.phase = 'waiting_choice';
      addLog('你到达了附近的村庄，村长带你去见几位愿意跟随的村民...');
      return { type: 'self_arrived', tutorialStep: Math.max(tutorialStep, 7) };
    }

    if (this.recruitTask.phase === 'returning') {
      const toCreate = this.recruitSelectedCandidates || [];
      const createdNpcs = [];
      if (toCreate.length > 0) {
        for (const candidateData of toCreate) {
          const npc = this._createNPCFromCandidate(candidateData);
          createdNpcs.push(npc);
          addLog(`${candidateData.name}（${candidateData.gender === 'male' ? '男' : '女'}，${candidateData.age}岁）加入了你的队伍！`);
        }
      }
      addLog(`你赶着${vehicle.icon}${vehicle.name}回到了家。${toCreate.length > 0 ? `带回了 ${toCreate.length} 位新村民！` : ''}`);
      this._resetRecruitState();
      return { type: 'self_returned', createdNpcs, tutorialStep: Math.max(tutorialStep, 9) };
    }
    return null;
  }

  _tickDelegateRecruit(vehicle, characters, addLog, tutorialStep) {
    const delegate = characters.find(c => c.id === this.recruitTask.delegateId);

    if (this.recruitTask.phase === 'traveling') {
      const preference = this.recruitTask.preference || 'any';
      const maxHire = vehicle.passengerCapacity;
      const selected = [];
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
      addLog(msg);

      this.recruitTask.phase = 'returning';
      this.recruitTask.ticksRemaining = RECRUIT_RETURN_TICKS;
      this.recruitTask.totalTicks = RECRUIT_RETURN_TICKS;
      return null;
    }

    if (this.recruitTask.phase === 'returning') {
      const toCreate = this.recruitSelectedCandidates || [];
      const createdNpcs = [];
      if (toCreate.length > 0) {
        for (const candidateData of toCreate) {
          const npc = this._createNPCFromCandidate(candidateData);
          createdNpcs.push(npc);
          addLog(`${candidateData.name}（${candidateData.gender === 'male' ? '男' : '女'}，${candidateData.age}岁）加入了你的队伍！`);
        }
      }
      addLog(`${delegate ? delegate.name : '派出的人'}赶着${vehicle.icon}${vehicle.name}回到了家。${toCreate.length > 0 ? `带回了 ${toCreate.length} 位新村民！` : ''}`);
      this._resetRecruitState();
      return { type: 'delegate_returned', createdNpcs, tutorialStep: Math.max(tutorialStep, 9) };
    }
    return null;
  }

  _createNPCFromCandidate(candidateData) {
    const allTraits = [candidateData.originTrait, ...(candidateData.generalTraits || [])];
    const npc = new Character({
      name: candidateData.name,
      roles: ['farmer'],
      isPlayer: false,
      gender: candidateData.gender,
      age: candidateData.age,
      originTrait: candidateData.originTrait,
      traits: allTraits,
      fate: candidateData.fate,
      appearance: candidateData.appearance,
    });
    if (candidateData.farming) {
      npc.knowledgeAttributes.farming = candidateData.farming;
    } else {
      npc.knowledgeAttributes.farming = 3 + Math.floor(Math.random() * 5);
    }
    // 候选人背景属性
    if (candidateData.attributes) {
      for (const [key, val] of Object.entries(candidateData.attributes)) {
        if (key in npc.baseAttributes) {
          npc.baseAttributes[key] = val;
        }
      }
    }
    npc.recruitBackground = candidateData.background || 'village_farmer';
    npc.salaryDemand = candidateData.salaryDemand || 100;
    npc.maxWorkHours = candidateData.maxWorkHours || 14;
    return npc;
  }

  _resetRecruitState() {
    this.recruitTask = null;
    this.recruitSelectedCandidates = [];
    this.recruitHiredCount = 0;
  }
}
