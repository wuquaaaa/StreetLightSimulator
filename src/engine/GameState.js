import { technologies } from '../data/technologies';
import { buildings } from '../data/buildings';
import { aiNations } from '../data/nations';
import { eventDefinitions } from '../data/events';

export class GameState {
  constructor() {
    this.turn = 1;
    this.year = 1000;

    // Resources
    this.gold = 500;
    this.food = 300;
    this.production = 100;
    this.science = 50;
    this.culture = 50;
    this.manpower = 100;

    // Population by class
    this.population = {
      total: 200,
      nobles: 20,
      merchants: 40,
      peasants: 100,
      workers: 30,
      soldiers: 10
    };

    // Buildings
    this.buildings = {
      farm: 2,
      market: 1,
      barracks: 1
    };

    // Military
    this.military = {
      militia: 10,
      infantry: 5,
      cavalry: 0,
      artillery: 0
    };
    this.militaryPower = 30;
    this.militaryDefense = 10;

    // Tech and research
    this.researchedTechs = ['agriculture', 'bronze_working'];
    this.currentResearch = null;
    this.researchProgress = 0;

    // Happiness and stability
    this.happiness = 70;
    this.stability = 80;
    this.unrest = 0;

    // Diplomacy
    this.relations = {};
    aiNations.forEach(nation => {
      this.relations[nation.id] = nation.baseRelation;
    });
    this.treaties = {};
    this.atWar = {};

    // Economy
    this.taxRate = 0.3; // 30%
    this.tradeValue = 0;
    this.goldIncome = 0;
    this.foodProduction = 0;
    this.scienceOutput = 0;
    this.cultureOutput = 0;

    // Game log
    this.log = ['游戏开始'];

    // Events
    this.currentEvent = null;
    this.eventHistory = [];

    // Building queue
    this.buildingQueue = [];
  }

  nextTurn() {
    this.turn++;
    this.year = Math.floor(1000 + (this.turn - 1) * 0.5);

    // Calculate production
    this.calculateIncomeExpenses();

    // Apply effects
    this.applyPopulationGrowth();
    this.applyHappinessEffects();
    this.applyResearch();
    this.processBuildingQueue();

    // AI decisions
    this.processAIDiplomacy();

    // Chance of random event
    if (Math.random() < 0.4) {
      this.triggerRandomEvent();
    }

    this.addLog(`第${this.turn}回合结束 (${this.year}年)`);
  }

  calculateIncomeExpenses() {
    // Reset income
    this.goldIncome = 0;
    this.foodProduction = 0;
    this.scienceOutput = 0;
    this.cultureOutput = 0;

    // Building effects
    for (const [buildingId, count] of Object.entries(this.buildings)) {
      const buildingDef = buildings.find(b => b.id === buildingId);
      if (buildingDef) {
        for (let i = 0; i < count; i++) {
          if (buildingDef.effects.foodProduction) {
            this.foodProduction += buildingDef.effects.foodProduction;
          }
          if (buildingDef.effects.production) {
            this.production += buildingDef.effects.production;
          }
          if (buildingDef.effects.goldIncome) {
            this.goldIncome += buildingDef.effects.goldIncome;
          }
          if (buildingDef.effects.science) {
            this.scienceOutput += buildingDef.effects.science;
          }
          if (buildingDef.effects.culture) {
            this.cultureOutput += buildingDef.effects.culture;
          }
        }
      }
    }

    // Population modifiers
    const merchantBonus = this.population.merchants / 10;
    this.goldIncome *= (1 + merchantBonus * 0.1);

    const scholarBonus = this.population.workers / 20;
    this.scienceOutput *= (1 + scholarBonus * 0.1);

    // Tax income (increases with happiness)
    const baseTaxIncome = this.population.total * this.taxRate * 2;
    const happinessMod = this.happiness / 100;
    this.goldIncome += baseTaxIncome * happinessMod;

    // Food production
    this.foodProduction += this.population.peasants * 0.5;

    // Apply modifiers and add to resources
    this.gold += Math.floor(this.goldIncome);
    this.food += Math.floor(this.foodProduction);
    this.science += Math.floor(this.scienceOutput);
    this.culture += Math.floor(this.cultureOutput);

    // Expenses
    // Military upkeep
    const militaryUpkeep = this.militaryPower * 2;
    this.gold -= militaryUpkeep;

    // Building upkeep
    let buildingUpkeep = 0;
    for (const [buildingId, count] of Object.entries(this.buildings)) {
      const buildingDef = buildings.find(b => b.id === buildingId);
      if (buildingDef) {
        buildingUpkeep += buildingDef.upkeep * count;
      }
    }
    this.gold -= buildingUpkeep;

    // Population maintenance (food)
    const foodConsumption = this.population.total * 0.5;
    this.food -= foodConsumption;

    // Happiness impact from taxes
    this.happiness -= this.taxRate * 20;

    // Ensure resources don't go negative
    if (this.food < 0) {
      this.unrest += Math.abs(this.food) / 10;
      this.happiness -= 10;
      this.food = 0;
    }

    if (this.gold < 0) {
      this.stability -= 5;
      this.gold = Math.max(0, this.gold);
    }

    // Clamp happiness
    this.happiness = Math.max(0, Math.min(100, this.happiness));
  }

  applyPopulationGrowth() {
    const foodSurplus = this.food - this.population.total * 0.5;
    if (foodSurplus > 50) {
      const growthRate = Math.min(foodSurplus / 100 * 0.1, 0.05);
      const newPopulation = Math.floor(this.population.total * (1 + growthRate));
      const growth = newPopulation - this.population.total;

      // Distribute among classes
      if (growth > 0) {
        this.population.peasants += Math.floor(growth * 0.6);
        this.population.workers += Math.floor(growth * 0.25);
        this.population.merchants += Math.floor(growth * 0.15);
        this.population.total += growth;
      }
    } else if (foodSurplus < -50) {
      const loss = Math.floor(this.population.total * 0.05);
      this.population.total -= loss;
      this.population.peasants -= Math.floor(loss * 0.6);
      this.happiness -= 20;
    }
  }

  applyHappinessEffects() {
    // Happiness changes based on factors
    if (this.stability < 40) {
      this.happiness -= 5;
    }

    if (this.culture > 200) {
      this.happiness += 5;
    }

    // Unrest reduces happiness
    this.happiness -= this.unrest / 10;
    this.unrest *= 0.9; // Decay unrest

    this.happiness = Math.max(0, Math.min(100, this.happiness));

    // Rebellion chance if very unhappy
    if (this.happiness < 20 && Math.random() < 0.3) {
      this.unrest += 20;
      this.addLog('民众发生了不安!');
    }
  }

  applyResearch() {
    if (this.currentResearch) {
      const tech = technologies.find(t => t.id === this.currentResearch);
      if (tech) {
        this.researchProgress += this.science / 20;

        if (this.researchProgress >= tech.cost) {
          this.completeResearch();
        }
      }
    }
  }

  completeResearch() {
    const tech = technologies.find(t => t.id === this.currentResearch);
    if (tech) {
      this.researchedTechs.push(tech.id);
      this.addLog(`研究完成: ${tech.name}`);

      // Apply tech effects
      for (const [key, value] of Object.entries(tech.effects)) {
        if (key in this) {
          this[key] += value;
        }
      }

      this.currentResearch = null;
      this.researchProgress = 0;
    }
  }

  startResearch(techId) {
    const tech = technologies.find(t => t.id === techId);
    if (!tech) return false;

    // Check prerequisites
    const hasPrereqs = tech.requires.every(req => this.researchedTechs.includes(req));
    if (!hasPrereqs) {
      this.addLog('缺少前置科技!');
      return false;
    }

    this.currentResearch = techId;
    this.researchProgress = 0;
    this.addLog(`开始研究: ${tech.name}`);
    return true;
  }

  processBuildingQueue() {
    if (this.buildingQueue.length > 0) {
      const building = this.buildingQueue[0];
      building.progress += this.production;

      if (building.progress >= building.cost) {
        this.buildings[building.id] = (this.buildings[building.id] || 0) + 1;
        this.buildingQueue.shift();

        const buildingDef = buildings.find(b => b.id === building.id);
        this.addLog(`建筑完成: ${buildingDef.name}`);
      }
    }
  }

  buildBuilding(buildingId) {
    const buildingDef = buildings.find(b => b.id === buildingId);
    if (!buildingDef) return false;

    // Check tech requirement
    if (buildingDef.requires) {
      const hasTech = buildingDef.requires.every(req => this.researchedTechs.includes(req));
      if (!hasTech) {
        this.addLog('缺少技术!');
        return false;
      }
    }

    this.buildingQueue.push({
      id: buildingId,
      cost: buildingDef.cost,
      progress: 0
    });

    this.addLog(`开始建造: ${buildingDef.name}`);
    return true;
  }

  processAIDiplomacy() {
    for (const nation of aiNations) {
      const relation = this.relations[nation.id];

      // Relations can drift
      const drift = (Math.random() - 0.5) * 5;
      this.relations[nation.id] = Math.max(-100, Math.min(100, relation + drift));

      // AI might declare war if relations are very bad
      if (relation < -50 && !this.atWar[nation.id] && Math.random() < 0.1) {
        this.atWar[nation.id] = true;
        this.addLog(`${nation.name}宣布对我们开战!`);
      }

      // Might offer peace if relations improve
      if (relation > 50 && this.atWar[nation.id] && Math.random() < 0.1) {
        this.atWar[nation.id] = false;
        this.addLog(`${nation.name}提议和平协议。`);
      }
    }
  }

  triggerRandomEvent() {
    const validEvents = eventDefinitions.filter(e => e.condition(this));

    if (validEvents.length === 0) return;

    this.currentEvent = validEvents[Math.floor(Math.random() * validEvents.length)];
  }

  resolveEvent(choiceIndex) {
    if (!this.currentEvent) return;

    const choice = this.currentEvent.choices[choiceIndex];
    if (!choice) return;

    // Apply effects
    for (const [key, value] of Object.entries(choice.effects)) {
      if (key in this) {
        this[key] += value;
      }
    }

    this.eventHistory.push(this.currentEvent);
    this.addLog(`事件: ${this.currentEvent.name} - ${choice.text}`);
    this.currentEvent = null;
  }

  changeRelation(nationId, amount) {
    if (nationId in this.relations) {
      this.relations[nationId] = Math.max(-100, Math.min(100, this.relations[nationId] + amount));
    }
  }

  declareTreaty(nationId, type) {
    this.treaties[nationId] = type;
    const nation = aiNations.find(n => n.id === nationId);
    this.addLog(`与${nation.name}缔结${type === 'alliance' ? '联盟' : '贸易协议'}`);
  }

  addLog(message) {
    this.log.push(message);
    if (this.log.length > 50) {
      this.log.shift();
    }
  }

  getAvailableTechs() {
    return technologies.filter(tech => {
      const notResearched = !this.researchedTechs.includes(tech.id);
      const hasPrereqs = tech.requires.length === 0 || tech.requires.every(req => this.researchedTechs.includes(req));
      return notResearched && hasPrereqs;
    });
  }

  getAvailableBuildings() {
    return buildings.filter(building => {
      if (!building.requires || building.requires.length === 0) return true;
      return building.requires.every(req => this.researchedTechs.includes(req));
    });
  }

  getTotalMilitaryPower() {
    return (
      this.military.militia * 1 +
      this.military.infantry * 3 +
      this.military.cavalry * 4 +
      this.military.artillery * 5
    );
  }
}
