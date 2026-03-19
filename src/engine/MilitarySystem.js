export class MilitarySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.unitTypes = {
      militia: { name: '民兵', cost: 20, power: 1, upkeep: 1, speed: 2 },
      infantry: { name: '步兵', cost: 50, power: 3, upkeep: 3, speed: 1 },
      cavalry: { name: '骑兵', cost: 80, power: 4, upkeep: 5, speed: 3 },
      artillery: { name: '炮兵', cost: 120, power: 6, upkeep: 7, speed: 1 }
    };
  }

  recruitUnit(unitType, count) {
    const unitDef = this.unitTypes[unitType];
    if (!unitDef) return false;

    const totalCost = unitDef.cost * count;
    if (this.gameState.gold < totalCost) {
      this.gameState.addLog(`金币不足! 需要${totalCost}，拥有${this.gameState.gold}`);
      return false;
    }

    this.gameState.gold -= totalCost;
    this.gameState.military[unitType] = (this.gameState.military[unitType] || 0) + count;
    this.gameState.militaryPower = this.getTotalMilitaryPower();
    this.gameState.addLog(`招募了${count}个${unitDef.name}`);
    return true;
  }

  getTotalMilitaryPower() {
    let power = 0;
    for (const [unitType, count] of Object.entries(this.gameState.military)) {
      const unitDef = this.unitTypes[unitType];
      if (unitDef) {
        power += unitDef.power * count;
      }
    }
    return power;
  }

  getTotalMilitaryUpkeep() {
    let upkeep = 0;
    for (const [unitType, count] of Object.entries(this.gameState.military)) {
      const unitDef = this.unitTypes[unitType];
      if (unitDef) {
        upkeep += unitDef.upkeep * count;
      }
    }
    return upkeep;
  }

  resolveSimpleCombat(enemyPower) {
    const ourPower = this.getTotalMilitaryPower();
    const ourDefense = this.gameState.militaryDefense;
    const enemyDefense = 10; // AI base defense

    // Combat resolution
    const ourDamage = Math.floor(ourPower * (1 + ourDefense / 100) * (Math.random() * 0.5 + 0.75));
    const enemyDamage = Math.floor(enemyPower * (1 + enemyDefense / 100) * (Math.random() * 0.5 + 0.75));

    const ourLosses = Math.floor(enemyDamage / 3);
    const enemyLosses = Math.floor(ourDamage / 3);

    // Apply losses
    this.applyLosses(ourLosses);

    const result = {
      ourDamage,
      enemyDamage,
      ourLosses,
      enemyLosses,
      victory: ourDamage > enemyDamage,
      ourStrength: ourPower,
      enemyStrength: enemyPower
    };

    return result;
  }

  applyLosses(count) {
    let remaining = count;

    // Lose from cheapest units first (militia)
    for (const unitType of ['militia', 'infantry', 'cavalry', 'artillery']) {
      if (remaining <= 0) break;
      const losses = Math.min(remaining, this.gameState.military[unitType] || 0);
      this.gameState.military[unitType] -= losses;
      remaining -= losses;
    }

    this.gameState.militaryPower = this.getTotalMilitaryPower();
  }

  declareWar(nationId) {
    if (this.gameState.atWar[nationId]) {
      this.gameState.addLog('已经在战争中!');
      return false;
    }

    this.gameState.atWar[nationId] = true;
    this.gameState.relations[nationId] -= 50;
    this.gameState.addLog(`宣布对${nationId}开战!`);
    return true;
  }

  offerPeace(nationId) {
    if (!this.gameState.atWar[nationId]) {
      this.gameState.addLog('双方没有在战争中!');
      return false;
    }

    this.gameState.atWar[nationId] = false;
    this.gameState.relations[nationId] += 10;
    this.gameState.addLog(`与${nationId}缔结和平协议`);
    return true;
  }

  getMilitaryData() {
    return {
      totalPower: this.getTotalMilitaryPower(),
      totalUpkeep: this.getTotalMilitaryUpkeep(),
      unitComposition: this.gameState.military,
      unitDetails: Object.entries(this.gameState.military).map(([type, count]) => ({
        type,
        name: this.unitTypes[type]?.name || type,
        count,
        power: (this.unitTypes[type]?.power || 0) * count,
        upkeep: (this.unitTypes[type]?.upkeep || 0) * count
      })),
      defense: this.gameState.militaryDefense,
      wars: Object.entries(this.gameState.atWar)
        .filter(([_, isAtWar]) => isAtWar)
        .map(([nationId]) => nationId)
    };
  }
}
