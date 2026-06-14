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
    this.reputation = 50;
    this.dailyCustomers = [];
    this.salesHistory = [];
    this.shopStock = {};
    this.pricing = {
      wheat: 1.0, corn: 1.5, turnip: 0.8,
      spirit_grass: 3.0, blood_lotus: 5.0, frost_flower: 4.0, sky_root: 10.0,
      moonvine: 15.0, firelotus: 20.0, voidmoss: 25.0, heavenfruit: 50.0, dragonblood_grass: 40.0,
      iron_ore: 1.5, copper_ore: 1.0, coal: 0.5,
      iron_ingot: 5.0, copper_ingot: 3.0, spirit_stone: 15.0,
      pill_heal: 8.0, pill_buff: 12.0, pill_fortune: 25.0,
    };
    // 竞品商店
    this.competitors = this._generateCompetitors();
    this.dailyStats = {};
  }

  _generateCompetitors() {
    return [
      { name: '老王杂货铺', priceMod: 1.0, stock: { wheat: 15, corn: 10, turnip: 8 } },
      { name: '张记药铺', priceMod: 0.9, stock: { pill_heal: 5, spirit_grass: 3 } },
      { name: '李氏铁器', priceMod: 1.1, stock: { iron_ore: 10, iron_ingot: 3 } },
    ];
  }

  /** 获取竞品价格 */
  getCompetitorPrices(itemId) {
    return this.competitors
      .filter(c => c.stock[itemId] > 0)
      .map(c => ({
        name: c.name,
        price: Math.round((this.pricing[itemId] || 1) * c.priceMod * 100) / 100,
        stock: c.stock[itemId],
      }));
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

  tick(isNewDay, allCharacters, warehouse, logFn, financeSystem) {
    if (!isNewDay) return;

    this._generateCustomers();

    const traders = allCharacters.filter(c => !c.isRetired && c.hasPost('trader'));

    // 贩子自动从仓库上架可售商品
    if (traders.length > 0) {
      this._autoStock(warehouse, logFn);
    }

    // 贩子自动销售
    for (const trader of traders) {
      this._autoSell(trader, warehouse, logFn, financeSystem);
    }

    // 声望每日衰减
    this.reputation = Math.max(0, this.reputation - 0.5);
  }

  // ====== 内部方法 ======

  /** 贩子自动从仓库上架可售商品 */
  _autoStock(warehouse, logFn) {
    // 可售商品列表：category → itemId
    const sellableItems = [
      { cat: 'food', itemId: 'wheat', name: '小麦' },
      { cat: 'food', itemId: 'corn', name: '玉米' },
      { cat: 'food', itemId: 'turnip', name: '萝卜' },
      { cat: 'herb', itemId: 'spirit_grass', name: '灵草' },
      { cat: 'mineral', itemId: 'iron_ore', name: '铁矿石' },
      { cat: 'mineral', itemId: 'iron_ingot', name: '铁锭' },
      { cat: 'herb', itemId: 'pill_heal', name: '治愈丹' },
      { cat: 'herb', itemId: 'pill_buff', name: '增益丹' },
    ];

    for (const item of sellableItems) {
      const warehouseAmt = warehouse.getItemAmount(item.cat, item.itemId);
      const shopAmt = this.shopStock[item.itemId]?.amount || 0;
      // 仓库有货且店铺不超过20单位时上架
      if (warehouseAmt > 0 && shopAmt < 20) {
        const toStock = Math.min(warehouseAmt, 5); // 每次上架最多5单位
        warehouse.removeItem(item.cat, item.itemId, toStock);
        this.stockItem(item.itemId, item.name, toStock, this.pricing[item.itemId] || 1);
      }
    }
  }

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

  _autoSell(trader, warehouse, logFn, financeSystem) {
    for (const customer of this.dailyCustomers) {
      if (!customer.wantItem) continue;

      const stock = this.shopStock[customer.wantItem];
      if (!stock || stock.amount <= 0) continue;

      const price = this.pricing[customer.wantItem] || stock.price;

      // 竞品影响：如果有更便宜的竞品，顾客可能不买
      const competitors = this.getCompetitorPrices(customer.wantItem);
      if (competitors.length > 0) {
        const cheapest = Math.min(...competitors.map(c => c.price));
        if (price > cheapest * 1.2) {
          // 我们的价格比最便宜的竞品贵20%以上，顾客去别家
          continue;
        }
      }

      if (price <= customer.budget) {
        stock.amount -= 1;
        customer.wantItem = null;

        if (financeSystem) {
          financeSystem.treasury += price;
        }

        this.reputation = Math.min(100, this.reputation + 1);

        this.salesHistory.push({
          itemId: customer.wantItem,
          price,
          day: Date.now(),
        });

        logFn(`${trader.name}卖出了${customer.wantItemName}，获得${price.toFixed(2)}两`);
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
