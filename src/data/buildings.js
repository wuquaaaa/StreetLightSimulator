/**
 * 可建造建筑定义 - 路灯计划
 *
 * 建筑系统：建造/升级两条路径
 *   - 建造：消耗材料，加入建造队列，tick 推进
 *   - 升级：建筑建成后，可通过消耗额外材料升级到下一级
 */

import { TICKS_PER_DAY } from '../engine/constants';

export const BUILDING_DEFS = [
  // ====== 生产类 ======
  {
    id: 'mountain_trail',
    name: '探索后山',
    icon: '🏔️',
    description: '村子背后是一片绵延的山林。派几个胆大的村民进去探探路，说不定能发现些有用的东西。',
    category: 'production',
    costs: [
      { category: 'food', itemId: 'wheat', name: '小麦', amount: 15 },
    ],
    buildDays: 2,
    buildLabel: '探索',
    unique: true,
    requires: (game) => !game.buildings.includes('mountain_trail'),
    onBuilt: (game) => {
      game.gatherSystem.unlock();
    },
    story: '你望着村后的山峦出神。老人们说山里有成片的松林和采不完的石料——只是路早被荒草吞没了。你点了几个壮实的村民，带上干粮和柴刀，决心重新踏出一条路来。',
  },
  // ====== 仓储类 ======
  {
    id: 'warehouse',
    name: '仓库',
    icon: '🏚️',
    description: '搭一间像样的仓库，粮食和材料总得有个遮风挡雨的地方。',
    category: 'storage',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 10 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 5 },
    ],
    buildDays: 2,
    unique: true,
    requires: (game) => !game.buildings.includes('warehouse') && !game.buildings.includes('large_warehouse'),
    onBuilt: (game) => {
      game.warehouse.upgradeCommon();
    },
    story: '收成渐渐多了，堆在屋角不是办法。你招呼众人砍了些木头，垒了几块石头，一间简陋的仓库总算立了起来。',
  },
  {
    id: 'large_warehouse',
    name: '大仓库',
    icon: '🏗️',
    description: '仓库升级：用铁件加固梁柱，加高屋顶，容量大增。',
    category: 'storage',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 20 },
      { category: 'mineral', itemId: 'iron_ore', name: '铁矿石', amount: 8 },
    ],
    buildDays: 3,
    unique: true,
    requires: (game) => game.buildings.includes('warehouse') && !game.buildings.includes('large_warehouse'),
    onBuilt: (game) => {
      game.warehouse.upgradeCommon();
    },
    story: '仓库的木梁已经开始吱呀作响了。你决定趁早加固——几个铁匠学徒打了些铁件，把梁柱箍得结结实实。这下撑得住了。',
    lockedReason: '需要先建造仓库',
  },
  // ====== 研究类 ======
  {
    id: 'research_hall',
    name: '司务堂',
    icon: '📜',
    description: '人多了就该有规矩。建一间司务堂来统筹事务，研究岗位分配与功法传承。',
    category: 'research',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 30 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 15 },
    ],
    buildDays: 3,
    unique: true,
    requires: (game) => {
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
