import { useState } from 'react';
import { BASE_ATTRIBUTES, KNOWLEDGE_ATTRIBUTES, getMoodInfo } from '../engine/Character';
import { User, Lock, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';

const ROLE_LABELS = {
  farmer: { name: '农民', icon: '🌾', color: 'text-green-400' },
  farmer_leader: { name: '农民队长', icon: '👨‍🌾', color: 'text-amber-400' },
  scholar: { name: '学者', icon: '📖', color: 'text-blue-400' },
  trader: { name: '商人', icon: '💰', color: 'text-amber-400' },
  crafter: { name: '工匠', icon: '🔨', color: 'text-orange-400' },
  soldier: { name: '士兵', icon: '⚔️', color: 'text-red-400' },
  advisor: { name: '谋士', icon: '🧠', color: 'text-purple-400' },
  leader: { name: '领袖', icon: '👑', color: 'text-yellow-400' },
};

function AttributeBar({ name, value, maxValue = 100, icon, color = '#f59e0b' }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm w-5 text-center">{icon}</span>
      <span className="text-xs text-stone-400 w-16">{name}</span>
      <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-stone-500 w-6 text-right tabular-nums">{Math.floor(value)}</span>
    </div>
  );
}

function CharacterCard({ character, expanded, onToggle }) {
  const canSee = character.canSeeAttributes();
  const primaryRole = character.roles[0] || 'farmer';
  const roleInfo = ROLE_LABELS[primaryRole] || { name: primaryRole, icon: '👤', color: 'text-stone-400' };
  const moodInfo = getMoodInfo(character.mood);

  return (
    <div className="border border-stone-700 rounded-lg bg-stone-800/50 overflow-hidden">
      {/* 角色基本信息行（可点击展开） */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-700/30 transition-colors text-left"
      >
        <span className="text-lg">{roleInfo.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-200 font-medium">{character.name}</span>
            {character.roles.map(r => {
              const ri = ROLE_LABELS[r] || { name: r, icon: '👤', color: 'text-stone-400' };
              return <span key={r} className={`text-xs ${ri.color}`}>{ri.name}</span>;
            })}
            {character.isPlayer && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-900/40 text-amber-400 rounded">你</span>
            )}
            <span className="text-xs flex items-center gap-1" style={{ color: moodInfo.color }}>
              {moodInfo.icon} {moodInfo.text}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-stone-500" />
        ) : (
          <ChevronRight size={14} className="text-stone-500" />
        )}
      </button>

      {/* 展开的属性详情 */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-700/50">
          {/* 心情条 */}
          <div className="mt-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 w-10">心情</span>
              <span className="text-sm">{moodInfo.icon}</span>
              <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${character.mood}%`, backgroundColor: moodInfo.color }} />
              </div>
              <span className="text-xs w-16 text-right" style={{ color: moodInfo.color }}>
                {moodInfo.text} ({Math.floor(character.mood)})
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 天赋属性 */}
            <div className="rounded-lg border border-stone-700/50 bg-stone-900/30 p-3">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-stone-700/50">
                <Lock size={12} className={canSee ? 'text-amber-500' : 'text-stone-600'} />
                <span className={`text-xs font-medium ${canSee ? 'text-amber-400' : 'text-stone-500'}`}>天赋属性</span>
                {!canSee && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-stone-600">
                    <HelpCircle size={10} />
                    <span>未解锁</span>
                  </div>
                )}
              </div>
              {canSee ? (
                <div>
                  {Object.entries(BASE_ATTRIBUTES).map(([key, attr]) => (
                    <AttributeBar
                      key={key}
                      name={attr.name}
                      value={character.baseAttributes[key]}
                      icon={attr.icon}
                      color="#f59e0b"
                    />
                  ))}
                  <p className="text-xs text-stone-600 mt-1 italic">天赋基本固定，仅通过特殊方式改变</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Lock size={20} className="text-stone-700 mx-auto mb-1" />
                  <p className="text-xs text-stone-600">你还无法感知自身的天赋潜力...</p>
                  <p className="text-xs text-stone-700 mt-0.5">也许某个特别的身份能帮助你看清自己</p>
                </div>
              )}
            </div>

            {/* 知识属性 */}
            <div className="rounded-lg border border-stone-700/50 bg-stone-900/30 p-3">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-stone-700/50">
                <Lock size={12} className={canSee ? 'text-blue-500' : 'text-stone-600'} />
                <span className={`text-xs font-medium ${canSee ? 'text-blue-400' : 'text-stone-500'}`}>知识经验</span>
                {!canSee && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-stone-600">
                    <HelpCircle size={10} />
                    <span>未解锁</span>
                  </div>
                )}
              </div>
              {canSee ? (
                <div>
                  {Object.entries(KNOWLEDGE_ATTRIBUTES).map(([key, attr]) => (
                    <AttributeBar
                      key={key}
                      name={attr.name}
                      value={character.knowledgeAttributes[key]}
                      icon={attr.icon}
                      color="#3b82f6"
                    />
                  ))}
                  <p className="text-xs text-stone-600 mt-1 italic">从事相关工作会积累经验</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Lock size={20} className="text-stone-700 mx-auto mb-1" />
                  <p className="text-xs text-stone-600">你积累的经验尚无法被量化...</p>
                  <p className="text-xs text-stone-700 mt-0.5">但每一次劳作都在暗中改变着什么</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CharacterPanel({ game }) {
  const [activeRole, setActiveRole] = useState('farmer');
  const [expandedCharId, setExpandedCharId] = useState(null);

  // 收集所有角色（玩家 + NPC）
  const allCharacters = [game.player, ...(game.characters || [])];

  // 按身份分组（一个角色可以出现在多个组中）
  const roleGroups = {};
  for (const char of allCharacters) {
    for (const role of char.roles) {
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push(char);
    }
  }

  const roleKeys = Object.keys(roleGroups);
  const currentChars = roleGroups[activeRole] || [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <User size={20} className="text-amber-400" />
        <h2 className="text-lg font-bold text-amber-400">角色</h2>
      </div>

      {/* 身份标签栏 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {roleKeys.map(roleKey => {
          const info = ROLE_LABELS[roleKey] || { name: roleKey, icon: '👤', color: 'text-stone-400' };
          const count = roleGroups[roleKey].length;
          const isActive = activeRole === roleKey;
          return (
            <button
              key={roleKey}
              onClick={() => setActiveRole(roleKey)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                isActive
                  ? 'bg-amber-900/30 border-amber-600 text-amber-300'
                  : 'bg-stone-800/50 border-stone-700 text-stone-400 hover:bg-stone-700/50 hover:text-stone-300'
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.name}</span>
              <span className="text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 当前身份的角色列表 */}
      <div className="space-y-2">
        {currentChars.length === 0 ? (
          <div className="text-center text-stone-600 text-sm py-8">
            暂无此身份的角色
          </div>
        ) : (
          currentChars.map(char => (
            <CharacterCard
              key={char.id}
              character={char}
              expanded={expandedCharId === char.id}
              onToggle={() => setExpandedCharId(expandedCharId === char.id ? null : char.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
