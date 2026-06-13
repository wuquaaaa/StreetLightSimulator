import { useState } from 'react';
import { Sparkles, BookOpen, Clock, ChevronDown, ChevronUp, Check, Lock } from 'lucide-react';
import { IMMORTAL_ARTS, ART_CATEGORIES, ART_LEVEL_NAMES, canLearnArt } from '../data/immortalArts';
import { IMMORTAL_HERBS } from '../data/immortalHerbs';

const RARITY_COLORS = {
  1: 'text-stone-400 border-stone-600',
  2: 'text-green-400 border-green-700',
  3: 'text-blue-400 border-blue-700',
  4: 'text-purple-400 border-purple-700',
  5: 'text-yellow-400 border-yellow-700',
};

const RARITY_BG = {
  1: 'bg-stone-800/50',
  2: 'bg-green-900/10',
  3: 'bg-blue-900/10',
  4: 'bg-purple-900/10',
  5: 'bg-yellow-900/10',
};

function ArtCard({ art, npcId, currentLevel, isCultivating, canStart, onStart, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const isMaxLevel = currentLevel >= art.maxLevel;
  const nextLevel = currentLevel + 1;
  const nextLevelData = art.levels[nextLevel];

  // 获取当前等级效果描述
  const currentEffect = currentLevel > 0 ? art.levels[currentLevel]?.effect : null;
  const effectLabel = (key) => {
    const labels = {
      constitution: '体质', focus: '专注', spiritRegen: '灵气回复',
      alchemyBonus: '炼丹品质', herbQuality: '草药品质', miningBonus: '矿脉产出',
      allStats: '全属性', maxHP: '血量',
    };
    return labels[key] || key;
  };

  return (
    <div className={`rounded-lg border ${RARITY_COLORS[art.rarity]} ${RARITY_BG[art.rarity]} p-3`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{art.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-stone-200 font-bold">{art.name}</span>
              {currentLevel > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  currentLevel >= art.maxLevel ? 'bg-yellow-900/40 text-yellow-400' : 'bg-stone-700/50 text-stone-400'
                }`}>
                  {ART_LEVEL_NAMES[currentLevel]}
                </span>
              )}
            </div>
            <div className="text-[10px] text-stone-500">{art.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isCultivating && (
            <span className="text-[9px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded animate-pulse">修炼中</span>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-stone-500 hover:text-stone-300">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 当前效果 */}
      {currentEffect && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1">
          {Object.entries(currentEffect).map(([key, value]) => (
            <span key={key} className="text-[9px] px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded">
              {effectLabel(key)} +{typeof value === 'number' && value < 1 ? `${Math.round(value * 100)}%` : value}
            </span>
          ))}
        </div>
      )}

      {/* 展开详情 */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-stone-700/30 space-y-2">
          {/* 修炼路线 */}
          <div className="text-[10px] text-stone-400 font-semibold">修炼路线</div>
          <div className="space-y-1">
            {Object.entries(art.levels).map(([lv, data]) => {
              const lvNum = parseInt(lv);
              const isLearned = lvNum <= currentLevel;
              const isNext = lvNum === nextLevel;
              const effect = data.effect;

              return (
                <div key={lv} className={`flex items-center justify-between text-[10px] rounded px-2 py-1 ${
                  isLearned ? 'bg-green-900/20 text-green-400' : isNext ? 'bg-amber-900/20 text-amber-400' : 'text-stone-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {isLearned ? <Check size={10} /> : isNext ? <Sparkles size={10} /> : <Lock size={10} />}
                    <span>{data.name}</span>
                    <span className="text-stone-600">({data.learnTime}天)</span>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(effect).map(([key, value]) => (
                      <span key={key} className="text-stone-500">
                        {effectLabel(key)}+{typeof value === 'number' && value < 1 ? `${Math.round(value * 100)}%` : value}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 下一级消耗 */}
          {nextLevelData && !isMaxLevel && (
            <div className="text-[10px] text-stone-500">
              下一级消耗: {IMMORTAL_HERBS[nextLevelData.herbCost]?.icon} {IMMORTAL_HERBS[nextLevelData.herbCost]?.name || nextLevelData.herbCost}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {isCultivating ? (
              <button onClick={onCancel}
                className="flex-1 px-3 py-1.5 text-xs bg-red-800/40 hover:bg-red-700/40 text-red-300 rounded transition-colors">
                取消修炼
              </button>
            ) : isMaxLevel ? (
              <div className="flex-1 text-center text-xs text-yellow-400 py-1.5">✨ 已圆满</div>
            ) : (
              <button onClick={onStart}
                disabled={!canStart}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                  canStart
                    ? 'bg-purple-700/60 hover:bg-purple-600/60 text-purple-200'
                    : 'bg-stone-700/30 text-stone-600 cursor-not-allowed'
                }`}>
                {canStart ? '开始修炼' : '条件不足'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CultivationPanel({ game, onAction }) {
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const cultivation = game.cultivationSystem;
  const npcs = game.characters.filter(c => !c.isRetired);
  const player = game.player;

  // 所有角色（含玩家）
  const allChars = [player, ...npcs];
  const displayChar = selectedNpc ? allChars.find(c => c.id === selectedNpc) : player;
  const npcId = displayChar?.id;

  // 当前角色的仙法
  const learnedArts = cultivation?.learnedArts?.[npcId] || {};
  const currentCultivating = cultivation?.cultivating?.[npcId];

  // 过滤仙法列表
  const artList = Object.values(IMMORTAL_ARTS).filter(art => {
    if (categoryFilter !== 'all' && art.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">✨</span>
        <h2 className="text-lg font-bold text-amber-400">仙法修炼</h2>
      </div>

      {/* 角色选择 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">选择修炼者</div>
        <div className="flex flex-wrap gap-1.5">
          {allChars.map(char => (
            <button
              key={char.id}
              onClick={() => setSelectedNpc(char.id === player.id ? null : char.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                npcId === char.id
                  ? 'bg-purple-800/40 text-purple-300 border border-purple-600/50'
                  : 'bg-stone-800/50 text-stone-400 border border-transparent hover:bg-stone-700/50'
              }`}
            >
              <span>{char.name}</span>
              {char.isPlayer && <span className="text-[9px] text-stone-600">(你)</span>}
            </button>
          ))}
        </div>
        {displayChar && (
          <div className="mt-2 text-[10px] text-stone-500">
            悟性: <span className="text-amber-400">{displayChar.baseAttributes?.learningTalent || 50}</span>
            {' · 已学仙法: '}
            <span className="text-purple-400">{Object.keys(learnedArts).length}</span>
            {currentCultivating && (
              <span className="text-blue-400 ml-1">
                · 修炼中: {IMMORTAL_ARTS[currentCultivating.artId]?.name}
                ({Math.round(currentCultivating.progress / currentCultivating.totalTicks * 100)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-1 mb-4 bg-stone-900/50 rounded-lg p-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            categoryFilter === 'all' ? 'bg-amber-800/60 text-amber-200' : 'text-stone-500 hover:text-stone-300'
          }`}>
          全部
        </button>
        {Object.entries(ART_CATEGORIES).map(([id, cat]) => (
          <button
            key={id}
            onClick={() => setCategoryFilter(id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              categoryFilter === id ? 'bg-amber-800/60 text-amber-200' : 'text-stone-500 hover:text-stone-300'
            }`}>
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* 仙法列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {artList.map(art => {
          const currentLevel = learnedArts[art.id] || 0;
          const isCultivating = currentCultivating?.artId === art.id;
          const canStart = cultivation?.canCultivate(npcId, art.id) && displayChar;

          return (
            <ArtCard
              key={art.id}
              art={art}
              npcId={npcId}
              currentLevel={currentLevel}
              isCultivating={isCultivating}
              canStart={canStart}
              onStart={() => onAction('start_cultivation', { npcId, artId: art.id })}
              onCancel={() => onAction('cancel_cultivation', { npcId })}
            />
          );
        })}
      </div>

      {artList.length === 0 && (
        <div className="text-center text-stone-600 text-sm py-8">该分类下没有仙法</div>
      )}
    </div>
  );
}
