import { BASE_ATTRIBUTES, KNOWLEDGE_ATTRIBUTES } from '../engine/Character';
import { User, Lock, HelpCircle } from 'lucide-react';

function AttributeBar({ name, value, maxValue = 100, icon, color = '#f59e0b' }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="text-sm text-stone-300 w-20">{name}</span>
      <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-stone-400 w-8 text-right font-mono">{Math.floor(value)}</span>
    </div>
  );
}

export default function CharacterPanel({ game }) {
  const player = game.player;
  const canSee = player.canSeeAttributes();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <User size={20} className="text-amber-400" />
        <h2 className="text-lg font-bold text-amber-400">角色信息</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本信息（始终可见） */}
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="text-sm text-stone-400 mb-3 border-b border-stone-700 pb-2">基本信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-400">姓名</span>
              <span className="text-stone-200">{player.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">身份</span>
              <span className="text-green-400">
                {player.role === 'farmer' ? '农民' : player.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">体力</span>
              <span className="text-stone-200">{Math.floor(player.stamina)} / {player.maxStamina}</span>
            </div>
          </div>
        </div>

        {/* 体力详情 */}
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="text-sm text-stone-400 mb-3 border-b border-stone-700 pb-2">体力状态</h3>
          <div className="mb-3">
            <div className="w-full h-3 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(player.stamina / player.maxStamina) * 100}%`,
                  backgroundColor: player.stamina > 50 ? '#22c55e' : player.stamina > 20 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>
          <div className="text-xs text-stone-500 space-y-1">
            <p>每天自动恢复 30 点体力</p>
            <p>可通过休息额外恢复 20 点</p>
            <p>食物不足时体力会额外下降</p>
          </div>
        </div>

        {/* 基础属性 — 前期隐藏 */}
        <div className="rounded-lg border border-stone-700/50 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-stone-700/50 pb-2">
            <Lock size={14} className={canSee ? 'text-amber-500' : 'text-stone-600'} />
            <h3 className={`text-sm ${canSee ? 'text-amber-400' : 'text-stone-500'}`}>天赋属性</h3>
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
                  value={player.baseAttributes[key]}
                  icon={attr.icon}
                  color="#f59e0b"
                />
              ))}
              <p className="text-xs text-stone-600 mt-2 italic">天赋属性基本固定，仅通过特殊方式改变</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <Lock size={28} className="text-stone-700 mx-auto mb-2" />
              <p className="text-xs text-stone-600">
                你还无法感知自身的天赋潜力...
              </p>
              <p className="text-xs text-stone-700 mt-1">
                也许某个特别的身份能帮助你看清自己
              </p>
            </div>
          )}
        </div>

        {/* 知识属性 — 前期隐藏 */}
        <div className="rounded-lg border border-stone-700/50 bg-stone-900/30 p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-stone-700/50 pb-2">
            <Lock size={14} className={canSee ? 'text-blue-500' : 'text-stone-600'} />
            <h3 className={`text-sm ${canSee ? 'text-blue-400' : 'text-stone-500'}`}>知识经验</h3>
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
                  value={player.knowledgeAttributes[key]}
                  icon={attr.icon}
                  color="#3b82f6"
                />
              ))}
              <p className="text-xs text-stone-600 mt-2 italic">从事相关工作会积累经验，学习能力影响成长速度</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <Lock size={28} className="text-stone-700 mx-auto mb-2" />
              <p className="text-xs text-stone-600">
                你积累的经验尚无法被量化...
              </p>
              <p className="text-xs text-stone-700 mt-1">
                但每一次劳作都在暗中改变着什么
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
