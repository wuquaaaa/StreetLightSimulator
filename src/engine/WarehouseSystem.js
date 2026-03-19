/**
 * 仓库系统 - 路灯计划
 * 分类存储，容量限制，建设扩容
 */

// 仓库分类
export const WAREHOUSE_CATEGORIES = {
  food: { name: '食物', icon: '🍞', color: '#f59e0b' },
  mineral: { name: '矿物', icon: '⛏️', color: '#6b7280' },
  material: { name: '材料', icon: '🪵', color: '#92400e' },
  tool: { name: '工具', icon: '🔧', color: '#3b82f6' },
  seed: { name: '种子', icon: '🌱', color: '#22c55e' },
};

export class WarehouseSystem {
  constructor() {
    // 每个分类的容量和当前存储
    this.storage = {};
    for (const catKey of Object.keys(WAREHOUSE_CATEGORIES)) {
      this.storage[catKey] = {
        items: {},    // { itemId: { name, amount } }
        capacity: 100, // 初始容量
        level: 0,     // 仓库等级（0=未建设）
      };
    }

    // 初始只有食物仓库（等级1）
    this.storage.food.level = 1;
    this.storage.food.capacity = 200;

    // 给一点初始小麦种子
    this.addItem('seed', 'wheat_seed', '小麦种子', 5);
  }

  // 获取某分类的总存储量
  getCategoryUsed(category) {
    const cat = this.storage[category];
    if (!cat) return 0;
    return Object.values(cat.items).reduce((sum, item) => sum + item.amount, 0);
  }

  // 获取某分类的剩余空间
  getCategoryRemaining(category) {
    const cat = this.storage[category];
    if (!cat) return 0;
    return cat.capacity - this.getCategoryUsed(category);
  }

  // 添加物品
  addItem(category, itemId, name, amount) {
    const cat = this.storage[category];
    if (!cat) return { success: false, message: '未知仓库分类' };

    // 检查仓库是否已建设（等级>0）或是食物仓库（初始可用）
    if (cat.level <= 0) {
      return { success: false, message: `${WAREHOUSE_CATEGORIES[category].name}仓库尚未建设` };
    }

    const remaining = this.getCategoryRemaining(category);
    const actualAmount = Math.min(amount, remaining);

    if (actualAmount <= 0) {
      return { success: false, message: '仓库已满！' };
    }

    if (cat.items[itemId]) {
      cat.items[itemId].amount += actualAmount;
    } else {
      cat.items[itemId] = { name, amount: actualAmount };
    }

    const overflow = amount - actualAmount;
    return {
      success: true,
      stored: actualAmount,
      overflow,
      message: overflow > 0
        ? `存入${actualAmount}，${overflow}因仓库满而丢失`
        : `存入${actualAmount}${name}`,
    };
  }

  // 移除物品
  removeItem(category, itemId, amount) {
    const cat = this.storage[category];
    if (!cat) return { success: false, message: '未知仓库分类' };

    const item = cat.items[itemId];
    if (!item || item.amount < amount) {
      return { success: false, message: '物品不足' };
    }

    item.amount -= amount;
    if (item.amount <= 0) {
      delete cat.items[itemId];
    }

    return { success: true, message: `取出${amount}${item ? item.name : ''}` };
  }

  // 查询物品数量
  getItemAmount(category, itemId) {
    const cat = this.storage[category];
    if (!cat || !cat.items[itemId]) return 0;
    return cat.items[itemId].amount;
  }

  // 建设/升级仓库
  buildWarehouse(category) {
    const cat = this.storage[category];
    if (!cat) return { success: false, message: '未知分类' };

    const nextLevel = cat.level + 1;
    const cost = this.getUpgradeCost(nextLevel);

    cat.level = nextLevel;
    cat.capacity = nextLevel * 200;

    return {
      success: true,
      message: `${WAREHOUSE_CATEGORIES[category].name}仓库升级到${nextLevel}级，容量${cat.capacity}`,
      cost,
    };
  }

  // 获取升级费用
  getUpgradeCost(level) {
    return {
      // 升级需要的资源（后续可扩展）
      labor: level * 20,     // 劳动力（体力）
      material: level * 10,  // 材料
    };
  }

  // 获取所有分类的摘要
  getSummary() {
    const summary = {};
    for (const [catKey, catDef] of Object.entries(WAREHOUSE_CATEGORIES)) {
      const cat = this.storage[catKey];
      summary[catKey] = {
        ...catDef,
        level: cat.level,
        capacity: cat.capacity,
        used: this.getCategoryUsed(catKey),
        items: { ...cat.items },
        built: cat.level > 0,
      };
    }
    return summary;
  }
}
