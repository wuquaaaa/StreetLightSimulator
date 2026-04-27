/**
 * 交通工具定义 - 路灯计划
 *
 * 交通工具决定招募时的最大载客量和旅途耗时。
 * 初始只有驴车，后续可通过升级获得更好的载具。
 */

export const VEHICLES = {
  donkey_cart: {
    id: 'donkey_cart',
    name: '驴车',
    icon: '🫏',
    description: '穷得只剩一头驴和一辆破驴车，一趟最多坐四个人（含赶车的你）。',
    passengerCapacity: 3,   // 最多招3人（+1赶车=4人）
    travelDaysSelf: 1,      // 亲自去：1天到达（不含回程）
    travelDaysDelegate: 2,  // 派人去：2天往返
    upgradeCost: null,      // 初始载具，无需升级
  },
  horse_cart: {
    id: 'horse_cart',
    name: '马车',
    icon: '🐎',
    description: '换了一匹好马，马车宽敞了不少，一趟能拉更多人。',
    passengerCapacity: 5,   // 最多招5人（+1赶车=6人）
    travelDaysSelf: 1,      // 亲自去：1天到达
    travelDaysDelegate: 2,  // 派人去：2天往返
    upgradeCost: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 30 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 20 },
      { category: 'food', itemId: 'wheat', name: '小麦', amount: 50 },
    ],
    requires: null,  // 无前置
  },
  ox_cart: {
    id: 'ox_cart',
    name: '牛车',
    icon: '🐂',
    description: '老实巴交的老牛拉着一辆大板车，虽然慢但装得多。',
    passengerCapacity: 7,   // 最多招7人（+1赶车=8人）
    travelDaysSelf: 1,      // 亲自去：1天到达
    travelDaysDelegate: 2,  // 派人去：2天往返
    upgradeCost: [
      { category: 'material', itemId: 'lumber', name: '木材', amount: 60 },
      { category: 'material', itemId: 'stone', name: '石材', amount: 40 },
      { category: 'mineral', itemId: 'iron_ore', name: '铁矿石', amount: 10 },
    ],
    requires: 'horse_cart',  // 前置：马车
  },
};

// 升级路线（有序数组）
export const VEHICLE_UPGRADE_ORDER = ['donkey_cart', 'horse_cart', 'ox_cart'];

/**
 * 获取交通工具信息
 */
export function getVehicleInfo(vehicleId) {
  return VEHICLES[vehicleId] || VEHICLES.donkey_cart;
}

/**
 * 获取下一个可升级的交通工具
 */
export function getNextVehicle(currentVehicleId) {
  const idx = VEHICLE_UPGRADE_ORDER.indexOf(currentVehicleId);
  if (idx < 0 || idx >= VEHICLE_UPGRADE_ORDER.length - 1) return null;
  return VEHICLES[VEHICLE_UPGRADE_ORDER[idx + 1]];
}
