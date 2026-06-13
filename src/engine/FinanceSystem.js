/**
 * 财务系统 - 路灯计划
 *
 * 以明朝薪资为参考：
 * - 农夫：0.5-1两/月（最低，仅供温饱）
 * - 矿工：1-2两/月（危险补贴）
 - 炼铁匠：2-3两/月（技术活）
 * - 炼丹师：3-5两/月（高技术）
 * - 贩子：2-4两/月（有提成）
 *
 * 招募时路费：5-10两（根据交通工具）
 * 工资每月发放，从国库扣除
 * 五险一金是硬支出（约24%）
 */

import { OVERTIME_RATES } from './constants';

// 五险一金比例
export const BENEFIT_RATES = {
  pension: 0.08,       // 养老保险 8%
  medical: 0.02,       // 医疗保险 2%
  unemployment: 0.005, // 失业保险 0.5%
  injury: 0.005,       // 工伤保险 0.5%
  maternity: 0.008,    // 生育保险 0.8%
  housing: 0.12,       // 住房公积金 12%
};

const INJURY_SURCHARGE = {
  miner: 0.02,
  smelter: 0.01,
};

// 岗位默认月薪（明朝参考）
export const DEFAULT_MONTHLY_SALARY = {
  farmer: 1,           // 农夫：1两/月
  miner: 1.5,          // 矿工：1.5两/月（危险）
  smelter: 2.5,        // 炼铁匠：2.5两/月（技术）
  herb_prepper: 1.5,   // 药童：1.5两/月
  alchemist: 4,        // 炼丹师：4两/月（高技术）
  furnace_tender: 2,   // 炉工：2两/月
  trader: 3,           // 贩子：3两/月（有提成）
  porter: 1.5,         // 运工：1.5两/月
};

// 背景加成倍率
const BACKGROUND_SALARY_MULT = {
  village_farmer: 1.0,   // 村民：标准
  village_worker: 1.1,   // 村工：略高（有经验）
  city_youth: 1.5,       // 城镇青年：高50%
  city_scholar: 2.0,     // 城中学子：翻倍
  cultivator: 3.0,       // 修仙散人：三倍
};

// 年龄修正
function getAgeModifier(age) {
  if (age < 25) return 0.8;   // 年轻人便宜
  if (age < 35) return 1.0;   // 壮年标准
  if (age < 45) return 1.1;   // 中年略贵（经验丰富）
  return 1.2;                  // 老年最贵（经验最丰富）
}

export class FinanceSystem {
  constructor() {
    // 银两（总资金）
    this.treasury = 0;

    // 默认岗位工资
    this.wageSettings = {};
    for (const [post, salary] of Object.entries(DEFAULT_MONTHLY_SALARY)) {
      this.wageSettings[post] = {
        baseSalary: salary,
        overtimeRate: OVERTIME_RATES.weekday,
        maxOvertime: 4,
        standardHours: 8,
        mealAllowance: false,
        housing: false,
        insurance: true,
      };
    }

    // 财务记录
    this.dailyReports = [];
    this.monthlyReports = [];
    this.lastPayDay = 0;  // 上次发薪日
  }

  // ====== 薪资计算 ======

  /** 计算NPC的期望月薪（招募时显示） */
  calculateExpectedSalary(character) {
    const postId = character.posts?.[0] || 'farmer';
    const background = character.recruitBackground || 'village_farmer';

    const baseSalary = DEFAULT_MONTHLY_SALARY[postId] || 1;
    const bgMult = BACKGROUND_SALARY_MULT[background] || 1.0;
    const ageMult = getAgeModifier(character.age || 25);

    // 悟性加成（高悟性要求更高薪资）
    const learning = character.baseAttributes?.learning || 50;
    const learningMult = 1 + (learning - 50) / 200; // 0.75 ~ 1.25

    const expected = baseSalary * bgMult * ageMult * learningMult;
    return Math.round(expected * 10) / 10; // 保留一位小数
  }

  /** 设置岗位工资参数 */
  setWageSettings(postId, settings) {
    this.wageSettings[postId] = {
      ...this.wageSettings[postId],
      ...settings,
    };
    return { success: true };
  }

  /** 计算单个NPC的月薪（含五险一金） */
  calculateMonthlyWage(character, postId) {
    const settings = this.wageSettings[postId] || this.wageSettings['farmer'];
    const baseSalary = settings.baseSalary;

    // 五险一金
    const benefitRate = this._getBenefitRate(postId);
    const benefitCost = baseSalary * benefitRate;

    // 福利
    const福利Cost = (settings.mealAllowance ? 0.5 : 0) + (settings.housing ? 0.3 : 0);

    return {
      base: baseSalary,
      benefit: Math.round(benefitCost * 10) / 10,
      福利: Math.round(福利Cost * 10) / 10,
      total: Math.round((baseSalary + benefitCost + 福利Cost) * 10) / 10,
    };
  }

  /** 计算所有工人的月薪总成本 */
  calculateMonthlyCost(allCharacters) {
    let totalBase = 0;
    let totalBenefit = 0;
    let total福利 = 0;

    for (const char of allCharacters) {
      if (char.isRetired || char.isPlayer) continue;
      const postId = char.posts?.[0] || 'farmer';
      const wage = this.calculateMonthlyWage(char, postId);
      totalBase += wage.base;
      totalBenefit += wage.benefit;
      total福利 += wage.福利;
    }

    return {
      totalBase,
      totalBenefit,
      total福利,
      total: totalBase + totalBenefit + total福利,
    };
  }

  /** 每月发薪（从国库扣除） */
  processMonthlyPayroll(allCharacters, logFn) {
    const cost = this.calculateMonthlyCost(allCharacters);
    if (cost.total <= 0) return;

    if (this.treasury < cost.total) {
      logFn(`⚠️ 国库不足！需要 ${cost.total} 银两发工资，当前只有 ${this.treasury} 银两`);
      // 欠薪：工人心情下降
      for (const char of allCharacters) {
        if (!char.isRetired && !char.isPlayer) {
          char.changeMood(-10);
        }
      }
      return;
    }

    this.treasury -= cost.total;
    logFn(`💰 本月发放工资 ${cost.total} 银两（底薪${cost.totalBase} + 五险一金${cost.totalBenefit} + 福利${cost.total福利}）`);

    // 工人心情：按时发薪 slightly 提升
    for (const char of allCharacters) {
      if (!char.isRetired && !char.isPlayer) {
        char.changeMood(2);
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
      dailyReports: this.dailyReports.slice(-30),
    };
  }

  static fromJSON(data) {
    const sys = new FinanceSystem();
    if (data) {
      sys.treasury = data.treasury || 0;
      if (data.wageSettings) sys.wageSettings = data.wageSettings;
      sys.lastPayDay = data.lastPayDay || 0;
      sys.dailyReports = data.dailyReports || [];
    }
    return sys;
  }
}
