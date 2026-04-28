/**
 * 可建造建筑定义 - 路灯计划
 *
 * 每个建筑定义：
 *   id: 唯一标识
 *   name: 显示名称
 *   icon: emoji图标
 *   description: 描述
 *   category: 分类（storage/production/research）
 *   costs: 建造材料 [{ category, itemId, name, amount }]
 *   buildDays: 建造天数
 *   unique: 是否唯一（只能建一个）
 *   requires: 建造前置条件函数
 *   story: 建造时的故事性描述
 */

import { TICKS_PER_DAY } from '../engine/constants';

export const BUILDING_DEFS = [
  {
    id: 'mountain_trail',
    name: '后山小径',
    icon: '🛤️',
    description: '开辟一条通往后山的林间小径，解锁后山采集点，派NPC采集木材和石材。',
    category: 'production',
    costs: [
      { category: 'food', itemId: 'wheat', name: '小麦', amount: 15 },
    ],
    buildDays: 2,
    unique: true,
    requires: (game) => !game.buildings.includes('mountain_trail'),
    onBuilt: (game) => {
      game.gatherSystem.unlock();
    },
    story: '你决定在后山开辟一条小径。山林间有取之不尽的木材和石材，或许能派些人去采集。',
  },
  {
    id: 'large_warehouse',
    name: '大仓库',
    icon: '🏗️',
    description: '扩容公共仓库容量，让你能囤积更多物资。',
    category: 'storage',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 15 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 8 },
    ],
    buildDays: 2,
    unique: true,
    requires: (game) => !game.buildings.includes('large_warehouse'),
    onBuilt: (game) => {
      game.warehouse.upgradeCommon();
    },
    story: '你决定扩建仓库——粮食多了存不下可不是闹着玩的。',
  },
  {
    id: 'research_hall',
    name: '司务堂',
    icon: '📜',
    description: '统筹事务的建筑。建好后获得「司录」身份，可以研究岗位和功法。',
    category: 'research',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 30 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 15 },
    ],
    buildDays: 3,
    unique: true,
    requires: (game) => {
      // 必须接受过投靠
      return game.triggeredEvents && game.triggeredEvents['recruit'] === 'accepted';
    },
    onBuilt: (game) => {
      game.hallBuilt = true;
      game.researchSystem.unlock();
      if (!game.player.roles.includes('silu')) {
        game.player.roles.push('silu');
      }
    },
    story: '人多了就该有规矩。你决定建造一间司务堂来管理事务。',
    lockedReason: '需要先招募村民',
  },
];
