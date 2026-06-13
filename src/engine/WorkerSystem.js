/**
 * 工人权益系统 - 路灯计划
 *
 * 核心机制：
 * - 工时管理（标准工时/加班/超时）
 * - 心情系统（受工时/薪资/福利影响）
 * - 健康系统（长期加班损害健康）
 * - 逃跑/暴动风险
 * - 工人诉求（联名上书/罢工）
 */

export class WorkerSystem {
  constructor() {
    // 每个NPC的工人状态
    this.workerState = {};  // npcId → { workHours, overtimeHours, fatigue, health, lastRestDay }

    // 工人诉求队列
    this.grievances = [];  // [{ npcIds, type, demands, severity }]

    // 罢工状态
    this.strikeActive = false;
    this.strikeDay = 0;

    // 事件记录
    this.dailyEvents = [];
  }

  // ====== 工人状态管理 ======

  /** 初始化NPC的工人状态 */
  initWorker(npcId) {
    if (this.workerState[npcId]) return;
    this.workerState[npcId] = {
      workHours: 8,          // 当前日工时
      overtimeHours: 0,      // 加班时长
      fatigue: 0,            // 疲劳度 0-100
      health: 100,           // 健康度 0-100
      lastRestDay: 0,        // 上次休息日
      consecutiveDays: 0,    // 连续工作天数
      morale: 70,            // 士气 0-100
    };
  }

  /** 设置NPC的工作时长 */
  setWorkHours(npcId, standardHours, overtimeHours = 0) {
    const state = this.workerState[npcId];
    if (!state) return { success: false, message: '工人未初始化' };

    state.workHours = Math.max(0, Math.min(16, standardHours));
    state.overtimeHours = Math.max(0, Math.min(8, overtimeHours));

    return { success: true };
  }

  /** 给NPC放假 */
  restDay(npcId) {
    const state = this.workerState[npcId];
    if (!state) return;

    state.fatigue = Math.max(0, state.fatigue - 30);
    state.overtimeHours = 0;
    state.consecutiveDays = 0;
    state.lastRestDay = Date.now();
  }

  // ====== Tick ======

  tick(isNewDay, allCharacters, financeSystem, logFn) {
    for (const char of allCharacters) {
      if (char.isRetired || char.isPlayer) continue;

      this.initWorker(char.id);
      const state = this.workerState[char.id];

      // 疲劳累积
      const totalHours = state.workHours + state.overtimeHours;
      const fatigueGain = totalHours > 8 ? (totalHours - 8) * 3 : 0;
      state.fatigue = Math.min(100, state.fatigue + fatigueGain);

      // 健康损耗（长期加班）
      if (totalHours > 10) {
        state.health = Math.max(0, state.health - (totalHours - 10) * 0.5);
      }

      // 士气计算
      state.morale = this._calculateMorale(state, char, financeSystem);

      // 连续工作天数
      if (isNewDay) {
        state.consecutiveDays++;

        // 连续工作太久 → 强制休息 or 逃跑风险
        if (state.consecutiveDays > 7) {
          const escapeChance = (state.consecutiveDays - 7) * 0.02 * (1 - char.baseAttributes?.loyalty / 100);
          if (Math.random() < escapeChance) {
            this._triggerEscape(char, logFn);
          }
        }
      }

      // 疲劳过高 → 效率惩罚
      if (state.fatigue > 80) {
        char._fatigueModifier = 0.5; // 效率减半
      } else if (state.fatigue > 50) {
        char._fatigueModifier = 0.8;
      } else {
        char._fatigueModifier = 1.0;
      }
    }

    // 检查工人诉求
    if (isNewDay) {
      this._checkGrievances(allCharacters, logFn);
    }
  }

  // ====== 内部方法 ======

  _calculateMorale(state, character, financeSystem) {
    let morale = 50;

    // 薪资满意度
    const post = character.posts?.[0] || 'farmer';
    const wage = financeSystem?.calculateDailyWage(character, post);
    if (wage) {
      // 基本工资 vs 期望（简单模型）
      if (wage.base >= 50) morale += 15;
      else if (wage.base >= 30) morale += 5;
      else morale -= 10;
    }

    // 福利满意度
    const settings = financeSystem?.wageSettings?.[post] || {};
    if (settings.mealAllowance) morale += 5;
    if (settings.housing) morale += 5;

    // 工时惩罚
    const totalHours = state.workHours + state.overtimeHours;
    if (totalHours > 12) morale -= 20;
    else if (totalHours > 10) morale -= 10;
    else if (totalHours > 8) morale -= 3;

    // 疲劳惩罚
    morale -= state.fatigue * 0.2;

    // 健康惩罚
    if (state.health < 50) morale -= (50 - state.health) * 0.5;

    // 休息奖励
    if (state.consecutiveDays <= 1) morale += 10;

    // 特质影响
    for (const trait of (character.traits || [])) {
      if (trait.effects?.loyalty) morale += trait.effects.loyalty;
    }

    return Math.max(0, Math.min(100, Math.round(morale)));
  }

  _triggerEscape(character, logFn) {
    character.isRetired = true; // 简化处理：直接标记退休/离开
    logFn(`🚪${character.name}无法忍受高强度工作，悄悄离开了...`);

    // 清理工人状态
    delete this.workerState[character.id];
  }

  _checkGrievances(allCharacters, logFn) {
    // 检查是否有大量工人不满
    const unhappyWorkers = allCharacters.filter(c => {
      if (c.isRetired || c.isPlayer) return false;
      const state = this.workerState[c.id];
      return state && state.morale < 30;
    });

    if (unhappyWorkers.length >= 3) {
      // 触发联名上书
      this.grievances.push({
        npcIds: unhappyWorkers.map(c => c.id),
        type: 'petition',
        demands: ['减少工时', '提高工资'],
        severity: unhappyWorkers.length,
      });
      logFn(`📝${unhappyWorkers.length}名工人联名上书，要求改善待遇`);
    }

    // 检查罢工
    if (unhappyWorkers.length >= allCharacters.filter(c => !c.isRetired && !c.isPlayer).length * 0.5) {
      if (!this.strikeActive) {
        this.strikeActive = true;
        this.strikeDay = Date.now();
        logFn(`⚠️ 工人们集体罢工！生产暂停！`);
      }
    }
  }

  // ====== 存档 ======

  toJSON() {
    return {
      workerState: { ...this.workerState },
      grievances: [...this.grievances],
      strikeActive: this.strikeActive,
    };
  }

  static fromJSON(data) {
    const sys = new WorkerSystem();
    if (data) {
      sys.workerState = data.workerState || {};
      sys.grievances = data.grievances || [];
      sys.strikeActive = data.strikeActive || false;
    }
    return sys;
  }
}
