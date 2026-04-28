/**
 * 执事（岗位）定义 - 司务堂
 *
 * 岗位系统：
 * - 每个 NPC 有多个岗位，每个岗位占一定精力比例
 * - 精力总和不超 100%
 * - 种地占 100%，与其他岗位互斥（种地就是岗位之一）
 * - 独占岗位：不能与其他岗位同时担任
 */

export const POSTS = {
  farmer: {
    id: 'farmer',
    name: '农夫',
    icon: '🌾',
    description: '耕种农田，照料作物',
    energyCost: 1.0,      // 100% 精力
    exclusive: true,       // 独占，不可兼职
    category: 'production',
  },
  zhike: {
    id: 'zhike',
    name: '知客',
    icon: '📋',
    description: '管理人事、招募新人、安排岗位',
    energyCost: 0.3,       // 30% 精力
    exclusive: false,
    category: 'management',
    unlockCondition: 'research_unlocked', // 研究系统解锁时获得
  },
  fangshi: {
    id: 'fangshi',
    name: '房事',
    icon: '🏪',
    description: '管理仓库、物资调配',
    energyCost: 0.2,       // 20% 精力
    exclusive: false,
    category: 'management',
    requires: ['zhike'],   // 前置：需要先研究知客岗位
    researchCost: 5,        // 需要研究 5 天
  },
  tiedao: {
    id: 'tiedao',
    name: '铁道',
    icon: '⛏',
    description: '采矿、冶炼铁矿石',
    energyCost: 1.0,       // 100% 独占
    exclusive: true,
    category: 'production',
    researchCost: 10,       // 无前置
  },
  miaoshou: {
    id: 'miaoshou',
    name: '妙手',
    icon: '⚗',
    description: '炼丹、将草药制成丹药',
    energyCost: 1.0,       // 100% 独占
    exclusive: true,
    category: 'production',
    requires: ['farmer'],  // 前置：农夫
    researchCost: 12,
  },
};

/**
 * 获取岗位信息
 */
export function getPostInfo(postId) {
  return POSTS[postId] || null;
}

/**
 * 获取所有岗位列表
 */
export function getAllPosts() {
  return Object.values(POSTS);
}

/**
 * 获取非种地的管理/生产岗位（用于研究面板显示）
 */
export function getResearchablePosts() {
  return Object.values(POSTS).filter(p => p.id !== 'farmer');
}
