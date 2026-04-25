import { useState, useRef, useEffect } from 'react';
import { Wheat, Users } from 'lucide-react';

const ROLE_MAP = {
  farmer: { name: '农民', icon: '🌾', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700/40' },
  farmer_leader: { name: '农民队长', icon: '👨‍🌾', color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-700/40' },
  scholar: { name: '学者', icon: '📖', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-700/40' },
  trader: { name: '商人', icon: '💰', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700/40' },
};

// 当前可切换的所有身份（后续解锁更多）
const ALL_AVAILABLE_ROLES = ['farmer', 'farmer_leader'];

/**
 * 日月东升西落动画组件
 */
function DayNightCycle({ progress }) {
  const isDay = progress < 0.5;
  const cycleProgress = isDay ? progress / 0.5 : (progress - 0.5) / 0.5;
  const x = cycleProgress * 100;
  const y = 100 - (1 - Math.pow(2 * cycleProgress - 1, 2)) * 80;

  const bgStyle = isDay
    ? {
        background: `linear-gradient(to bottom,
          hsl(210, ${60 - cycleProgress * 30}%, ${30 + (1 - Math.abs(2 * cycleProgress - 1)) * 30}%) 0%,
          hsl(30, ${40 + cycleProgress * 20}%, ${20 + (1 - Math.abs(2 * cycleProgress - 1)) * 25}%) 100%)`,
      }
    : {
        background: `linear-gradient(to bottom,
          hsl(230, 40%, ${8 + cycleProgress * 5}%) 0%,
          hsl(240, 30%, ${5 + cycleProgress * 3}%) 100%)`,
      };

  return (
    <div className="relative w-28 h-8 rounded-full overflow-hidden border border-stone-700/50" style={bgStyle}>
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-800/60" />
      <div
        className="absolute transition-all duration-1000 ease-linear"
        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      >
        {isDay ? (
          <div className="w-4 h-4 rounded-full bg-yellow-300 shadow-lg shadow-yellow-400/50" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shadow-lg shadow-slate-300/30" />
        )}
      </div>
      {!isDay && (
        <>
          <div className="absolute w-0.5 h-0.5 bg-white/60 rounded-full" style={{ top: '20%', left: '15%' }} />
          <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full" style={{ top: '30%', left: '75%' }} />
          <div className="absolute w-0.5 h-0.5 bg-white/50 rounded-full" style={{ top: '15%', left: '50%' }} />
        </>
      )}
    </div>
  );
}

/**
 * 食物tooltip
 */
function FoodTooltip({ game }) {
  const wheat = game.warehouse.getItemAmount('food', 'wheat');
  const consumption = game.dailyFoodConsumption;
  const daysLeft = consumption > 0 ? Math.floor(wheat / consumption) : Infinity;

  return (
    <div className="absolute top-full right-0 mt-2 bg-stone-800 border border-stone-600 rounded-lg shadow-xl p-3 w-52 z-50">
      <div className="text-xs space-y-1.5">
        <div className="text-stone-400 font-medium border-b border-stone-700 pb-1 mb-1">粮食消耗</div>
        <div className="flex justify-between">
          <span className="text-stone-400">人口</span>
          <span className="text-stone-200">{game.population} 人</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">每人每天</span>
          <span className="text-stone-200">{game.foodPerPerson} 单位</span>
        </div>
        <div className="flex justify-between border-t border-stone-700 pt-1">
          <span className="text-stone-400">每日消耗</span>
          <span className="text-amber-400 font-bold">{consumption} 单位/天</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">当前存量</span>
          <span className="text-stone-200">{wheat} 单位</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">可维持</span>
          <span className={daysLeft <= 3 ? 'text-red-400 font-bold' : 'text-green-400'}>
            {daysLeft === Infinity ? '∞' : `${daysLeft} 天`}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 身份选择下拉面板
 */
function RoleDropdown({ player, game, onToggleRole, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // 基础身份始终可用；farmer_leader 需要接受过投靠才解锁
  const hasAcceptedRecruit = game.triggeredEvents && game.triggeredEvents['recruit'] === 'accepted';
  const unlockedRoles = ALL_AVAILABLE_ROLES.filter(r => {
    if (r === 'farmer_leader' && !hasAcceptedRecruit) return false;
    return true;
  });

  // 如果角色已拥有某身份但该身份不在解锁列表中，仍然显示（不可移除）
  const displayRoles = [...new Set([...unlockedRoles, ...player.roles])];

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 bg-stone-800 border border-stone-600 rounded-lg shadow-xl p-3 w-56 z-50">
      <div className="text-xs text-stone-400 mb-2">点击添加/移除身份（可多选，至少保留一个）</div>
      <div className="space-y-1.5">
        {displayRoles.map(r => {
          const info = ROLE_MAP[r] || { name: r, icon: '👤', color: 'text-stone-400', bg: 'bg-stone-700/30 border-stone-600/40' };
          const active = player.roles.includes(r);
          const locked = !unlockedRoles.includes(r);
          return (
            <button
              key={r}
              onClick={() => !locked && onToggleRole(r)}
              disabled={locked}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                active ? info.bg : 'bg-stone-900/30 border-stone-700/30 opacity-50 hover:opacity-80'
              } ${locked ? 'cursor-not-allowed' : ''}`}
              title={locked ? '接受投靠者后解锁' : ''}
            >
              <span>{info.icon}</span>
              <span className={active ? info.color : 'text-stone-500'}>{info.name}</span>
              {locked && !active && <span className="ml-auto text-xs text-stone-600">🔒</span>}
              {active && !locked && <span className="ml-auto text-xs text-green-400">✓</span>}
              {active && locked && <span className="ml-auto text-xs text-amber-400">✓ (已获得)</span>}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-stone-600 mt-2">至少保留一个身份</div>
    </div>
  );
}

export default function TopBar({ game, onAction }) {
  const [showFoodTip, setShowFoodTip] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const wheatCount = game.warehouse.getItemAmount('food', 'wheat');

  const handleToggleRole = (role) => {
    // farmer_leader 需要接受过投靠才可解锁
    if (role === 'farmer_leader' && (!game.triggeredEvents || game.triggeredEvents['recruit'] !== 'accepted')) {
      return;
    }
    const current = [...game.player.roles];
    const idx = current.indexOf(role);
    if (idx >= 0) {
      // 至少保留一个身份
      if (current.length <= 1) return;
      current.splice(idx, 1);
    } else {
      // 添加新身份（支持多选）
      current.push(role);
    }
    if (onAction) onAction('set_player_roles', { roles: current });
  };

  return (
    <div className="h-14 bg-stone-900 border-b border-amber-800/40 px-4 flex items-center justify-between shrink-0">
      {/* 左侧 */}
      <div className="flex items-center gap-4">
        <h1 className="text-amber-400 font-bold text-lg tracking-wider">路灯计划</h1>
        <div className="h-5 w-px bg-stone-700" />
        <div className="flex items-center gap-3">
          <DayNightCycle progress={game.tickProgress} />
          <div className="text-sm">
            <span className="text-stone-400">第 </span>
            <span className="text-amber-300 font-bold">{game.day}</span>
            <span className="text-stone-400"> 天</span>
            <span className="text-stone-600 ml-2 text-xs">{game.season}季</span>
          </div>
        </div>
      </div>

      {/* 右侧状态 */}
      <div className="flex items-center gap-5 text-sm">
        {/* 玩家身份（可点击切换） */}
        <div className="relative flex items-center gap-1.5">
          <span className="text-stone-500 text-xs">{game.player.name}</span>
          <div className="flex gap-1 cursor-pointer" onClick={() => setShowRoleDropdown(!showRoleDropdown)}>
            {game.player.roles.map(r => {
              const info = ROLE_MAP[r] || { name: r, icon: '👤', color: 'text-stone-400' };
              return (
                <span key={r} className={`text-xs px-1.5 py-0.5 rounded bg-stone-800 ${info.color} hover:ring-1 hover:ring-stone-500 transition-all`}>
                  {info.icon} {info.name}
                </span>
              );
            })}
          </div>
          {showRoleDropdown && (
            <RoleDropdown
              player={game.player}
              game={game}
              onToggleRole={handleToggleRole}
              onClose={() => setShowRoleDropdown(false)}
            />
          )}
        </div>

        {/* 人口 */}
        <div className="flex items-center gap-1.5" title="人口">
          <Users size={14} className="text-sky-400" />
          <span className="text-stone-300">{game.population}</span>
        </div>

        {/* 食物（hover显示tooltip） */}
        <div
          className="relative flex items-center gap-1.5 cursor-help"
          onMouseEnter={() => setShowFoodTip(true)}
          onMouseLeave={() => setShowFoodTip(false)}
        >
          <Wheat size={14} className="text-amber-400" />
          <span className={`${wheatCount < game.dailyFoodConsumption * 3 ? 'text-red-400' : 'text-stone-300'}`}>
            {wheatCount}
          </span>
          {showFoodTip && <FoodTooltip game={game} />}
        </div>
      </div>
    </div>
  );
}
