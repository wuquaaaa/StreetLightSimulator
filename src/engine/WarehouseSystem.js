/**
 * 仓库系统 - 路灯计划
 * 公共仓库：初始可用，可存所有种类物品
 * 专用仓库：随游戏进度解锁，解锁前不展示
 */

// 专用仓库分类（通过事件解锁，不按天数）
export const WAREHOUSE_CATEGORIES = {
  food:     { name: '食物', icon: '🍞', color: '#f59e0b' },
  herb:     { name: '药材', icon: '🌿', color: '#a855f7' },  // 灵草药材
  mineral:  { name: '矿物', icon: '⛏️', color: '#6b7280' },
  material: { name: '材料', icon: '🪵', color: '#92400e' },
  tool:     { name: '工具', icon: '🔧', color: '#3b82f6' },
  seed:     { name: '种子', icon: '🌱', color: '#22c55e' },
};

export class WarehouseSystem {
  constructor() {
    // ======== 公共仓库（初始可用，可存所有种类） ========
    this.common = {
      items: {},      // { itemId: { name, amount, category } }
      capacity: 300,
      level: 1,
    };

    // ======== 专用仓库（按进度解锁） ========
    this.storage = {};
    for (const catKey of Object.keys(WAREHOUSE_CATEGORIES)) {
      this.storage[catKey] = {
        items: {},
        capacity: 200,
        level: 0, // 0=未解锁
        unlocked: false,
      };
    }
  }

  // ======== 公共仓库操作 ========

  getCommonUsed() {
    return Object.values(this.common.items).reduce((sum, item) => sum + item.amount, 0);
  }

  getCommonRemaining() {
    return this.common.capacity - this.getCommonUsed();
  }

  // ======== 添加物品（优先存专用仓库，未解锁则存公共仓库） ========
  // meta: 可选附加信息，如 { quality: 'medium' }（灵草品质等）
  addItem(category, itemId, name, amount, meta = undefined) {
    const specialized = this.storage[category];

    // 如果专用仓库已解锁，优先存入专用仓库
    if (specialized && specialized.unlocked && specialized.level > 0) {
      const specUsed = Object.values(specialized.items).reduce((s, i) => s + i.amount, 0);
      const specRemaining = specialized.capacity - specUsed;
      const specAmount = Math.min(amount, specRemaining);

      if (specAmount > 0) {
        if (specialized.items[itemId]) {
          specialized.items[itemId].amount += specAmount;
          if (meta) specialized.items[itemId].meta = meta;
        } else {
          specialized.items[itemId] = { name, amount: specAmount, ...(meta ? { meta } : {}) };
        }
        amount -= specAmount;
      }
    }

    // 剩余存入公共仓库
    if (amount > 0) {
      const commonRemaining = this.getCommonRemaining();
      const commonAmount = Math.min(amount, commonRemaining);

      if (commonAmount > 0) {
        if (this.common.items[itemId]) {
          this.common.items[itemId].amount += commonAmount;
          if (meta) this.common.items[itemId].meta = meta;
        } else {
          this.common.items[itemId] = { name, amount: commonAmount, category, ...(meta ? { meta } : {}) };
        }
        amount -= commonAmount;
      }
    }

    const overflow = amount;
    return {
      success: overflow === 0,
      overflow,
      message: overflow > 0 ? `仓库空间不足，${overflow}单位${name}丢失` : `已存入${name}`,
    };
  }

  // ======== 移除物品（先从专用仓库取，不够再从公共仓库取） ========
  removeItem(category, itemId, amount) {
    let remaining = amount;

    // 先从专用仓库取
    const specialized = this.storage[category];
    if (specialized && specialized.items[itemId]) {
      const take = Math.min(remaining, specialized.items[itemId].amount);
      specialized.items[itemId].amount -= take;
      if (specialized.items[itemId].amount <= 0) delete specialized.items[itemId];
      remaining -= take;
    }

    // 再从公共仓库取
    if (remaining > 0 && this.common.items[itemId]) {
      const take = Math.min(remaining, this.common.items[itemId].amount);
      this.common.items[itemId].amount -= take;
      if (this.common.items[itemId].amount <= 0) delete this.common.items[itemId];
      remaining -= take;
    }

    if (remaining > 0) {
      return { success: false, message: '物品不足' };
    }
    return { success: true, message: `取出${amount}` };
  }

  // ======== 查询物品总数量（专用+公共） ========
  getItemAmount(category, itemId) {
    let total = 0;
    const specialized = this.storage[category];
    if (specialized && specialized.items[itemId]) {
      total += specialized.items[itemId].amount;
    }
    if (this.common.items[itemId]) {
      total += this.common.items[itemId].amount;
    }
    return total;
  }

  // ======== 解锁专用仓库 ========
  unlockWarehouse(category) {
    const cat = this.storage[category];
    if (!cat || cat.unlocked) return false;
    cat.unlocked = true;
    cat.level = 1;
    return true;
  }

  // ======== 升级仓库 ========
  upgradeWarehouse(category) {
    const cat = this.storage[category];
    if (!cat || !cat.unlocked) return { success: false, message: '仓库未解锁' };

    cat.level++;
    cat.capacity = cat.level * 200;
    return {
      success: true,
      message: `${WAREHOUSE_CATEGORIES[category].name}仓库升级到${cat.level}级，容量${cat.capacity}`,
    };
  }

  upgradeCommon() {
    this.common.level++;
    this.common.capacity = this.common.level * 300;
    return {
      success: true,
      message: `公共仓库升级到${this.common.level}级，容量${this.common.capacity}`,
    };
  }

  // ======== 通过事件解锁仓库（外部调用） ========
  checkUnlocks() {
    // 不再按天数自动解锁，由外部事件触发 unlockWarehouse()
    return [];
  }

  // ======== 获取摘要（只返回已解锁的专用仓库） ========
  getSummary() {
    const summary = { common: null, specialized: {} };

    // 公共仓库
    summary.common = {
      name: '公共仓库',
      icon: '📦',
      level: this.common.level,
      capacity: this.common.capacity,
      used: this.getCommonUsed(),
      items: { ...this.common.items },
    };

    // 只返回已解锁的专用仓库
    for (const [catKey, catDef] of Object.entries(WAREHOUSE_CATEGORIES)) {
      const cat = this.storage[catKey];
      if (cat.unlocked) {
        const used = Object.values(cat.items).reduce((s, i) => s + i.amount, 0);
        summary.specialized[catKey] = {
          ...catDef,
          level: cat.level,
          capacity: cat.capacity,
          used,
          items: { ...cat.items },
        };
      }
    }

    return summary;
  }
}
