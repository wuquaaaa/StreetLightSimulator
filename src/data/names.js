/**
 * NPC 名字池 & 外貌生成 - 路灯计划
 *
 * 按性别分类的名字，以及外貌描述生成器。
 */

// ====== 男性名字 ======
export const MALE_NAMES = [
  '张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十',
  '陈大壮', '杨铁柱', '马大力', '林阿牛', '徐大宝', '冯铁蛋', '卫大山',
  '蒋小龙', '韩大牛', '曹石头', '袁铁根', '邓大柱', '萧远山', '叶问天',
  '沈牧之', '宋青山', '陆青云', '潘长安', '方子墨', '石破天', '程大业',
  '魏无双', '唐伯虎', '秦守正', '许敬之', '何清风', '傅承志', '苏铁生',
];

// ====== 女性名字 ======
export const FEMALE_NAMES = [
  '刘小花', '黄翠兰', '朱小妹', '何秀英', '宋小美', '褚翠花', '沈秋菊', '韩冬梅',
  '赵婉儿', '钱灵珊', '孙巧巧', '周静怡', '吴碧云', '郑春花', '冯兰英', '陈秀娘',
  '杨素素', '马巧儿', '林青荷', '徐玉珍', '褚小凤', '蒋小红', '韩月娥', '曹素贞',
  '袁巧云', '邓春桃', '萧雨薇', '叶清秋', '沈碧瑶', '陆小蝶', '潘玉婷', '方婉清',
];

// 合并导出（兼容旧代码）
export const NPC_NAMES = [...MALE_NAMES, ...FEMALE_NAMES];

// ====== 外貌描述生成 ======

const MALE_AGE_PREFIXES = {
  young: ['年轻', '清瘦', '精干', '瘦小', '结实'],
  middle: ['中年', '黝黑', '壮实', '魁梧', '微胖', '精瘦'],
  old: ['花白头发', '佝偻', '瘦削', '满皱纹', '驼背'],
};

const FEMALE_AGE_PREFIXES = {
  young: ['年轻', '清秀', '苗条', '娇小', '水灵'],
  middle: ['中年', '黝黑', '健壮', '微胖', '利落'],
  old: ['花白头发', '慈眉善目', '佝偻', '瘦削', '满脸皱纹'],
};

const MALE_BODY_DESC = [
  '的汉子', '的男人', '的小伙子', '的庄稼人',
  '的壮汉', '的汉子，满手老茧',
];
const FEMALE_BODY_DESC = [
  '的女子', '的妇人', '的姑娘', '的村姑',
  '的女子，手脚麻利',
];

/**
 * 根据性别和年龄生成外貌描述
 * @param {'male'|'female'} gender
 * @param {number} age
 * @returns {string}
 */
export function generateAppearance(gender, age) {
  const ageGroup = age < 30 ? 'young' : age < 50 ? 'middle' : 'old';
  const prefixes = gender === 'male' ? MALE_AGE_PREFIXES[ageGroup] : FEMALE_AGE_PREFIXES[ageGroup];
  const bodies = gender === 'male' ? MALE_BODY_DESC : FEMALE_BODY_DESC;

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];

  return `${prefix}${body}`;
}
