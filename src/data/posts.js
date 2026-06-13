/**
 * 岗位定义 - 路灯计划（完整版）
 *
 * 三阶段岗位体系：
 * - 一线岗位（阶段一）：有独立迷你玩法
 * - 管理岗位（阶段二）：管理层，有管理方案
 * - 行政岗位（阶段三）：公司运营
 */

export const POSTS = {
  // ====== 一线岗位（阶段一） ======
  farmer: {
    id: 'farmer',
    name: '农夫',
    icon: '🌾',
    description: '耕种农田，照料作物',
    energyCost: 1.0,
    exclusive: true,
    category: 'production',
    phase: 1,
  },
  miner: {
    id: 'miner',
    name: '矿工',
    icon: '⛏️',
    description: '开采矿石，需要体力和技巧',
    energyCost: 1.0,
    exclusive: true,
    category: 'production',
    phase: 1,
    requires: [],
    researchCost: 8,
  },
  smelter: {
    id: 'smelter',
    name: '炼铁匠',
    icon: '🔥',
    description: '将矿石冶炼成可用金属',
    energyCost: 1.0,
    exclusive: true,
    category: 'production',
    phase: 1,
    requires: ['miner'],
    researchCost: 10,
  },
  herb_prepper: {
    id: 'herb_prepper',
    name: '药童',
    icon: '🌿',
    description: '分拣、清洗、晾晒草药材料',
    energyCost: 1.0,
    exclusive: true,
    category: 'production',
    phase: 1,
    requires: ['farmer'],
    researchCost: 6,
  },
  alchemist: {
    id: 'alchemist',
    name: '炼丹师',
    icon: '⚗️',
    description: '操控丹炉，将材料炼制成丹药',
    energyCost: 1.0,
    exclusive: true,
    category: 'production',
    phase: 1,
    requires: ['herb_prepper'],
    researchCost: 15,
  },
  furnace_tender: {
    id: 'furnace_tender',
    name: '炉工',
    icon: '🛠️',
    description: '维护丹炉/炼铁炉，修补损坏',
    energyCost: 1.0,
    exclusive: true,
    category: 'support',
    phase: 1,
    requires: ['smelter'],
    researchCost: 8,
  },
  trader: {
    id: 'trader',
    name: '贩子',
    icon: '💰',
    description: '摆摊售卖产品，与顾客议价',
    energyCost: 1.0,
    exclusive: true,
    category: 'sales',
    phase: 1,
    requires: [],
    researchCost: 5,
  },
  porter: {
    id: 'porter',
    name: '运工',
    icon: '📦',
    description: '搬运物资，装卸货物',
    energyCost: 1.0,
    exclusive: true,
    category: 'logistics',
    phase: 1,
    requires: [],
    researchCost: 3,
  },

  // ====== 管理岗位（阶段二） ======
  farm_manager: {
    id: 'farm_manager',
    name: '农场管事',
    icon: '👨‍🌾',
    description: '管理农夫，制定种植计划',
    energyCost: 0.3,
    exclusive: false,
    category: 'management',
    phase: 2,
    manages: ['farmer'],
    requires: ['farmer_leader'],
    researchCost: 12,
  },
  mine_manager: {
    id: 'mine_manager',
    name: '矿场管事',
    icon: '⛏️',
    description: '管理矿工，制定开采计划',
    energyCost: 0.3,
    exclusive: false,
    category: 'management',
    phase: 2,
    manages: ['miner', 'smelter', 'furnace_tender'],
    requires: ['miner'],
    researchCost: 15,
  },
  alchemy_manager: {
    id: 'alchemy_manager',
    name: '丹房管事',
    icon: '⚗️',
    description: '管理炼丹师和药童',
    energyCost: 0.3,
    exclusive: false,
    category: 'management',
    phase: 2,
    manages: ['alchemist', 'herb_prepper', 'furnace_tender'],
    requires: ['alchemist'],
    researchCost: 18,
  },
  shop_manager: {
    id: 'shop_manager',
    name: '商铺掌柜',
    icon: '🏪',
    description: '管理贩子和运工',
    energyCost: 0.3,
    exclusive: false,
    category: 'management',
    phase: 2,
    manages: ['trader', 'porter'],
    requires: ['trader'],
    researchCost: 10,
  },

  // ====== 行政岗位（阶段三） ======
  zhike: {
    id: 'zhike',
    name: '知客（HR）',
    icon: '📋',
    description: '管理人事、招募新人、观察候选人',
    energyCost: 0.3,
    exclusive: false,
    category: 'admin',
    phase: 3,
    researchCost: 5,
  },
  accountant: {
    id: 'accountant',
    name: '账房',
    icon: '📊',
    description: '财务核算、成本分析',
    energyCost: 0.2,
    exclusive: false,
    category: 'admin',
    phase: 3,
    requires: ['zhike'],
    researchCost: 10,
  },
  legal: {
    id: 'legal',
    name: '法务',
    icon: '⚖️',
    description: '合同审核、纠纷处理、合规管理',
    energyCost: 0.2,
    exclusive: false,
    category: 'admin',
    phase: 3,
    requires: ['zhike'],
    researchCost: 15,
  },
  guard_captain: {
    id: 'guard_captain',
    name: '护卫头目',
    icon: '⚔️',
    description: '安保管理、商队保护',
    energyCost: 0.3,
    exclusive: false,
    category: 'admin',
    phase: 3,
    requires: [],
    researchCost: 12,
  },

  // ====== 兼容旧岗位 ======
  fangshi: {
    id: 'fangshi',
    name: '房事',
    icon: '🏪',
    description: '管理仓库、物资调配',
    energyCost: 0.2,
    exclusive: false,
    category: 'management',
    phase: 2,
    requires: ['zhike'],
    researchCost: 5,
  },
  tiedao: {
    id: 'tiedao',
    name: '铁道',
    icon: '⛏',
    description: '采矿、冶炼铁矿石',
    energyCost: 1.0,
    exclusive: true,
    category: 'production',
    phase: 1,
    researchCost: 10,
  },
  miaoshou: {
    id: 'miaoshou',
    name: '妙手',
    icon: '⚗',
    description: '炼丹、将草药制成丹药',
    energyCost: 1.0,
    exclusive: true,
    category: 'production',
    phase: 1,
    requires: ['farmer'],
    researchCost: 12,
  },
};

export function getPostInfo(postId) {
  return POSTS[postId] || null;
}

export function getAllPosts() {
  return Object.values(POSTS);
}

export function getResearchablePosts() {
  return Object.values(POSTS).filter(p => p.id !== 'farmer' && p.researchCost);
}

export function getPostsByPhase(phase) {
  return Object.values(POSTS).filter(p => p.phase === phase);
}

export function getPostsByCategory(category) {
  return Object.values(POSTS).filter(p => p.category === category);
}

export function getManagedPosts(managerPostId) {
  const post = POSTS[managerPostId];
  if (!post?.manages) return [];
  return post.manages.map(id => POSTS[id]).filter(Boolean);
}
