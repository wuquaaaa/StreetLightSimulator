/**
 * NPC 命格系统 - 路灯计划
 *
 * 命格是 NPC 隐性命运标签，玩家永远看不到具体文字。
 * 通过概率偏移影响游戏事件，玩家只能通过观察行为间接感知。
 */

// 命格稀有度
export const FATE_RARITY = {
  common:   { name: '凡命',   weight: 60, color: '#9ca3af' },  // 灰色（玩家不可见）
  uncommon: { name: '异命',   weight: 20, color: '#60a5fa' },  // 蓝色
  rare:     { name: '天命',   weight: 5,  color: '#c084fc' },  // 紫色
  none:     { name: '无命格', weight: 15, color: '#374151' },  // 无命格
};

// ====== 命格定义 ======
export const FATES = {

  // ---- ⭐ 常见命格（凡命） ----
  industrious_fate: {
    id: 'industrious_fate',
    // 玩家不可见，此名称仅用于日志线索
    hint: '此人身强体壮，似乎从不叫苦叫累',
    category: 'common',
    modifiers: {
      diseaseChance: -0.3,      // 疾病概率 -30%
      moodSwing: -0.2,          // 心情波动幅度 -20%
    },
    weight: 15,
  },
  lucky_star: {
    id: 'lucky_star',
    hint: '此人身边似乎总是有些好事发生……',
    category: 'common',
    modifiers: {
      goodEventChance: 0.25,    // 好事件概率 +25%
    },
    weight: 12,
  },
  money_drainer: {
    id: 'money_drainer',
    hint: '不知道为什么，有他在的时候粮食总是损耗得很快',
    category: 'common',
    modifiers: {
      ratDamageChance: 0.3,     // 仓库鼠灾概率 +30%
      grainRotChance: 0.3,      // 粮食霉变概率 +30%
    },
    weight: 10,
  },
  pest_magnet: {
    id: 'pest_magnet',
    hint: '虫群似乎对他管的地特别感兴趣……',
    category: 'common',
    modifiers: {
      pestSpreadToSelf: 0.4,    // 病虫害传播到自身地块 +40%
    },
    weight: 8,
  },
  fertile_soil: {
    id: 'fertile_soil',
    hint: '他种的地，庄稼总是长得格外好',
    category: 'common',
    modifiers: {
      growthSpeedBonus: 0.05,   // 生长速度 +5%
      yieldBonus: 0.05,         // 产量上限 +5%
    },
    weight: 10,
  },
  glutton_curse: {
    id: 'glutton_curse',
    hint: '此人食量惊人，一顿能吃三人份',
    category: 'common',
    modifiers: {
      foodConsumption: 0.5,     // 食物消耗 +50%
    },
    weight: 5,
  },

  // ---- ⭐⭐ 稀有命格（异命） ----
  herb_conduit: {
    id: 'herb_conduit',
    hint: '他种的草药似乎蕴含着不同寻常的灵性……',
    category: 'uncommon',
    modifiers: {
      herbQualityUpChance: 0.1, // 草药品质上浮一级 10%
    },
    weight: 5,
  },
  disaster_star: {
    id: 'disaster_star',
    hint: '自从他来了，周围的地总是出些问题……',
    category: 'uncommon',
    modifiers: {
      nearbyBadEventChance: 0.2, // 周边地块负面事件 +20%
    },
    weight: 4,
  },
  spirit_gatherer: {
    id: 'spirit_gatherer',
    hint: '灵田的灵气似乎在他身边格外活跃',
    category: 'uncommon',
    modifiers: {
      spiritAuraRecovery: 0.3,  // 灵气回复速度 +30%
    },
    weight: 4,
  },
  iron_stomach: {
    id: 'iron_stomach',
    hint: '此人什么剩饭都敢吃，还从来没出过事',
    category: 'uncommon',
    modifiers: {
      foodPoisonImmune: true,    // 免疫食物中毒
    },
    weight: 3,
  },
  lone_star: {
    id: 'lone_star',
    hint: '其他人在他身边似乎总有些不自在……',
    category: 'uncommon',
    modifiers: {
      nearbyMoodPenalty: 5,      // 附近 NPC 心情 -5/天
      selfMoodImmune: true,      // 自身心情不受影响
    },
    weight: 3,
  },
  talent_scout: {
    id: 'talent_scout',
    hint: '跟着他干活，总感觉学东西特别快',
    category: 'uncommon',
    modifiers: {
      nearbyXpBonus: 0.1,        // 身边 NPC 经验获取 +10%
    },
    weight: 3,
  },

  // ---- ⭐⭐⭐ 传说命格（天命） ----
  heavenly_root: {
    id: 'heavenly_root',
    hint: '他种出的草药灵气充沛，品质远超常人……',
    category: 'rare',
    modifiers: {
      herbTopQualityChance: 0.3, // 草药极品概率 30%
    },
    weight: 1,
  },
  undying_body: {
    id: 'undying_body',
    hint: '此人年岁已高，却依然精神矍铄，毫无老态……',
    category: 'rare',
    modifiers: {
      retireAgeDelay: 20,        // 退休年龄推迟 20 年
    },
    weight: 1,
  },
  calamity_shield: {
    id: 'calamity_shield',
    hint: '有他在的时候，灾祸仿佛都不太敢靠近',
    category: 'rare',
    modifiers: {
      allDisasterChance: -0.5,   // 所有灾害概率 -50%
    },
    weight: 1,
  },
  pill_allergy: {
    id: 'pill_allergy',
    hint: '此人每次服药似乎都有些不太对劲……',
    category: 'rare',
    modifiers: {
      pillPoisonChance: 0.05,    // 服丹药 5% 概率中毒
    },
    weight: 1,
  },
  child_of_fortune: {
    id: 'child_of_fortune',
    hint: '此人运气好得离谱，但仿佛老天也不会让他太顺……',
    category: 'rare',
    modifiers: {
      goodEventChance: 0.5,      // 好事件 +50%
      badEventIntensity: 0.3,    // 坏事件强度 +30%
    },
    weight: 1,
  },
};

// 命格权重（按稀有度分组）
export const FATE_WEIGHTS = {};
for (const [id, fate] of Object.entries(FATES)) {
  FATE_WEIGHTS[id] = fate.weight;
}

/**
 * 随机生成命格
 * @returns {{ id: string, hint: string, category: string, modifiers: object } | null}
 */
export function rollFate() {
  // 15% 概率无命格
  if (Math.random() < FATE_RARITY.none.weight / 100) {
    return null;
  }

  const entries = Object.entries(FATE_WEIGHTS);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [id] of entries) {
    roll -= FATE_WEIGHTS[id];
    if (roll <= 0) {
      const fate = FATES[id];
      return {
        id: fate.id,
        hint: fate.hint,
        category: fate.category,
        modifiers: { ...fate.modifiers },
      };
    }
  }
  return null;
}

/**
 * 获取命格稀有度信息
 */
export function getFateRarity(fateCategory) {
  return FATE_RARITY[fateCategory] || FATE_RARITY.none;
}
