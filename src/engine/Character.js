/**
 * 角色系统 - 路灯计划
 *
 * NPC 属性可见性三层：
 *   表层：性别、年龄、出身、特质、外貌 —— 招募时可见
 *   发现层：耕种等级、学习天赋、专注力、体质、忠诚度 —— 共事后揭示
 *   隐藏层：命格 —— 永远不可见，通过行为间接感知
 */

import { TRAIT_EFFECT_KEYS } from '../data/traits';
import { POSTS, getPostInfo } from '../data/posts';

// ====== 基础属性（发现层） ======
export const BASE_ATTRIBUTES = {
  leadership:  { name: '领导力',   description: '影响管理效率和团队协作', icon: '👑' },
  learning:    { name: '学习天赋', description: '影响经验增长速度', icon: '📖' },
  cooperation: { name: '合作能力', description: '影响与他人协作的效率', icon: '🤝' },
  focus:       { name: '专注力',   description: '影响工作品质和产出', icon: '🎯' },
  constitution:{ name: '体质',     description: '影响抗病能力和劳作耐力', icon: '💪' },
  loyalty:     { name: '忠诚度',   description: '影响逃跑概率和懈怠概率', icon: '🛡️' },
};

// ====== 经验属性（发现层） ======
export const KNOWLEDGE_ATTRIBUTES = {
  farming:  { name: '耕种等级', description: '影响农业产出量和速度', icon: '🌾' },
  research: { name: '研发经验', description: '影响科研速度和成果', icon: '🔬' },
  trading:  { name: '交易经验', description: '影响贸易利润', icon: '💰' },
  crafting: { name: '工艺经验', description: '影响制造质量和速度', icon: '🔨' },
  combat:   { name: '战斗经验', description: '影响军事能力', icon: '⚔️' },
};

// ====== 揭示系统配置 ======
// 共事多少 tick 后自动揭示对应属性
export const REVEAL_THRESHOLDS = {
  farming:      100,   // ~10天
  learning:     300,   // ~30天
  focus:        300,   // ~30天
  constitution: 200,   // ~20天
  loyalty:      500,   // ~50天
};

// ====== 退休年龄 ======
export const RETIRE_AGE = { male: 60, female: 55 };
// 退休前几年开始效率下降
export const AGE_DECLINE_START = { male: 55, female: 50 };

// ====== 心情标签 ======
export const MOOD_LABELS = {
  90: { text: '欣喜', icon: '😄', color: '#22c55e' },
  70: { text: '愉快', icon: '🙂', color: '#84cc16' },
  40: { text: '平静', icon: '😐', color: '#f59e0b' },
  20: { text: '低落', icon: '😞', color: '#f97316' },
  0:  { text: '痛苦', icon: '😣', color: '#ef4444' },
};

export function getMoodInfo(mood) {
  if (mood >= 90) return MOOD_LABELS[90];
  if (mood >= 70) return MOOD_LABELS[70];
  if (mood >= 40) return MOOD_LABELS[40];
  if (mood >= 20) return MOOD_LABELS[20];
  return MOOD_LABELS[0];
}

export const ROLES_THAT_REVEAL_ATTRIBUTES = ['scholar', 'advisor', 'leader'];

export class Character {
  /**
   * @param {object} opts
   * @param {string} opts.name
   * @param {string} [opts.role] - 兼容旧的单角色
   * @param {string[]} [opts.roles]
   * @param {boolean} [opts.isPlayer]
   * @param {'male'|'female'} [opts.gender]
   * @param {number} [opts.age]
   * @param {object} [opts.originTrait] - 出身特质 { id, name, icon, effects }
   * @param {object[]} [opts.traits] - 所有特质（含出身）
   * @param {object} [opts.fate] - 命格 { id, hint, category, modifiers }
   * @param {string} [opts.appearance] - 外貌描述
   */
  constructor({ name, role = 'farmer', roles, isPlayer = false,
    gender, age, originTrait, traits, fate, appearance,
  } = {}) {
    this.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    this.name = name;
    this.roles = roles || (role ? [role] : ['farmer']);
    this.isPlayer = isPlayer;

    // 心情 0-100
    this.mood = 70;

    // ====== 表层属性 ======
    this.gender = gender || (Math.random() < 0.55 ? 'male' : 'female');
    this.age = age ?? (18 + Math.floor(Math.random() * 35)); // 18-52
    this.appearance = appearance || '';
    this.traits = traits || [];        // 特质数组（含出身）
    this.fate = fate || null;          // 命格（隐藏）

    // ====== 基础属性（发现层） ======
    this.baseAttributes = {};
    for (const key of Object.keys(BASE_ATTRIBUTES)) {
      this.baseAttributes[key] = isPlayer
        ? 30 + Math.floor(Math.random() * 40)
        : 15 + Math.floor(Math.random() * 50);
    }

    // 应用特质加成到基础属性
    this._applyTraitBonuses();

    // ====== 经验属性（发现层） ======
    this.knowledgeAttributes = {};
    for (const key of Object.keys(KNOWLEDGE_ATTRIBUTES)) {
      this.knowledgeAttributes[key] = 0;
    }
    if (this.roles.includes('farmer')) {
      this.knowledgeAttributes.farming = 5;
    }
    // 应用出身的耕种经验加成
    if (originTrait?.effects?.farmingBonus) {
      this.knowledgeAttributes.farming = (this.knowledgeAttributes.farming || 0) + originTrait.effects.farmingBonus;
    }

    // ====== 揭示系统 ======
    // revealedAttributes: { farming: 100, learning: 300, ... } 记录揭示时的共事tick数
    this.revealedAttributes = {};
    this.daysWorked = 0;  // 共事天数（tick 计数，在 GameState 中递增）

    // 旧字段兼容
    this.attributesRevealed = false;

    // ====== 岗位系统（司务堂） ======
    // posts: NPC 担任的岗位列表（不含 farmer，farmer 由 roles 决定）
    // 种地通过 hasRole('farmer') + hasFarmerPost() 判断
    this.posts = [];             // ['zhike', 'fangshi', ...]
    this.learnedGongfu = [];     // 已学会的功法 ID 列表（退休失效）
  }

  // 兼容旧代码
  get role() { return this.roles[0] || 'farmer'; }
  set role(val) { this.roles = [val]; }

  hasRole(role) { return this.roles.includes(role); }

  /**
   * 应用特质加成到基础属性
   */
  _applyTraitBonuses() {
    for (const trait of this.traits) {
      if (!trait.effects) continue;
      for (const [key, value] of Object.entries(trait.effects)) {
        if (key in this.baseAttributes) {
          this.baseAttributes[key] = Math.max(1, Math.min(100, (this.baseAttributes[key] || 50) + value));
        }
      }
    }
  }

  /**
   * 获取退休年龄（考虑命格修改）
   */
  get retireAge() {
    const base = this.gender === 'female' ? RETIRE_AGE.female : RETIRE_AGE.male;
    if (this.fate?.modifiers?.retireAgeDelay) {
      return base + this.fate.modifiers.retireAgeDelay;
    }
    return base;
  }

  // ====== 岗位系统（司务堂） ======

  /**
   * 是否担任种地岗位（由 roles 决定 + 没有独占岗位）
   */
  get isFarmerPost() {
    // 如果有独占岗位（铁道/妙手），不算农夫岗位
    for (const postId of this.posts) {
      const post = getPostInfo(postId);
      if (post && post.exclusive) return false;
    }
    return this.hasRole('farmer');
  }

  /**
   * 是否担任某个岗位
   */
  hasPost(postId) {
    return this.posts.includes(postId);
  }

  /**
   * 担任岗位的总精力消耗
   */
  get postEnergyCost() {
    let cost = 0;
    for (const postId of this.posts) {
      const post = getPostInfo(postId);
      if (post) cost += post.energyCost;
    }
    return Math.min(1.0, cost);
  }

  /**
   * 种地岗位的精力比例
   * 如果是农夫岗位且无独占岗位，剩余精力就是种地的
   */
  get farmEnergyRatio() {
    if (!this.isFarmerPost) return 0;
    const used = this.postEnergyCost;
    return Math.max(0, 1.0 - used);
  }

  /**
   * 任命岗位（检查精力上限）
   * @returns {{ success: boolean, message: string }}
   */
  assignPost(postId) {
    const post = getPostInfo(postId);
    if (!post) return { success: false, message: '未知岗位' };

    if (this.posts.includes(postId)) {
      return { success: false, message: `已经担任${post.name}了` };
    }

    // 检查独占冲突
    if (post.exclusive && this.posts.length > 0) {
      return { success: false, message: `${post.name}是独占岗位，不能兼任其他岗位` };
    }
    // 检查已有独占岗位
    const hasExclusive = this.posts.some(pid => {
      const p = getPostInfo(pid);
      return p && p.exclusive;
    });
    if (hasExclusive) {
      return { success: false, message: '已有独占岗位，无法再担任其他岗位' };
    }

    // 检查精力是否溢出
    const newCost = this.postEnergyCost + post.energyCost;
    if (newCost > 1.0) {
      return { success: false, message: '精力不足，无法再担任更多岗位' };
    }

    this.posts.push(postId);
    return { success: true, message: `${this.name}被任命为${post.name}` };
  }

  /**
   * 移除岗位
   */
  removePost(postId) {
    const idx = this.posts.indexOf(postId);
    if (idx < 0) return { success: false, message: '未担任该岗位' };
    const post = getPostInfo(postId);
    this.posts.splice(idx, 1);
    return { success: true, message: `${this.name}被免去${post?.name || '岗位'}` };
  }

  /**
   * 退休时清除功法
   */
  onRetire() {
    this.learnedGongfu = [];
    this.posts = [];
  }

  /**
   * 是否已退休
   */
  get isRetired() {
    return this.age >= this.retireAge;
  }

  /**
   * 是否进入衰退期
   */
  get isDeclining() {
    const declineStart = this.gender === 'female' ? AGE_DECLINE_START.female : AGE_DECLINE_START.male;
    return this.age >= declineStart;
  }

  /**
   * 衰退效率修正（0.0~1.0）
   * 退休年龄-5 每年下降 5%
   */
  getAgeEfficiencyModifier() {
    if (!this.isDeclining) return 1.0;
    const declineStart = this.gender === 'female' ? AGE_DECLINE_START.female : AGE_DECLINE_START.male;
    const yearsOver = this.age - declineStart;
    return Math.max(0.2, 1.0 - yearsOver * 0.05);
  }

  /**
   * 获取食物消耗倍率（考虑特质+命格）
   */
  getFoodConsumptionModifier() {
    let mod = 1.0;
    for (const trait of this.traits) {
      if (trait.effects?.foodConsumptionBonus) {
        mod += trait.effects.foodConsumptionBonus;
      }
    }
    if (this.fate?.modifiers?.foodConsumption) {
      mod += this.fate.modifiers.foodConsumption;
    }
    return Math.max(0.3, mod);
  }

  /**
   * 获取工作速率（含特质修正+年龄修正+岗位精力修正）
   */
  getFarmWorkSpeed() {
    const farming = this.knowledgeAttributes.farming || 0;
    let speed = 2 * (1 + farming / 100);
    // 特质修正
    for (const trait of this.traits) {
      if (trait.effects?.workSpeedBonus) {
        speed *= (1 + trait.effects.workSpeedBonus);
      }
    }
    // 年龄衰退
    speed *= this.getAgeEfficiencyModifier();
    // 岗位精力修正：种地岗位只获得剩余精力比例的速度
    speed *= this.farmEnergyRatio;
    return Math.max(0, speed);
  }

  /**
   * 获取显示用的速率值
   */
  getDisplaySpeed() {
    return this.getFarmWorkSpeed() / 2;
  }

  /**
   * 检查属性是否已揭示
   */
  isAttributeRevealed(attrKey) {
    // 旧兼容：全揭示模式
    if (this.attributesRevealed || this.roles.some(r => ROLES_THAT_REVEAL_ATTRIBUTES.includes(r))) {
      return true;
    }
    // 检查揭示阈值
    const threshold = REVEAL_THRESHOLDS[attrKey];
    if (threshold == null) return true; // 不在揭示列表中的默认可见
    return (this.revealedAttributes[attrKey] || 0) >= threshold;
  }

  /**
   * 更新揭示进度（每 tick 调用）
   * @param {number} increment - tick 数
   */
  updateRevealProgress(increment = 1) {
    this.daysWorked += increment;
    for (const [key, threshold] of Object.entries(REVEAL_THRESHOLDS)) {
      if (this.isAttributeRevealed(key)) continue;
      this.revealedAttributes[key] = (this.revealedAttributes[key] || 0) + increment;
    }
  }

  /**
   * 获取属性的揭示进度百分比
   */
  getRevealProgress(attrKey) {
    const threshold = REVEAL_THRESHOLDS[attrKey];
    if (!threshold) return 1;
    if (this.isAttributeRevealed(attrKey)) return 1;
    return Math.min(1, (this.revealedAttributes[attrKey] || 0) / threshold);
  }

  // 心情变化
  changeMood(amount) {
    this.mood = Math.max(0, Math.min(100, this.mood + amount));
  }

  getWorkEfficiency(knowledgeKey, baseAttrKey) {
    const baseValue = this.baseAttributes[baseAttrKey] || 50;
    const knowledgeValue = this.knowledgeAttributes[knowledgeKey] || 0;
    const baseMod = 0.6 + (baseValue / 100) * 0.8;
    const knowledgeMod = 0.7 + (knowledgeValue / 100) * 0.8;
    const moodMod = 0.7 + (this.mood / 100) * 0.3;
    return baseMod * knowledgeMod * moodMod * this.getAgeEfficiencyModifier();
  }

  getQualityRate(knowledgeKey) {
    const focusValue = this.baseAttributes.focus || 50;
    const knowledgeValue = this.knowledgeAttributes[knowledgeKey] || 0;
    const rate = (focusValue * 0.6 + knowledgeValue * 0.4) / 100;
    return Math.max(0.1, Math.min(0.95, rate));
  }

  calculateOutput(baseAmount, knowledgeKey, baseAttrKey = 'focus') {
    const efficiency = this.getWorkEfficiency(knowledgeKey, baseAttrKey);
    const qualityRate = this.getQualityRate(knowledgeKey);
    const amount = Math.max(1, Math.floor(baseAmount * efficiency));
    const isHighQuality = Math.random() < qualityRate;
    return { amount, isHighQuality };
  }

  gainKnowledge(knowledgeKey, baseAmount) {
    if (!(knowledgeKey in this.knowledgeAttributes)) return;
    const learningMod = 0.5 + (this.baseAttributes.learning || 50) / 100;
    const actualGain = baseAmount * learningMod;
    this.knowledgeAttributes[knowledgeKey] = Math.min(100, this.knowledgeAttributes[knowledgeKey] + actualGain);
  }

  modifyBaseAttribute(attrKey, amount) {
    if (!(attrKey in this.baseAttributes)) return;
    this.baseAttributes[attrKey] = Math.max(1, Math.min(100, this.baseAttributes[attrKey] + amount));
  }

  canSeeAttributes() {
    return this.attributesRevealed || this.roles.some(r => ROLES_THAT_REVEAL_ATTRIBUTES.includes(r));
  }

  revealAttributes() {
    this.attributesRevealed = true;
  }

  // 序列化
  toJSON() {
    return {
      id: this.id, name: this.name, roles: [...this.roles], isPlayer: this.isPlayer,
      mood: this.mood,
      // 表层
      gender: this.gender,
      age: this.age,
      appearance: this.appearance,
      traits: this.traits.map(t => ({ ...t })),
      fate: this.fate ? { ...this.fate } : null,
      // 属性
      baseAttributes: { ...this.baseAttributes },
      knowledgeAttributes: { ...this.knowledgeAttributes },
      // 揭示
      revealedAttributes: { ...this.revealedAttributes },
      daysWorked: this.daysWorked,
      // 旧兼容
      attributesRevealed: this.attributesRevealed,
      // 岗位系统
      posts: [...this.posts],
      learnedGongfu: [...this.learnedGongfu],
    };
  }

  static fromJSON(data) {
    const roles = data.roles || (data.role ? [data.role] : ['farmer']);
    const char = new Character({
      name: data.name, roles, isPlayer: data.isPlayer,
      gender: data.gender,
      age: data.age,
      appearance: data.appearance,
      traits: data.traits || [],
      fate: data.fate || null,
    });
    char.id = data.id;
    char.mood = data.mood ?? 70;
    char.baseAttributes = { ...data.baseAttributes };
    char.knowledgeAttributes = { ...data.knowledgeAttributes };
    char.revealedAttributes = data.revealedAttributes || {};
    char.daysWorked = data.daysWorked || 0;
    char.attributesRevealed = data.attributesRevealed;
    // 岗位系统
    char.posts = data.posts || [];
    char.learnedGongfu = data.learnedGongfu || [];
    return char;
  }
}
