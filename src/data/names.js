/**
 * NPC 名字生成器 & 外貌描述 - 路灯计划
 *
 * 组合式姓名：百家姓 + 名字用字 → 成千上万种组合
 * 避重机制：同一场游戏内不会生成重名
 */

// ====== 百家姓（常见 120 姓）======
const SURNAMES = [
  '赵','钱','孙','李','周','吴','郑','王',
  '冯','陈','褚','卫','蒋','沈','韩','杨',
  '朱','秦','尤','许','何','吕','施','张',
  '孔','曹','严','华','金','魏','陶','姜',
  '戚','谢','邹','喻','柏','水','窦','章',
  '云','苏','潘','葛','奚','范','彭','郎',
  '鲁','韦','昌','马','苗','凤','花','方',
  '俞','任','袁','柳','酆','鲍','史','唐',
  '费','廉','岑','薛','雷','贺','倪','汤',
  '滕','殷','罗','毕','郝','邬','安','常',
  '乐','于','时','傅','皮','齐','康','伍',
  '余','元','卜','顾','孟','平','黄','和',
  '穆','萧','尹','姚','邵','湛','汪','祁',
  '毛','禹','狄','米','贝','明','臧','计',
  '伏','成','戴','谈','宋','茅','庞','熊',
];

// ====== 男性名字用字 ======

// 适合做单字名的（刚劲/文雅）
const MALE_SINGLE = [
  '虎','龙','刚','强','勇','武','锋','磊',
  '军','伟','杰','斌','涛','鹏','飞','亮',
  '明','辉','昊','天','宇','浩','然','远',
  '山','川','林','风','云','雷','松','柏',
  '石','铁','钢','柱','根','生','福','贵',
  '德','仁','义','礼','信','忠','正','平',
  '安','康','宁','寿','旺','兴','旺','成',
  '荣','华','富','昌','盛','宝','金','银',
];

// 名字第二字（可和上面的组合成双字名）
const MALE_SECOND = [
  '大','小','阿','老',
  '山','河','海','风','云','雷','雨','雪',
  '松','柏','竹','梅','林','泉','石','峰',
  '生','根','财','宝','福','禄','寿','喜',
  '文','武','才','德','志','义','忠','信',
  '明','亮','清','正','安','康','宁','平',
  '国','家','天','地','龙','虎','鹏','鹤',
  '铁','钢','石','木','金','银','玉','珠',
  '东','南','西','北','春','秋','冬','夏',
  '远','长','永','久','承','继','传','世',
  '大','壮','牛','蛋','娃','娃',
];

// ====== 女性名字用字 ======

const FEMALE_SINGLE = [
  '花','兰','梅','菊','荷','莲','竹','月',
  '凤','燕','蝶','莺','鹤','琴','兰','芳',
  '秀','娟','英','华','美','丽','珍','珠',
  '玉','翠','碧','琼','瑶','琳','珊','琳',
  '云','霞','雪','露','霜','雨','虹','晴',
  '春','秋','夏','冬','宁','静','怡','欣',
  '巧','灵','慧','敏','颖','聪','慧','雅',
];

const FEMALE_SECOND = [
  '小','阿','春','夏','秋','冬',
  '花','兰','梅','菊','荷','莲','竹','月',
  '凤','燕','蝶','莺','琴','兰','芳','秀',
  '珍','珠','玉','翠','碧','琼','瑶','琳',
  '云','霞','雪','露','霜','雨','虹','晴',
  '英','华','美','丽','秀','娟','芳','丽',
  '妹','娘','姑','姐','儿','娃','丫','妮',
  '巧','灵','慧','敏','静','怡','欣','宁',
  '红','绿','青','素','素','素','锦','绣',
  '香','芬','芬','芳','蕊','芯','芯','蕊',
];

// ====== 已用名字缓存（避免重名）======
const _usedNames = new Set();

/**
 * 重置已用名字缓存（新游戏时调用）
 */
export function resetNamePool() {
  _usedNames.clear();
}

/**
 * 生成一个不重复的随机名字
 * @param {'male'|'female'} gender
 * @param {Set<string>} [existingNames] - 额外的已用名字集合
 * @returns {string}
 */
export function generateName(gender, existingNames) {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];

  // 50% 概率单字名，50% 双字名
  const isSingleChar = Math.random() < 0.5;
  let name;

  if (isSingleChar) {
    const pool = gender === 'male' ? MALE_SINGLE : FEMALE_SINGLE;
    const char = pool[Math.floor(Math.random() * pool.length)];
    name = surname + char;
  } else {
    const pool1 = gender === 'male' ? MALE_SINGLE : FEMALE_SINGLE;
    const pool2 = gender === 'male' ? MALE_SECOND : FEMALE_SECOND;
    const char1 = pool1[Math.floor(Math.random() * pool1.length)];
    const char2 = pool2[Math.floor(Math.random() * pool2.length)];
    name = surname + char1 + char2;
  }

  // 避重：先检查全局缓存和传入的集合
  const allUsed = new Set([..._usedNames, ...(existingNames || [])]);
  if (allUsed.has(name)) {
    // 重试一次（概率极低会碰撞）
    return generateName(gender, existingNames);
  }

  _usedNames.add(name);
  return name;
}

/**
 * 批量生成不重复名字
 * @param {'male'|'female'} gender
 * @param {number} count
 * @param {Set<string>} [existingNames]
 * @returns {string[]}
 */
export function generateNames(gender, count, existingNames) {
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push(generateName(gender, existingNames));
    if (existingNames) {
      existingNames.add(names[names.length - 1]);
    }
  }
  return names;
}

// ====== 兼容旧代码的固定名字池（备用）======
export const MALE_NAMES = [
  '张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十',
  '陈大壮', '杨铁柱', '马大力', '林阿牛', '徐大宝', '冯铁蛋', '卫大山',
  '蒋小龙', '韩大牛', '曹石头', '袁铁根', '邓大柱', '萧远山', '叶问天',
  '沈牧之', '宋青山', '陆青云', '潘长安', '方子墨', '石破天', '程大业',
  '魏无双', '唐伯虎', '秦守正', '许敬之', '何清风', '傅承志', '苏铁生',
];

export const FEMALE_NAMES = [
  '刘小花', '黄翠兰', '朱小妹', '何秀英', '宋小美', '褚翠花', '沈秋菊', '韩冬梅',
  '赵婉儿', '钱灵珊', '孙巧巧', '周静怡', '吴碧云', '郑春花', '冯兰英', '陈秀娘',
  '杨素素', '马巧儿', '林青荷', '徐玉珍', '褚小凤', '蒋小红', '韩月娥', '曹素贞',
  '袁巧云', '邓春桃', '萧雨薇', '叶清秋', '沈碧瑶', '陆小蝶', '潘玉婷', '方婉清',
];

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
