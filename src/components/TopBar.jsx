import { Heart, Sun, Wheat } from 'lucide-react';

export default function TopBar({ game, onNextTurn }) {
  const player = game.player;
  const wheatCount = game.warehouse.getItemAmount('food', 'wheat');

  return (
    <div className="h-14 bg-stone-900 border-b border-amber-800/40 px-4 flex items-center justify-between shrink-0">
      {/* 左侧：游戏信息 */}
      <div className="flex items-center gap-6">
        <h1 className="text-amber-400 font-bold text-lg tracking-wider">路灯计划</h1>
        <div className="h-6 w-px bg-stone-700" />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-stone-400">
            第 <span className="text-amber-300 font-bold">{game.turn}</span> 天
          </span>
          <span className="text-stone-400 flex items-center gap-1">
            <Sun size={14} className="text-yellow-400" />
            {game.season}季
          </span>
          <span className="text-stone-400">
            身份：<span className="text-green-400">农民</span>
          </span>
        </div>
      </div>

      {/* 中间：核心状态 */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5" title="体力">
          <Heart size={14} className="text-red-400" />
          <div className="w-24 h-2 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(player.stamina / player.maxStamina) * 100}%`,
                backgroundColor: player.stamina > 50 ? '#22c55e' : player.stamina > 20 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <span className="text-stone-300 w-10 text-right">{Math.floor(player.stamina)}</span>
        </div>
        <div className="flex items-center gap-1.5" title="小麦存量">
          <Wheat size={14} className="text-amber-400" />
          <span className="text-stone-300">{wheatCount}</span>
        </div>
      </div>

      {/* 右侧：下一天 */}
      <button
        onClick={onNextTurn}
        className="px-5 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold rounded transition-colors"
      >
        下一天 →
      </button>
    </div>
  );
}
