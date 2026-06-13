import { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Users, Clock, Coins, Heart, BedDouble, ChevronDown, ChevronUp } from 'lucide-react';
import { FIELD_STATE, FIELD_DISPLAY } from '../engine/FarmSystem';
import { FARM_EXPAND_TICKS, RECRUIT_POOL_SIZE } from '../engine/constants';
import { getMoodInfo } from '../engine/Character';
import { CROPS } from '../data/crops';
import { OVERTIME_RATES, BENEFIT_RATES } from '../engine/FinanceSystem';

// 获取plot的分配角色名列表
function getAssignedNames(plot, farmers) {
  const ids = Array.isArray(plot.assignedTo) ? plot.assignedTo : (plot.assignedTo ? [plot.assignedTo] : []);
  return ids.map(id => {
    const f = farmers.find(f => f.id === id);
    return f ? f.name : null;
  }).filter(Boolean);
}

function PlotBlock({ plot, farmers, selected, onClick }) {
  const info = FIELD_DISPLAY[plot.state] || FIELD_DISPLAY[FIELD_STATE.EMPTY];
  const growPct = plot.state === FIELD_STATE.GROWING ? Math.floor(plot.growthProgress) : null;
  const caretakers = getAssignedNames(plot, farmers);

  return (
    <div
      onClick={onClick}
      className={`relative w-16 h-16 rounded-lg border-2 ${info.bg} ${selected ? 'border-amber-400 ring-1 ring-amber-400/50' : info.border} cursor-pointer hover:brightness-125 transition-all flex flex-col items-center justify-center overflow-hidden`}
    >
      <span className="text-[8px] text-stone-400/80 absolute top-0.5 left-0 right-0 text-center truncate px-0.5">{plot.name}</span>
      {growPct !== null ? (
        <span className="text-xs font-bold text-green-300">{growPct}%</span>
      ) : (
        <span className="text-xs text-stone-400">{info.label}</span>
      )}
      <div className="flex gap-0.5 mt-0.5">
        {plot.hasPest && <span className="text-[10px]">🐛</span>}
        {plot.weedGrowth > 40 && <span className="text-[10px]">🌿</span>}
        {plot.waterLevel < 30 && <span className="text-[10px]">💧</span>}
      </div>
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
  const pct = Math.floor(((FARM_EXPAND_TICKS - q.ticksRemaining) / FARM_EXPAND_TICKS) * 100);
  return (
    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-600 flex flex-col items-center justify-center overflow-hidden relative">
      <div className="absolute bottom-0 left-0 right-0 bg-blue-800/30" style={{ height: `${pct}%` }} />
      <span className="text-[10px] text-stone-400 relative z-10">⛏</span>
      <span className="text-[9px] text-blue-400 font-bold relative z-10">{pct}%</span>
      {char && <span className="text-[7px] text-stone-500 relative z-10">{char.name}</span>}
    </div>
  );
}

function calcDailyYieldEstimate(plots) {
  let totalDaily = 0;
  for (const plot of plots) {
    if (plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.PLANTED) {
      const crop = plot.getCropDef();
      if (!crop) continue;
      const growthTicks = crop.growthTime * 100 || 100;
      const totalYield = Math.floor(crop.baseYield * plot.getYieldModifier());
      const daysToGrow = growthTicks / 10;
      totalDaily += totalYield / daysToGrow;
    }
  }
  return totalDaily;
}

// ========== 子面板：农田概览 ==========
function OverviewTab({ game, selectedPlot, setSelectedPlot, onAction }) {
  const plots = game.farm.plots;
  const farmers = game.characters.filter(c => c.hasRole('farmer') && !c.isRetired);
  const expandQueue = game.farm.expandQueue;
  const targetCount = game.farm.targetPlotCount;
  const allChars = [game.player, ...game.characters];

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
  const selectedPlotData = selectedPlot ? plots.find(p => p.id === selectedPlot) : null;

  const handleTargetChange = (delta) => {
    const newCount = Math.max(0, targetCount + delta);
    if (onAction) onAction('set_target_plots', { count: newCount });
  };

  const handleAssign = (plotId, charId) => {
    if (onAction) onAction('assign_plot', { plotId, characterId: charId });
  };
  const handleUnassign = (plotId, charId) => {
    if (onAction) onAction('unassign_plot', { plotId, characterId: charId });
  };

  const selectedAssignedIds = selectedPlotData
    ? (Array.isArray(selectedPlotData.assignedTo) ? selectedPlotData.assignedTo : (selectedPlotData.assignedTo ? [selectedPlotData.assignedTo] : []))
    : [];

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs">
        <span className="text-stone-400">农田 <span className="text-stone-200 font-bold">{totalPlots}</span></span>
        <span className="text-stone-400">种植中 <span className="text-green-400 font-bold">{growingPlots}</span></span>
        <span className="text-stone-400">可收获 <span className="text-yellow-400 font-bold">{readyPlots}</span></span>
        <span className="text-stone-400">空闲田 <span className="text-stone-300 font-bold">{emptyPlots}</span></span>
        <span className="text-stone-400">预计总产 <span className="text-amber-400 font-bold">{estimatedHarvest}</span></span>
        <span className="text-stone-400">日均产量 <span className="text-amber-300 font-bold">≈{dailyYield.toFixed(1)}</span></span>
        <span className="text-stone-400">平均肥力 <span className="text-green-400 font-bold">{avgFertility}</span></span>
        {pestPlots > 0 && <span className="text-red-400">🐛 虫害 {pestPlots}</span>}
        {lowWaterPlots > 0 && <span className="text-blue-400">💧 缺水 {lowWaterPlots}</span>}
        {expandQueue.length > 0 && <span className="text-blue-400">⛏ 开垦中 {expandQueue.length}</span>}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-stone-300">农田概览</h3>
        <div className="flex flex-col items-end gap-0.5">
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
            <span className="text-blue-400 text-xs">待开垦 {targetCount - totalPlots - expandQueue.length}</span>
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

      {selectedPlotData && (
        <div className="mt-4 p-3 bg-stone-900/50 rounded-lg border border-stone-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-stone-200">{selectedPlotData.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">
                {FIELD_DISPLAY[selectedPlotData.state]?.label || selectedPlotData.state}
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
  );
}

// ========== 子面板：人员管理 ==========
function PersonnelTab({ game, onAction }) {
  const farmers = game.characters.filter(c => c.hasRole('farmer') && !c.isRetired);
  const recruitingIds = game.recruitingNPCIds;

  const assignedFarmerCount = new Set(game.farm.plots.flatMap(p =>
    Array.isArray(p.assignedTo) ? p.assignedTo : (p.assignedTo ? [p.assignedTo] : [])
  )).size;
  const idleFarmers = farmers.filter(f => {
    if (f.isRetired) return false;
    const hasPlots = game.farm.getPlotsForCharacter(f.id).length > 0;
    const isExpanding = game.farm.expandQueue.find(q => q.characterId === f.id);
    const isRecruiting = recruitingIds.has(f.id);
    return !hasPlots && !isExpanding && !isRecruiting;
  }).length;
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-stone-400" />
          <h3 className="text-sm font-bold text-stone-300">人员管理</h3>
          <span className="text-xs text-stone-500">({farmers.length} 人)</span>
        </div>
        <div className="text-xs text-stone-500">
          在岗 <span className="text-green-400 font-bold">{assignedFarmerCount}</span>
          {' / '}
          空闲 <span className="text-stone-300 font-bold">{idleFarmers}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {farmers.map(farmer => {
          const moodInfo = getMoodInfo(farmer.mood);
          const assignedPlots = game.farm.getPlotsForCharacter(farmer.id);
          const isExpanding = game.farm.expandQueue.find(q => q.characterId === farmer.id);
          const isRecruiting = recruitingIds.has(farmer.id);
          const speed = farmer.getDisplaySpeed();
          const genderIcon = farmer.gender === 'female' ? '♀' : '♂';
          const farmingRevealed = farmer.isAttributeRevealed('farming');
          const workerState = game.workerSystem?.workerState?.[farmer.id];
          const fatigue = workerState?.fatigue || 0;
          const health = workerState?.health || 100;

          return (
            <div key={farmer.id} className={`p-2 rounded-lg border ${
              farmer.isRetired ? 'border-stone-800/30 bg-stone-900/20 opacity-60'
              : isRecruiting ? 'border-amber-700/50 bg-amber-900/10'
              : 'border-stone-700/30 bg-stone-900/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-stone-200">{farmer.name}</span>
                  <span className="text-xs text-stone-500">{genderIcon} {farmer.age}岁</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base" style={{ color: moodInfo.color }} title={`心情: ${farmer.mood} ${moodInfo.text}`}>{moodInfo.icon}</span>
                  {!isRecruiting && (
                    <button
                      onClick={() => onAction('dismiss_character', { characterId: farmer.id })}
                      className="text-red-500/40 hover:text-red-400 transition-colors"
                      title={`遣散${farmer.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {farmer.traits && farmer.traits.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {farmer.traits.map(t => (
                    <span key={t.id} className="text-[9px] px-1 py-0.5 bg-stone-800 rounded text-stone-500" title={t.description}>
                      {t.icon}{t.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
                {farmingRevealed ? (
                  <span>🌾 {Math.floor(farmer.knowledgeAttributes.farming)}</span>
                ) : (
                  <span title={`揭示进度 ${Math.floor(farmer.getRevealProgress('farming') * 100)}%`}>🌾 ???</span>
                )}
                <span>速率 {speed.toFixed(1)}</span>
                {farmer.isRetired ? (
                  <span className="text-stone-600">👴 已退休</span>
                ) : isRecruiting ? (
                  <span className="text-amber-400">🚶 招募中</span>
                ) : isExpanding ? (
                  <span className="text-blue-400">⛏ 开垦中</span>
                ) : assignedPlots.length > 0 ? (
                  <span className="text-green-400">管理 {assignedPlots.length} 田</span>
                ) : (
                  <span className="text-stone-600">空闲</span>
                )}
              </div>

              {/* 疲劳/健康条 */}
              {workerState && (
                <div className="flex gap-2 mt-1.5">
                  <div className="flex items-center gap-1 flex-1">
                    <BedDouble size={9} className={fatigue > 60 ? 'text-orange-400' : 'text-stone-500'} />
                    <div className="flex-1 h-1 bg-stone-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(100, fatigue)}%`,
                        backgroundColor: fatigue > 80 ? '#ef4444' : fatigue > 50 ? '#f59e0b' : '#22c55e',
                      }} />
                    </div>
                    <span className="text-[8px] text-stone-500 w-6">{Math.round(fatigue)}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <Heart size={9} className={health < 50 ? 'text-red-400' : 'text-stone-500'} />
                    <div className="flex-1 h-1 bg-stone-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(100, health)}%`,
                        backgroundColor: health < 30 ? '#ef4444' : health < 60 ? '#f59e0b' : '#22c55e',
                      }} />
                    </div>
                    <span className="text-[8px] text-stone-500 w-6">{Math.round(health)}</span>
                  </div>
                </div>
              )}

              {farmer.appearance && (
                <div className="text-[9px] text-stone-600 mt-0.5 italic">{farmer.appearance}</div>
              )}
            </div>
          );
        })}
      </div>
      {farmers.length === 0 && (
        <div className="text-center text-stone-600 text-sm py-8">
          还没有农民，去「附近村庄」招募吧
        </div>
      )}
    </div>
  );
}

// ========== 子面板：工人权益管理 ==========
function WorkerWelfareTab({ game, onAction }) {
  const farmers = game.characters.filter(c => c.hasRole('farmer') && !c.isRetired);
  const finance = game.financeSystem;
  const workerSys = game.workerSystem;

  // 当前工资设置
  const wageSettings = finance.wageSettings['farmer'] || {
    baseSalary: 100,
    overtimeRate: OVERTIME_RATES.weekday,
    standardHours: 8,
    maxOvertime: 4,
    mealAllowance: false,
    housing: false,
    insurance: true,
  };

  const [localSettings, setLocalSettings] = useState({ ...wageSettings });

  const handleSave = () => {
    finance.setWageSettings('farmer', localSettings);
    onAction('set_wage_settings', { postId: 'farmer', settings: localSettings });
  };

  // 计算每日总成本
  const cost = finance.calculateDailyCost(farmers);
  const benefitRate = Object.values(BENEFIT_RATES).reduce((s, r) => s + r, 0);

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins size={14} className="text-amber-400" />
          <h3 className="text-sm font-bold text-stone-300">工人权益管理</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">国库</span>
          <span className="text-sm text-amber-400 font-bold">{finance.treasury} 银两</span>
        </div>
      </div>

      {/* 工资设置 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-3 flex items-center gap-1.5">
          <Coins size={12} /> 农夫岗位工资设置
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 底薪 */}
          <div>
            <label className="text-[10px] text-stone-500 block mb-1">底薪（银两/月）</label>
            <div className="flex items-center gap-1">
              <button onClick={() => setLocalSettings(s => ({ ...s, baseSalary: Math.max(0, s.baseSalary - 10) }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Minus size={10} />
              </button>
              <span className="text-sm text-amber-400 font-bold w-12 text-center">{localSettings.baseSalary}</span>
              <button onClick={() => setLocalSettings(s => ({ ...s, baseSalary: s.baseSalary + 10 }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Plus size={10} />
              </button>
            </div>
            <div className="text-[9px] text-stone-600 mt-0.5">
              日薪: {Math.round(localSettings.baseSalary / 30)} 银两
            </div>
          </div>

          {/* 标准工时 */}
          <div>
            <label className="text-[10px] text-stone-500 block mb-1">标准工时（小时/天）</label>
            <div className="flex items-center gap-1">
              <button onClick={() => setLocalSettings(s => ({ ...s, standardHours: Math.max(4, s.standardHours - 1) }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Minus size={10} />
              </button>
              <span className="text-sm text-blue-400 font-bold w-12 text-center">{localSettings.standardHours}</span>
              <button onClick={() => setLocalSettings(s => ({ ...s, standardHours: Math.min(12, s.standardHours + 1) }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Plus size={10} />
              </button>
            </div>
          </div>

          {/* 加班费率 */}
          <div>
            <label className="text-[10px] text-stone-500 block mb-1">加班费率（倍）</label>
            <div className="flex items-center gap-1">
              <button onClick={() => setLocalSettings(s => ({ ...s, overtimeRate: Math.max(1.0, +(s.overtimeRate - 0.5).toFixed(1)) }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Minus size={10} />
              </button>
              <span className="text-sm text-orange-400 font-bold w-12 text-center">{localSettings.overtimeRate}x</span>
              <button onClick={() => setLocalSettings(s => ({ ...s, overtimeRate: Math.min(3.0, +(s.overtimeRate + 0.5).toFixed(1)) }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Plus size={10} />
              </button>
            </div>
          </div>

          {/* 加班上限 */}
          <div>
            <label className="text-[10px] text-stone-500 block mb-1">加班上限（小时/天）</label>
            <div className="flex items-center gap-1">
              <button onClick={() => setLocalSettings(s => ({ ...s, maxOvertime: Math.max(0, s.maxOvertime - 1) }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Minus size={10} />
              </button>
              <span className="text-sm text-red-400 font-bold w-12 text-center">{localSettings.maxOvertime}h</span>
              <button onClick={() => setLocalSettings(s => ({ ...s, maxOvertime: Math.min(8, s.maxOvertime + 1) }))}
                className="w-6 h-6 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 flex items-center justify-center text-xs">
                <Plus size={10} />
              </button>
            </div>
          </div>
        </div>

        {/* 福利开关 */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => setLocalSettings(s => ({ ...s, mealAllowance: !s.mealAllowance }))}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              localSettings.mealAllowance ? 'bg-green-800/60 text-green-300' : 'bg-stone-700/40 text-stone-500'
            }`}>
            🍚 餐补 {localSettings.mealAllowance ? '✓' : '✗'}
          </button>
          <button
            onClick={() => setLocalSettings(s => ({ ...s, housing: !s.housing }))}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              localSettings.housing ? 'bg-green-800/60 text-green-300' : 'bg-stone-700/40 text-stone-500'
            }`}>
            🏠 住房 {localSettings.housing ? '✓' : '✗'}
          </button>
          <button
            onClick={() => setLocalSettings(s => ({ ...s, insurance: !s.insurance }))}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              localSettings.insurance ? 'bg-blue-800/60 text-blue-300' : 'bg-stone-700/40 text-stone-500'
            }`}>
            🛡️ 五险一金 {localSettings.insurance ? '✓' : '✗'}
          </button>
        </div>

        <div className="flex justify-end mt-3">
          <button onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-amber-700 hover:bg-amber-600 text-amber-100 rounded transition-colors">
            保存设置
          </button>
        </div>
      </div>

      {/* 每日成本分析 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">📊 每日成本分析</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500">工人工资</span>
            <span className="text-amber-400">{cost.totalWages} 银两</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">五险一金</span>
            <span className="text-blue-400">{cost.totalBenefits} 银两</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">福利支出</span>
            <span className="text-green-400">{cost.totalOther} 银两</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-stone-400">总人力成本</span>
            <span className="text-red-400">{cost.total} 银两/天</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-stone-700/30 text-[10px] text-stone-600">
          五险一金比例: {Math.round(benefitRate * 100)}% (养老8% + 医疗2% + 失业0.5% + 工伤0.5% + 生育0.8% + 公积金12%)
        </div>
      </div>

      {/* 工人列表（简要） */}
      <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">👥 工人列表</div>
        <div className="space-y-1.5">
          {farmers.map(farmer => {
            const state = workerSys?.workerState?.[farmer.id];
            const totalHours = (state?.workHours || 8) + (state?.overtimeHours || 0);
            const morale = state?.morale || 70;

            return (
              <div key={farmer.id} className="flex items-center justify-between text-xs py-1 border-b border-stone-800/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-stone-300 w-16 truncate">{farmer.name}</span>
                  <span className="text-stone-600">{totalHours}h/天</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={morale >= 70 ? 'text-green-400' : morale >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                    心情 {Math.round(morale)}
                  </span>
                </div>
              </div>
            );
          })}
          {farmers.length === 0 && (
            <div className="text-center text-stone-600 text-xs py-3">暂无工人</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== 主面板 ==========
export default function FarmLeaderPanel({ game, onAction }) {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const plots = game.farm.plots;

  useEffect(() => {
    if (game.farm.targetPlotCount < plots.length) {
      game.farm.targetPlotCount = plots.length;
      if (onAction) onAction('set_target_plots', { count: plots.length });
    }
  }, []);

  const tabs = [
    { id: 'overview', label: '农田概览', icon: '🌾' },
    { id: 'personnel', label: '人员管理', icon: '👥' },
    { id: 'welfare', label: '工人权益', icon: '💰' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">👨‍🌾</span>
        <h2 className="text-lg font-bold text-amber-400">农田管理</h2>
        <span className="text-xs text-stone-500">（农民队长视角）</span>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 bg-stone-900/50 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-800/60 text-amber-200'
                : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          game={game}
          selectedPlot={selectedPlot}
          setSelectedPlot={setSelectedPlot}
          onAction={onAction}
        />
      )}
      {activeTab === 'personnel' && (
        <PersonnelTab game={game} onAction={onAction} />
      )}
      {activeTab === 'welfare' && (
        <WorkerWelfareTab game={game} onAction={onAction} />
      )}
    </div>
  );
}
