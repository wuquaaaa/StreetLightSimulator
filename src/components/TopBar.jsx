import { Sun, Wheat, Sprout } from 'lucide-react';

export default function TopBar({ game }) {
  const wheatCount = game.warehouse.getItemAmount('food', 'wheat');
  const seedCount = game.warehouse.getItemAmount('seed', 'wheat_seed');

  return (
    <div className="h-12 bg-stone-900 border-b border-amber-800/40 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-6">
        <h1 className="text-amber-400 font-bold text-lg tracking-wider">路灯计划</h1>
        <div className="h-5 w-px bg-stone-700" />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-stone-400">
            第 <span className="text-amber-300 font-bold">{game.day}</span> 天
          </span>
          <span className="text-stone-400 flex items-center gap-1">
            <Sun size={14} className="text-yellow-400" />
            {game.season}季
          </span>
          <span className="text-stone-500 text-xs">农民</span>
        </div>
      </div>
      <div className="flex items-center gap-5 text-sm">
        <div className="flex items-center gap-1.5" title="小麦存量">
          <Wheat size={14} className="text-amber-400" />
          <span className="text-stone-300">{wheatCount}</span>
        </div>
        <div className="flex items-center gap-1.5" title="小麦种子">
          <Sprout size={14} className="text-green-400" />
          <span className="text-stone-300">{seedCount}</span>
        </div>
      </div>
    </div>
  );
}
