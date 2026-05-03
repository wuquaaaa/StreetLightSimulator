/**
 * 仓库系统 - 路灯计划
 *
 * 多货架架构：每个仓库内部有多个独立货架，货架之间不互通。
 * 物品分散在不同货架上不会自动合并，取出时需逐个货架取。
 *
 * 房事（仓库管理岗）的职责：
 *   - 整理货架：将同类物品归拢到同一货架（方便大批量取用）
 *   - 玩家担任房事时可手动拖拽物品
 *
 * 货架命名：甲、乙、丙、丁...（天干编号）
 */

import { FANGSHI_CAPACITY_BONUS } from './constants';

// 专用仓库分类
export const WAREHOUSE_CATEGORIES = {
  food:     { name: '食物', icon: '🍞', color: '#f59e0b' },
  herb:     { name: '药材', icon: '🌿', color: '#a855f7' },
  mineral:  { name: '矿物', icon: '⛏️', color: '#6b7280' },
  material: { name: '材料', icon: '🪵', color: '#92400e' },
  tool:     { name: '工具', icon: '🔧', color: '#3b82f6' },
  seed:     { name: '种子', icon: '🌱', color: '#22c55e' },
};

const SHELF_NAMES = ['甲', '乙', '丙', '丁', '戊', '己'];
const DEFAULT_SHELVES_PER = 2;

// ======================================================
// StorageShelf — 单个货架
// ======================================================
export class StorageShelf {
  constructor(id, name, capacity) {
    this.id = id;
    this.name = name;
    this.capacity = capacity;
    this.items = {}; // { itemId: { name, amount, category?, meta? } }
  }

  get used() {
    return Object.values(this.items).reduce((s, i) => s + i.amount, 0);
  }

  get remaining() {
    return this.capacity - this.used;
  }

  getEffectiveCapacity(buffMultiplier = 0) {
    if (buffMultiplier <= 0) return this.capacity;
    return Math.floor(this.capacity * (1 + buffMultiplier));
  }

  getRemaining(buffMultiplier = 0) {
    if (buffMultiplier <= 0) return this.remaining;
    return Math.max(0, this.getEffectiveCapacity(buffMultiplier) - this.used);
  }

  hasItem(itemId) {
    return !!(this.items[itemId] && this.items[itemId].amount > 0);
  }

  toJSON() {
    return {
      id: this.id, name: this.name, capacity: this.capacity,
      items: { ...this.items },
    };
  }

  static fromJSON(data) {
    const shelf = new StorageShelf(data.id, data.name, data.capacity);
    shelf.items = data.items || {};
    return shelf;
  }
}

// ======================================================
// WarehouseSystem
// ======================================================
export class WarehouseSystem {
  constructor() {
    // 公共仓库（始终可用，有多个货架）
    this.common = {
      shelves: [],
      level: 1,
    };
    this._initCommonShelves();

    // 专用仓库（按进度解锁）
    this.storage = {};
    for (const catKey of Object.keys(WAREHOUSE_CATEGORIES)) {
      this.storage[catKey] = {
        shelves: [],
        level: 0,
        unlocked: false,
      };
    }

    // 房事 NPC 当前搬运任务
    this._fangshiTask = null;

    // 房事被动 buff
    this.fangshiActive = false;  // 房事 NPC 是否在职
  }

  /** 初始化公共仓库货架 */
  _initCommonShelves() {
    const totalCap = this.common.level * 300;
    const perShelf = Math.floor(totalCap / DEFAULT_SHELVES_PER);
    this.common.shelves = [];
    for (let i = 0; i < DEFAULT_SHELVES_PER; i++) {
      this.common.shelves.push(new StorageShelf(
        `common_${i}`,
        `公共·${SHELF_NAMES[i]}`,
        perShelf
      ));
    }
  }

  /** 初始化专用仓库货架 */
  _initSpecializedShelves(catKey) {
    const cat = this.storage[catKey];
    const totalCap = cat.level * 200;
    const perShelf = Math.floor(totalCap / DEFAULT_SHELVES_PER);
    cat.shelves = [];
    for (let i = 0; i < DEFAULT_SHELVES_PER; i++) {
      cat.shelves.push(new StorageShelf(
        `${catKey}_${i}`,
        `${WAREHOUSE_CATEGORIES[catKey].name}·${SHELF_NAMES[i]}`,
        perShelf
      ));
    }
  }

  // ======== 公共仓库 ========
  getCommonUsed() {
    return this.common.shelves.reduce((s, sh) => s + sh.used, 0);
  }

  getCommonRemaining() {
    return this.common.shelves.reduce((s, sh) => s + sh.remaining, 0);
  }

  // ======== 添加物品 ========
  /**
   * 将物品存入仓库。优先专用仓库，其次公共仓库。
   * 每个仓库内部按货架顺序依次填充。
   * @param {string} category
   * @param {string} itemId
   * @param {string} name
   * @param {number} amount
   * @param {*} meta - 可选元数据（灵草品质等）
   * @returns {{ success: boolean, overflow: number }}
   */
  addItem(category, itemId, name, amount, meta = undefined) {
    let remaining = amount;
    const specialized = this.storage[category];
    const fangshiBonus = this.fangshiActive ? FANGSHI_CAPACITY_BONUS : 0;

    // 先尝试专用仓库
    if (specialized && specialized.unlocked && specialized.level > 0) {
      for (const shelf of specialized.shelves) {
        if (remaining <= 0) break;
        const avail = fangshiBonus > 0 ? shelf.getRemaining(fangshiBonus) : shelf.remaining;
        const take = Math.min(remaining, avail);
        if (take <= 0) continue;
        this._putOnShelf(shelf, itemId, name, take, category, meta);
        remaining -= take;
      }
    }

    // 剩余存入公共仓库
    if (remaining > 0) {
      for (const shelf of this.common.shelves) {
        if (remaining <= 0) break;
        const avail = fangshiBonus > 0 ? shelf.getRemaining(fangshiBonus) : shelf.remaining;
        const take = Math.min(remaining, avail);
        if (take <= 0) continue;
        this._putOnShelf(shelf, itemId, name, take, category, meta);
        remaining -= take;
      }
    }

    return {
      success: remaining === 0,
      overflow: remaining,
    };
  }

  _putOnShelf(shelf, itemId, name, amount, category, meta) {
    if (shelf.items[itemId]) {
      shelf.items[itemId].amount += amount;
      if (meta) shelf.items[itemId].meta = meta;
    } else {
      shelf.items[itemId] = { name, amount, ...(category ? { category } : {}), ...(meta ? { meta } : {}) };
    }
  }

  // ======== 移除物品 ========
  /**
   * 从仓库取出物品。
   * 由于货架不互通，需逐个货架取。
   * @returns {{ success: boolean, message: string }}
   */
  removeItem(category, itemId, amount) {
    let remaining = amount;

    // 先从专用仓库取
    const specialized = this.storage[category];
    if (specialized && specialized.unlocked) {
      for (const shelf of specialized.shelves) {
        if (remaining <= 0) break;
        if (!shelf.hasItem(itemId)) continue;
        const take = Math.min(remaining, shelf.items[itemId].amount);
        shelf.items[itemId].amount -= take;
        if (shelf.items[itemId].amount <= 0) delete shelf.items[itemId];
        remaining -= take;
      }
    }

    // 再从公共仓库取
    if (remaining > 0) {
      for (const shelf of this.common.shelves) {
        if (remaining <= 0) break;
        if (!shelf.hasItem(itemId)) continue;
        const take = Math.min(remaining, shelf.items[itemId].amount);
        shelf.items[itemId].amount -= take;
        if (shelf.items[itemId].amount <= 0) delete shelf.items[itemId];
        remaining -= take;
      }
    }

    if (remaining > 0) {
      return { success: false, message: `物品不足（尚缺${remaining}）` };
    }
    return { success: true, message: `取出${amount}` };
  }

  // ======== 查询物品总量 ========
  getItemAmount(category, itemId) {
    let total = 0;
    const specialized = this.storage[category];
    if (specialized && specialized.unlocked) {
      for (const shelf of specialized.shelves) {
        if (shelf.items[itemId]) total += shelf.items[itemId].amount;
      }
    }
    for (const shelf of this.common.shelves) {
      if (shelf.items[itemId]) total += shelf.items[itemId].amount;
    }
    return total;
  }

  // ======== 房事操作：移动物品 ========
  /**
   * 在货架之间移动物品（同仓库内或跨仓库）
   * @param {string} fromShelfId - 源货架 ID
   * @param {string} toShelfId - 目标货架 ID
   * @param {string} itemId - 物品 ID
   * @param {number} amount - 数量
   * @returns {{ success: boolean, message: string }}
   */
  moveItem(fromShelfId, toShelfId, itemId, amount) {
    const fromShelf = this._findShelf(fromShelfId);
    const toShelf = this._findShelf(toShelfId);

    if (!fromShelf) return { success: false, message: '源货架不存在' };
    if (!toShelf) return { success: false, message: '目标货架不存在' };
    if (fromShelfId === toShelfId) return { success: false, message: '不能移动到同一个货架' };
    if (!fromShelf.hasItem(itemId)) return { success: false, message: '源货架没有该物品' };

    const available = fromShelf.items[itemId].amount;
    const actual = Math.min(amount, available);
    const space = toShelf.remaining;
    const moveAmount = Math.min(actual, space);

    if (moveAmount <= 0) {
      return { success: false, message: '目标货架空间不足' };
    }

    // 从源货架移除
    fromShelf.items[itemId].amount -= moveAmount;
    const itemMeta = fromShelf.items[itemId];
    if (fromShelf.items[itemId].amount <= 0) delete fromShelf.items[itemId];

    // 添加到目标货架
    if (toShelf.items[itemId]) {
      toShelf.items[itemId].amount += moveAmount;
    } else {
      toShelf.items[itemId] = {
        name: itemMeta.name,
        amount: moveAmount,
        category: itemMeta.category,
        ...(itemMeta.meta ? { meta: itemMeta.meta } : {}),
      };
    }

    return {
      success: true,
      message: `已将${moveAmount}单位${itemMeta.name}从${fromShelf.name}移至${toShelf.name}`,
    };
  }

  // ======== 房事操作：手动整理（玩家点击，即时生效） ========
  /**
   * 将指定物品归拢到同一货架
   */
  autoConsolidate(category, itemId) {
    const shelves = category === 'common'
      ? [...this.common.shelves]
      : (this.storage[category]?.unlocked ? [...this.storage[category].shelves] : []);

    if (shelves.length === 0) return { success: false, message: '该仓库尚未解锁' };

    const shelvesWithItem = shelves.filter(s => s.hasItem(itemId));
    if (shelvesWithItem.length <= 1) {
      return { success: false, message: '该物品已集中在一个货架上，无需整理' };
    }

    const target = shelvesWithItem.reduce((best, s) =>
      s.items[itemId].amount > best.items[itemId].amount ? s : best
    );

    let moved = 0;
    for (const shelf of shelvesWithItem) {
      if (shelf.id === target.id) continue;
      const amount = shelf.items[itemId].amount;
      const space = target.remaining;
      const take = Math.min(amount, space);
      if (take > 0) {
        shelf.items[itemId].amount -= take;
        if (shelf.items[itemId].amount <= 0) delete shelf.items[itemId];
        target.items[itemId].amount += take;
        moved += take;
      }
    }

    if (moved === 0) {
      return { success: false, message: '目标货架已满，无法归拢' };
    }

    const itemName = target.items[itemId]?.name || itemId;
    return {
      success: true,
      message: `已将${moved}单位${itemName}归拢至${target.name}`,
    };
  }

  // ======== 房事 NPC 任务系统（搬运耗时，逐 tick 推进） ========

  /**
   * 房事 NPC 每 tick 的搬运任务
   *
   * 任务流程:
   *   1. 选中分散物品 A，以存量最多的货架为目标
   *   2. 若目标货架满了 → 先将目标货架上的其他物品 B 搬到源货架（FREE_SPACE 阶段）
   *   3. 将源货架上的 A 搬到目标货架（MOVE_ITEM 阶段）
   *   4. 重复直到 A 全部归拢
   *
   * 耗时: 每步操作 = ceil(2 / npcSpeed) tick
   *       两步（腾位+搬入）= 两倍时间
   */
  tickFangshi(npcSpeed) {
    // 如果没有任务，寻找需要整理的东西
    if (!this._fangshiTask) {
      this._fangshiTask = this._findConsolidationTarget();
      if (!this._fangshiTask) return null; // 没有需要整理的

      // 计算本步耗时
      const ticksPerOp = Math.max(1, Math.round(2 / Math.max(0.5, npcSpeed)));
      this._fangshiTask.totalTicks = ticksPerOp;
      this._fangshiTask.progress = 0;

      // 判断是否需要先腾位
      const target = this._findShelf(this._fangshiTask.targetShelfId);
      if (target && target.remaining <= 0) {
        // 目标满了，找到目标上一个其他物品来腾位
        const swapItem = this._findSwapItem(target, this._fangshiTask.itemId);
        if (swapItem) {
          this._fangshiTask.phase = 'free_space';
          this._fangshiTask.swapItemId = swapItem;
        } else {
          // 目标货架只有目标物品，无法腾位→跳过
          this._fangshiTask = null;
          return null;
        }
      } else {
        this._fangshiTask.phase = 'move_item';
      }
    }

    // 推进进度
    this._fangshiTask.progress++;
    if (this._fangshiTask.progress < this._fangshiTask.totalTicks) {
      return null; // 还在搬运中
    }

    // 当前阶段完成，执行搬运
    const task = this._fangshiTask;
    const source = this._findShelf(task.sourceShelfId);
    const target = this._findShelf(task.targetShelfId);

    if (!source || !target) {
      this._fangshiTask = null;
      return null;
    }

    let message = '';

    if (task.phase === 'free_space') {
      // 腾位：把 target 上的 swapItem 搬到 source
      const swapAmount = target.items[task.swapItemId]?.amount || 0;
      if (swapAmount > 0 && source.remaining > 0) {
        const take = Math.min(swapAmount, source.remaining);
        this._doMove(target, source, task.swapItemId, take);
        message = `${target.name}的${target.items[task.swapItemId]?.name || task.swapItemId}×${take} → ${source.name}（腾位）`;
      }
      // 进入下一阶段：搬入目标物品
      task.phase = 'move_item';
      task.progress = 0;
      task.totalTicks = Math.max(1, Math.round(2 / Math.max(0.5, npcSpeed)));
      return message ? { success: true, message } : null;
    }

    if (task.phase === 'move_item') {
      // 搬入：把 source 上的 itemId 搬到 target
      if (!source.hasItem(task.itemId)) {
        // 源货架没有该物品了 → 找下一个
        this._fangshiTask = this._findConsolidationTarget();
        if (!this._fangshiTask) {
          return message ? { success: true, message } : null;
        }
        const ticksPerOp = Math.max(1, Math.round(2 / Math.max(0.5, npcSpeed)));
        this._fangshiTask.totalTicks = ticksPerOp;
        this._fangshiTask.progress = 0;
        return message ? { success: true, message } : null;
      }

      const amount = source.items[task.itemId].amount;
      const space = target.remaining;
      const take = Math.min(amount, space);

      if (take > 0) {
        this._doMove(source, target, task.itemId, take);
        const itemName = target.items[task.itemId]?.name || task.itemId;
        message = `${source.name}的${itemName}×${take} → ${target.name}（归拢）`;
      }

      // 这个源货架搬完了或目标满了 → 找下一个任务
      this._fangshiTask = this._findConsolidationTarget();
      if (this._fangshiTask) {
        const ticksPerOp = Math.max(1, Math.round(2 / Math.max(0.5, npcSpeed)));
        this._fangshiTask.totalTicks = ticksPerOp;
        this._fangshiTask.progress = 0;
      }
      return message ? { success: true, message } : null;
    }

    this._fangshiTask = null;
    return null;
  }

  /** 寻找一个需要归拢的（物品, 源货架, 目标货架） */
  _findConsolidationTarget() {
    const allShelves = [
      ...this.common.shelves,
      ...Object.values(this.storage).filter(c => c.unlocked).flatMap(c => c.shelves),
    ];

    // 找到分散在多个货架上的物品，按分散程度排序
    const itemLocations = new Map();
    for (const shelf of allShelves) {
      for (const itemId of Object.keys(shelf.items)) {
        if (!itemLocations.has(itemId)) itemLocations.set(itemId, []);
        itemLocations.get(itemId).push({ shelfId: shelf.id, amount: shelf.items[itemId].amount });
      }
    }

    // 筛选有多个位置的物品，按分散程度排序（最多的优先）
    const candidates = [...itemLocations.entries()]
      .filter(([, locs]) => locs.length >= 2)
      .sort((a, b) => {
        const aSpread = a[1].length;
        const bSpread = b[1].length;
        if (aSpread !== bSpread) return bSpread - aSpread;
        // 同级分散，按总数量多的优先
        const aTotal = a[1].reduce((s, l) => s + l.amount, 0);
        const bTotal = b[1].reduce((s, l) => s + l.amount, 0);
        return bTotal - aTotal;
      });

    if (candidates.length === 0) return null;

    const [itemId, locs] = candidates[0];
    // 目标：存量最多的货架
    locs.sort((a, b) => b.amount - a.amount);
    const targetLoc = locs[0];
    // 源：有该物品但不是目标货架的货架
    const sourceLoc = locs.find(l => l.shelfId !== targetLoc.shelfId);
    if (!sourceLoc) return null;

    return {
      itemId,
      targetShelfId: targetLoc.shelfId,
      sourceShelfId: sourceLoc.shelfId,
      phase: 'move_item',
      swapItemId: null,
      progress: 0,
      totalTicks: 1,
    };
  }

  /**
   * 在目标货架上找一个「其他」物品来腾位
   * 优先选数量最少的（搬走代价小）
   */
  _findSwapItem(targetShelf, excludeItemId) {
    const others = Object.entries(targetShelf.items)
      .filter(([id]) => id !== excludeItemId)
      .sort((a, b) => a[1].amount - b[1].amount);
    return others.length > 0 ? others[0][0] : null;
  }

  /** 底层搬运：从一个货架移动物品到另一个 */
  _doMove(fromShelf, toShelf, itemId, amount) {
    const itemMeta = fromShelf.items[itemId];
    fromShelf.items[itemId].amount -= amount;
    if (fromShelf.items[itemId].amount <= 0) delete fromShelf.items[itemId];

    if (toShelf.items[itemId]) {
      toShelf.items[itemId].amount += amount;
    } else {
      toShelf.items[itemId] = {
        name: itemMeta.name,
        amount,
        ...(itemMeta.category ? { category: itemMeta.category } : {}),
        ...(itemMeta.meta ? { meta: itemMeta.meta } : {}),
      };
    }
  }

  /** 清空 NPC 搬运任务 */
  clearFangshiTask() {
    this._fangshiTask = null;
  }

  /** 查找货架（跨所有仓库） */
  _findShelf(shelfId) {
    for (const shelf of this.common.shelves) {
      if (shelf.id === shelfId) return shelf;
    }
    for (const cat of Object.values(this.storage)) {
      for (const shelf of (cat.shelves || [])) {
        if (shelf.id === shelfId) return shelf;
      }
    }
    return null;
  }

  // ======== 仓库解锁/升级 ========
  unlockWarehouse(category) {
    const cat = this.storage[category];
    if (!cat || cat.unlocked) return false;
    cat.unlocked = true;
    cat.level = 1;
    this._initSpecializedShelves(category);
    return true;
  }

  upgradeWarehouse(category) {
    const cat = this.storage[category];
    if (!cat || !cat.unlocked) return { success: false, message: '仓库未解锁' };

    cat.level++;
    const totalCap = cat.level * 200;
    const perShelf = Math.floor(totalCap / (cat.shelves.length || DEFAULT_SHELVES_PER));

    // 扩容现有货架
    for (const shelf of cat.shelves) {
      shelf.capacity = perShelf;
    }

    return {
      success: true,
      message: `${WAREHOUSE_CATEGORIES[category].name}仓库升级到${cat.level}级，每货架容量${perShelf}`,
    };
  }

  upgradeCommon() {
    this.common.level++;
    const totalCap = this.common.level * 300;
    const perShelf = Math.floor(totalCap / (this.common.shelves.length || DEFAULT_SHELVES_PER));

    for (const shelf of this.common.shelves) {
      shelf.capacity = perShelf;
    }

    return {
      success: true,
      message: `公共仓库升级到${this.common.level}级，每货架容量${perShelf}`,
    };
  }

  // ======== 摘要（供 UI 使用） ========
  getSummary() {
    const summary = { common: null, specialized: {} };

    summary.common = {
      name: '公共仓库',
      icon: '📦',
      level: this.common.level,
      shelves: this.common.shelves.map(s => ({
        id: s.id, name: s.name, capacity: s.capacity,
        used: s.used, items: { ...s.items },
      })),
      totalCapacity: this.common.shelves.reduce((s, sh) => s + sh.capacity, 0),
      totalUsed: this.getCommonUsed(),
    };

    for (const [catKey, catDef] of Object.entries(WAREHOUSE_CATEGORIES)) {
      const cat = this.storage[catKey];
      if (cat.unlocked) {
        const totalUsed = (cat.shelves || []).reduce((s, sh) => s + sh.used, 0);
        const totalCap = (cat.shelves || []).reduce((s, sh) => s + sh.capacity, 0);
        summary.specialized[catKey] = {
          ...catDef,
          level: cat.level,
          shelves: (cat.shelves || []).map(s => ({
            id: s.id, name: s.name, capacity: s.capacity,
            used: s.used, items: { ...s.items },
          })),
          totalCapacity: totalCap,
          totalUsed,
        };
      }
    }

    return summary;
  }

  // ====== 序列化 ======
  toJSON() {
    const storageData = {};
    for (const [catKey, cat] of Object.entries(this.storage)) {
      storageData[catKey] = {
        shelves: (cat.shelves || []).map(s => s.toJSON()),
        level: cat.level,
        unlocked: cat.unlocked,
      };
    }

    return {
      common: {
        shelves: this.common.shelves.map(s => s.toJSON()),
        level: this.common.level,
      },
      storage: storageData,
    };
  }

  static fromJSON(data) {
    const sys = new WarehouseSystem();

    if (!data) return sys;

    // 公共仓库
    if (data.common) {
      sys.common.level = data.common.level || 1;
      if (data.common.shelves && data.common.shelves.length > 0) {
        sys.common.shelves = data.common.shelves.map(s => StorageShelf.fromJSON(s));
      } else if (data.common.items) {
        // 迁移旧格式：将 flat items 分散到货架
        sys._initCommonShelves();
        sys._migrateItemsToShelves(data.common.items, sys.common.shelves);
      }
    }

    // 专用仓库
    if (data.storage) {
      for (const [catKey, catData] of Object.entries(data.storage)) {
        if (!sys.storage[catKey]) continue;
        sys.storage[catKey].level = catData.level || 0;
        sys.storage[catKey].unlocked = catData.unlocked || false;

        if (catData.shelves && catData.shelves.length > 0) {
          sys.storage[catKey].shelves = catData.shelves.map(s => StorageShelf.fromJSON(s));
        } else if (catData.items && catData.unlocked) {
          // 迁移旧格式
          sys._initSpecializedShelves(catKey);
          sys._migrateItemsToShelves(catData.items, sys.storage[catKey].shelves);
        } else if (catData.unlocked) {
          sys._initSpecializedShelves(catKey);
        }
      }
    }

    return sys;
  }

  /** 将旧的 flat items 迁移到货架数组 */
  _migrateItemsToShelves(items, shelves) {
    if (!items || shelves.length === 0) return;
    const itemEntries = Object.entries(items);
    let shelfIdx = 0;

    for (const [itemId, itemData] of itemEntries) {
      let remaining = itemData.amount || 0;
      while (remaining > 0 && shelfIdx < shelves.length) {
        const shelf = shelves[shelfIdx];
        const take = Math.min(remaining, shelf.remaining);
        if (take > 0) {
          shelf.items[itemId] = {
            name: itemData.name || itemId,
            amount: take,
            ...(itemData.category ? { category: itemData.category } : {}),
            ...(itemData.meta ? { meta: itemData.meta } : {}),
          };
          remaining -= take;
        }
        if (shelf.remaining <= 0) shelfIdx++;
      }
      // 如果所有货架都满了，剩余物品丢失（旧存档的极限情况）
    }
  }
}
