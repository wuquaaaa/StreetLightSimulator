/**
 * 角色系统 - 路灯计划
 *
 * 基础属性：角色天赋，生成后基本固定，仅通过特定稀有方式改变（如特殊事件、道具）
 * 知识属性：从事相关工作会成长
 * 两者前期全部隐藏，只有解锁特定身份后才能查看
 * 两者共同影响工作的产出和良率
 */

// 基础属性定义（天赋，基本不变）
export const BASE_ATTRIBUTES = {
  leadership: { name: '领导能力', description: '影响管理效率和团队协作', icon: '👑' },
  learning: { name: '学习能力', description: '影响获取新知识和技能的速度，间接加快知识属性成长', icon: '📖' },
  cooperation: { name: '合作能力', description: '影响与他人协作的效率和多人任务产出', icon: '🤝' },
  focus: { name: '专注能力', description: '影响工作良率和产出品质', icon: '🎯' },
};

// 知识属性定义（从事相关工作成长）
export const KNOWLEDGE_ATTRIBUTES = {
  farming: { name: '耕种经验', description: '影响农业产出量', icon: '🌾' },
  research: { name: '研发经验', description: '影响科研速度和成果', icon: '🔬' },
  trading: { name: '交易经验', description: '影响贸易利润', icon: '💰' },
  crafting: { name: '工艺经验', description: '影响制造质量和速度', icon: '🔨' },
  combat: { name: '战斗经验', description: '影响军事能力', icon: '⚔️' },
};

// 哪些身份可以查看属性
export const ROLES_THAT_REVEAL_ATTRIBUTES = ['scholar', 'advisor', 'leader'];

export class Character {
  constructor({ name, role = 'farmer', isPlayer = false }) {
    this.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    this.name = name;
    this.role = role;
    this.isPlayer = isPlayer;

    // ======== 基础属性（天赋，创建时随机，之后基本固定） ========
    this.baseAttributes = {};
    for (const key of Object.keys(BASE_ATTRIBUTES)) {
      this.baseAttributes[key] = isPlayer
        ? 30 + Math.floor(Math.random() * 40) // 玩家 30-70
        : 15 + Math.floor(Math.random() * 50); // NPC 15-65
    }

    // ======== 知识属性（从事相关工作成长） ========
    this.knowledgeAttributes = {};
    for (const key of Object.keys(KNOWLEDGE_ATTRIBUTES)) {
      this.knowledgeAttributes[key] = 0;
    }

    // 农民身份给少量初始耕种经验
    if (role === 'farmer') {
      this.knowledgeAttributes.farming = 5;
    }

    // ======== 属性可见性（前期全部隐藏） ========
    this.attributesRevealed = false;

    // ======== 体力 ========
    this.stamina = 100;
    this.maxStamina = 100;
    this.status = 'idle';
  }

  // ======== 产出计算：基础属性 × 知识属性 联合影响 ========

  /**
   * 计算某项工作的综合效率
   * @param {string} knowledgeKey - 相关知识属性 (如 'farming')
   * @param {string} baseAttrKey - 主要关联的基础属性 (如 'focus')
   * @returns {number} 综合效率系数，基准为1.0
   *
   * 公式：效率 = 基础属性系数 × 知识属性系数
   *   基础属性系数 = 0.6 + (属性值 / 100) × 0.8    → 范围 0.6~1.4
   *   知识属性系数 = 0.7 + (经验值 / 100) × 0.8    → 范围 0.7~1.5
   *   综合范围：0.42 ~ 2.1
   */
  getWorkEfficiency(knowledgeKey, baseAttrKey) {
    const baseValue = this.baseAttributes[baseAttrKey] || 50;
    const knowledgeValue = this.knowledgeAttributes[knowledgeKey] || 0;

    const baseMod = 0.6 + (baseValue / 100) * 0.8;
    const knowledgeMod = 0.7 + (knowledgeValue / 100) * 0.8;

    return baseMod * knowledgeMod;
  }

  /**
   * 计算良率（品质概率）
   * 主要受「专注能力」（基础属性）和相关知识属性影响
   * @returns {number} 良率 0~1
   */
  getQualityRate(knowledgeKey) {
    const focusValue = this.baseAttributes.focus || 50;
    const knowledgeValue = this.knowledgeAttributes[knowledgeKey] || 0;

    // 专注力贡献60%权重，知识经验贡献40%权重
    const rate = (focusValue * 0.6 + knowledgeValue * 0.4) / 100;
    return Math.max(0.1, Math.min(0.95, rate));
  }

  /**
   * 计算产出量
   * @param {number} baseAmount - 基础产量
   * @param {string} knowledgeKey - 相关知识属性
   * @param {string} baseAttrKey - 主要基础属性（默认 focus）
   * @returns {{ amount: number, isHighQuality: boolean }}
   */
  calculateOutput(baseAmount, knowledgeKey, baseAttrKey = 'focus') {
    const efficiency = this.getWorkEfficiency(knowledgeKey, baseAttrKey);
    const qualityRate = this.getQualityRate(knowledgeKey);

    const amount = Math.max(1, Math.floor(baseAmount * efficiency));
    const isHighQuality = Math.random() < qualityRate;

    return { amount, isHighQuality };
  }

  // ======== 知识属性成长 ========

  /**
   * 从事工作后获得知识经验
   * 成长速度受「学习能力」（基础属性）影响
   */
  gainKnowledge(knowledgeKey, baseAmount) {
    if (!(knowledgeKey in this.knowledgeAttributes)) return;

    const learningMod = 0.5 + (this.baseAttributes.learning || 50) / 100;
    const actualGain = baseAmount * learningMod;

    this.knowledgeAttributes[knowledgeKey] = Math.min(
      100,
      this.knowledgeAttributes[knowledgeKey] + actualGain
    );
  }

  // ======== 基础属性变更（仅特定方式） ========

  /**
   * 通过特殊事件/道具改变基础属性
   * 普通工作不会改变基础属性
   */
  modifyBaseAttribute(attrKey, amount) {
    if (!(attrKey in this.baseAttributes)) return;
    this.baseAttributes[attrKey] = Math.max(1, Math.min(100, this.baseAttributes[attrKey] + amount));
  }

  // ======== 属性可见性 ========

  /**
   * 检查当前身份是否可以查看属性
   */
  canSeeAttributes() {
    return this.attributesRevealed || ROLES_THAT_REVEAL_ATTRIBUTES.includes(this.role);
  }

  /**
   * 永久解锁属性可见（比如完成特定任务）
   */
  revealAttributes() {
    this.attributesRevealed = true;
  }

  // ======== 体力系统 ========

  useStamina(amount) {
    if (this.stamina < amount) return false;
    this.stamina = Math.max(0, this.stamina - amount);
    return true;
  }

  restoreStamina(amount = 30) {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
  }
}
