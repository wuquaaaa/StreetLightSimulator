import { useState } from 'react';
import { Wheat, Users } from 'lucide-react';

/**
 * 日月东升西落动画组件
 * progress: 0~1 表示一天内的进度
 * 0~0.5 白天（太阳升起落下），0.5~1 夜晚（月亮升起落下）
 */
function DayNightCycle({ progress }) {
  // 太阳和月亮走抛物线轨迹
  const isDay = progress < 0.5;
  const cycleProgress = isDay ? progress / 0.5 : (progress - 0.5) / 0.5;

  // X: 从左到右 (0% ~ 100%)
  const x = cycleProgress * 100;
  // Y: 抛物线，中间最高 (顶部y小，底部y大)
  const y = 100 - (1 - Math.pow(2 * cycleProgress - 1, 2)) * 80;

  // 背景渐变
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
      {/* 地平线 */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-stone-800/60" />

      {/* 太阳或月亮 */}
      <div
        className="absolute transition-all duration-1000 ease-linear"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {isDay ? (
          <div className="w-4 h-4 rounded-full bg-yellow-300 shadow-lg shadow-yellow-400/50" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shadow-lg shadow-slate-300/30" />
        )}
      </div>

      {/* 星星（夜晚） */}
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

export default function TopBar({ game }) {
  const [showFoodTip, setShowFoodTip] = useState(false);
  const wheatCount = game.warehouse.getItemAmount('food', 'wheat');

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
