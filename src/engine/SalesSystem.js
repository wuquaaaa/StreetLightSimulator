/**
 * 销售系统 - 路灯计划
 *
 * 核心机制：
 * - 贩子在店铺售卖产品
 * - 每天有客流量，顾客有不同需求和预算
 * - 议价系统：顾客出价 ↔ 贩子还价
 * - 声望系统：卖得好声望高，吸引更多客人
 * - 竞品影响：价格太高客人去别家
 */

export class SalesSystem {
  constructor() {
    this.reputation = 50;       // 声望 0-100
    this.dailyCustomers = [];   // 今日顾客列表
    this.salesHistory = [];     // 销售记录
    this.shopStock = {};        // 店铺货架 { itemId: { amount, price } }
    this.pricing = {};          // 定价 { itemId: price }
    this.dailyStats = {};
  }

  // ====== 玩家操作 ======

  /** 设置商品价格 */
  setPrice(itemId, price) {
    if (price < 1) return { success: false, message: '价格不能低于1' };
    this.pricing[itemId] = price;
    return { success: true, message: `已设置价格为${price}银两` };
  }

  /** 上架商品 */
  stockItem(itemId, name, amount, defaultPrice = 10) {
    if (!this.shopStock[itemId]) {
      this.shopStock[itemId] = { amount: 0, price: defaultPrice, name };
    }
    this.shopStock[itemId].amount += amount;
    if (!this.pricing[itemId]) {
      this.pricing[itemId] = defaultPrice;
    }
    return { success: true, message: `上架了${amount}个${name}` };
  }

  /** 与顾客议价（玩家主动） */
  haggle(customerIndex, offerPrice) {
    const customer = this.dailyCustomers[customerIndex];
    if (!customer) return { success: false, message: '无效的顾客' };

    const result = this._resolveHaggle(customer, offerPrice);
    return result;
  }

  // ====== Tick ======

  tick(isNewDay, allCharacters, warehouse, logFn) {
    if (!isNewDay) return;

    // 生成今日顾客
    this._generateCustomers();

    // 贩子自动销售
    const traders = allCharacters.filter(c => !c.isRetired && c.hasPost('trader'));
    for (const trader of traders) {
      this._autoSell(trader, warehouse, logFn);
    }

    // 声望每日衰减
    this.reputation = Math.max(0, this.reputation - 0.5);
  }

  // ====== 内部方法 ======

  _generateCustomers() {
    this.dailyCustomers = [];
    // 客流量受声望影响
    const baseFlow = 3 + Math.floor(this.reputation / 20);
    const flow = baseFlow + Math.floor(Math.random() * 3);

    for (let i = 0; i < flow; i++) {
      const customer = this._createCustomer();
      this.dailyCustomers.push(customer);
    }
  }

  _createCustomer() {
    const budgets = [
      { tier: 'poor', maxBudget: 20, patience: 2 },
      { tier: 'normal', maxBudget: 50, patience: 3 },
      { tier: 'rich', maxBudget: 100, patience: 4 },
      { tier: 'wealthy', maxBudget: 300, patience: 5 },
    ];
    const tier = budgets[Math.floor(Math.random() * budgets.length)];
    const name = `顾客${Math.floor(Math.random() * 100)}`;

    // 选择想要的商品
    const availableItems = Object.entries(this.shopStock)
      .filter(([_, s]) => s.amount > 0)
      .map(([id, s]) => ({ id, name: s.name, price: s.price }));

    if (availableItems.length === 0) {
      return { name, tier: tier.tier, budget: tier.maxBudget, patience: tier.patience, wantItem: null };
    }

    const wantItem = availableItems[Math.floor(Math.random() * availableItems.length)];

    return {
      name,
      tier: tier.tier,
      budget: tier.maxBudget,
      patience: tier.patience,
      wantItem: wantItem.id,
      wantItemName: wantItem.name,
      offerPrice: Math.floor(wantItem.price * (0.5 + Math.random() * 0.5)),
    };
  }

  _autoSell(trader, warehouse, logFn) {
    for (const customer of this.dailyCustomers) {
      if (!customer.wantItem) continue;

      const stock = this.shopStock[customer.wantItem];
      if (!stock || stock.amount <= 0) continue;

      const price = this.pricing[customer.wantItem] || stock.price;

      // 顾客决定是否购买
      if (price <= customer.budget) {
        // 成功销售
        stock.amount -= 1;
        customer.wantItem = null; // 已购买

        // 加钱到仓库
        warehouse.addItem('currency', 'silver', '银两', price);

        // 声望提升
        this.reputation = Math.min(100, this.reputation + 1);

        this.salesHistory.push({
          itemId: customer.wantItem,
          price,
          day: Date.now(),
        });

        logFn(`💰${trader.name}卖出了${customer.wantItemName}，获得${price}银两`);
      }
    }
  }

  _resolveHaggle(customer, offerPrice) {
    const stock = this.shopStock[customer.wantItem];
    if (!stock || stock.amount <= 0) {
      return { success: false, message: '该商品已售罄' };
    }

    const listPrice = this.pricing[customer.wantItem] || stock.price;

    // 顾客心理价位
    const maxAccept = Math.floor(listPrice * (0.6 + Math.random() * 0.3));

    if (offerPrice <= customer.budget && offerPrice >= maxAccept) {
      // 议价成功
      stock.amount -= 1;
      this.reputation = Math.min(100, this.reputation + 2);

      return {
        success: true,
        sold: true,
        price: offerPrice,
        message: `${customer.name}同意以${offerPrice}银两购买`,
      };
    } else if (offerPrice > customer.budget) {
      return { success: false, sold: false, message: `${customer.name}出不起这个价` };
    } else {
      customer.patience -= 1;
      if (customer.patience <= 0) {
        return { success: false, sold: false, message: `${customer.name}不耐烦地走了` };
      }
      return { success: false, sold: false, message: `${customer.name}觉得太贵了，再想想` };
    }
  }

  // ====== 存档 ======

  toJSON() {
    return {
      reputation: this.reputation,
      shopStock: { ...this.shopStock },
      pricing: { ...this.pricing },
      salesHistory: this.salesHistory.slice(-100),
    };
  }

  static fromJSON(data) {
    const sys = new SalesSystem();
    if (data) {
      sys.reputation = data.reputation || 50;
      sys.shopStock = data.shopStock || {};
      sys.pricing = data.pricing || {};
      sys.salesHistory = data.salesHistory || [];
    }
    return sys;
  }
}
