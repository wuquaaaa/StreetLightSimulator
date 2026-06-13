/**
 * 炉工维修系统 - 路灯计划
 *
 * 核心机制：
 * - 炉工维护丹炉和冶炼炉，防止故障
 * - 设备有耐久度，使用后会损耗
 * - 维修需要材料（铁锭、石材等）
 * - 不维修 → 故障概率增加 → 影响炼丹/冶炼产出
 * - 维修质量受专注力/经验影响
 */

export const FURNACE_EQUIPMENT = {
  alchemy_furnace: {
    id: 'alchemy_furnace',
    name: '丹炉',
    icon: '⚗️',
    maxDurability: 100,
    decayRate: 0.5,        // 每tick自然损耗
    useDecayRate: 2.0,     // 每次使用损耗
    failureThreshold: 20,  // 低于此值有故障风险
    repairCost: { iron_ingot: 2, stone: 3 },
  },
  smelting_furnace: {
    id: 'smelting_furnace',
    name: '冶炼炉',
    icon: '🔥',
    maxDurability: 120,
    decayRate: 0.3,
    useDecayRate: 1.5,
    failureThreshold: 15,
    repairCost: { iron_ingot: 3, stone: 5 },
  },
};

export class RepairSystem {
  constructor() {
    this.equipment = {};  // equipId → { durability, lastRepairDay }
    this.repairProgress = {}; // npcId → { equipId, progress, total }
    this.dailyStats = {};
  }

  init() {
    for (const [id, def] of Object.entries(FURNACE_EQUIPMENT)) {
      this.equipment[id] = {
        id,
        durability: def.maxDurability,
        lastRepairDay: 0,
      };
    }
  }

  // ====== 玩家操作 ======

  /** 开始维修设备 */
  startRepair(equipId, character) {
    const def = FURNACE_EQUIPMENT[equipId];
    if (!def) return { success: false, message: '未知设备' };

    const equip = this.equipment[equipId];
    if (!equip) return { success: false, message: '设备不存在' };

    if (equip.durability >= def.maxDurability * 0.9) {
      return { success: false, message: '设备状态良好，无需维修' };
    }

    const key = character.id;
    this.repairProgress[key] = {
      equipId,
      progress: 0,
      total: 2, // 维修需要2个周期
    };

    return { success: true, message: `开始维修${def.name}` };
  }

  /** 紧急维修（快速但效果差） */
  emergencyRepair(equipId, character) {
    const def = FURNACE_EQUIPMENT[equipId];
    if (!def) return { success: false, message: '未知设备' };

    const equip = this.equipment[equipId];
    if (!equip) return { success: false, message: '设备不存在' };

    equip.durability = Math.min(def.maxDurability, equip.durability + 30);
    delete this.repairProgress[character.id];

    return { success: true, message: `紧急维修${def.name}完成，但状态不太理想` };
  }

  // ====== Tick ======

  tick(isNewDay, allCharacters, warehouse, logFn) {
    // 设备自然损耗
    for (const [id, equip] of Object.entries(this.equipment)) {
      const def = FURNACE_EQUIPMENT[id];
      equip.durability = Math.max(0, equip.durability - def.decayRate);
    }

    // 维修进度推进
    for (const [npcId, repair] of Object.entries(this.repairProgress)) {
      const character = allCharacters.find(c => c.id === npcId);
      if (!character || character.isRetired) {
        delete this.repairProgress[npcId];
        continue;
      }

      const efficiency = this._getRepairEfficiency(character);
      repair.progress += efficiency;

      if (repair.progress >= repair.total) {
        this._completeRepair(repair.equipId, character);
        delete this.repairProgress[npcId];

        if (typeof character.gainKnowledge === 'function') {
          character.gainKnowledge('farming', 1);
        }
      }
    }

    if (!isNewDay) return;

    // 炉工自动维修
    const tenders = allCharacters.filter(c => !c.isRetired && c.hasPost('furnace_tender'));
    for (const tender of tenders) {
      if (this.repairProgress[tender.id]) continue;

      // 找最需要维修的设备
      let worstEquip = null;
      let worstDurability = Infinity;
      for (const [id, equip] of Object.entries(this.equipment)) {
        const def = FURNACE_EQUIPMENT[id];
        const ratio = equip.durability / def.maxDurability;
        if (ratio < 0.5 && equip.durability < worstDurability) {
          worstEquip = id;
          worstDurability = equip.durability;
        }
      }

      if (worstEquip) {
        // 检查材料
        const def = FURNACE_EQUIPMENT[worstEquip];
        let canRepair = true;
        for (const [itemId, amount] of Object.entries(def.repairCost)) {
          if (warehouse.getItemAmount('mineral', itemId) < amount) {
            canRepair = false;
            break;
          }
        }
        if (canRepair) {
          for (const [itemId, amount] of Object.entries(def.repairCost)) {
            warehouse.removeItem('mineral', itemId, amount);
          }
          this.startRepair(worstEquip, tender);
        }
      }
    }
  }

  // ====== 内部方法 ======

  _completeRepair(equipId, character) {
    const def = FURNACE_EQUIPMENT[equipId];
    const equip = this.equipment[equipId];
    if (!def || !equip) return;

    const efficiency = this._getRepairEfficiency(character);
    const repairAmount = Math.floor(40 * efficiency);
    equip.durability = Math.min(def.maxDurability, equip.durability + repairAmount);
    equip.lastRepairDay = 0; // 会被外部设置
  }

  _getRepairEfficiency(character) {
    let eff = 0.5;

    const focus = character.baseAttributes?.focus || 50;
    eff *= 0.5 + (focus / 100) * 1.0;

    const constitution = character.baseAttributes?.constitution || 50;
    eff *= 0.6 + (constitution / 100) * 0.8;

    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    for (const trait of (character.traits || [])) {
      if (trait.effects?.workSpeedBonus) eff *= (1 + trait.effects.workSpeedBonus);
    }

    return Math.max(0.2, Math.min(2.0, eff));
  }

  /** 获取设备故障概率 */
  getFailureChance(equipId) {
    const def = FURNACE_EQUIPMENT[equipId];
    const equip = this.equipment[equipId];
    if (!def || !equip) return 0;

    if (equip.durability > def.failureThreshold) return 0;
    return (def.failureThreshold - equip.durability) / def.failureThreshold * 0.5;
  }

  // ====== 存档 ======

  toJSON() {
    return {
      equipment: { ...this.equipment },
      repairProgress: { ...this.repairProgress },
    };
  }

  static fromJSON(data) {
    const sys = new RepairSystem();
    if (data) {
      sys.equipment = data.equipment || {};
      sys.repairProgress = data.repairProgress || {};
    }
    return sys;
  }
}
