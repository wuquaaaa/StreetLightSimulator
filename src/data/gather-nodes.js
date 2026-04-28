/**
 * 后山资源点定义 - 路灯计划
 *
 * 资源类型：lumber（木材）、stone（石材）
 * 每个资源点有基础产量、NPC容量上限
 * 资源不会枯竭，NPC 分配后每天自动产出
 */

export const RESOURCE_TYPES = {
  lumber: {
    id: 'lumber',
    name: '木材',
    icon: '🪵',
    category: 'material',
    description: '从树木上砍伐的木材，建造和升级的必备材料',
    baseDailyYield: 3,       // 基础每日产量（每NPC）
    maxAssignees: 2,         // 每个资源点最多分配NPC数
  },
  stone: {
    id: 'stone',
    name: '石材',
    icon: '🪨',
    category: 'material',
    description: '从山石中开采的石料，建筑地基和围墙的必需品',
    baseDailyYield: 2,       // 基础每日产量（石材比木材难采）
    maxAssignees: 2,
  },
};

// 初始资源点定义（后山小径建好后解锁）
export const INITIAL_GATHER_NODES = [
  {
    id: 'node_lumber_1',
    name: '松木林',
    type: 'lumber',
    description: '一片茂密的松树林，适合砍伐木材',
    icon: '🌲',
  },
  {
    id: 'node_lumber_2',
    name: '竹林',
    type: 'lumber',
    description: '青翠竹林，木材柔韧用途广',
    icon: '🎋',
  },
  {
    id: 'node_stone_1',
    name: '青石崖',
    type: 'stone',
    description: '一处陡峭的岩壁，可开采石料',
    icon: '⛰️',
  },
  {
    id: 'node_stone_2',
    name: '碎石滩',
    type: 'stone',
    description: '溪边的碎石滩，采集石料比较省力',
    icon: '🏞️',
  },
];
