export class EconomySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.tradeRoutes = [];
    this.marketPrices = {
      gold: 100,
      food: 120,
      production: 110,
      science: 150,
      culture: 140
    };
  }

  updateTaxRate(newRate) {
    this.gameState.taxRate = Math.max(0, Math.min(1, newRate));
    // Higher tax reduces happiness but increases gold
    this.gameState.happiness -= (newRate - this.gameState.taxRate) * 30;
  }

  addTradeRoute(nationId, type) {
    const route = {
      nationId,
      type, // 'export' or 'import'
      value: 0,
      active: true
    };
    this.tradeRoutes.push(route);
    return route;
  }

  removeTradeRoute(index) {
    this.tradeRoutes.splice(index, 1);
  }

  calculateGDP() {
    let gdp = 0;

    // Direct resource production
    gdp += this.gameState.gold * this.marketPrices.gold / 100;
    gdp += this.gameState.food * this.marketPrices.food / 100;
    gdp += this.gameState.production * this.marketPrices.production / 100;

    // Population contribution
    gdp += this.gameState.population.total * 10;

    // Trade value
    gdp += this.gameState.tradeValue * 2;

    // Building contribution
    const buildingValue = Object.values(this.gameState.buildings).reduce((sum, count) => sum + count, 0) * 100;
    gdp += buildingValue;

    return Math.floor(gdp);
  }

  processTradeRoutes() {
    let totalTradeValue = 0;

    for (const route of this.tradeRoutes) {
      if (!route.active) continue;

      // Base trade value depends on route type and nation relations
      const relation = this.gameState.relations[route.nationId] || 0;
      const relationMod = 1 + relation / 200;

      let value = Math.floor(50 * relationMod);

      if (route.type === 'export') {
        // Export our surplus resources
        value += this.gameState.gold > 500 ? 20 : 0;
        this.gameState.gold -= Math.floor(value * 0.5);
      } else {
        // Import what we need
        value += this.gameState.food < 200 ? 30 : 0;
      }

      totalTradeValue += value;
    }

    this.gameState.tradeValue = totalTradeValue;
    return totalTradeValue;
  }

  fluctuateMarketPrices() {
    for (const resource in this.marketPrices) {
      // Random walk with reversion to mean (100)
      const change = (Math.random() - 0.5) * 10;
      const reversion = (100 - this.marketPrices[resource]) * 0.05;
      this.marketPrices[resource] += change + reversion;
      this.marketPrices[resource] = Math.max(50, Math.min(200, this.marketPrices[resource]));
    }
  }

  getEconomicData() {
    return {
      gdp: this.calculateGDP(),
      incomeBreakdown: {
        taxes: Math.floor(this.gameState.population.total * this.gameState.taxRate * 2),
        trade: this.gameState.tradeValue,
        buildings: Object.entries(this.gameState.buildings).reduce((sum, [buildingId, count]) => {
          const building = require('../data/buildings').buildings.find(b => b.id === buildingId);
          return sum + (building?.effects?.goldIncome || 0) * count;
        }, 0)
      },
      expenses: {
        military: this.gameState.militaryPower * 2,
        buildings: Object.entries(this.gameState.buildings).reduce((sum, [buildingId, count]) => {
          const building = require('../data/buildings').buildings.find(b => b.id === buildingId);
          return sum + (building?.upkeep || 0) * count;
        }, 0),
        population: this.gameState.population.total * 0.5
      },
      marketPrices: this.marketPrices,
      tradeRoutes: this.tradeRoutes.length
    };
  }
}
