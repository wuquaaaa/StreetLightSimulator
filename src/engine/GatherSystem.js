/**
 * 后山采集系统 - 路灯计划
 *
 * 核心机制：
 * - 资源点不会枯竭，NPC 分配后每天自动产出
 * - NPC 可兼职（与农田系统类似），分配到资源点即可
 * - 产出 = 基础产量 * NPC效率
 * - 被动产出模式：不需要 NPC 主动执行操作，NPCAISystem 不需要改
 */

import { RESOURCE_TYPES, INITIAL_GATHER_NODES } from '../data/gather-nodes';

// ======================================================
// ResourceNode — 资源点
// ======================================================

export class ResourceNode {
  constructor(def) {
    const typeDef = RESOURCE_TYPES[def.type];
    this.id = def.id;
    this.name = def.name || typeDef.name;
    this.type = def.type;         // 'lumber' | 'stone'
    this.description = def.description || '';
    this.icon = def.icon || typeDef.icon;
    this.assignedTo = [];          // 分配的 NPC id 列表
    // 以下从 RESOURCE_TYPES 读取
    this.baseDailyYield = typeDef.baseDailyYield;
    this.maxAssignees = typeDef.maxAssignees;
    this.category = typeDef.category;
  }

  getTypeDef() {
    return RESOURCE_TYPES[this.type];
  }

  canAssign() {
    return this.assignedTo.length < this.maxAssignees;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      icon: this.icon,
      assignedTo: [...this.assignedTo],
    };
  }

  static fromJSON(data) {
    const node = new ResourceNode({ type: data.type, id: data.id });
    node.name = data.name;
    node.description = data.description || '';
    node.icon = data.icon;
    node.assignedTo = Array.isArray(data.assignedTo) ? [...data.assignedTo] : [];
    return node;
  }
}

// ======================================================
// GatherSystem — 采集系统
// ======================================================

export class GatherSystem {
  constructor() {
    this.nodes = [];              // ResourceNode[]
    this.unlocked = false;        // 是否已解锁（后山小径建好后）
  }

  /**
   * 解锁后山采集系统
   */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.nodes = INITIAL_GATHER_NODES.map(def => new ResourceNode(def));
  }

  /**
   * 分配 NPC 到资源点
   */
  assignNode(nodeId, characterId) {
    if (!this.unlocked) return { success: false, message: '后山尚未开通' };
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { success: false, message: '找不到资源点' };
    if (node.assignedTo.includes(characterId)) {
      return { success: false, message: '已分配到该资源点' };
    }
    if (!node.canAssign()) {
      return { success: false, message: `${node.name}已满（最多${node.maxAssignees}人）` };
    }
    node.assignedTo.push(characterId);
    return { success: true, message: `已分配到${node.name}` };
  }

  /**
   * 取消分配
   */
  unassignNode(nodeId, characterId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { success: false, message: '找不到资源点' };
    if (characterId) {
      node.assignedTo = node.assignedTo.filter(id => id !== characterId);
    } else {
      node.assignedTo = [];
    }
    return { success: true, message: '已取消分配' };
  }

  /**
   * 获取 NPC 负责的资源点
   */
  getNodesForCharacter(characterId) {
    return this.nodes.filter(n => n.assignedTo.includes(characterId));
  }

  /**
   * 获取某类型资源点
   */
  getNodesByType(type) {
    return this.nodes.filter(n => n.type === type);
  }

  /**
   * 计算每日预计总产出（不实际入库，用于UI显示）
   */
  getDailySummary(allCharacters) {
    const summary = { lumber: 0, stone: 0 };
    for (const node of this.nodes) {
      for (const charId of node.assignedTo) {
        const char = allCharacters.find(c => c.id === charId);
        if (!char || char.isRetired) continue;
        const eff = this._getGatherEfficiency(char);
        summary[node.type] += node.baseDailyYield * eff;
      }
    }
    summary.lumber = Math.floor(summary.lumber);
    summary.stone = Math.floor(summary.stone);
    return summary;
  }

  /**
   * 每 tick 调用
   * @param {boolean} isNewDay - 是否新的一天
   * @param {Character[]} allCharacters - 所有角色列表（含玩家）
   * @param {WarehouseSystem} warehouse - 仓库
   * @param {(msg:string)=>void} logFn - 日志函数
   */
  tick(isNewDay, allCharacters, warehouse, logFn) {
    if (!this.unlocked || this.nodes.length === 0) return;

    if (!isNewDay) return;

    // 新的一天：计算每个资源点的总产出
    for (const node of this.nodes) {
      if (node.assignedTo.length === 0) continue;

      let totalYield = 0;
      for (const charId of node.assignedTo) {
        const char = allCharacters.find(c => c.id === charId);
        if (!char || char.isRetired) continue;
        const efficiency = this._getGatherEfficiency(char);
        totalYield += node.baseDailyYield * efficiency;
      }

      const finalYield = Math.max(1, Math.floor(totalYield));
      const typeDef = node.getTypeDef();

      const result = warehouse.addItem(
        typeDef.category, typeDef.id, typeDef.name, finalYield
      );

      const msg = `${node.icon}${node.name}产出了 ${finalYield} ${typeDef.name}`;
      logFn(msg);
      if (result.overflow > 0) {
        logFn(`仓库满了！${result.overflow}单位${typeDef.name}丢失`);
      }
    }
  }

  /**
   * 计算 NPC 采集效率
   * 采集是体力活，参考体质+年龄+特质
   */
  _getGatherEfficiency(character) {
    let eff = 1.0;
    // 体质影响
    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.7 + (constitution / 100) * 0.6;
    // 年龄衰退
    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }
    // 特质修正（workSpeedBonus）
    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) {
        eff *= (1 + trait.effects.workSpeedBonus);
      }
    }
    return Math.max(0.2, Math.min(2.0, eff));
  }

  toJSON() {
    return {
      nodes: this.nodes.map(n => n.toJSON()),
      unlocked: this.unlocked,
    };
  }

  static fromJSON(data) {
    const system = new GatherSystem();
    system.unlocked = data.unlocked || false;
    if (data.nodes && data.nodes.length > 0) {
      system.nodes = data.nodes.map(n => ResourceNode.fromJSON(n));
    } else if (system.unlocked) {
      // 兼容：已解锁但没有节点数据，初始化默认节点
      system.nodes = INITIAL_GATHER_NODES.map(def => new ResourceNode(def));
    }
    return system;
  }
}
