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
    icon: '\u26F0\uFE0F',
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
  {
    id: 'mine',
    name: '矿场',
    icon: '\u26CF\uFE0F',
    description: '在山脚发现了一处铁矿脉。搭建矿棚，开始开采。',
    category: 'production',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 20 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 15 },
    ],
    buildDays: 3,
    unique: true,
    requires: (game) => game.unlockedJobs?.has('miner'),
    onBuilt: (game) => {
      // 解锁矿脉
      if (game.miningSystem && !game.miningSystem.veins?.iron_vein) {
        game.miningSystem.init();
      }
    },
    story: '勘探后山的村民带回了好消息——山脚裸露着一层赭红色的矿石。你组织人手搭建矿棚，准备开采。',
    lockedReason: '需要先解锁矿工岗位',
  },
  {
    id: 'smelter_build',
    name: '冶炼炉',
    icon: '\uD83D\uDD25',
    description: '建造一座土法冶炼炉，将铁矿石炼成铁锭。',
    category: 'production',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 25 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 20 },
      { category: 'mineral', itemId: 'iron_ore', name: '铁矿石', amount: 10 },
    ],
    buildDays: 4,
    unique: true,
    requires: (game) => game.buildings.includes('mine'),
    onBuilt: (game) => {
      if (game.repairSystem && !game.repairSystem.equipment?.smelting_furnace) {
        game.repairSystem.init();
      }
    },
    story: '矿石挖出来了，但得炼成铁锭才能用。你找了个老铁匠，按他的指点垒起一座土高炉。',
    lockedReason: '需要先建造矿场',
  },
  {
    id: 'herb_garden',
    name: '药圃',
    icon: '\uD83C\uDF3F',
    description: '划出一片地专门种植草药，为炼丹做准备。',
    category: 'production',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 15 },
      { category: 'food', itemId: 'wheat', name: '小麦', amount: 10 },
    ],
    buildDays: 2,
    unique: true,
    requires: (game) => game.researchSystem?.unlocked,
    onBuilt: (game) => {},
    story: '有人生了病，你才意识到草药的重要性。你划出一块向阳的坡地，撒下药种。',
    lockedReason: '需要先建造司务堂',
  },
  {
    id: 'alchemy_room',
    name: '丹房',
    icon: '\u2697\uFE0F',
    description: '建造一间专门的炼丹房，配备丹炉和药柜。',
    category: 'production',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 30 },
      { category: 'mineral', itemId: 'iron_ore', name: '铁矿石', amount: 15 },
      { category: 'mineral', itemId: 'iron_ingot', name: '铁锭', amount: 5 },
    ],
    buildDays: 5,
    unique: true,
    requires: (game) => game.buildings.includes('herb_garden'),
    onBuilt: (game) => {
      if (game.repairSystem && !game.repairSystem.equipment?.alchemy_furnace) {
        game.repairSystem.init();
      }
    },
    story: '草药有了，但没有炼丹的地方。你请来一位云游道士，按他的图纸建了一间丹房。',
    lockedReason: '需要先建造药圃',
  },
  {
    id: 'shop',
    name: '商铺',
    icon: '\uD83C\uDFEA',
    description: '搭建一间铺面，挂牌营业，开始做买卖。',
    category: 'commercial',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 20 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 10 },
    ],
    buildDays: 2,
    unique: true,
    requires: (game) => game.characters.length >= 2,
    onBuilt: (game) => {},
    story: '东西多了，光堆在仓库不是办法。你找了街口一间空屋，挂上招牌，开张营业。',
    lockedReason: '需要至少2个村民',
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
  // ====== 生活类 ======
  {
    id: 'dormitory',
    name: '宿舍',
    icon: '🏠',
    description: '盖几间土坯房，让工人们有地方住。每间宿舍可住4人。',
    category: 'living',
    costs: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 15 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 8 },
    ],
    buildDays: 2,
    unique: false, // 可以建多间
    capacity: 4,   // 每间住4人
    requires: (game) => game.characters.length >= 1,
    onBuilt: (game) => {
      if (!game.dormitoryCapacity) game.dormitoryCapacity = 0;
      game.dormitoryCapacity += 4;
    },
    story: '工人们晚上只能睡在仓库角落。你找了些木头和石头，盖了两间土坯房。虽然简陋，但总算有张床了。',
    lockedReason: '需要先招募工人',
  },
];
