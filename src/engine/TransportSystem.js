/**
 * 运输系统 - 路灯计划
 *
 * 物资流转：
 * - 矿场→仓库：矿工开采的矿石
 * - 仓库→店铺：待售商品
 * - 仓库→丹房：草药原料
 * - 后山→仓库：木材/石材
 *
 * 运工自动选择最需要的路线运输
 * 运输有距离/风险/负重限制
 */

export const TRANSPORT_ROUTES = {
  mine_to_warehouse: {
    id: 'mine_to_warehouse',
    name: '矿场→仓库',
    icon: '\u26CF\uFE0F\u2192\uD83D\uDCE6',
    distance: 1,
    risk: 0.05,
    maxLoad: 20,
    unlockBuilding: 'mine',
  },
  warehouse_to_shop: {
    id: 'warehouse_to_shop',
    name: '仓库→店铺',
    icon: '\uD83D\uDCE6\u2192\uD83C\uDFEA',
    distance: 1,
    risk: 0.03,
    maxLoad: 15,
    unlockBuilding: 'shop',
  },
  warehouse_to_alchemy: {
    id: 'warehouse_to_alchemy',
    name: '仓库→丹房',
    icon: '\uD83D\uDCE6\u2192\u2697\uFE0F',
    distance: 1,
    risk: 0.02,
    maxLoad: 10,
    unlockBuilding: 'alchemy_room',
  },
  mountain_to_warehouse: {
    id: 'mountain_to_warehouse',
    name: '后山→仓库',
    icon: '\u26F0\uFE0F\u2192\uD83D\uDCE6',
    distance: 2,
    risk: 0.08,
    maxLoad: 12,
    unlockBuilding: 'mountain_trail',
  },
};

// 各路线可运输的物品类型
const ROUTE_CARGO = {
  mine_to_warehouse: ['mineral'],
  warehouse_to_shop: ['food', 'herb', 'mineral'],
  warehouse_to_alchemy: ['herb'],
  mountain_to_warehouse: ['material'],
};

export class TransportSystem {
  constructor() {
    this.activeTrips = {};
  }

  startTrip(routeId, character, cargo, amount) {
    const route = TRANSPORT_ROUTES[routeId];
    if (!route) return { success: false, message: '未知路线' };
    if (amount > route.maxLoad) {
      return { success: false, message: `超出最大负重（${route.maxLoad}）` };
    }

    const key = character.id;
    this.activeTrips[key] = {
      routeId,
      progress: 0,
      total: route.distance,
      load: amount,
      cargo,
    };

    return { success: true, message: `开始运输${amount}单位${cargo}` };
  }

  tick(isNewDay, allCharacters, warehouse, logFn, salesSystem) {
    // 推进运输进度
    for (const [npcId, trip] of Object.entries(this.activeTrips)) {
      const character = allCharacters.find(c => c.id === npcId);
      if (!character || character.isRetired) {
        delete this.activeTrips[npcId];
        continue;
      }

      const efficiency = this._getTransportEfficiency(character, trip);
      trip.progress += efficiency;

      if (trip.progress >= trip.total) {
        this._completeTrip(trip, character, warehouse, logFn, salesSystem);
        delete this.activeTrips[npcId];

        if (typeof character.gainKnowledge === 'function') {
          character.gainKnowledge('farming', 1);
        }
      }
    }

    if (!isNewDay) return;

    // 运工自动运输
    const porters = allCharacters.filter(c => !c.isRetired && c.hasPost('porter'));
    for (const porter of porters) {
      if (this.activeTrips[porter.id]) continue;
      this._autoTransport(porter, warehouse, logFn);
    }
  }

  _completeTrip(trip, character, warehouse, logFn, salesSystem) {
    const route = TRANSPORT_ROUTES[trip.routeId];
    if (!route) return;

    // 事故检查
    if (Math.random() < route.risk) {
      const lostAmount = Math.floor(trip.load * (0.1 + Math.random() * 0.3));
      trip.load -= lostAmount;
      if (lostAmount > 0) {
        logFn(`\u26A0\uFE0F${character.name}运输途中遭遇意外，损失了${lostAmount}单位${trip.cargo}`);
        character.changeMood(-5);
      }
    }

    if (trip.load <= 0) {
      logFn(`\uD83D\uDCE6${character.name}的货物全部损失了！`);
      return;
    }

    // 物资流向
    if (trip.routeId === 'mine_to_warehouse') {
      warehouse.addItem('mineral', trip.cargo, trip.cargo, trip.load);
      logFn(`\uD83D\uDCE6${character.name}将${trip.load}单位${trip.cargo}运到仓库`);
    } else if (trip.routeId === 'warehouse_to_shop') {
      // 运到店铺（由SalesSystem的autoStock处理）
      if (salesSystem) {
        salesSystem.stockItem(trip.cargo, trip.cargo, trip.load, salesSystem.pricing[trip.cargo] || 1);
      }
      logFn(`\uD83D\uDCE6${character.name}将${trip.load}单位${trip.cargo}运到店铺`);
    } else if (trip.routeId === 'warehouse_to_alchemy') {
      // 运到丹房（丹房使用时从仓库取）
      logFn(`\uD83D\uDCE6${character.name}将${trip.load}单位${trip.cargo}运到丹房`);
    } else if (trip.routeId === 'mountain_to_warehouse') {
      warehouse.addItem('material', trip.cargo, trip.cargo, trip.load);
      logFn(`\uD83D\uDCE6${character.name}从后山运回${trip.load}单位${trip.cargo}`);
    } else {
      warehouse.addItem('mineral', trip.cargo, trip.cargo, trip.load);
    }
  }

  _getTransportEfficiency(character, trip) {
    let eff = 0.5;
    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.5 + (constitution / 100) * 1.0;

    const route = TRANSPORT_ROUTES[trip.routeId];
    if (route) {
      const loadRatio = trip.load / route.maxLoad;
      eff *= 1.0 - loadRatio * 0.3;
    }

    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
      if (trait.effects?.constitutionBonus) eff *= (1 + trait.effects.constitutionBonus / 100);
    }

    return Math.max(0.2, Math.min(2.0, eff));
  }

  /** 获取已解锁的路线 */
  getUnlockedRoutes(buildings) {
    return Object.values(TRANSPORT_ROUTES).filter(r => {
      if (!r.unlockBuilding) return true;
      return buildings.includes(r.unlockBuilding);
    });
  }

  /** 自动选择最需要的运输任务 */
  _autoTransport(porter, warehouse, logFn) {
    // 优先级：矿场→仓库 > 后山→仓库 > 仓库→店铺
    const routes = [
      { routeId: 'mine_to_warehouse', check: () => {
        // 矿场有矿石需要运
        const ironOre = warehouse.getItemAmount('mineral', 'iron_ore_inferior')
          + warehouse.getItemAmount('mineral', 'iron_ore_standard')
          + warehouse.getItemAmount('mineral', 'iron_ore_premium')
          + warehouse.getItemAmount('mineral', 'iron_ore_supreme');
        return ironOre > 3 ? { cargo: 'iron_ore', amount: Math.min(ironOre, 15) } : null;
      }},
      { routeId: 'mountain_to_warehouse', check: () => {
        const lumber = warehouse.getItemAmount('material', 'lumber');
        const stone = warehouse.getItemAmount('material', 'stone');
        if (lumber > 3) return { cargo: 'lumber', amount: Math.min(lumber, 10) };
        if (stone > 3) return { cargo: 'stone', amount: Math.min(stone, 10) };
        return null;
      }},
    ];

    for (const { routeId, check } of routes) {
      const task = check();
      if (task) {
        this.startTrip(routeId, porter, task.cargo, task.amount);
        return;
      }
    }
  }

  toJSON() {
    return { activeTrips: { ...this.activeTrips } };
  }

  static fromJSON(data) {
    const sys = new TransportSystem();
    if (data) {
      sys.activeTrips = data.activeTrips || {};
    }
    return sys;
  }
}
