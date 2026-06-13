/**
 * 财务系统 - 路灯计划
 *
 * 月薪制（明朝薪资参考）：
 * - 农夫：1两/月（最低，仅供温饱）
 * - 矿工：1.5两/月（危险补贴）
 * - 炼丹师：4两/月（高技术）
 * - 贩子：3两/月（有提成）
 *
 * 薪资期望浮动：
 * - 连续3个月领取高于期望的薪资 → 期望上调（锚定效应）
 * - 低于期望 → 心情下降
 * - 这就是"涨了回不去"的资本困境
 */

import { OVERTIME_RATES } from './constants';

export const BENEFIT_RATES = {
  pension: 0.08, medical: 0.02, unemployment: 0.005,
  injury: 0.005, maternity: 0.008, housing: 0.12,
};

const INJURY_SURCHARGE = { miner: 0.02, smelter: 0.01 };

// 岗位默认月薪（明朝参考：农夫约1两/月）
export const DEFAULT_MONTHLY_SALARY = {
  farmer: 1, miner: 1.5, smelter: 2.5, herb_prepper: 1.5,
  alchemist: 4, furnace_tender: 2, trader: 3, porter: 1.5,
};

// 背景加成倍率
const BACKGROUND_SALARY_MULT = {
  village_farmer: 1.0, village_worker: 1.1,
  city_youth: 1.5, city_scholar: 2.0, cultivator: 3.0,
};

function getAgeModifier(age) {
  if (age < 25) return 0.8;
  if (age < 35) return 1.0;
  if (age < 45) return 1.1;
  return 1.2;
}

// 薪资锚定阈值（连续多少个月后调整期望）
const SALARY_LOCK_MONTHS = 3;

export class FinanceSystem {
  constructor() {
    this.treasury = 0;

    // 默认岗位工资
    this.wageSettings = {};
    for (const [post, salary] of Object.entries(DEFAULT_MONTHLY_SALARY)) {
      this.wageSettings[post] = {
        baseSalary: salary, overtimeRate: OVERTIME_RATES.weekday,
        maxOvertime: 4, standardHours: 8,
        mealAllowance: false, housing: false, insurance: true,
      };
    }

    this.lastPayDay = 0;
  }

  // ====== 薪资计算 ======

  /** 计算NPC的期望月薪（招募时显示） */
  calculateExpectedSalary(character) {
    const postId = character.posts?.[0] || 'farmer';
    const background = character.recruitBackground || 'village_farmer';
    const baseSalary = DEFAULT_MONTHLY_SALARY[postId] || 1;
    const bgMult = BACKGROUND_SALARY_MULT[background] || 1.0;
    const ageMult = getAgeModifier(character.age || 25);
    const learning = character.baseAttributes?.learning || 50;
    const learningMult = 1 + (learning - 50) / 200;
    const expected = baseSalary * bgMult * ageMult * learningMult;
    return Math.round(expected * 10) / 10;
  }

  setWageSettings(postId, settings) {
    this.wageSettings[postId] = { ...this.wageSettings[postId], ...settings };
    return { success: true };
  }

  /** 计算单个NPC的月薪（含五险一金） */
  calculateMonthlyWage(character, postId) {
    const settings = this.wageSettings[postId] || this.wageSettings['farmer'];
    const baseSalary = settings.baseSalary;
    const benefitRate = this._getBenefitRate(postId);
    const benefitCost = baseSalary * benefitRate;
    const welfareCost = (settings.mealAllowance ? 0.5 : 0) + (settings.housing ? 0.3 : 0);
    return {
      base: baseSalary,
      benefit: Math.round(benefitCost * 10) / 10,
      welfare: Math.round(welfareCost * 10) / 10,
      total: Math.round((baseSalary + benefitCost + welfareCost) * 10) / 10,
    };
  }

  /** 计算所有工人的月薪总成本 */
  calculateMonthlyCost(allCharacters) {
    let totalBase = 0, totalBenefit = 0, totalWelfare = 0;
    for (const char of allCharacters) {
      if (char.isRetired || char.isPlayer) continue;
      const postId = char.posts?.[0] || 'farmer';
      const wage = this.calculateMonthlyWage(char, postId);
      totalBase += wage.base;
      totalBenefit += wage.benefit;
      totalWelfare += wage.welfare;
    }
    return { totalBase, totalBenefit, totalWelfare, total: totalBase + totalBenefit + totalWelfare };
  }

  // ====== 每月发薪 + 薪资锚定 ======

  processMonthlyPayroll(allCharacters, logFn) {
    const cost = this.calculateMonthlyCost(allCharacters);
    if (cost.total <= 0) return;

    if (this.treasury < cost.total) {
      logFn(`⚠️ 国库不足！需要 ${cost.total} 银两发工资，当前只有 ${this.treasury} 银两`);
      for (const char of allCharacters) {
        if (!char.isRetired && !char.isPlayer) char.changeMood(-10);
      }
      return;
    }

    this.treasury -= cost.total;
    logFn(`💰 本月发放工资 ${cost.total} 银两（底薪${cost.totalBase} + 五险一金${cost.totalBenefit} + 福利${cost.totalWelfare}）`);

    // 每个工人：薪资心情 + 锚定检查
    for (const char of allCharacters) {
      if (char.isRetired || char.isPlayer) continue;

      const postId = char.posts?.[0] || 'farmer';
      const actualSalary = this.wageSettings[postId]?.baseSalary || 1;
      const expectedSalary = char.salaryDemand || this.calculateExpectedSalary(char);

      // 薪资心情
      if (actualSalary > expectedSalary) {
        char.changeMood(3);  // 高于期望：开心
      } else if (actualSalary < expectedSalary) {
        char.changeMood(-5); // 低于期望：不满
      } else {
        char.changeMood(1);  // 刚好：满意
      }

      // 薪资锚定：连续3个月领取高于期望的薪资 → 期望上调
      if (actualSalary > expectedSalary) {
        char._salaryAboveCount = (char._salaryAboveCount || 0) + 1;
        if (char._salaryAboveCount >= SALARY_LOCK_MONTHS) {
          const oldDemand = char.salaryDemand;
          char.salaryDemand = actualSalary; // 锚定到当前薪资
          char._salaryAboveCount = 0;
          logFn(`📊 ${char.name}的薪资期望从 ${oldDemand}两 调整为 ${actualSalary}两`);
        }
      } else {
        char._salaryAboveCount = 0; // 重置计数
      }
    }
  }

  _getBenefitRate(postId) {
    let rate = Object.values(BENEFIT_RATES).reduce((s, r) => s + r, 0);
    if (INJURY_SURCHARGE[postId]) rate += INJURY_SURCHARGE[postId];
    return rate;
  }

  // ====== 存档 ======

  toJSON() {
    return {
      treasury: this.treasury,
      wageSettings: { ...this.wageSettings },
      lastPayDay: this.lastPayDay,
    };
  }

  static fromJSON(data) {
    const sys = new FinanceSystem();
    if (data) {
      sys.treasury = data.treasury || 0;
      if (data.wageSettings) sys.wageSettings = data.wageSettings;
      sys.lastPayDay = data.lastPayDay || 0;
    }
    return sys;
  }
}
