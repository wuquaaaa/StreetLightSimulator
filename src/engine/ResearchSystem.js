/**
 * 司务堂（研究系统）- 路灯计划
 *
 * 管理岗位研究和功法研究两个板块：
 *
 * 1. 执事册（岗位研究）：
 *    - 研究解锁新岗位（如房事、村长、铁道、妙手）
 *    - 研究完成后可在游戏中任命 NPC 到该岗位
 *
 * 2. 功法帖（功法研究）：
 *    - 研究解锁功法供 NPC 学习
 *    - 功法绑定 NPC 个人，退休失效
 *    - 学习时间受导师（已学会且在同工作地点的 NPC）加速
 *    - 农田阶段：导师和徒弟必须在同一块地上
 *    - 后续（丹炉等）：同理，同工作台/同丹炉
 *
 * 触发条件：玩家第一次完成招募后自动解锁
 */

import { POSTS, getPostInfo } from '../data/posts';
import { GONGFU, getGongfuInfo, canResearch as canResearchGongfu } from '../data/gongfu';
import { TICKS_PER_DAY } from './constants';

// 学习速度常数
const MENTOR_SPEED_BONUS = 0.4;   // 有导师时额外加速
const BASE_LEARN_TICKS_PER_DAY = TICKS_PER_DAY;
const BASE_RESEARCH_TICKS_PER_DAY = TICKS_PER_DAY;

export class ResearchSystem {
  constructor() {
    // 研究系统是否已解锁
    this.unlocked = false;

    // 岗位研究：已研究的岗位 ID 集合
    this.researchedPosts = new Set();

    // 功法研究：已研究的功法 ID 集合
    this.researchedGongfu = new Set();

    // 当前正在研究的功法（一次只能研究一个）
    // { gongfuId: string, progress: number, totalTicks: number }
    this.currentGongfuResearch = null;

    // NPC 学习功法进度
    // Map<characterId, { gongfuId: string, progress: number, totalTicks: number }>
    this.npcLearning = new Map();
  }

  /**
   * 解锁研究系统（玩家首次招募后调用）
   * @param {string} logMsg - 日志消息
   */
  unlock(logMsg) {
    if (this.unlocked) return;
    this.unlocked = true;
    // 知客岗位自动获得（不需要研究）
    this.researchedPosts.add('zhike');
  }

  /**
   * 获取岗位是否已研究（可用）
   */
  isPostResearched(postId) {
    return this.researchedPosts.has(postId);
  }

  /**
   * 获取功法是否已研究（NPC可学习）
   */
  isGongfuResearched(gongfuId) {
    return this.researchedGongfu.has(gongfuId);
  }

  /**
   * 获取岗位是否可以被研究（前置已满足）
   */
  canResearchPost(postId) {
    const post = getPostInfo(postId);
    if (!post || !post.researchCost) return false;
    if (this.researchedPosts.has(postId)) return false;
    return (post.requires || []).every(req => this.researchedPosts.has(req));
  }

  /**
   * 获取功法是否可以被研究（前置已满足）
   */
  canResearchGongfu(gongfuId) {
    return canResearchGongfu(gongfuId, this.researchedGongfu);
  }

  /**
   * 开始研究岗位
   * @returns {{ success: boolean, message: string }}
   */
  startPostResearch(postId) {
    const post = getPostInfo(postId);
    if (!post) return { success: false, message: '未知岗位' };
    if (!post.researchCost) return { success: false, message: '该岗位不需要研究' };
    if (this.researchedPosts.has(postId)) return { success: false, message: '该岗位已经研究过了' };
    if (!this.canResearchPost(postId)) return { success: false, message: '前置岗位尚未研究' };

    // 岗位研究即时完成（简化设计：研究时间用天数表达，但实现为直接完成+等待天数）
    this.researchedPosts.add(postId);
    return {
      success: true,
      message: `岗位「${post.name}」研究完成！现在可以任命${post.name}了`,
    };
  }

  /**
   * 开始研究功法
   * @returns {{ success: boolean, message: string }}
   */
  startGongfuResearch(gongfuId) {
    if (this.currentGongfuResearch) {
      const cur = getGongfuInfo(this.currentGongfuResearch.gongfuId);
      return { success: false, message: `正在研究「${cur?.name}」，请等待完成` };
    }
    const gongfu = getGongfuInfo(gongfuId);
    if (!gongfu) return { success: false, message: '未知功法' };
    if (this.researchedGongfu.has(gongfuId)) return { success: false, message: '该功法已经研究过了' };
    if (!this.canResearchGongfu(gongfuId)) return { success: false, message: '前置功法尚未研究' };

    const totalTicks = gongfu.researchCost * BASE_RESEARCH_TICKS_PER_DAY;
    this.currentGongfuResearch = {
      gongfuId,
      progress: 0,
      totalTicks,
    };
    return { success: true, message: `开始参悟「${gongfu.name}」，预计需要 ${gongfu.researchCost} 天` };
  }

  /**
   * 检查某个 NPC 学习功法时，是否有导师在同一工作地点
   * 农田阶段：导师和徒弟必须被分配到同一块地（assignedTo 重叠）
   * 后续扩展（丹炉等）：根据工作台/丹炉分配判断
   *
   * @param {string} learnerId - 学徒 ID
   * @param {string} gongfuId - 功法 ID
   * @param {Character[]} allNPCs - 所有 NPC（含玩家）
   * @param {FarmSystem} [farm] - 农田系统（用于检查地块分配）
   * @returns {{ hasMentor: boolean, mentors: Character[] }}
   */
  _getMentorsOnSameWorksite(learnerId, gongfuId, allNPCs, farm) {
    // 找到所有已学会该功法的非本人NPC
    const mentors = allNPCs.filter(n =>
      n.id !== learnerId &&
      !n.isRetired &&
      n.learnedGongfu &&
      n.learnedGongfu.includes(gongfuId)
    );

    if (!farm || mentors.length === 0) {
      return { hasMentor: false, mentors: [] };
    }

    // 获取学徒负责的地块
    const learnerPlots = farm.getPlotsForCharacter(learnerId);
    if (learnerPlots.length === 0) {
      return { hasMentor: false, mentors: [] };
    }
    const learnerPlotIds = new Set(learnerPlots.map(p => p.id));

    // 筛选与学徒在同一地块的导师
    const onSiteMentors = mentors.filter(mentor => {
      const mentorPlots = farm.getPlotsForCharacter(mentor.id);
      return mentorPlots.some(p => learnerPlotIds.has(p.id));
    });

    return {
      hasMentor: onSiteMentors.length > 0,
      mentors: onSiteMentors,
    };
  }

  /**
   * NPC 开始学习功法
   * @param {string} characterId
   * @param {string} gongfuId
   * @param {Character} npc - NPC 角色对象
   * @param {Character[]} allNPCs - 所有 NPC 列表（含玩家）
   * @param {FarmSystem} [farm] - 农田系统（用于检查同地块导师）
   * @returns {{ success: boolean, message: string }}
   */
  startLearning(characterId, gongfuId, npc, allNPCs, farm) {
    // 检查是否已在学习
    if (this.npcLearning.has(characterId)) {
      const cur = getGongfuInfo(this.npcLearning.get(characterId).gongfuId);
      return { success: false, message: `${npc.name}正在学习「${cur?.name}」` };
    }
    // 检查是否已学会
    if (npc.learnedGongfu && npc.learnedGongfu.includes(gongfuId)) {
      return { success: false, message: `${npc.name}已经学会了这个功法` };
    }
    // 检查功法是否已研究
    if (!this.researchedGongfu.has(gongfuId)) {
      return { success: false, message: '该功法尚未研究完成' };
    }

    const gongfu = getGongfuInfo(gongfuId);
    if (!gongfu) return { success: false, message: '未知功法' };

    // 检查是否有同工作地点的导师
    const { hasMentor, mentors } = this._getMentorsOnSameWorksite(characterId, gongfuId, allNPCs, farm);

    // 基础学习时间，有导师时缩短
    const baseTicks = gongfu.learnTime * BASE_LEARN_TICKS_PER_DAY;
    const mentorMul = hasMentor ? (1 - (gongfu.mentorBonus || MENTOR_SPEED_BONUS)) : 1.0;
    const totalTicks = Math.ceil(baseTicks * mentorMul);

    // 学习天赋影响学习速度
    const learningMod = 0.7 + (npc.baseAttributes.learning || 50) / 100 * 0.6;
    const finalTicks = Math.ceil(totalTicks / learningMod);

    this.npcLearning.set(characterId, {
      gongfuId,
      progress: 0,
      totalTicks: finalTicks,
      hasMentor,
    });

    const mentorText = hasMentor
      ? `（${mentors.map(m => m.name).join('、')}在同地块传功指点，进度加快）`
      : '';
    return {
      success: true,
      message: `${npc.name}开始修习「${gongfu.name}」，预计需要 ${Math.ceil(finalTicks / TICKS_PER_DAY)} 天${mentorText}`,
    };
  }

  /**
   * 取消 NPC 学习
   */
  cancelLearning(characterId, npc) {
    if (!this.npcLearning.has(characterId)) {
      return { success: false, message: `${npc.name}没有在学习任何功法` };
    }
    const cur = getGongfuInfo(this.npcLearning.get(characterId).gongfuId);
    this.npcLearning.delete(characterId);
    return { success: true, message: `${npc.name}停止了修习「${cur?.name}」` };
  }

  /**
   * 每 tick 推进研究进度
   * @param {Character[]} npcs - 所有 NPC
   * @param {FarmSystem} [farm] - 农田系统（用于动态检查导师同地块）
   * @returns {{ messages: string[] }}
   */
  tick(npcs, farm) {
    const messages = [];

    // 推进功法研究
    if (this.currentGongfuResearch) {
      this.currentGongfuResearch.progress++;
      if (this.currentGongfuResearch.progress >= this.currentGongfuResearch.totalTicks) {
        const gongfuId = this.currentGongfuResearch.gongfuId;
        const gongfu = getGongfuInfo(gongfuId);
        this.researchedGongfu.add(gongfuId);
        this.currentGongfuResearch = null;
        messages.push(`参悟成功！功法「${gongfu.name}」已可传授。`);
      }
    }

    // 推进 NPC 学习
    for (const [charId, learning] of this.npcLearning) {
      // 动态检查导师状态（导师可能被重新分配地块）
      const { hasMentor } = this._getMentorsOnSameWorksite(
        charId, learning.gongfuId, npcs, farm
      );
      const prevMentor = learning.hasMentor;
      learning.hasMentor = hasMentor;

      // 提示导师状态变化
      if (prevMentor && !hasMentor) {
        const npc = npcs.find(n => n.id === charId);
        const gongfu = getGongfuInfo(learning.gongfuId);
        if (npc && gongfu) {
          messages.push(`${npc.name}修习「${gongfu.name}」失去导师指点，进度变慢了。`);
        }
      } else if (!prevMentor && hasMentor) {
        const npc = npcs.find(n => n.id === charId);
        const gongfu = getGongfuInfo(learning.gongfuId);
        if (npc && gongfu) {
          messages.push(`${npc.name}修习「${gongfu.name}」获得导师指点，进度加快了！`);
        }
      }

      learning.progress++;
      if (learning.progress >= learning.totalTicks) {
        const gongfu = getGongfuInfo(learning.gongfuId);
        const npc = npcs.find(n => n.id === charId);
        if (npc) {
          if (!npc.learnedGongfu) npc.learnedGongfu = [];
          npc.learnedGongfu.push(learning.gongfuId);
          messages.push(`${npc.name}参悟「${gongfu.name}」大成！从此他负责的地块将受益于此功法。`);
          npc.gainKnowledge('research', 3);
        }
        this.npcLearning.delete(charId);
      }
    }

    return { messages };
  }

  /**
   * 获取 NPC 的功法效果集合（用于地块效率计算）
   * @param {Character} npc
   * @returns {Map<string, number>} effectType → value
   */
  getNpcGongfuEffects(npc) {
    const effects = new Map();
    if (!npc.learnedGongfu || !npc.isRetired === false) return effects;
    for (const gongfuId of npc.learnedGongfu) {
      const gongfu = getGongfuInfo(gongfuId);
      if (gongfu && gongfu.effect) {
        effects.set(gongfu.effect.type, (effects.get(gongfu.effect.type) || 0) + gongfu.effect.value);
      }
    }
    return effects;
  }

  /**
   * 获取某功法是否有同工作地点的导师（已学会的 NPC 且在同一地块）
   */
  hasMentor(gongfuId, learnerId, allNPCs, farm) {
    return this._getMentorsOnSameWorksite(learnerId, gongfuId, allNPCs, farm).hasMentor;
  }

  // ====== 序列化 ======
  toJSON() {
    return {
      unlocked: this.unlocked,
      researchedPosts: [...this.researchedPosts],
      researchedGongfu: [...this.researchedGongfu],
      currentGongfuResearch: this.currentGongfuResearch ? { ...this.currentGongfuResearch } : null,
      npcLearning: this.npcLearning.size > 0
        ? Object.fromEntries([...this.npcLearning].map(([k, v]) => [k, { ...v }]))
        : {},
    };
  }

  static fromJSON(data) {
    const sys = new ResearchSystem();
    if (!data) return sys;
    sys.unlocked = data.unlocked || false;
    sys.researchedPosts = new Set(data.researchedPosts || []);
    sys.researchedGongfu = new Set(data.researchedGongfu || []);
    sys.currentGongfuResearch = data.currentGongfuResearch || null;
    if (data.npcLearning && typeof data.npcLearning === 'object') {
      sys.npcLearning = new Map(Object.entries(data.npcLearning));
    }
    return sys;
  }
}
