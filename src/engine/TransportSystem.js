/**
 * 运输系统 - 路灯计划
 *
 * 核心机制：
 * - 运工搬运物资，在仓库/店铺/矿场之间运输
 * - 路线管理：不同路线距离/风险不同
 * - 负载管理：负重影响速度和体力消耗
 * - 事故风险：路途可能遇到强盗/货物损坏
 */

export const TRANSPORT_ROUTES = {
  mine_to_warehouse: {
    id: 'mine_to_warehouse',
    name: '矿场→仓库',
    icon: '⛏️→📦',
    distance: 1,          // 距离（影响耗时）
    risk: 0.05,           // 事故概率
    maxLoad: 20,          // 最大负重
  },
  warehouse_to_shop: {
    id: 'warehouse_to_shop',
    name: '仓库→店铺',
    icon: '📦→🏪',
    distance: 1,
    risk: 0.03,
    maxLoad: 15,
  },
  shop_to_warehouse: {
    id: 'shop_to_warehouse',
    name: '店铺→仓库',
    icon: '🏪→📦',
    distance: 1,
    risk: 0.03,
    maxLoad: 15,
  },
  warehouse_to_alchemy: {
    id: 'warehouse_to_alchemy',
    name: '仓库→丹房',
    icon: '📦→⚗️',
    distance: 1,
    risk: 0.02,
    maxLoad: 10,
  },
  mountain_trail: {
    id: 'mountain_trail',
    name: '后山小径',
    icon: '⛰️',
    distance: 2,
    risk: 0.1,
    maxLoad: 12,
  },
};

export class TransportSystem {
  constructor() {
    this.activeTrips = {};  // npcId → { routeId, progress, total, load, cargo }
    this.dailyStats = {};
  }

  // ====== 玩家操作 ======

  /** 开始运输任务 */
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

  // ====== Tick ======

  tick(isNewDay, allCharacters, warehouse, logFn) {
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
        // 运输完成
        this._completeTrip(trip, character, warehouse, logFn);
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

      // 自动选择最需要的运输任务
      this._autoTransport(porter, warehouse, logFn);
    }
  }

  // ====== 内部方法 ======

  _completeTrip(trip, character, warehouse, logFn) {
    const route = TRANSPORT_ROUTES[trip.routeId];
    if (!route) return;

    // 检查事故
    if (Math.random() < route.risk) {
      const lostAmount = Math.floor(trip.load * (0.1 + Math.random() * 0.3));
      trip.load -= lostAmount;
      if (lostAmount > 0) {
        logFn(`⚠️${character.name}运输途中遭遇意外，损失了${lostAmount}单位${trip.cargo}`);
        character.changeMood(-5);
      }
    }

    // 根据路线方向决定物资流向
    if (trip.routeId.includes('to_warehouse')) {
      warehouse.addItem('mineral', trip.cargo, trip.cargo, trip.load);
    } else if (trip.routeId.includes('to_shop')) {
      // 移到店铺（简化处理）
      logFn(`📦${character.name}运送了${trip.load}单位${trip.cargo}到店铺`);
    } else {
      warehouse.addItem('mineral', trip.cargo, trip.cargo, trip.load);
    }

    logFn(`📦${character.name}完成了${route.name}的运输任务`);
  }

  _getTransportEfficiency(character, trip) {
    let eff = 0.5;

    // 体质（体力活）
    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.5 + (constitution / 100) * 1.0;

    // 负重惩罚
    const route = TRANSPORT_ROUTES[trip.routeId];
    if (route) {
      const loadRatio = trip.load / route.maxLoad;
      eff *= 1.0 - loadRatio * 0.3; // 负重越大越慢
    }

    // 年龄
    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    // 特质
    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
      if (trait.effects?.constitutionBonus) eff *= (1 + trait.effects.constitutionBonus / 100);
    }

    return Math.max(0.2, Math.min(2.0, eff));
  }

  _autoTransport(porter, warehouse, logFn) {
    // 检查矿场是否有矿石需要运
    const ironOre = warehouse.getItemAmount('mineral', 'iron_ore');
    if (ironOre > 5) {
      this.startTrip('mine_to_warehouse', porter, 'iron_ore', Math.min(ironOre, 15));
      return;
    }

    // 检查仓库是否有草药需要运到丹房
    const herbs = warehouse.getItemAmount('herb', 'herb_root')
      + warehouse.getItemAmount('herb', 'herb_leaf')
      + warehouse.getItemAmount('herb', 'herb_flower');
    if (herbs > 3) {
      this.startTrip('warehouse_to_alchemy', porter, 'herbs', Math.min(herbs, 8));
      return;
    }
  }

  // ====== 存档 ======

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
