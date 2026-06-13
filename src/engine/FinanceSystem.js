/**
 * 财务系统 - 路灯计划
 *
 * 核心机制：
 * - 工资计算（底薪 + 加班费 + 提成）
 * - 五险一金（不可压缩的硬支出）
 * - 福利系统（餐补/住房/休假）
 * - 财务报表（每日/每月汇总）
 * - 市场竞争（竞品价格压力）
 */

// 五险一金比例
export const BENEFIT_RATES = {
  pension: 0.08,       // 养老保险 8%
  medical: 0.02,       // 医疗保险 2%
  unemployment: 0.005, // 失业保险 0.5%
  injury: 0.005,       // 工伤保险 0.5%（矿工等高危岗位更高）
  maternity: 0.008,    // 生育保险 0.8%
  housing: 0.12,       // 住房公积金 12%
};

// 高危岗位的工伤保险额外费率
const INJURY_SURCHARGE = {
  miner: 0.02,        // 矿工额外 2%
  smelter: 0.01,      // 炼铁匠额外 1%
};

// 加班费率
export const OVERTIME_RATES = {
  weekday: 1.5,       // 工作日加班 1.5 倍
  weekend: 2.0,       // 周末加班 2 倍
  holiday: 3.0,       // 节假日加班 3 倍
};

export class FinanceSystem {
  constructor() {
    // 工资设置（玩家可调整）
    this.wageSettings = {};  // postId → { baseSalary, overtimeRate, maxOvertime, benefits }

    // 财务记录
    this.dailyReports = [];  // 每日报告
    this.monthlyReports = []; // 每月报告
    this.currentMonth = { income: 0, expenses: 0, details: [] };

    // 市场
    this.marketPrices = {};  // itemId → 市场价格
    this.competitors = [];   // 竞品列表

    // 银两（总资金）
    this.treasury = 0;
  }

  // ====== 工资管理 ======

  /** 设置岗位工资参数 */
  setWageSettings(postId, settings) {
    this.wageSettings[postId] = {
      baseSalary: settings.baseSalary || 100,
      overtimeRate: settings.overtimeRate || OVERTIME_RATES.weekday,
      maxOvertime: settings.maxOvertime || 4,  // 最大加班小时数
      standardHours: settings.standardHours || 8,
      mealAllowance: settings.mealAllowance || false,
      housing: settings.housing || false,
      insurance: settings.insurance !== false, // 默认有保险
    };
    return { success: true };
  }

  /** 计算单个NPC的日薪 */
  calculateDailyWage(character, postId) {
    const settings = this.wageSettings[postId] || this.wageSettings['default'] || {
      baseSalary: 100,
      overtimeRate: OVERTIME_RATES.weekday,
      standardHours: 8,
    };

    const monthlyBase = settings.baseSalary;
    const dailyBase = monthlyBase / 30;

    // 加班费（假设NPC每天加班2小时）
    const overtimeHours = Math.min(2, settings.maxOvertime);
    const hourlyBase = dailyBase / settings.standardHours;
    const overtimePay = overtimeHours * hourlyBase * settings.overtimeRate;

    const dailyWage = dailyBase + overtimePay;

    // 五险一金（按月计算，转日）
    const benefitRate = this._getBenefitRate(postId);
    const dailyBenefit = (monthlyBase * benefitRate) / 30;

    // 福利
    const dailyBenefits = (settings.mealAllowance ? 5 : 0) + (settings.housing ? 3 : 0);

    return {
      base: Math.round(dailyBase),
      overtime: Math.round(overtimePay),
      benefit: Math.round(dailyBenefit),
      benefits: dailyBenefits,
      total: Math.round(dailyWage + dailyBenefit + dailyBenefits),
    };
  }

  /** 计算所有工人的每日总成本 */
  calculateDailyCost(allCharacters) {
    let totalWages = 0;
    let totalBenefits = 0;
    let totalOther = 0;
    const breakdown = [];

    for (const char of allCharacters) {
      if (char.isRetired || char.isPlayer) continue;

      const post = char.posts?.[0] || 'farmer';
      const wage = this.calculateDailyWage(char, post);

      totalWages += wage.base + wage.overtime;
      totalBenefits += wage.benefit;
      totalOther += wage.benefits;

      breakdown.push({
        name: char.name,
        post,
        ...wage,
      });
    }

    return {
      totalWages,
      totalBenefits,
      totalOther,
      total: totalWages + totalBenefits + totalOther,
      breakdown,
    };
  }

  // ====== 财务报告 ======

  /** 记录每日财务 */
  recordDaily(income, expenses, allCharacters) {
    const cost = this.calculateDailyCost(allCharacters);
    const profit = income - cost.total;

    const report = {
      day: Date.now(),
      income,
      laborCost: cost.total,
      profit,
      costBreakdown: cost,
    };

    this.dailyReports.push(report);
    if (this.dailyReports.length > 30) this.dailyReports.shift();

    this.treasury += profit;

    return report;
  }

  /** 获取月度汇总 */
  getMonthlySummary() {
    if (this.dailyReports.length === 0) return null;

    const totalIncome = this.dailyReports.reduce((s, r) => s + r.income, 0);
    const totalCost = this.dailyReports.reduce((s, r) => s + r.laborCost, 0);
    const totalProfit = this.dailyReports.reduce((s, r) => s + r.profit, 0);

    return {
      days: this.dailyReports.length,
      totalIncome,
      totalCost,
      totalProfit,
      profitMargin: totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 100) : 0,
      laborCostRatio: totalIncome > 0 ? Math.round((totalCost / totalIncome) * 100) : 0,
    };
  }

  // ====== 内部方法 ======

  _getBenefitRate(postId) {
    let rate = Object.values(BENEFIT_RATES).reduce((s, r) => s + r, 0);
    // 高危岗位额外工伤保险
    if (INJURY_SURCHARGE[postId]) {
      rate += INJURY_SURCHARGE[postId];
    }
    return rate;
  }

  // ====== 存档 ======

  toJSON() {
    return {
      wageSettings: { ...this.wageSettings },
      treasury: this.treasury,
      dailyReports: this.dailyReports.slice(-30),
      marketPrices: { ...this.marketPrices },
    };
  }

  static fromJSON(data) {
    const sys = new FinanceSystem();
    if (data) {
      sys.wageSettings = data.wageSettings || {};
      sys.treasury = data.treasury || 0;
      sys.dailyReports = data.dailyReports || [];
      sys.marketPrices = data.marketPrices || {};
    }
    return sys;
  }
}
