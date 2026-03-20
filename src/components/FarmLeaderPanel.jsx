import { useState } from 'react';
import { Users, Plus, Minus, UserPlus } from 'lucide-react';
import { FIELD_STATE } from '../engine/FarmSystem';
import { getMoodInfo } from '../engine/Character';

// 农田小方块状态颜色
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
      className={`relative w-16 h-16 rounded-lg border-2 ${info.bg} ${selected ? 'border-amber-400 ring-1 ring-amber-400/50' : info.border} cursor-pointer hover:brightness-125 transition-all flex flex-col items-center justify-center`}
    >
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
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-stone-900 border border-stone-600 flex items-center justify-center" title={assignedFarmer.name}>
          <span className="text-[8px]">👤</span>
        </div>
      )}

      {/* 名字 */}
      <div className="absolute -top-4 left-0 right-0 text-center">
        <span className="text-[9px] text-stone-500 truncate">{plot.name}</span>
      </div>
    </div>
  );
}

export default function FarmLeaderPanel({ game, onAction }) {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const plots = game.farm.plots;
  const farmers = [game.player, ...game.characters].filter(c => c.hasRole('farmer'));

  // 统计
  const totalPlots = plots.length;
  const growingPlots = plots.filter(p => p.state === FIELD_STATE.GROWING || p.state === FIELD_STATE.PLANTED).length;
  const readyPlots = plots.filter(p => p.state === FIELD_STATE.READY).length;
  const pestPlots = plots.filter(p => p.hasPest).length;

  // 预计收获
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

      {/* 顶部统计条 */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <span className="text-stone-400">农田 <span className="text-stone-200 font-bold">{totalPlots}</span></span>
        <span className="text-stone-400">种植中 <span className="text-green-400 font-bold">{growingPlots}</span></span>
        <span className="text-stone-400">可收获 <span className="text-yellow-400 font-bold">{readyPlots}</span></span>
        <span className="text-stone-400">预计产量 <span className="text-amber-400 font-bold">{estimatedHarvest}</span></span>
        {pestPlots > 0 && <span className="text-red-400">🐛 虫害 {pestPlots}</span>}
        {expandQueue.length > 0 && <span className="text-blue-400">⛏ 开垦中 {expandQueue.length}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* 农田概览网格 */}
        <div className="lg:col-span-2 rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="text-sm font-bold text-stone-300 mb-4">农田概览</h3>
          <div className="flex flex-wrap gap-4 pt-3">
            {plots.map(plot => (
              <PlotBlock
                key={plot.id}
                plot={plot}
                farmers={farmers}
                selected={selectedPlot === plot.id}
                onClick={() => setSelectedPlot(selectedPlot === plot.id ? null : plot.id)}
              />
            ))}
            {/* 开垦中的虚位 */}
            {expandQueue.map((q, i) => {
              const char = [game.player, ...game.characters].find(c => c.id === q.characterId);
              const dayLeft = Math.ceil(q.ticksRemaining / 10);
              return (
                <div key={`expand_${i}`} className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-600 flex flex-col items-center justify-center opacity-50">
                  <span className="text-[10px] text-stone-500">⛏</span>
                  <span className="text-[9px] text-stone-600">{dayLeft}天</span>
                  {char && <span className="text-[8px] text-stone-600">{char.name}</span>}
                </div>
              );
            })}
          </div>

          {/* 选中农田详情 */}
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

              {/* 分配管理 */}
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

        {/* 右侧：管理面板 */}
        <div className="space-y-4">
          {/* 目标农田数 */}
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
            <h3 className="text-sm font-bold text-stone-300 mb-3">目标农田</h3>
            <div className="flex items-center justify-center gap-3 mb-2">
              <button onClick={() => handleTargetChange(-1)}
                disabled={targetCount <= totalPlots}
                className="w-7 h-7 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center disabled:opacity-30 transition-colors">
                <Minus size={14} />
              </button>
              <span className="text-2xl font-bold text-amber-400 w-10 text-center">{targetCount}</span>
              <button onClick={() => handleTargetChange(1)}
                className="w-7 h-7 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="text-xs text-stone-500 text-center">
              当前 {totalPlots} 块
              {targetCount > totalPlots && (
                <span className="text-blue-400">（需开垦 {targetCount - totalPlots - expandQueue.length > 0 ? targetCount - totalPlots - expandQueue.length : 0} 块）</span>
              )}
            </div>
          </div>

          {/* 队内农民 */}
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-300">农民 ({farmers.length})</h3>
              <button onClick={handleRecruit}
                className="flex items-center gap-1 px-2 py-1 bg-green-800/50 hover:bg-green-700/50 text-green-300 rounded text-xs transition-colors">
                <UserPlus size={12} /> 招募
              </button>
            </div>
            <div className="space-y-2">
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
      </div>
    </div>
  );
}
