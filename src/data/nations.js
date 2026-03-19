export const aiNations = [
  {
    id: 'empire_north',
    name: '北方帝国',
    personality: 'aggressive',
    color: '#ef4444',
    baseRelation: 0,
    traits: {
      militaryGrowth: 1.3,
      tradeAversion: 0.7,
      warTendency: 0.8,
      trustLevel: 0.3
    }
  },
  {
    id: 'merchant_republic',
    name: '商业共和国',
    personality: 'mercantile',
    color: '#f59e0b',
    baseRelation: 10,
    traits: {
      militaryGrowth: 0.8,
      tradeAversion: 0.2,
      warTendency: 0.2,
      trustLevel: 0.6,
      tradeBonus: 1.5
    }
  },
  {
    id: 'kingdom_east',
    name: '东方王国',
    personality: 'balanced',
    color: '#06b6d4',
    baseRelation: 5,
    traits: {
      militaryGrowth: 1.0,
      tradeAversion: 0.5,
      warTendency: 0.5,
      trustLevel: 0.5
    }
  },
  {
    id: 'federation_south',
    name: '南方联邦',
    personality: 'peaceful',
    color: '#10b981',
    baseRelation: 20,
    traits: {
      militaryGrowth: 0.7,
      tradeAversion: 0.3,
      warTendency: 0.2,
      trustLevel: 0.8,
      culturalBonus: 1.3
    }
  }
];
