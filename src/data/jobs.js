/**
 * 一线岗位定义 - 路灯计划
 *
 * 每个岗位有独立的迷你玩法（类似农夫种田）
 * 玩家作为一线工人时，直接操作这些系统
 */

export const FRONTLINE_JOBS = {
  miner: {
    id: 'miner',
    name: '矿工',
    icon: '⛏️',
    description: '开采矿石，需要体力和技巧',
    category: 'production',
    energyCost: 1.0,
    exclusive: true,
    miniGame: {
      type: 'node_management',  // 资源点管理类
      hasOwnPanel: true,        // 有独立面板
    },
    attributes: {
      primary: 'constitution',   // 主属性：体质
      secondary: 'focus',        // 副属性：专注力
    },
  },
  smelter: {
    id: 'smelter',
    name: '炼铁匠',
    icon: '🔥',
    description: '将矿石冶炼成可用金属',
    category: 'production',
    energyCost: 1.0,
    exclusive: true,
    miniGame: {
      type: 'process_crafting',  // 流程制造类
      hasOwnPanel: true,
    },
    attributes: {
      primary: 'constitution',
      secondary: 'focus',
    },
  },
  herb_prepper: {
    id: 'herb_prepper',
    name: '药童',
    icon: '🌿',
    description: '分拣、清洗、晾晒草药材料',
    category: 'production',
    energyCost: 1.0,
    exclusive: true,
    miniGame: {
      type: 'batch_processing',  // 批量加工类
      hasOwnPanel: true,
    },
    attributes: {
      primary: 'focus',
      secondary: 'learning',
    },
  },
  alchemist: {
    id: 'alchemist',
    name: '炼丹师',
    icon: '⚗️',
    description: '操控丹炉，将材料炼制成丹药',
    category: 'production',
    energyCost: 1.0,
    exclusive: true,
    miniGame: {
      type: 'furnace_control',  // 炉温控制类
      hasOwnPanel: true,
    },
    attributes: {
      primary: 'focus',
      secondary: 'learning',
    },
    requires: ['herb_prepper'],
  },
  furnace_tender: {
    id: 'furnace_tender',
    name: '炉工',
    icon: '🛠️',
    description: '维护丹炉/炼铁炉，修补损坏',
    category: 'support',
    energyCost: 1.0,
    exclusive: true,
    miniGame: {
      type: 'maintenance',  // 维护修理类
      hasOwnPanel: true,
    },
    attributes: {
      primary: 'constitution',
      secondary: 'focus',
    },
  },
  trader: {
    id: 'trader',
    name: '贩子',
    icon: '💰',
    description: '摆摊售卖产品，与顾客议价',
    category: 'sales',
    energyCost: 1.0,
    exclusive: true,
    miniGame: {
      type: 'haggling',  // 议价博弈类
      hasOwnPanel: true,
    },
    attributes: {
      primary: 'cooperation',
      secondary: 'focus',
    },
  },
  porter: {
    id: 'porter',
    name: '运工',
    icon: '📦',
    description: '搬运物资，装卸货物',
    category: 'logistics',
    energyCost: 1.0,
    exclusive: true,
    miniGame: {
      type: 'route_management',  // 路线管理类
      hasOwnPanel: true,
    },
    attributes: {
      primary: 'constitution',
      secondary: null,
    },
  },
};

export function getJobInfo(jobId) {
  return FRONTLINE_JOBS[jobId] || null;
}

export function getAllJobs() {
  return Object.values(FRONTLINE_JOBS);
}

export function getJobsByCategory(category) {
  return Object.values(FRONTLINE_JOBS).filter(j => j.category === category);
}
