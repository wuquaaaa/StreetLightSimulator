import { Users, Wheat, Sprout, AlertTriangle } from 'lucide-react';
import { FIELD_STATE } from '../engine/FarmSystem';
import { CROPS } from '../data/crops';
import { getMoodInfo } from '../engine/Character';

export default function FarmLeaderPanel({ game }) {
  const plots = game.farm.plots;
  const farmers = [game.player, ...game.characters].filter(c => c.hasRole('farmer'));

  // 统计
  const totalPlots = plots.length;
  const emptyPlots = plots.filter(p => p.state === FIELD_STATE.EMPTY || p.state === FIELD_STATE.PLOWED).length;
  const growingPlots = plots.filter(p => p.state === FIELD_STATE.GROWING || p.state === FIELD_STATE.PLANTED).length;
  const readyPlots = plots.filter(p => p.state === FIELD_STATE.READY).length;
  const witheredPlots = plots.filter(p => p.state === FIELD_STATE.WITHERED).length;
  const pestPlots = plots.filter(p => p.hasPest).length;

  // 预计收获
  let estimatedHarvest = 0;
  for (const plot of plots) {
    if (plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.READY) {
      const crop = plot.getCropDef();
      if (crop) {
        const yieldMod = plot.getYieldModifier();
        estimatedHarvest += Math.floor(crop.baseYield * yieldMod);
      }
    }
  }

  // 平均水分和肥力
  const avgWater = plots.length > 0 ? Math.floor(plots.reduce((s, p) => s + p.waterLevel, 0) / plots.length) : 0;
  const avgFertility = plots.length > 0 ? Math.floor(plots.reduce((s, p) => s + p.fertility, 0) / plots.length) : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">👨‍🌾</span>
        <h2 className="text-lg font-bold text-amber-400">农田管理总览</h2>
        <span className="text-xs text-stone-500">（农民队长视角）</span>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon="🌾" label="总农田" value={totalPlots} sub={`空闲 ${emptyPlots}`} />
        <StatCard icon="🌱" label="种植中" value={growingPlots} color="text-green-400" sub={`成熟 ${readyPlots}`} />
        <StatCard icon="📦" label="预计收获" value={estimatedHarvest} color="text-amber-400" sub="单位" />
        <StatCard icon="⚠️" label="问题田" value={pestPlots + witheredPlots}
          color={pestPlots + witheredPlots > 0 ? 'text-red-400' : 'text-stone-500'}
          sub={`虫害 ${pestPlots} 枯萎 ${witheredPlots}`} />
      </div>

      {/* 农田状况 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="text-sm font-bold text-stone-300 mb-3">农田状况</h3>
          <div className="space-y-2">
            <BarStat label="平均水分" value={avgWater} max={100}
              color={avgWater < 40 ? '#ef4444' : avgWater < 60 ? '#f59e0b' : '#3b82f6'} />
            <BarStat label="平均肥力" value={avgFertility} max={100}
              color={avgFertility < 50 ? '#f59e0b' : '#22c55e'} />
          </div>
          {readyPlots > 0 && (
            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-xs text-yellow-400">
              ✨ 有 {readyPlots} 块农田已成熟，可以收获！
            </div>
          )}
          {pestPlots > 0 && (
            <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-xs text-red-400">
              🐛 有 {pestPlots} 块农田出现病虫害！
            </div>
          )}
        </div>

        {/* 农田列表简要 */}
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="text-sm font-bold text-stone-300 mb-3">农田概览</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {plots.map(plot => {
              const crop = plot.getCropDef();
              const stateColors = {
                [FIELD_STATE.EMPTY]: 'text-stone-600',
                [FIELD_STATE.PLOWED]: 'text-amber-600',
                [FIELD_STATE.PLANTED]: 'text-green-600',
                [FIELD_STATE.GROWING]: 'text-green-400',
                [FIELD_STATE.READY]: 'text-yellow-400',
                [FIELD_STATE.WITHERED]: 'text-red-500',
              };
              const stateTexts = {
                [FIELD_STATE.EMPTY]: '空地',
                [FIELD_STATE.PLOWED]: '已翻地',
                [FIELD_STATE.PLANTED]: '已播种',
                [FIELD_STATE.GROWING]: `生长 ${Math.floor(plot.growthProgress)}%`,
                [FIELD_STATE.READY]: '可收获',
                [FIELD_STATE.WITHERED]: '已枯萎',
              };
              return (
                <div key={plot.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-stone-700/30">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">{plot.name}</span>
                    {crop && <span>{crop.icon}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {plot.hasPest && <span className="text-red-400">🐛</span>}
                    {plot.weedGrowth > 40 && <span className="text-lime-400">🌿</span>}
                    <span className={stateColors[plot.state] || 'text-stone-500'}>
                      {stateTexts[plot.state] || plot.state}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 队内农民 */}
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-amber-400" />
          <h3 className="text-sm font-bold text-stone-300">队内农民 ({farmers.length}人)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {farmers.map(farmer => {
            const moodInfo = getMoodInfo(farmer.mood);
            return (
              <div key={farmer.id} className="flex items-center gap-3 p-2 rounded-lg bg-stone-900/30 border border-stone-700/30">
                <span className="text-lg">🌾</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-200 truncate">{farmer.name}</span>
                    {farmer.isPlayer && (
                      <span className="text-xs px-1 py-0.5 bg-amber-900/40 text-amber-400 rounded">你</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span>耕种 {Math.floor(farmer.knowledgeAttributes.farming)}</span>
                    <span style={{ color: moodInfo.color }}>{moodInfo.icon} {moodInfo.text}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = 'text-stone-200', sub }) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
      {sub && <div className="text-xs text-stone-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function BarStat({ label, value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500 w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-stone-500 w-8 text-right">{value}</span>
    </div>
  );
}
