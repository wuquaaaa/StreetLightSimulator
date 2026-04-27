/**
 * 角色定义 - 路灯计划
 *
 * 统一管理所有角色的显示信息，避免分散在 TopBar / CharacterPanel / GameApp 等多个文件中。
 * 各组件按需取用所需字段（icon / color / bg / label 等）。
 */

const ROLES = {
  farmer: {
    name: '农民',
    icon: '🌾',
    color: 'text-green-400',
    bg: 'bg-green-900/30 border-green-700/40',
    tabLabel: '农田',
  },
  farmer_leader: {
    name: '农民队长',
    icon: '👨‍🌾',
    color: 'text-amber-400',
    bg: 'bg-amber-900/30 border-amber-700/40',
    tabLabel: '管理',
  },
  scholar: {
    name: '学者',
    icon: '📖',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30 border-blue-700/40',
    tabLabel: '研究',
  },
  trader: {
    name: '商人',
    icon: '💰',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30 border-yellow-700/40',
    tabLabel: '贸易',
  },
  crafter: {
    name: '工匠',
    icon: '🔨',
    color: 'text-orange-400',
    bg: 'bg-orange-900/30 border-orange-700/40',
    tabLabel: '制造',
  },
  soldier: {
    name: '士兵',
    icon: '⚔️',
    color: 'text-red-400',
    bg: 'bg-red-900/30 border-red-700/40',
    tabLabel: '军事',
  },
  advisor: {
    name: '谋士',
    icon: '🧠',
    color: 'text-purple-400',
    bg: 'bg-purple-900/30 border-purple-700/40',
    tabLabel: '谋略',
  },
  leader: {
    name: '领袖',
    icon: '👑',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30 border-yellow-700/40',
    tabLabel: '统治',
  },
  // 司务堂岗位
  zhike: {
    name: '知客',
    icon: '📋',
    color: 'text-cyan-400',
    bg: 'bg-cyan-900/30 border-cyan-700/40',
    tabLabel: '司务堂',
  },
};

// 默认回退样式
const FALLBACK = { name: '未知', icon: '👤', color: 'text-stone-400', bg: 'bg-stone-700/30 border-stone-600/40', tabLabel: '未知' };

/**
 * 获取角色显示信息（带默认回退）
 */
export function getRoleInfo(roleId) {
  return ROLES[roleId] || FALLBACK;
}

/**
 * 获取角色中文名
 */
export function getRoleName(roleId) {
  return (ROLES[roleId] || FALLBACK).name;
}

export default ROLES;
