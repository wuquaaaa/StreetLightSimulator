export class PopulationSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  updatePopulation() {
    const totalPop = this.gameState.population;

    // Calculate happiness based on factors
    let happinessChange = 0;

    // Food surplus
    if (this.gameState.food > totalPop.total * 0.7) {
      happinessChange += 5;
    } else if (this.gameState.food < totalPop.total * 0.3) {
      happinessChange -= 15;
    }

    // Wealth
    if (this.gameState.gold > 1000) {
      happinessChange += 3;
    } else if (this.gameState.gold < 100) {
      happinessChange -= 10;
    }

    // Culture
    if (this.gameState.culture > 200) {
      happinessChange += 5;
    }

    // Military service (soldiers reduce happiness)
    if (totalPop.soldiers > totalPop.total * 0.1) {
      happinessChange -= 8;
    }

    // Apply happiness change
    this.gameState.happiness += happinessChange;
    this.gameState.happiness = Math.max(0, Math.min(100, this.gameState.happiness));

    // Social mobility based on merchants
    const merchantBonus = totalPop.merchants / totalPop.total;
    if (Math.random() < merchantBonus * 0.1) {
      // Peasants become merchants
      if (totalPop.peasants > 0) {
        totalPop.peasants--;
        totalPop.merchants++;
      }
    }

    // Population loss if unhappy
    if (this.gameState.happiness < 30) {
      const loss = Math.floor(totalPop.total * 0.02);
      totalPop.total -= loss;
      totalPop.peasants = Math.max(0, totalPop.peasants - loss);
    }
  }

  getClassBonuses() {
    const pop = this.gameState.population;

    return {
      nobles: {
        diplomacy: 1 + pop.nobles / 100,
        culture: pop.nobles * 0.1
      },
      merchants: {
        trade: 1 + pop.merchants / 50,
        gold: pop.merchants * 0.5
      },
      peasants: {
        food: pop.peasants * 0.5,
        population: pop.peasants * 0.01
      },
      workers: {
        production: pop.workers * 0.5,
        science: pop.workers * 0.2
      },
      soldiers: {
        military: pop.soldiers * 3,
        happiness: -(pop.soldiers * 0.1)
      }
    };
  }

  recruitSoldiers(count) {
    const cost = count * 50; // Gold cost per soldier
    if (this.gameState.gold < cost) {
      return false;
    }

    this.gameState.gold -= cost;
    this.gameState.population.soldiers += count;
    this.gameState.population.peasants = Math.max(0, this.gameState.population.peasants - count);
    this.gameState.militaryPower += count * 3;
    this.gameState.addLog(`招募了${count}名士兵`);
    return true;
  }

  disbandSoldiers(count) {
    const disbanded = Math.min(count, this.gameState.population.soldiers);
    this.gameState.population.soldiers -= disbanded;
    this.gameState.population.peasants += disbanded;
    this.gameState.militaryPower -= disbanded * 3;
    this.gameState.addLog(`解散了${disbanded}名士兵`);
    return disbanded;
  }

  promoteNobility(peasantCount) {
    const count = Math.min(peasantCount, this.gameState.population.peasants);
    if (count <= 0) return 0;

    this.gameState.population.peasants -= count;
    this.gameState.population.nobles += count;
    this.gameState.happiness += count / 10; // Makes them happy
    this.gameState.addLog(`晋升${count}名贵族`);
    return count;
  }

  getPopulationData() {
    const pop = this.gameState.population;
    return {
      total: pop.total,
      byClass: {
        nobles: pop.nobles,
        merchants: pop.merchants,
        peasants: pop.peasants,
        workers: pop.workers,
        soldiers: pop.soldiers
      },
      percentages: {
        nobles: (pop.nobles / pop.total * 100).toFixed(1),
        merchants: (pop.merchants / pop.total * 100).toFixed(1),
        peasants: (pop.peasants / pop.total * 100).toFixed(1),
        workers: (pop.workers / pop.total * 100).toFixed(1),
        soldiers: (pop.soldiers / pop.total * 100).toFixed(1)
      },
      happiness: this.gameState.happiness,
      stability: this.gameState.stability,
      unrest: this.gameState.unrest
    };
  }
}
