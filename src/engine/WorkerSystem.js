/**
 * 工人权益系统 - 路灯计划
 *
 * 管理工人的工时、疲劳、健康、心情、逃跑、罢工。
 *
 * 心情影响因素：
 * - 薪资满意度（实际薪资 vs 期望薪资）
 * - 福利满意度（包吃/包住）
 * - 工时惩罚（超时越多越不满）
 * - 疲劳惩罚（身体疲劳）
 * - 健康惩罚（长期加班损害健康）
 * - 休息奖励（休息后心情恢复）
 *
 * 逃跑机制：
 * - 连续工作>7天，忠诚度越低越容易跑
 * - 心情<10，每天5%逃跑概率
 *
 * 罢工机制：
 * - 50%+工人不满 → 集体罢工 → 生产暂停
 * - 罢工持续直到提高待遇
 */

export class WorkerSystem {
  constructor() {
    this.workerState = {};
    this.grievances = [];
    this.strikeActive = false;
    this.strikeDay = 0;
    this.strikeResolved = true;
  }

  initWorker(npcId) {
    if (this.workerState[npcId]) return;
    this.workerState[npcId] = {
      workHours: 8,
      overtimeHours: 0,
      fatigue: 0,
      health: 100,
      lastRestDay: 0,
      consecutiveDays: 0,
      morale: 70,
    };
  }

  setWorkHours(npcId, standardHours, overtimeHours = 0) {
    const state = this.workerState[npcId];
    if (!state) return { success: false, message: '工人未初始化' };
    state.workHours = Math.max(0, Math.min(16, standardHours));
    state.overtimeHours = Math.max(0, Math.min(8, overtimeHours));
    return { success: true };
  }

  restDay(npcId) {
    const state = this.workerState[npcId];
    if (!state) return;
    state.fatigue = Math.max(0, state.fatigue - 30);
    state.overtimeHours = 0;
    state.consecutiveDays = 0;
    state.health = Math.min(100, state.health + 10);
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

      // 健康损耗
      if (totalHours > 12) {
        state.health = Math.max(0, state.health - (totalHours - 12) * 0.8);
      } else if (totalHours > 10) {
        state.health = Math.max(0, state.health - (totalHours - 10) * 0.3);
      }

      // 心情计算
      state.morale = this._calculateMorale(state, char, financeSystem);

      // 连续工作 + 逃跑检查
      if (isNewDay) {
        state.consecutiveDays++;

        // 逃跑概率：连续>7天 或 心情极低
        let escapeChance = 0;
        if (state.consecutiveDays > 7) {
          escapeChance += (state.consecutiveDays - 7) * 0.02;
        }
        if (state.morale < 20) {
          escapeChance += 0.05;
        } else if (state.morale < 40) {
          escapeChance += 0.02;
        }
        // 忠诚度降低逃跑概率
        const loyalty = char.baseAttributes?.loyalty || 50;
        escapeChance *= (1 - loyalty / 150);

        if (escapeChance > 0 && Math.random() < escapeChance) {
          this._triggerEscape(char, logFn);
        }
      }

      // 疲劳→效率修正
      if (state.fatigue > 80) {
        char._fatigueModifier = 0.5;
      } else if (state.fatigue > 50) {
        char._fatigueModifier = 0.8;
      } else {
        char._fatigueModifier = 1.0;
      }

      // 健康→效率修正
      if (state.health < 50) {
        char._healthModifier = 0.5 + (state.health / 100);
      } else {
        char._healthModifier = 1.0;
      }
    }

    // 罢工检查
    if (isNewDay) {
      this._checkGrievances(allCharacters, logFn);
      this._checkStrikeResolution(allCharacters, financeSystem, logFn);
    }
  }

  // ====== 心情计算 ======

  _calculateMorale(state, character, financeSystem) {
    let morale = 50;

    // 薪资满意度（月薪 vs 期望）
    const post = character.posts?.[0] || 'farmer';
    const expectedSalary = character.salaryDemand || 1;
    if (financeSystem) {
      const wage = financeSystem.calculateMonthlyWage(character, post);
      if (wage.base > expectedSalary * 1.2) morale += 15;
      else if (wage.base > expectedSalary * 1.05) morale += 8;
      else if (wage.base >= expectedSalary) morale += 3;
      else if (wage.base >= expectedSalary * 0.8) morale -= 8;
      else morale -= 20;
    }

    // 福利满意度
    const settings = financeSystem?.wageSettings?.[post] || {};
    if (settings.freeFood) morale += 8;
    if (settings.freeHousing) morale += 8;

    // 工时惩罚
    const totalHours = state.workHours + state.overtimeHours;
    if (totalHours > 14) morale -= 25;
    else if (totalHours > 12) morale -= 18;
    else if (totalHours > 10) morale -= 10;
    else if (totalHours > 8) morale -= 3;

    // 疲劳惩罚
    morale -= state.fatigue * 0.25;

    // 健康惩罚
    if (state.health < 50) morale -= (50 - state.health) * 0.6;

    // 休息奖励
    if (state.consecutiveDays <= 1) morale += 12;

    // 特质影响
    for (const trait of (character.traits || [])) {
      if (trait.effects?.loyalty) morale += trait.effects.loyalty * 0.3;
    }

    return Math.max(0, Math.min(100, Math.round(morale)));
  }

  // ====== 逃跑 ======

  _triggerEscape(character, logFn) {
    const reason = character._fatigueModifier < 0.6
      ? '过度劳累'
      : character._healthModifier < 0.7
        ? '身体垮了'
        : '无法忍受';
    character.isRetired = true;
    logFn(`🚪${character.name}${reason}，悄悄离开了...`);
    delete this.workerState[character.id];
  }

  // ====== 诉求 & 罢工 ======

  _checkGrievances(allCharacters, logFn) {
    const workers = allCharacters.filter(c => !c.isRetired && !c.isPlayer);
    const unhappyWorkers = workers.filter(c => {
      const state = this.workerState[c.id];
      return state && state.morale < 30;
    });

    // 联名上书：3+人不满
    if (unhappyWorkers.length >= 3 && unhappyWorkers.length < workers.length * 0.5) {
      const existing = this.grievances.find(g => g.type === 'petition' && !g.resolved);
      if (!existing) {
        this.grievances.push({
          npcIds: unhappyWorkers.map(c => c.id),
          type: 'petition',
          demands: this._generateDemands(unhappyWorkers),
          severity: unhappyWorkers.length,
          resolved: false,
        });
        logFn(`📝${unhappyWorkers.length}名工人联名上书，要求改善待遇`);
      }
    }

    // 罢工：50%+工人不满
    if (unhappyWorkers.length >= workers.length * 0.5 && workers.length >= 2) {
      if (!this.strikeActive) {
        this.strikeActive = true;
        this.strikeDay = Date.now();
        this.strikeResolved = false;
        logFn(`⚠️ 工人们集体罢工！生产暂停！`);
      }
    }
  }

  _generateDemands(unhappyWorkers) {
    const demands = [];
    const avgMorale = unhappyWorkers.reduce((s, c) => {
      const state = this.workerState[c.id];
      return s + (state?.morale || 50);
    }, 0) / unhappyWorkers.length;

    if (avgMorale < 20) {
      demands.push('大幅提高工资', '减少工时');
    } else if (avgMorale < 40) {
      demands.push('提高工资', '提供包吃包住');
    } else {
      demands.push('改善工作环境');
    }
    return demands;
  }

  _checkStrikeResolution(allCharacters, financeSystem, logFn) {
    if (!this.strikeActive) return;

    const workers = allCharacters.filter(c => !c.isRetired && !c.isPlayer);
    const unhappyWorkers = workers.filter(c => {
      const state = this.workerState[c.id];
      return state && state.morale < 30;
    });

    // 不满人数降到20%以下 → 罢工结束
    if (unhappyWorkers.length < workers.length * 0.2) {
      this.strikeActive = false;
      this.strikeResolved = true;
      logFn(`✅ 工人们结束了罢工，恢复生产`);
    }
  }

  /** 玩家回应诉求 */
  respondToGrievance(grievanceIndex, response, financeSystem, logFn) {
    const grievance = this.grievances[grievanceIndex];
    if (!grievance || grievance.resolved) return { success: false, message: '无效诉求' };

    if (response === 'accept') {
      // 满足诉求
      for (const npcId of grievance.npcIds) {
        const state = this.workerState[npcId];
        if (state) state.morale = Math.min(100, state.morale + 20);
      }
      grievance.resolved = true;
      logFn(`✅ 你满足了工人的诉求，他们很满意`);
      return { success: true, message: '诉求已满足' };
    } else {
      // 拒绝
      for (const npcId of grievance.npcIds) {
        const state = this.workerState[npcId];
        if (state) state.morale = Math.max(0, state.morale - 15);
      }
      grievance.resolved = true;
      logFn(`❌ 你拒绝了工人的诉求，他们很不满`);
      return { success: true, message: '诉求已拒绝' };
    }
  }

  // ====== 存档 ======

  toJSON() {
    return {
      workerState: { ...this.workerState },
      grievances: [...this.grievances],
      strikeActive: this.strikeActive,
      strikeDay: this.strikeDay,
      strikeResolved: this.strikeResolved,
    };
  }

  static fromJSON(data) {
    const sys = new WorkerSystem();
    if (data) {
      sys.workerState = data.workerState || {};
      sys.grievances = data.grievances || [];
      sys.strikeActive = data.strikeActive || false;
      sys.strikeDay = data.strikeDay || 0;
      sys.strikeResolved = data.strikeResolved !== false;
    }
    return sys;
  }
}
