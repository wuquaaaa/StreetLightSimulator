export const buildings = [
  {
    id: 'farm',
    name: '农场',
    category: '经济',
    cost: 50,
    upkeep: 2,
    effects: { foodProduction: 10, population: 5 },
    requires: ['agriculture'],
    description: '增加食物产量'
  },
  {
    id: 'mill',
    name: '磨坊',
    category: '经济',
    cost: 60,
    upkeep: 3,
    effects: { foodProduction: 15, production: 5 },
    requires: ['agriculture'],
    description: '改进食物处理，增加产量'
  },
  {
    id: 'mine',
    name: '矿山',
    category: '经济',
    cost: 75,
    upkeep: 4,
    effects: { production: 20, goldIncome: 10 },
    requires: ['bronze_working'],
    description: '开采矿物资源'
  },
  {
    id: 'market',
    name: '市场',
    category: '经济',
    cost: 100,
    upkeep: 3,
    effects: { goldIncome: 25, tradeValue: 15 },
    requires: ['currency'],
    description: '增加商业收入'
  },
  {
    id: 'bank',
    name: '银行',
    category: '经济',
    cost: 150,
    upkeep: 5,
    effects: { goldIncome: 50, loanCapacity: 200 },
    requires: ['banking'],
    description: '管理金融，增加收入'
  },
  {
    id: 'workshop',
    name: '工坊',
    category: '经济',
    cost: 80,
    upkeep: 4,
    effects: { production: 25, happiness: 5 },
    requires: ['masonry'],
    description: '增加生产效率'
  },
  {
    id: 'factory',
    name: '工厂',
    category: '经济',
    cost: 200,
    upkeep: 8,
    effects: { production: 50, pollution: 5 },
    requires: ['scientific_method'],
    description: '大幅提高生产能力'
  },

  {
    id: 'library',
    name: '图书馆',
    category: '科技',
    cost: 120,
    upkeep: 3,
    effects: { science: 25 },
    requires: ['writing'],
    description: '加速科技研究'
  },
  {
    id: 'university',
    name: '大学',
    category: '科技',
    cost: 200,
    upkeep: 6,
    effects: { science: 50, happiness: 10 },
    requires: ['education'],
    description: '高等教育机构，大幅提升科研'
  },
  {
    id: 'academy',
    name: '学院',
    category: '科技',
    cost: 250,
    upkeep: 8,
    effects: { science: 70, culture: 30 },
    requires: ['printing'],
    description: '艺术和科学学院'
  },

  {
    id: 'monument',
    name: '纪念碑',
    category: '文化',
    cost: 100,
    upkeep: 2,
    effects: { culture: 20, happiness: 10 },
    requires: [],
    description: '文明的象征，提升文化'
  },
  {
    id: 'temple',
    name: '寺庙',
    category: '文化',
    cost: 80,
    upkeep: 2,
    effects: { culture: 15, happiness: 15 },
    requires: ['philosophy'],
    description: '宗教建筑，增加民众满意度'
  },
  {
    id: 'theater',
    name: '剧院',
    category: '文化',
    cost: 150,
    upkeep: 4,
    effects: { culture: 40, happiness: 20 },
    requires: ['drama'],
    description: '文化娱乐场所'
  },
  {
    id: 'museum',
    name: '博物馆',
    category: '文化',
    cost: 200,
    upkeep: 5,
    effects: { culture: 60, happiness: 15 },
    requires: ['printing'],
    description: '保护文化遗产'
  },

  {
    id: 'barracks',
    name: '营房',
    category: '军事',
    cost: 100,
    upkeep: 3,
    effects: { militaryPower: 20, militaryUpkeep: 10 },
    requires: ['bronze_working'],
    description: '训练士兵'
  },
  {
    id: 'stable',
    name: '马厩',
    category: '军事',
    cost: 120,
    upkeep: 4,
    effects: { militaryPower: 30, movementSpeed: 2 },
    requires: ['horseback_riding'],
    description: '骑兵训练基地'
  },
  {
    id: 'fortress',
    name: '要塞',
    category: '军事',
    cost: 250,
    upkeep: 6,
    effects: { militaryDefense: 50, militaryPower: 30 },
    requires: ['feudalism'],
    description: '防御性军事设施'
  },
  {
    id: 'armory',
    name: '军械库',
    category: '军事',
    cost: 150,
    upkeep: 5,
    effects: { militaryPower: 40, militaryUpkeep: 20 },
    requires: ['iron_working'],
    description: '制造和储备武器'
  },
  {
    id: 'garrison',
    name: '驻防地',
    category: '军事',
    cost: 80,
    upkeep: 2,
    effects: { militaryDefense: 30, militaryPower: 15 },
    requires: [],
    description: '防守城市'
  },

  {
    id: 'granary',
    name: '仓库',
    category: '民生',
    cost: 70,
    upkeep: 2,
    effects: { foodStorage: 100, foodLoss: -10 },
    requires: [],
    description: '储存食物，减少损失'
  },
  {
    id: 'aqueduct',
    name: '渠道',
    category: '民生',
    cost: 200,
    upkeep: 4,
    effects: { population: 30, happiness: 10 },
    requires: ['masonry'],
    description: '供应饮用水，增加人口'
  },
  {
    id: 'housing',
    name: '住房',
    category: '民生',
    cost: 60,
    upkeep: 1,
    effects: { population: 15, happiness: 5 },
    requires: [],
    description: '容纳更多人口'
  },
  {
    id: 'orphanage',
    name: '孤儿院',
    category: '民生',
    cost: 90,
    upkeep: 3,
    effects: { happiness: 20, socialMobility: 10 },
    requires: ['philosophy'],
    description: '照顾孤儿，改善民众福利'
  }
];
