import { useState, useEffect } from 'react';
import { Plus, Minus, UserPlus, Trash2 } from 'lucide-react';
import { FIELD_STATE } from '../engine/FarmSystem';
import { getMoodInfo } from '../engine/Character';
import { CROPS } from '../data/crops';

const STATE_COLORS = {
  [FIELD_STATE.EMPTY]: { bg: 'bg-stone-700', border: 'border-stone-600', label: '空' },
  [FIELD_STATE.PLOWED]: { bg: 'bg-amber-900/60', border: 'border-amber-700/50', label: '翻' },
  [FIELD_STATE.PLANTED]: { bg: 'bg-green-900/60', border: 'border-green-700/50', label: '种' },
  [FIELD_STATE.GROWING]: { bg: 'bg-green-800/60', border: 'border-green-600/50', label: null },
  [FIELD_STATE.READY]: { bg: 'bg-yellow-800/60', border: 'border-yellow-600/50', label: '收' },
  [FIELD_STATE.WITHERED]: { bg: 'bg-red-900/60', border: 'border-red-700/50', label: '枯' },
};

// 获取plot的分配角色名列表
function getAssignedNames(plot, farmers) {
  const ids = Array.isArray(plot.assignedTo) ? plot.assignedTo : (plot.assignedTo ? [plot.assignedTo] : []);
  return ids.map(id => {
    const f = farmers.find(f => f.id === id);
    return f ? f.name : null;
  }).filter(Boolean);
}

function PlotBlock({ plot, farmers, selected, onClick }) {
  const info = STATE_COLORS[plot.state] || STATE_COLORS[FIELD_STATE.EMPTY];
  const growPct = plot.state === FIELD_STATE.GROWING ? Math.floor(plot.growthProgress) : null;
  const caretakers = getAssignedNames(plot, farmers);

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

      {/* 照顾者名字 */}
      {caretakers.length > 0 && (
        <span className="text-[7px] text-amber-300/80 absolute bottom-0.5 left-0 right-0 text-center truncate px-0.5">
          {caretakers.length <= 2 ? caretakers.join(',') : `${caretakers[0]}+${caretakers.length - 1}`}
        </span>
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

// 计算农田预计每日产量
function calcDailyYieldEstimate(plots) {
  let totalDaily = 0;
  for (const plot of plots) {
    if (plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.PLANTED) {
      const crop = plot.getCropDef();
      if (!crop) continue;
      const growthTicks = crop.growthTime * 100 || 100; // ticks to grow
      const totalYield = Math.floor(crop.baseYield * plot.getYieldModifier());
      // 每天10 ticks
      const daysToGrow = growthTicks / 10;
      totalDaily += totalYield / daysToGrow;
    } else if (plot.state === FIELD_STATE.READY) {
      // 已成熟但未收获，不算持续产量
    }
  }
  return totalDaily;
}

export default function FarmLeaderPanel({ game, onAction }) {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const plots = game.farm.plots;
  const farmers = game.characters.filter(c => c.hasRole('farmer'));

  // 切换到队长视角时，自动将目标农田数同步为当前实际农田数
  useEffect(() => {
    if (game.farm.targetPlotCount < plots.length) {
      game.farm.targetPlotCount = plots.length;
      if (onAction) onAction('set_target_plots', { count: plots.length });
    }
  }, []);

  const totalPlots = plots.length;
  const growingPlots = plots.filter(p => p.state === FIELD_STATE.GROWING || p.state === FIELD_STATE.PLANTED).length;
  const readyPlots = plots.filter(p => p.state === FIELD_STATE.READY).length;
  const emptyPlots = plots.filter(p => p.state === FIELD_STATE.EMPTY || p.state === FIELD_STATE.PLOWED || p.state === FIELD_STATE.WITHERED).length;
  const pestPlots = plots.filter(p => p.hasPest).length;
  const lowWaterPlots = plots.filter(p => p.waterLevel < 30 && (p.state === FIELD_STATE.GROWING || p.state === FIELD_STATE.READY)).length;
  const avgFertility = plots.length > 0 ? Math.floor(plots.reduce((s, p) => s + p.fertility, 0) / plots.length) : 0;

  let estimatedHarvest = 0;
  for (const plot of plots) {
    if (plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.READY) {
      const crop = plot.getCropDef();
      if (crop) estimatedHarvest += Math.floor(crop.baseYield * plot.getYieldModifier());
    }
  }

  const dailyYield = calcDailyYieldEstimate(plots);
  // 统计用：包含玩家在内的全部农民
  const allFarmers = [game.player, ...game.characters].filter(c => c.hasRole('farmer'));
  const assignedFarmerCount = new Set(plots.flatMap(p => Array.isArray(p.assignedTo) ? p.assignedTo : (p.assignedTo ? [p.assignedTo] : []))).size;
  const idleFarmers = allFarmers.filter(f => {
    const hasPlots = game.farm.getPlotsForCharacter(f.id).length > 0;
    const isExpanding = game.farm.expandQueue.find(q => q.characterId === f.id);
    return !hasPlots && !isExpanding;
  }).length;

  const selectedPlotData = selectedPlot ? plots.find(p => p.id === selectedPlot) : null;
  const expandQueue = game.farm.expandQueue;
  const targetCount = game.farm.targetPlotCount;
  const allChars = [game.player, ...game.characters];

  const handleAssign = (plotId, charId) => {
    if (onAction) onAction('assign_plot', { plotId, characterId: charId });
  };
  const handleUnassign = (plotId, charId) => {
    if (onAction) onAction('unassign_plot', { plotId, characterId: charId });
  };
  const handleTargetChange = (delta) => {
    const newCount = Math.max(0, targetCount + delta);
    if (onAction) onAction('set_target_plots', { count: newCount });
  };
  const handleRecruit = () => {
    if (onAction) onAction('leader_recruit');
  };

  // 获取选中农田的分配id列表
  const selectedAssignedIds = selectedPlotData
    ? (Array.isArray(selectedPlotData.assignedTo) ? selectedPlotData.assignedTo : (selectedPlotData.assignedTo ? [selectedPlotData.assignedTo] : []))
    : [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">👨‍🌾</span>
        <h2 className="text-lg font-bold text-amber-400">农田管理</h2>
        <span className="text-xs text-stone-500">（农民队长视角）</span>
      </div>

      {/* 统计条 - 更多信息 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs">
        <span className="text-stone-400">农田 <span className="text-stone-200 font-bold">{totalPlots}</span></span>
        <span className="text-stone-400">种植中 <span className="text-green-400 font-bold">{growingPlots}</span></span>
        <span className="text-stone-400">可收获 <span className="text-yellow-400 font-bold">{readyPlots}</span></span>
        <span className="text-stone-400">空闲田 <span className="text-stone-300 font-bold">{emptyPlots}</span></span>
        <span className="text-stone-400">预计总产 <span className="text-amber-400 font-bold">{estimatedHarvest}</span></span>
        <span className="text-stone-400">日均产量 <span className="text-amber-300 font-bold">≈{dailyYield.toFixed(1)}</span></span>
        <span className="text-stone-400">平均肥力 <span className="text-green-400 font-bold">{avgFertility}</span></span>
        <span className="text-stone-400">农民 <span className="text-stone-200 font-bold">{allFarmers.length}</span><span className="text-stone-600">（在岗{assignedFarmerCount} 空闲{idleFarmers}）</span></span>
        {pestPlots > 0 && <span className="text-red-400">🐛 虫害 {pestPlots}</span>}
        {lowWaterPlots > 0 && <span className="text-blue-400">💧 缺水 {lowWaterPlots}</span>}
        {expandQueue.length > 0 && <span className="text-blue-400">⛏ 开垦中 {expandQueue.length}</span>}
      </div>

      {/* 农田概览（全宽） */}
      <div className="mb-4">
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-300">农田概览</h3>
            {/* 目标农田数 - 更大更醒目 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-400">目标</span>
              <button onClick={() => handleTargetChange(-1)}
                disabled={targetCount <= 0}
                className="w-7 h-7 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center disabled:opacity-30 transition-colors">
                <Minus size={14} />
              </button>
              <span className="text-xl text-amber-400 font-bold w-8 text-center">{targetCount}</span>
              <button onClick={() => handleTargetChange(1)}
                className="w-7 h-7 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {targetCount > totalPlots + expandQueue.length && (
              <span className="text-blue-400 text-xs mt-1 text-right">待开垦 {targetCount - totalPlots - expandQueue.length}</span>
            )}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {STATE_COLORS[selectedPlotData.state]?.label || selectedPlotData.state}
                    {selectedPlotData.state === FIELD_STATE.GROWING && ` ${Math.floor(selectedPlotData.growthProgress)}%`}
                  </span>
                  <button
                    onClick={() => { if (onAction) onAction('remove_plot', { plotId: selectedPlotData.id }); setSelectedPlot(null); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-900/40 hover:bg-red-800/50 text-red-400 rounded transition-colors"
                    title="拆除农田"
                  >
                    <Trash2 size={11} /> 拆除
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div><span className="text-stone-500">水分</span> <span className={selectedPlotData.waterLevel < 40 ? 'text-red-400' : 'text-blue-400'}>{Math.floor(selectedPlotData.waterLevel)}</span></div>
                <div><span className="text-stone-500">肥力</span> <span className="text-green-400">{Math.floor(selectedPlotData.fertility)}</span></div>
                <div><span className="text-stone-500">杂草</span> <span className={selectedPlotData.weedGrowth > 40 ? 'text-lime-400' : 'text-stone-400'}>{Math.floor(selectedPlotData.weedGrowth)}</span></div>
                <div><span className="text-stone-500">产量修正</span> <span className={selectedPlotData.getYieldPercent() >= 0 ? 'text-green-400' : 'text-red-400'}>{selectedPlotData.getYieldPercent() >= 0 ? '+' : ''}{selectedPlotData.getYieldPercent()}%</span></div>
              </div>
              {/* 预计产量 */}
              {(selectedPlotData.state === FIELD_STATE.GROWING || selectedPlotData.state === FIELD_STATE.READY) && (() => {
                const crop = selectedPlotData.getCropDef();
                return crop ? (
                  <div className="text-xs text-stone-400 mb-2">
                    预计产量: <span className="text-amber-300 font-bold">{Math.floor(crop.baseYield * selectedPlotData.getYieldModifier())}</span> {crop.name}
                  </div>
                ) : null;
              })()}
              <div className="text-xs text-stone-400 mb-1">管理者：</div>
              <div className="flex flex-wrap gap-1">
                {/* 已分配的角色（排除玩家） */}
                {selectedAssignedIds.filter(cid => cid !== game.player.id).map(cid => {
                  const f = farmers.find(f => f.id === cid);
                  return (
                    <span key={cid} className="px-2 py-1 bg-green-900/40 text-green-300 rounded text-xs flex items-center gap-1">
                      {f?.name || '未知'}
                      <button onClick={() => handleUnassign(selectedPlotData.id, cid)}
                        className="text-red-400 hover:text-red-300 ml-1">✕</button>
                    </span>
                  );
                })}
                {/* 可分配的角色（排除已分配的和玩家） */}
                {farmers.filter(f => !selectedAssignedIds.includes(f.id)).map(f => (
                  <button key={f.id} onClick={() => handleAssign(selectedPlotData.id, f.id)}
                    className="px-2 py-1 bg-stone-700/50 hover:bg-stone-600/50 text-stone-300 rounded text-xs transition-colors">
                    +{f.name}
                  </button>
                ))}
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
            const speed = farmer.getDisplaySpeed();
            return (
              <div key={farmer.id} className="p-2 rounded-lg bg-stone-900/30 border border-stone-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-200">{farmer.name}</span>
                  </div>
                  {/* 心情 */}
                  <span className="text-base" style={{ color: moodInfo.color }} title={`心情: ${farmer.mood} ${moodInfo.text}`}>{moodInfo.icon}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
                  <span>耕种 {Math.floor(farmer.knowledgeAttributes.farming)}</span>
                  <span>速率 {speed.toFixed(1)}</span>
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
