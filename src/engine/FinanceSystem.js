/**
 * 财务系统 - 路灯计划
 *
 * 两种薪资模式：
 * - 加班制：按工时计费，多劳多得，工人自定工时
 * - 包薪制：固定月薪，不管工时，适合管理岗
 *
 * 月薪 = 模式决定的工资 + 五险一金 + 福利
 */

import { OVERTIME_RATES } from './constants';

export const BENEFIT_RATES = {
  pension: 0.08, medical: 0.02, unemployment: 0.005,
  injury: 0.005, maternity: 0.008, housing: 0.12,
};
const INJURY_SURCHARGE = { miner: 0.02, smelter: 0.01 };

export const DEFAULT_MONTHLY_SALARY = {
  farmer: 1, miner: 1.5, smelter: 2.5, herb_prepper: 1.5,
  alchemist: 4, furnace_tender: 2, trader: 3, porter: 1.5,
};

// 加班制时薪下限（文）
const MIN_HOURLY_RATE = 9; // 9文/时，最低标准
const WEN_PER_LIANG = 100; // 1两 = 100文

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

export class FinanceSystem {
  constructor() {
    this.treasury = 0;

    this.wageSettings = {};
    for (const [post, salary] of Object.entries(DEFAULT_MONTHLY_SALARY)) {
      this.wageSettings[post] = {
        baseSalary: salary,
        payMode: 'salary',
        standardHours: 8,
        overtimeRate: 1.5,
        hourlyRate: null,
        freeFood: false,       // 包吃：消耗仓库粮食
        freeHousing: false,    // 包住：占用宿舍床位
        insurance: true,
      };
    }

    this.lastPayDay = 0;
  }

  calculateExpectedSalary(character) {
    const postId = character.posts?.[0] || 'farmer';
    const background = character.recruitBackground || 'village_farmer';
    const baseSalary = DEFAULT_MONTHLY_SALARY[postId] || 1;
    const bgMult = BACKGROUND_SALARY_MULT[background] || 1.0;
    const ageMult = getAgeModifier(character.age || 25);
    const learning = character.baseAttributes?.learning || 50;
    const learningMult = 1 + (learning - 50) / 200;
    return Math.round(baseSalary * bgMult * ageMult * learningMult * 10) / 10;
  }

  setWageSettings(postId, settings) {
    this.wageSettings[postId] = { ...this.wageSettings[postId], ...settings };
    return { success: true };
  }

  calculateMonthlyWage(character, postId) {
    const settings = this.wageSettings[postId] || this.wageSettings['farmer'];
    const baseSalary = settings.baseSalary;
    const payMode = settings.payMode || 'salary';
    const standardHours = settings.standardHours || 8;
    const overtimeRate = settings.overtimeRate || 1.5;

    let basePay, overtimePay = 0;

    if (payMode === 'overtime') {
      // 加班制：时薪单位为"文"，最低9文/时
      const hourlyRateWen = Math.max(MIN_HOURLY_RATE, settings.hourlyRate || 10);
      const workerState = character._workerState;
      const actualHours = (workerState?.workHours || standardHours) + (workerState?.overtimeHours || 0);

      // 基本工资（按时薪×工时，转为两）
      basePay = (hourlyRateWen * actualHours * 30) / WEN_PER_LIANG;

      // 超出标准工时的部分按加班费率
      if (actualHours > standardHours) {
        const extraHours = actualHours - standardHours;
        overtimePay = (hourlyRateWen * extraHours * 30 * (overtimeRate - 1)) / WEN_PER_LIANG;
      }
    } else {
      // 包薪制：固定月薪
      basePay = baseSalary;
    }

    const benefitRate = this._getBenefitRate(postId);
    const benefitCost = basePay * benefitRate;

    // 包吃：每人每月消耗5单位粮食
    const foodCost = settings.freeFood ? 0.5 : 0; // 0.5两/月（粮食折价）
    // 包住：不额外花钱，但需要宿舍床位

    return {
      base: Math.round(basePay * 100) / 100,
      overtime: Math.round(overtimePay * 100) / 100,
      benefit: Math.round(benefitCost * 100) / 100,
      food: Math.round(foodCost * 100) / 100,
      total: Math.round((basePay + overtimePay + benefitCost + foodCost) * 100) / 100,
    };
  }

  calculateMonthlyCost(allCharacters) {
    let totalBase = 0, totalOvertime = 0, totalBenefit = 0, totalFood = 0;
    for (const char of allCharacters) {
      if (char.isRetired || char.isPlayer) continue;
      const postId = char.posts?.[0] || 'farmer';
      const wage = this.calculateMonthlyWage(char, postId);
      totalBase += wage.base;
      totalOvertime += wage.overtime;
      totalBenefit += wage.benefit;
      totalFood += wage.food;
    }
    return { totalBase, totalOvertime, totalBenefit, totalFood, total: totalBase + totalOvertime + totalBenefit + totalFood };
  }

  processMonthlyPayroll(allCharacters, logFn) {
    const cost = this.calculateMonthlyCost(allCharacters);
    if (cost.total <= 0) return;

    if (this.treasury < cost.total) {
      logFn(`⚠️ 国库不足！需要 ${cost.total.toFixed(2)} 银两，当前只有 ${this.treasury.toFixed(2)} 银两`);
      for (const char of allCharacters) {
        if (!char.isRetired && !char.isPlayer) char.changeMood(-10);
      }
      return;
    }

    this.treasury -= cost.total;
    logFn(`💰 本月发放工资 ${cost.total.toFixed(2)} 银两`);

    for (const char of allCharacters) {
      if (char.isRetired || char.isPlayer) continue;
      const postId = char.posts?.[0] || 'farmer';
      const actualSalary = this.wageSettings[postId]?.baseSalary || 1;
      const expectedSalary = char.salaryDemand || this.calculateExpectedSalary(char);

      if (actualSalary > expectedSalary) char.changeMood(3);
      else if (actualSalary < expectedSalary) char.changeMood(-5);
      else char.changeMood(1);

      if (actualSalary > expectedSalary) {
        char._salaryAboveCount = (char._salaryAboveCount || 0) + 1;
        if (char._salaryAboveCount >= 3) {
          const old = char.salaryDemand;
          char.salaryDemand = actualSalary;
          char._salaryAboveCount = 0;
          logFn(`📊 ${char.name}的薪资期望从 ${old.toFixed(2)}两 调整为 ${actualSalary.toFixed(2)}两`);
        }
      } else {
        char._salaryAboveCount = 0;
      }
    }
  }

  _getBenefitRate(postId) {
    let rate = Object.values(BENEFIT_RATES).reduce((s, r) => s + r, 0);
    if (INJURY_SURCHARGE[postId]) rate += INJURY_SURCHARGE[postId];
    return rate;
  }

  toJSON() {
    return {
      treasury: this.treasury,
      wageSettings: JSON.parse(JSON.stringify(this.wageSettings)),
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
