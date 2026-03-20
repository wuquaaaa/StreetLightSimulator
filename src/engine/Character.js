/**
 * 角色系统 - 路灯计划
 */

export const BASE_ATTRIBUTES = {
  leadership: { name: '领导能力', description: '影响管理效率和团队协作', icon: '👑' },
  learning: { name: '学习能力', description: '影响获取新知识和技能的速度', icon: '📖' },
  cooperation: { name: '合作能力', description: '影响与他人协作的效率', icon: '🤝' },
  focus: { name: '专注能力', description: '影响工作良率和产出品质', icon: '🎯' },
};

export const KNOWLEDGE_ATTRIBUTES = {
  farming: { name: '耕种经验', description: '影响农业产出量', icon: '🌾' },
  research: { name: '研发经验', description: '影响科研速度和成果', icon: '🔬' },
  trading: { name: '交易经验', description: '影响贸易利润', icon: '💰' },
  crafting: { name: '工艺经验', description: '影响制造质量和速度', icon: '🔨' },
  combat: { name: '战斗经验', description: '影响军事能力', icon: '⚔️' },
};

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
  constructor({ name, role = 'farmer', roles, isPlayer = false }) {
    this.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    this.name = name;
    // 支持多角色：优先使用 roles 数组，兼容旧的单 role
    this.roles = roles || (role ? [role] : ['farmer']);
    this.isPlayer = isPlayer;

    // 心情 0-100
    this.mood = 70;

    this.baseAttributes = {};
    for (const key of Object.keys(BASE_ATTRIBUTES)) {
      this.baseAttributes[key] = isPlayer
        ? 30 + Math.floor(Math.random() * 40)
        : 15 + Math.floor(Math.random() * 50);
    }

    this.knowledgeAttributes = {};
    for (const key of Object.keys(KNOWLEDGE_ATTRIBUTES)) {
      this.knowledgeAttributes[key] = 0;
    }

    if (this.roles.includes('farmer')) {
      this.knowledgeAttributes.farming = 5;
    }

    this.attributesRevealed = false;
  }

  // 兼容旧代码：返回第一个角色
  get role() { return this.roles[0] || 'farmer'; }
  set role(val) { this.roles = [val]; }

  hasRole(role) { return this.roles.includes(role); }

  /**
   * 获取工作速率：基准2秒一次操作
   * 务农经验100%时速率翻倍（1秒一次）
   * 返回：每个game tick执行的操作次数（tick=2s）
   * 基准=1次/tick，经验100%=2次/tick
   */
  getFarmWorkSpeed() {
    const farming = this.knowledgeAttributes.farming || 0;
    return 1 + farming / 100; // 1.0 ~ 2.0
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
    // 心情也影响效率：低心情减产
    const moodMod = 0.7 + (this.mood / 100) * 0.3; // 0.7~1.0
    return baseMod * knowledgeMod * moodMod;
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
      baseAttributes: { ...this.baseAttributes },
      knowledgeAttributes: { ...this.knowledgeAttributes },
      attributesRevealed: this.attributesRevealed,
    };
  }

  static fromJSON(data) {
    // 兼容旧存档的单 role 字段
    const roles = data.roles || (data.role ? [data.role] : ['farmer']);
    const char = new Character({ name: data.name, roles, isPlayer: data.isPlayer });
    char.id = data.id;
    char.mood = data.mood ?? 70;
    char.baseAttributes = { ...data.baseAttributes };
    char.knowledgeAttributes = { ...data.knowledgeAttributes };
    char.attributesRevealed = data.attributesRevealed;
    return char;
  }
}
