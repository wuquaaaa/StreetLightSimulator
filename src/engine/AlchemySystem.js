/**
 * 妙手炼丹系统 - 路灯计划
 *
 * 核心机制：
 * - NPC 被任命为「妙手」岗位后，每天消耗草药产出丹药
 * - 丹药类型：治愈丹（pill_heal）、增益丹（pill_buff）
 * - 产出受 NPC 特质/联动/功法影响
 * - 被动产出模式，不影响 NPCAISystem
 */

import { ALCHEMY_HERB_COST } from './constants';

// 丹药定义
const PILL_TYPES = {
  pill_heal: { name: '治愈丹', icon: '💊', category: 'herb', description: '恢复心情，治疗小伤' },
  pill_buff: { name: '增益丹', icon: '🧪', category: 'herb', description: '临时提升耕作效率' },
};

// 草药原料映射（后山采集的草药ID）
const HERB_MATERIALS = ['herb_root', 'herb_leaf', 'herb_flower'];

export class AlchemySystem {
  constructor() {
    // 积累的炼制进度（效率越高，产出越快）
    this.progress = {};
  }

  /**
   * 每日 tick——对所有妙手 NPC 尝试炼丹
   */
  tick(isNewDay, allCharacters, warehouse, logFn) {
    if (!isNewDay) return;

    const alchemists = allCharacters.filter(c => !c.isRetired && c.hasPost('miaoshou'));

    for (const alchemist of alchemists) {
      // 检查草药库存
      const herbAvailable = HERB_MATERIALS.some(h => warehouse.getTotalInCategory?.('herb') > 0);
      // fallback: 直接查 item
      const hasHerb = HERB_MATERIALS.some(h => {
        let total = 0;
        // 遍历所有仓库货架统计草药
        const checkShelves = (shelves) => {
          for (const s of shelves) {
            for (const [id, item] of Object.entries(s.items)) {
              if (HERB_MATERIALS.includes(id)) total += item.amount;
            }
          }
        };
        checkShelves(warehouse.common?.shelves || []);
        if (warehouse.storage?.herb) checkShelves(warehouse.storage.herb.shelves || []);
        return total > 0;
      });

      if (!hasHerb) continue; // 没草药，跳过

      // 消耗草药：优先消耗任一可用草药
      let herbConsumed = false;
      for (const herbId of HERB_MATERIALS) {
        const result = warehouse.removeItem('herb', herbId, ALCHEMY_HERB_COST);
        if (result.success) {
          herbConsumed = true;
          break;
        }
      }
      if (!herbConsumed) continue;

      // 计算产出
      const efficiency = this._getAlchemyEfficiency(alchemist);
      const key = alchemist.id;
      this.progress[key] = (this.progress[key] || 0) + efficiency;

      let pills = 0;
      while (this.progress[key] >= 1) {
        this.progress[key] -= 1;
        pills++;
      }

      if (pills === 0) continue;

      // 决定丹药类型（60%治愈丹，40%增益丹）
      for (let i = 0; i < pills; i++) {
        const type = Math.random() < 0.6 ? 'pill_heal' : 'pill_buff';
        const def = PILL_TYPES[type];
        const result = warehouse.addItem(def.category, type, def.name, 1, { icon: def.icon });
        if (result.overflow > 0) {
          logFn(`仓库满了！1颗${def.name}丢失`);
        }
      }

      const typeCounts = {};
      const label = [];
      for (let i = 0; i < pills; i++) {
        const t = Math.random() < 0.6 ? 'pill_heal' : 'pill_buff';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      }
      if (typeCounts.pill_heal) label.push(`${typeCounts.pill_heal}💊治愈丹`);
      if (typeCounts.pill_buff) label.push(`${typeCounts.pill_buff}🧪增益丹`);
      logFn(`⚗${alchemist.name}炼出 ${label.join('、')}`);

      // 炼丹经验
      if (typeof alchemist.gainKnowledge === 'function') {
        alchemist.gainKnowledge('farming', 2);
      }
    }
  }

  /**
   * 炼丹效率
   * 影响因素：学习天赋、辨识草药特质、草药大师联动
   */
  _getAlchemyEfficiency(character) {
    let eff = 0.3; // 基础：0.3 颗/天（约 3 天 1 颗）

    // 学习天赋
    const learningTalent = character.baseAttributes?.learningTalent || 50;
    eff *= 0.6 + (learningTalent / 100) * 0.8; // 范围: 0.6 ~ 1.4

    // 年龄衰退
    if (typeof character.getAgeEfficiencyModifier === 'function') {
      eff *= character.getAgeEfficiencyModifier();
    }

    // 特质加成
    for (const trait of (character.traits || [])) {
      if (trait.effects?.herbQualityBonus) {
        eff *= (1 + trait.effects.herbQualityBonus);
      }
      if (trait.effects?.workSpeedBonus) {
        eff *= (1 + trait.effects.workSpeedBonus);
      }
    }

    // 特质联动
    if (typeof character.getSynergyOutputMultiplier === 'function') {
      eff *= character.getSynergyOutputMultiplier();
    }

    return Math.max(0.1, Math.min(2.0, eff));
  }

  toJSON() {
    return { progress: { ...this.progress } };
  }

  static fromJSON(data) {
    const sys = new AlchemySystem();
    if (data?.progress) sys.progress = { ...data.progress };
    return sys;
  }
}
