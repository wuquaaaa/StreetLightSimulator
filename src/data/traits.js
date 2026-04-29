/**
 * NPC 特质系统 - 路灯计划
 *
 * 特质是 NPC 的表层可见属性，一个 NPC 可以拥有 1-3 个特质。
 * 特质在招募时直接可见，提供直接的数值加成。
 */

// ====== 出身类特质（每个 NPC 必有 1 个） ======
export const ORIGIN_TRAITS = {
  peasant: {
    id: 'peasant',
    name: '农民出身',
    icon: '🌾',
    category: 'origin',
    description: '从小在田间长大，对农活驾轻就熟',
    effects: { farmingBonus: 5 },
  },
  hunter: {
    id: 'hunter',
    name: '猎户出身',
    icon: '🏹',
    category: 'origin',
    description: '常年在山间狩猎，不擅长种地但身强力壮',
    effects: { constitutionBonus: 10 },
  },
  fisherman: {
    id: 'fisherman',
    name: '渔夫出身',
    icon: '🐟',
    category: 'origin',
    description: '靠水吃水，对水边劳作得心应手',
    effects: { farmingBonus: 1, focusBonus: 3 },
  },
  merchant: {
    id: 'merchant',
    name: '商贩出身',
    icon: '💰',
    category: 'origin',
    description: '见过世面，脑子灵活，但吃不了苦',
    effects: { learningBonus: 5, farmingBonus: -3 },
  },
  scholar_family: {
    id: 'scholar_family',
    name: '书香门第',
    icon: '📚',
    category: 'origin',
    description: '虽家境中落，但读书识字，领悟力极强',
    effects: { learningBonus: 10, farmingBonus: -5 },
  },
  vagrant: {
    id: 'vagrant',
    name: '流浪汉',
    icon: '🚶',
    category: 'origin',
    description: '四海为家，什么都干过一点',
    effects: { farmingBonus: 2, learningBonus: 2, focusBonus: 2 },
  },
  miner: {
    id: 'miner',
    name: '矿工出身',
    icon: '⛏️',
    category: 'origin',
    description: '常年在矿洞里干活，力气大，但皮肤不好',
    effects: { constitutionBonus: 15, cooperationBonus: -3 },
  },
  herb_apprentice: {
    id: 'herb_apprentice',
    name: '药铺学徒',
    icon: '🌿',
    category: 'origin',
    description: '在药铺帮过工，对草药有些了解',
    effects: { farmingBonus: 3, focusBonus: 5 },
  },
  blacksmith: {
    id: 'blacksmith',
    name: '铁匠学徒',
    icon: '🔨',
    category: 'origin',
    description: '打铁的出身，力气大，性子直',
    effects: { constitutionBonus: 8, cooperationBonus: -2 },
  },
  orphan: {
    id: 'orphan',
    name: '孤儿',
    icon: '👁️',
    category: 'origin',
    description: '从小独自生存，什么都会一点，但性格孤僻',
    effects: { farmingBonus: 2, learningBonus: 3, cooperationBonus: -5 },
  },
};

// 出身权重分配（招募时随机抽取出身）
export const ORIGIN_WEIGHTS = {
  peasant: 30,
  hunter: 10,
  fisherman: 8,
  merchant: 8,
  scholar_family: 5,
  vagrant: 15,
  miner: 8,
  herb_apprentice: 5,
  blacksmith: 6,
  orphan: 5,
};

// ====== 通用特质（可有 0-2 个） ======
export const GENERAL_TRAITS = {
  hardworking: {
    id: 'hardworking',
    name: '勤劳',
    icon: '💪',
    category: 'general',
    description: '干活不知疲倦，效率更高，也更早发现杂草',
    effects: { workSpeedBonus: 0.15, weedVigilance: -10 },
    rarity: 'common',
  },
  lazy: {
    id: 'lazy',
    name: '懒惰',
    icon: '😴',
    category: 'general',
    description: '能偷懒就偷懒，干活慢，杂草长满了才发现',
    effects: { workSpeedBonus: -0.2, weedVigilance: 15, waterVigilance: -10 },
    rarity: 'common',
  },
  clever: {
    id: 'clever',
    name: '聪慧过人',
    icon: '🧠',
    category: 'general',
    description: '领悟力极强，学到快，浇水时机精准',
    effects: { learningBonus: 15, waterVigilance: 5 },
    rarity: 'uncommon',
  },
  clumsy: {
    id: 'clumsy',
    name: '笨手笨脚',
    icon: '🤕',
    category: 'general',
    description: '干活总出差错，效率低，除虫也费劲',
    effects: { focusBonus: -10, workSpeedBonus: -0.15, pestEfficiency: -1 },
    rarity: 'common',
  },
  stubborn: {
    id: 'stubborn',
    name: '固执己见',
    icon: '😑',
    category: 'general',
    description: '很犟，不轻易改变想法',
    effects: { cooperationBonus: -10, loyaltyBonus: 5 },
    rarity: 'common',
  },
  loyal: {
    id: 'loyal',
    name: '忠心耿耿',
    icon: '🛡️',
    category: 'general',
    description: '对主人忠心不二，绝不背叛',
    effects: { loyaltyBonus: 20 },
    rarity: 'uncommon',
  },
  greedy: {
    id: 'greedy',
    name: '贪吃',
    icon: '🍖',
    category: 'general',
    description: '饭量惊人，消耗更多食物',
    effects: { foodConsumptionBonus: 0.5 },
    rarity: 'common',
  },
  frugal: {
    id: 'frugal',
    name: '节俭',
    icon: '🍚',
    category: 'general',
    description: '吃很少就够，粮食消耗减半',
    effects: { foodConsumptionBonus: -0.3 },
    rarity: 'uncommon',
  },
  sickly: {
    id: 'sickly',
    name: '体弱多病',
    icon: '🤒',
    category: 'general',
    description: '身体不好，容易生病',
    effects: { constitutionBonus: -15 },
    rarity: 'uncommon',
  },
  iron_body: {
    id: 'iron_body',
    name: '铁骨铮铮',
    icon: '🏋️',
    category: 'general',
    description: '体格强健，几乎不生病，除虫有力',
    effects: { constitutionBonus: 20, pestEfficiency: 1 },
    rarity: 'rare',
  },
  herb_sense: {
    id: 'herb_sense',
    name: '辨识草药',
    icon: '🌱',
    category: 'general',
    description: '对草药有天生的敏感，灵草品质略高',
    effects: { herbQualityBonus: 0.1 },
    rarity: 'rare',
  },
  talkative: {
    id: 'talkative',
    name: '能说会道',
    icon: '🗣️',
    category: 'general',
    description: '嘴巴很厉害，擅长搞关系',
    effects: { cooperationBonus: 10, loyaltyBonus: -3 },
    rarity: 'common',
  },
  quiet: {
    id: 'quiet',
    name: '沉默寡言',
    icon: '🤫',
    category: 'general',
    description: '不爱说话，但干活踏实',
    effects: { focusBonus: 5, cooperationBonus: -3 },
    rarity: 'common',
  },
};

// 通用特质抽取权重（null 表示不可获得）
export const GENERAL_TRAIT_WEIGHTS = {
  hardworking: 20,
  lazy: 15,
  clever: 8,
  clumsy: 12,
  stubborn: 10,
  loyal: 6,
  greedy: 10,
  frugal: 5,
  sickly: 8,
  iron_body: 3,
  herb_sense: 3,
  talkative: 12,
  quiet: 12,
};

// ====== 特质联动系统 ======
/**
 * 特质联动（Synergy）：当 NPC 同时拥有两个特定特质时触发额外效果
 *
 * 设计原则（方案 B）：联动修改操作产出，不影响操作频率（零性能压力）
 * - outputMultiplier: 所有农田操作产出乘数（收获/浇水/施肥/除草/除虫）
 * - pestMultiplier: 除虫/灵蛊清除效率额外加成
 * - waterMultiplier: 浇水效果额外加成
 * - fertilizeMultiplier: 施肥效果额外加成
 * - herbQualityBonus: 灵草品质判定加成
 * - herbYieldBonus: 灵草产量加成
 * - farmingExpBonus: 耕种经验获取加成
 * - learningExpBonus: 学习力获取加成
 * - foodReduction: 食物消耗减免（负值=减少）
 */
export const TRAIT_SYNERGIES = [
  // ====== 出身 × 通用 ======
  {
    id: 'old_farmer',
    requiredTraits: ['peasant', 'hardworking'],
    name: '老农本色',
    icon: '🌾💪',
    description: '世代务农的底子配上不惜力的性子，农田产出比旁人高出一截',
    effects: { outputMultiplier: 1.10, farmingExpBonus: 0.3 },
  },
  {
    id: 'hunter_body',
    requiredTraits: ['hunter', 'iron_body'],
    name: '猎人体魄',
    icon: '🏹🏋️',
    description: '长年狩猎炼出的警觉配合铁打的身板，除虫格外利索',
    effects: { outputMultiplier: 1.08, pestMultiplier: 1.5 },
  },
  {
    id: 'fisher_clever',
    requiredTraits: ['fisherman', 'clever'],
    name: '渔者之智',
    icon: '🐟🧠',
    description: '水边讨生活的经验加上灵活脑子，浇水时机和水量拿捏得准',
    effects: { outputMultiplier: 1.05, waterMultiplier: 1.3 },
  },
  {
    id: 'merchant_talk',
    requiredTraits: ['merchant', 'talkative'],
    name: '商贾之舌',
    icon: '💰🗣️',
    description: '见过世面的商贩配上能说会道，做事讲究方法',
    effects: { outputMultiplier: 1.05 },
  },
  {
    id: 'scholar_clever',
    requiredTraits: ['scholar_family', 'clever'],
    name: '家学渊源',
    icon: '📚🧠',
    description: '书香门第的底子遇上天生聪慧，学什么都快人一步',
    effects: { outputMultiplier: 1.08, learningExpBonus: 0.3 },
  },
  {
    id: 'miner_iron',
    requiredTraits: ['miner', 'iron_body'],
    name: '矿工体魄',
    icon: '⛏️🏋️',
    description: '矿洞里打磨出的筋骨，干农活力气使不完',
    effects: { outputMultiplier: 1.10 },
  },
  {
    id: 'herb_master',
    requiredTraits: ['herb_apprentice', 'herb_sense'],
    name: '草药大师',
    icon: '🌿🌱',
    description: '药铺学徒的见识与辨识草药的天赋融为一体，种出的灵草品质拔群',
    effects: { outputMultiplier: 1.08, herbQualityBonus: 0.15, herbYieldBonus: 0.1 },
  },
  {
    id: 'smith_fire',
    requiredTraits: ['blacksmith', 'hardworking'],
    name: '铁火淬炼',
    icon: '🔨💪',
    description: '打铁的韧劲配上不惜力的性子，施肥特别到位',
    effects: { outputMultiplier: 1.08, fertilizeMultiplier: 1.3 },
  },
  {
    id: 'vagrant_frugal',
    requiredTraits: ['vagrant', 'frugal'],
    name: '江湖节省',
    icon: '🚶🍚',
    description: '四海为家的经历加上节俭本性，吃得少还干得好',
    effects: { outputMultiplier: 1.05, foodReduction: -0.15 },
  },
  {
    id: 'orphan_loyal',
    requiredTraits: ['orphan', 'loyal'],
    name: '孤心归处',
    icon: '👁️🛡️',
    description: '从小无依无靠，一旦找到归宿便倾尽全力，忠诚无人能及',
    effects: { outputMultiplier: 1.10 },
  },
  // ====== 通用 × 通用 ======
  {
    id: 'diligent_scholar',
    requiredTraits: ['hardworking', 'clever'],
    name: '勤智双全',
    icon: '💪🧠',
    description: '勤奋与聪慧兼备，做什么都事半功倍——千里挑一的组合',
    effects: { outputMultiplier: 1.15 },
  },
  {
    id: 'loyal_worker',
    requiredTraits: ['loyal', 'hardworking'],
    name: '忠勤不怠',
    icon: '🛡️💪',
    description: '忠心耿耿又勤劳肯干，绝不会偷懒耍滑',
    effects: { outputMultiplier: 1.12 },
  },
  {
    id: 'iron_worker',
    requiredTraits: ['iron_body', 'hardworking'],
    name: '铁骨勤劳',
    icon: '🏋️💪',
    description: '强健的体格配上勤劳的性子，除虫时格外有力',
    effects: { outputMultiplier: 1.12, pestMultiplier: 1.5 },
  },
  {
    id: 'clever_herb',
    requiredTraits: ['clever', 'herb_sense'],
    name: '灵智识草',
    icon: '🧠🌱',
    description: '聪慧的头脑对草药的敏感度更上一层',
    effects: { outputMultiplier: 1.05, herbQualityBonus: 0.1 },
  },
];

/**
 * 检查一组特质中是否存在某个联动
 * @param {string[]} traitIds - NPC 拥有的特质 ID 列表
 * @param {object} synergy - 联动定义
 * @returns {boolean}
 */
export function hasTraitSynergy(traitIds, synergy) {
  return synergy.requiredTraits.every(tid => traitIds.includes(tid));
}

/**
 * 从特质 ID 列表中获取所有激活的联动
 * @param {string[]} traitIds
 * @returns {object[]} 激活的联动列表
 */
export function getActiveSynergies(traitIds) {
  return TRAIT_SYNERGIES.filter(s => hasTraitSynergy(traitIds, s));
}

// ====== 特质效果索引 ======
// 统一定义所有可能的特质效果 key 及其含义
export const TRAIT_EFFECT_KEYS = {
  farmingBonus:        { name: '耕种经验加成', unit: '' },
  learningBonus:       { name: '学习力加成', unit: '' },
  focusBonus:          { name: '专注力加成', unit: '' },
  cooperationBonus:    { name: '合作力加成', unit: '' },
  constitutionBonus:   { name: '体质加成', unit: '' },
  loyaltyBonus:        { name: '忠诚度加成', unit: '' },
  workSpeedBonus:      { name: '工作效率修正', unit: '%' },
  foodConsumptionBonus:{ name: '食物消耗修正', unit: '%' },
  herbQualityBonus:    { name: '草药品质修正', unit: '%' },
  weedVigilance:       { name: '杂草感知', unit: '负值=更早除草' },
  waterVigilance:      { name: '浇水勤快度', unit: '正值=更早浇水' },
  pestEfficiency:      { name: '除虫效率', unit: '每动作清除更多严重度' },
  // 特质联动效果
  outputMultiplier:    { name: '联动产出加成', unit: '所有操作产出乘数' },
  pestMultiplier:      { name: '联动除虫加成', unit: '除虫效率额外乘数' },
  waterMultiplier:     { name: '联动浇水加成', unit: '浇水效果额外乘数' },
  fertilizeMultiplier: { name: '联动施肥加成', unit: '施肥效果额外乘数' },
  herbYieldBonus:      { name: '灵草产量加成', unit: '%' },
  farmingExpBonus:     { name: '耕种经验加成', unit: '%' },
  learningExpBonus:    { name: '学习力加成', unit: '%' },
  foodReduction:       { name: '食物消耗减免', unit: '负值=减少消耗' },
};

/**
 * 从特质池中随机抽取一个特质（加权随机）
 */
export function rollOriginTrait() {
  const entries = Object.entries(ORIGIN_WEIGHTS);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [id] of entries) {
    roll -= ORIGIN_WEIGHTS[id];
    if (roll <= 0) return ORIGIN_TRAITS[id];
  }
  return ORIGIN_TRAITS.peasant;
}

/**
 * 随机决定是否有通用特质，有则抽取 0-2 个
 */
export function rollGeneralTraits(count = 1) {
  const traits = [];
  const pool = { ...GENERAL_TRAIT_WEIGHTS };

  for (let i = 0; i < count; i++) {
    const entries = Object.entries(pool).filter(([, w]) => w > 0);
    if (entries.length === 0) break;
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [id] of entries) {
      roll -= pool[id];
      if (roll <= 0) {
        traits.push(GENERAL_TRAITS[id]);
        pool[id] = 0; // 已抽取，不再重复
        break;
      }
    }
  }
  return traits;
}
