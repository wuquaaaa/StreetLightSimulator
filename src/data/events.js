export const eventDefinitions = [
  {
    id: 'bumper_harvest',
    name: '大丰收',
    description: '农业获得了意外的丰收！',
    condition: (state) => state.food > 0,
    choices: [
      { text: '分发给民众', effects: { food: -50, happiness: 20 } },
      { text: '储存以备荒年', effects: { food: 100, foodStorage: 50 } },
      { text: '在市场出售', effects: { food: -100, gold: 100 } }
    ]
  },
  {
    id: 'plague',
    name: '瘟疫',
    description: '疾病在城市中蔓延...',
    condition: (state) => state.population > 100,
    choices: [
      { text: '投入资金防疫', effects: { gold: -100, happiness: -10 } },
      { text: '隔离患者', effects: { population: -50, happiness: -30 } },
      { text: '祈祷奇迹', effects: { happiness: -20 } }
    ]
  },
  {
    id: 'trade_opportunity',
    name: '贸易机遇',
    description: '一个有利的贸易机会出现了！',
    condition: (state) => true,
    choices: [
      { text: '接受交易', effects: { gold: 150, food: -50 } },
      { text: '提高要价', effects: { gold: 100, food: -30, happiness: 10 } },
      { text: '拒绝', effects: { happiness: 5 } }
    ]
  },
  {
    id: 'rebellion',
    name: '叛乱',
    description: '民众正在反抗！',
    condition: (state) => state.happiness < 30,
    choices: [
      { text: '镇压叛乱', effects: { militaryPower: -30, happiness: -40 } },
      { text: '进行改革', effects: { happiness: 40, gold: -100 } },
      { text: '协商和平', effects: { happiness: 15, gold: -50 } }
    ]
  },
  {
    id: 'discovery',
    name: '科学发现',
    description: '科学家有了突破性的发现！',
    condition: (state) => state.science > 50,
    choices: [
      { text: '推进研究', effects: { science: 100, gold: -50 } },
      { text: '出版论文', effects: { culture: 50, science: 30 } },
      { text: '保密研究', effects: { science: 50, militaryPower: 30 } }
    ]
  },
  {
    id: 'economic_boom',
    name: '经济繁荣',
    description: '市场形势看好，商业繁荣！',
    condition: (state) => state.gold < 1000,
    choices: [
      { text: '投资贸易', effects: { gold: 200, production: 30 } },
      { text: '积累储备', effects: { gold: 300 } },
      { text: '扩展市场', effects: { gold: 150, population: 50 } }
    ]
  },
  {
    id: 'crime_wave',
    name: '犯罪浪潮',
    description: '犯罪活动急剧增加...',
    condition: (state) => state.happiness < 40,
    choices: [
      { text: '加强警队', effects: { gold: -80, happiness: 15 } },
      { text: '改善贫困', effects: { gold: -150, happiness: 30 } },
      { text: '实施宵禁', effects: { happiness: -20, gold: -30 } }
    ]
  },
  {
    id: 'artist_arrives',
    name: '艺术家来临',
    description: '一位著名艺术家来到你的城邦！',
    condition: (state) => true,
    choices: [
      { text: '资助他', effects: { gold: -100, culture: 50, happiness: 20 } },
      { text: '冷淡对待', effects: { culture: 10 } },
      { text: '让他免费工作', effects: { gold: 50, culture: 20, happiness: -10 } }
    ]
  },
  {
    id: 'resource_shortage',
    name: '资源短缺',
    description: '关键资源面临短缺...',
    condition: (state) => state.production < 100,
    choices: [
      { text: '发起进口', effects: { gold: -150, production: 100 } },
      { text: '寻找替代品', effects: { science: 50, production: 50 } },
      { text: '减少使用', effects: { production: -30, happiness: -20 } }
    ]
  },
  {
    id: 'population_surge',
    name: '人口激增',
    description: '人口出生率突然上升！',
    condition: (state) => state.food > 200,
    choices: [
      { text: '欢迎新增人口', effects: { population: 100, food: -80 } },
      { text: '鼓励移民', effects: { population: 150, happiness: 15 } },
      { text: '限制出生', effects: { population: 30, happiness: -30 } }
    ]
  },
  {
    id: 'cultural_renaissance',
    name: '文化复兴',
    description: '文化艺术形成一股浪潮！',
    condition: (state) => state.culture > 100,
    choices: [
      { text: '全力支持', effects: { culture: 100, gold: -100, happiness: 30 } },
      { text: '温和支持', effects: { culture: 50, happiness: 15 } },
      { text: '置之不理', effects: { happiness: -10 } }
    ]
  },
  {
    id: 'military_morale',
    name: '军队士气高昂',
    description: '军队战斗精神十足！',
    condition: (state) => state.militaryPower > 100,
    choices: [
      { text: '发动战争', effects: { militaryPower: 50, gold: -200 } },
      { text: '保持戒备', effects: { militaryDefense: 30 } },
      { text: '进行阅兵式', effects: { culture: 30, happiness: 20, militaryUpkeep: 50 } }
    ]
  },
  {
    id: 'foreign_contact',
    name: '外交接触',
    description: '一个外国使节来访！',
    condition: (state) => true,
    choices: [
      { text: '建立贸易协议', effects: { gold: 100, tradeValue: 50 } },
      { text: '缔结联盟', effects: { militaryPower: 30, happiness: 20 } },
      { text: '冷淡接待', effects: { happiness: -5 } }
    ]
  }
];
