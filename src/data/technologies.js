export const technologies = [
  // 古代
  {
    id: 'bronze_working',
    name: '青铜冶炼',
    era: 'ancient',
    cost: 50,
    requires: [],
    effects: { militaryPower: 10, production: 5 },
    description: '学会冶炼青铜，提高生产和军事力量'
  },
  {
    id: 'agriculture',
    name: '农业',
    era: 'ancient',
    cost: 40,
    requires: [],
    effects: { foodProduction: 20, population: 10 },
    description: '发展农业技术，增加食物产量'
  },
  {
    id: 'writing',
    name: '文字',
    era: 'ancient',
    cost: 60,
    requires: [],
    effects: { science: 15, culture: 10 },
    description: '发明文字，加快科学和文化进步'
  },
  {
    id: 'mathematics',
    name: '数学',
    era: 'ancient',
    cost: 70,
    requires: ['writing'],
    effects: { science: 25, production: 10 },
    description: '发展数学科学，大幅提高研究速度'
  },
  {
    id: 'masonry',
    name: '砌体',
    era: 'ancient',
    cost: 55,
    requires: [],
    effects: { production: 15, happiness: 5 },
    description: '学会石头建筑，改进城市建设'
  },

  // 古典
  {
    id: 'iron_working',
    name: '铁器冶炼',
    era: 'classical',
    cost: 90,
    requires: ['bronze_working'],
    effects: { militaryPower: 25, production: 20 },
    description: '掌握铁器技术，大幅提升武装力量'
  },
  {
    id: 'philosophy',
    name: '哲学',
    era: 'classical',
    cost: 85,
    requires: ['writing'],
    effects: { science: 30, culture: 25, happiness: 10 },
    description: '发展哲学思想，提高文化和民众满意度'
  },
  {
    id: 'horseback_riding',
    name: '骑术',
    era: 'classical',
    cost: 80,
    requires: [],
    effects: { militaryPower: 20, movementSpeed: 1 },
    description: '掌握骑术，提升军队机动力'
  },
  {
    id: 'currency',
    name: '货币',
    era: 'classical',
    cost: 100,
    requires: ['mathematics'],
    effects: { goldIncome: 30, tradeValue: 25 },
    description: '创造货币制度，大幅提高贸易收入'
  },
  {
    id: 'drama',
    name: '戏剧',
    era: 'classical',
    cost: 75,
    requires: ['writing'],
    effects: { culture: 35, happiness: 15 },
    description: '发展戏剧艺术，显著提升文化'
  },

  // 中世纪
  {
    id: 'feudalism',
    name: '封建制',
    era: 'medieval',
    cost: 120,
    requires: ['iron_working'],
    effects: { militaryPower: 35, stability: 20 },
    description: '建立封建体制，强化统治和军事'
  },
  {
    id: 'education',
    name: '教育',
    era: 'medieval',
    cost: 110,
    requires: ['philosophy'],
    effects: { science: 40, culture: 30 },
    description: '创办学校，加速知识传播'
  },
  {
    id: 'chivalry',
    name: '骑士精神',
    era: 'medieval',
    cost: 105,
    requires: ['feudalism', 'philosophy'],
    effects: { culture: 40, militaryMorale: 25 },
    description: '推崇骑士文化，提升部队士气'
  },
  {
    id: 'banking',
    name: '银行制度',
    era: 'medieval',
    cost: 115,
    requires: ['currency'],
    effects: { goldIncome: 50, loanCapacity: 100 },
    description: '建立银行系统，增加资金流通'
  },
  {
    id: 'gunpowder',
    name: '火药',
    era: 'medieval',
    cost: 130,
    requires: ['iron_working'],
    effects: { militaryPower: 50, science: 20 },
    description: '发明火药，革命性地改变战争'
  },

  // 文艺复兴
  {
    id: 'printing',
    name: '印刷术',
    era: 'renaissance',
    cost: 140,
    requires: ['education'],
    effects: { science: 60, culture: 50 },
    description: '发明印刷机，知识传播革命'
  },
  {
    id: 'scientific_method',
    name: '科学方法',
    era: 'renaissance',
    cost: 160,
    requires: ['mathematics', 'philosophy'],
    effects: { science: 80, productionSpeed: 30 },
    description: '建立科学方法论，加速科技进步'
  },
  {
    id: 'mercantilism',
    name: '重商主义',
    era: 'renaissance',
    cost: 150,
    requires: ['banking'],
    effects: { goldIncome: 70, tradeValue: 60 },
    description: '采行重商主义政策，极大增加贸易收益'
  },
  {
    id: 'nationalism',
    name: '民族主义',
    era: 'renaissance',
    cost: 145,
    requires: ['chivalry'],
    effects: { culture: 70, militaryMorale: 40, unity: 30 },
    description: '激发民族意识，强化国家凝聚力'
  }
];
