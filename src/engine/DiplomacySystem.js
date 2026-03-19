import { aiNations } from '../data/nations';

export class DiplomacySystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  getRelationStatus(value) {
    if (value >= 80) return '盟友';
    if (value >= 50) return '友好';
    if (value >= 20) return '中立';
    if (value >= -20) return '冷淡';
    if (value >= -50) return '敌对';
    return '宿敌';
  }

  proposeAlliance(nationId) {
    const nation = aiNations.find(n => n.id === nationId);
    if (!nation) return false;

    const relation = this.gameState.relations[nationId];
    const trustLevel = nation.traits.trustLevel;

    // Success chance based on relation and AI trust
    const successChance = Math.min(0.9, Math.max(0.1, (relation + 50) / 100) * trustLevel);

    if (Math.random() < successChance) {
      this.gameState.treaties[nationId] = 'alliance';
      this.gameState.relations[nationId] += 20;
      this.gameState.addLog(`${nation.name}同意结成联盟!`);
      return true;
    } else {
      this.gameState.relations[nationId] -= 10;
      this.gameState.addLog(`${nation.name}拒绝了我们的联盟提议。`);
      return false;
    }
  }

  proposeTradeAgreement(nationId) {
    const nation = aiNations.find(n => n.id === nationId);
    if (!nation) return false;

    const relation = this.gameState.relations[nationId];
    const successChance = Math.min(0.95, Math.max(0.3, (relation + 50) / 100));

    if (Math.random() < successChance) {
      this.gameState.treaties[nationId] = 'trade';
      this.gameState.relations[nationId] += 10;
      this.gameState.tradeValue += 50;
      this.gameState.addLog(`${nation.name}同意贸易协议!`);
      return true;
    } else {
      this.gameState.relations[nationId] -= 5;
      this.gameState.addLog(`${nation.name}拒绝了我们的贸易提议。`);
      return false;
    }
  }

  breakAlliance(nationId) {
    const nation = aiNations.find(n => n.id === nationId);
    if (!nation) return false;

    delete this.gameState.treaties[nationId];
    this.gameState.relations[nationId] -= 40;
    this.gameState.addLog(`我们打破了与${nation.name}的联盟!`);
    return true;
  }

  sendGiftDiplomacy(nationId, amount) {
    if (this.gameState.gold < amount) {
      this.gameState.addLog('金币不足!');
      return false;
    }

    const nation = aiNations.find(n => n.id === nationId);
    if (!nation) return false;

    this.gameState.gold -= amount;
    const relationGain = Math.floor(amount / 10);
    this.gameState.relations[nationId] += relationGain;
    this.gameState.addLog(`赠送${amount}金币给${nation.name}`);
    return true;
  }

  spy(nationId) {
    const nation = aiNations.find(n => n.id === nationId);
    if (!nation) return false;

    const cost = 100;
    if (this.gameState.gold < cost) return false;

    this.gameState.gold -= cost;
    const successChance = 0.6;

    if (Math.random() < successChance) {
      this.gameState.addLog(`成功地刺探了${nation.name}的信息`);
      return true;
    } else {
      this.gameState.relations[nationId] -= 30;
      this.gameState.addLog(`刺探${nation.name}失败! 他们发现了我们的间谍。`);
      return false;
    }
  }

  getNationInfo(nationId) {
    const nation = aiNations.find(n => n.id === nationId);
    if (!nation) return null;

    const relation = this.gameState.relations[nationId];
    const treaty = this.gameState.treaties[nationId];
    const atWar = this.gameState.atWar[nationId];

    return {
      id: nation.id,
      name: nation.name,
      personality: nation.personality,
      color: nation.color,
      relation: Math.round(relation),
      relationStatus: this.getRelationStatus(relation),
      treaty: treaty || 'none',
      atWar: atWar || false,
      traits: nation.traits
    };
  }

  getDiplomacyData() {
    const nations = aiNations.map(nation => this.getNationInfo(nation.id));
    return {
      nations,
      alliances: Object.entries(this.gameState.treaties)
        .filter(([_, type]) => type === 'alliance')
        .map(([nationId]) => aiNations.find(n => n.id === nationId)?.name || nationId),
      trades: Object.entries(this.gameState.treaties)
        .filter(([_, type]) => type === 'trade')
        .map(([nationId]) => aiNations.find(n => n.id === nationId)?.name || nationId),
      wars: Object.entries(this.gameState.atWar)
        .filter(([_, isAtWar]) => isAtWar)
        .map(([nationId]) => aiNations.find(n => n.id === nationId)?.name || nationId)
    };
  }
}
