import { useState } from 'react';
import { Plus, Minus, UserPlus } from 'lucide-react';
import { FIELD_STATE } from '../engine/FarmSystem';
import { getMoodInfo } from '../engine/Character';

const STATE_COLORS = {
  [FIELD_STATE.EMPTY]: { bg: 'bg-stone-700', border: 'border-stone-600', label: '空' },
  [FIELD_STATE.PLOWED]: { bg: 'bg-amber-900/60', border: 'border-amber-700/50', label: '翻' },
  [FIELD_STATE.PLANTED]: { bg: 'bg-green-900/60', border: 'border-green-700/50', label: '种' },
  [FIELD_STATE.GROWING]: { bg: 'bg-green-800/60', border: 'border-green-600/50', label: null },
  [FIELD_STATE.READY]: { bg: 'bg-yellow-800/60', border: 'border-yellow-600/50', label: '收' },
  [FIELD_STATE.WITHERED]: { bg: 'bg-red-900/60', border: 'border-red-700/50', label: '枯' },
};

function PlotBlock({ plot, farmers, selected, onClick }) {
  const info = STATE_COLORS[plot.state] || STATE_COLORS[FIELD_STATE.EMPTY];
  const assignedFarmer = plot.assignedTo ? farmers.find(f => f.id === plot.assignedTo) : null;
  const growPct = plot.state === FIELD_STATE.GROWING ? Math.floor(plot.growthProgress) : null;

  return (
    <div
      onClick={onClick}
      className={`relative w-16 h-16 rounded-lg border-2 ${info.bg} ${selected ? 'border-amber-400 ring-1 ring-amber-400/50' : info.border} cursor-pointer hover:brightness-125 transition-all flex flex-col items-center justify-center overflow-hidden`}
    >
      {/* 名字在顶部内侧 */}
      <span className="text-[8px] text-stone-400/80 absolute top-0.5 left-0 right-0 text-center truncate px-0.5">{plot.name}</span>

      {/* 状态文字或进度 */}
      {growPct !== null ? (
        <span className="text-xs font-bold text-green-300">{growPct}%</span>
      ) : (
        <span className="text-xs text-stone-400">{info.label}</span>
      )}

      {/* 图标指示器 */}
      <div className="flex gap-0.5 mt-0.5">
        {plot.hasPest && <span className="text-[10px]">🐛</span>}
        {plot.weedGrowth > 40 && <span className="text-[10px]">🌿</span>}
        {plot.waterLevel < 30 && <span className="text-[10px]">💧</span>}
      </div>

      {/* 分配的农民 */}
      {assignedFarmer && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-stone-900 border border-stone-600 flex items-center justify-center" title={assignedFarmer.name}>
          <span className="text-[8px]">👤</span>
        </div>
      )}
    </div>
  );
}

function ExpandBlock({ q, allChars }) {
  const char = allChars.find(c => c.id === q.characterId);
  const pct = Math.floor(((50 - q.ticksRemaining) / 50) * 100);
  return (
    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-600 flex flex-col items-center justify-center overflow-hidden relative">
      {/* 进度条背景 */}
      <div className="absolute bottom-0 left-0 right-0 bg-blue-800/30" style={{ height: `${pct}%` }} />
      <span className="text-[10px] text-stone-400 relative z-10">⛏</span>
      <span className="text-[9px] text-blue-400 font-bold relative z-10">{pct}%</span>
      {char && <span className="text-[7px] text-stone-500 relative z-10">{char.name}</span>}
    </div>
  );
}

export default function FarmLeaderPanel({ game, onAction }) {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const plots = game.farm.plots;
  const farmers = [game.player, ...game.characters].filter(c => c.hasRole('farmer'));

  const totalPlots = plots.length;
  const growingPlots = plots.filter(p => p.state === FIELD_STATE.GROWING || p.state === FIELD_STATE.PLANTED).length;
  const readyPlots = plots.filter(p => p.state === FIELD_STATE.READY).length;
  const pestPlots = plots.filter(p => p.hasPest).length;

  let estimatedHarvest = 0;
  for (const plot of plots) {
    if (plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.READY) {
      const crop = plot.getCropDef();
      if (crop) estimatedHarvest += Math.floor(crop.baseYield * plot.getYieldModifier());
    }
  }

  const selectedPlotData = selectedPlot ? plots.find(p => p.id === selectedPlot) : null;
  const expandQueue = game.farm.expandQueue;
  const targetCount = game.farm.targetPlotCount;
  const allChars = [game.player, ...game.characters];

  const handleAssign = (plotId, charId) => {
    if (onAction) onAction('assign_plot', { plotId, characterId: charId });
  };
  const handleUnassign = (plotId) => {
    if (onAction) onAction('unassign_plot', { plotId });
  };
  const handleTargetChange = (delta) => {
    const newCount = Math.max(totalPlots, targetCount + delta);
    if (onAction) onAction('set_target_plots', { count: newCount });
  };
  const handleRecruit = () => {
    if (onAction) onAction('leader_recruit');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">👨‍🌾</span>
        <h2 className="text-lg font-bold text-amber-400">农田管理</h2>
        <span className="text-xs text-stone-500">（农民队长视角）</span>
      </div>

      {/* 统计条 */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <span className="text-stone-400">农田 <span className="text-stone-200 font-bold">{totalPlots}</span></span>
        <span className="text-stone-400">种植中 <span className="text-green-400 font-bold">{growingPlots}</span></span>
        <span className="text-stone-400">可收获 <span className="text-yellow-400 font-bold">{readyPlots}</span></span>
        <span className="text-stone-400">预计产量 <span className="text-amber-400 font-bold">{estimatedHarvest}</span></span>
        {pestPlots > 0 && <span className="text-red-400">🐛 虫害 {pestPlots}</span>}
        {expandQueue.length > 0 && <span className="text-blue-400">⛏ 开垦中 {expandQueue.length}</span>}
      </div>

      {/* 农田概览（全宽） */}
      <div className="mb-4">
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-300">农田概览</h3>
            {/* 目标农田数内联 */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500">目标</span>
              <button onClick={() => handleTargetChange(-1)}
                disabled={targetCount <= totalPlots}
                className="w-5 h-5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center disabled:opacity-30 transition-colors text-xs">
                <Minus size={10} />
              </button>
              <span className="text-amber-400 font-bold w-5 text-center">{targetCount}</span>
              <button onClick={() => handleTargetChange(1)}
                className="w-5 h-5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center transition-colors text-xs">
                <Plus size={10} />
              </button>
              {targetCount > totalPlots + expandQueue.length && (
                <span className="text-blue-400 text-[10px]">待开垦 {targetCount - totalPlots - expandQueue.length}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {plots.map(plot => (
              <PlotBlock
                key={plot.id}
                plot={plot}
                farmers={farmers}
                selected={selectedPlot === plot.id}
                onClick={() => setSelectedPlot(selectedPlot === plot.id ? null : plot.id)}
              />
            ))}
            {expandQueue.map((q, i) => (
              <ExpandBlock key={`expand_${i}`} q={q} allChars={allChars} />
            ))}
          </div>

          {/* 选中详情 */}
          {selectedPlotData && (
            <div className="mt-4 p-3 bg-stone-900/50 rounded-lg border border-stone-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-stone-200">{selectedPlotData.name}</span>
                <span className="text-xs text-stone-500">
                  {STATE_COLORS[selectedPlotData.state]?.label || selectedPlotData.state}
                  {selectedPlotData.state === FIELD_STATE.GROWING && ` ${Math.floor(selectedPlotData.growthProgress)}%`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div><span className="text-stone-500">水分</span> <span className={selectedPlotData.waterLevel < 40 ? 'text-red-400' : 'text-blue-400'}>{Math.floor(selectedPlotData.waterLevel)}</span></div>
                <div><span className="text-stone-500">肥力</span> <span className="text-green-400">{Math.floor(selectedPlotData.fertility)}</span></div>
                <div><span className="text-stone-500">杂草</span> <span className={selectedPlotData.weedGrowth > 40 ? 'text-lime-400' : 'text-stone-400'}>{Math.floor(selectedPlotData.weedGrowth)}</span></div>
              </div>
              <div className="text-xs text-stone-400 mb-1">分配给：</div>
              <div className="flex flex-wrap gap-1">
                {selectedPlotData.assignedTo ? (
                  <>
                    <span className="px-2 py-1 bg-green-900/40 text-green-300 rounded text-xs">
                      {farmers.find(f => f.id === selectedPlotData.assignedTo)?.name || '未知'}
                    </span>
                    <button onClick={() => handleUnassign(selectedPlotData.id)}
                      className="px-2 py-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 rounded text-xs transition-colors">
                      取消
                    </button>
                  </>
                ) : (
                  farmers.map(f => (
                    <button key={f.id} onClick={() => handleAssign(selectedPlotData.id, f.id)}
                      className="px-2 py-1 bg-stone-700/50 hover:bg-stone-600/50 text-stone-300 rounded text-xs transition-colors">
                      {f.name}{f.isPlayer ? '(你)' : ''}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 队内农民（独立一行） */}
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-300">队内农民 ({farmers.length})</h3>
          <button onClick={handleRecruit}
            className="flex items-center gap-1 px-2 py-1 bg-green-800/50 hover:bg-green-700/50 text-green-300 rounded text-xs transition-colors">
            <UserPlus size={12} /> 招募
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {farmers.map(farmer => {
            const moodInfo = getMoodInfo(farmer.mood);
            const assignedPlots = game.farm.getPlotsForCharacter(farmer.id);
            const isExpanding = game.farm.expandQueue.find(q => q.characterId === farmer.id);
            const speed = farmer.getFarmWorkSpeed();
            return (
              <div key={farmer.id} className="p-2 rounded-lg bg-stone-900/30 border border-stone-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-200">{farmer.name}</span>
                    {farmer.isPlayer && <span className="text-[10px] px-1 py-0.5 bg-amber-900/40 text-amber-400 rounded">你</span>}
                  </div>
                  <span className="text-[10px]" style={{ color: moodInfo.color }}>{moodInfo.icon}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
                  <span>耕种 {Math.floor(farmer.knowledgeAttributes.farming)}</span>
                  <span>速率 {speed.toFixed(1)}x</span>
                  {isExpanding ? (
                    <span className="text-blue-400">⛏ 开垦中</span>
                  ) : assignedPlots.length > 0 ? (
                    <span className="text-green-400">管理 {assignedPlots.length} 田</span>
                  ) : (
                    <span className="text-stone-600">空闲</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
