/**
 * 农作物定义 - 路灯计划
 */

export const CROPS = [
  {
    id: 'wheat',
    name: '小麦',
    description: '最基础的粮食作物，适应性强',
    category: 'food',
    harvestItem: 'wheat',
    growthTime: 3,   // 需要3个回合生长
    baseYield: 8,    // 基础产量
    seedCost: 1,     // 播种消耗种子数
    season: ['春', '夏', '秋'], // 适宜季节
    icon: '🌾',
  },
  // 后续可扩展更多作物
  // {
  //   id: 'potato',
  //   name: '土豆',
  //   description: '产量较高的根茎类作物',
  //   category: 'food',
  //   harvestItem: 'potato',
  //   growthTime: 4,
  //   baseYield: 12,
  //   seedCost: 1,
  //   season: ['春', '秋'],
  //   icon: '🥔',
  // },
];
