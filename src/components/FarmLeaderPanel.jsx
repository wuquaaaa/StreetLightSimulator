import { useState, useEffect } from 'react';
import { Plus, Minus, UserPlus, Trash2, MapPin, Clock, Users, Wheat, ChevronRight, X } from 'lucide-react';
import { FIELD_STATE, FIELD_DISPLAY } from '../engine/FarmSystem';
import { FARM_EXPAND_TICKS, RECRUIT_TICKS, RECRUIT_FOOD_COST, RECRUIT_MAX_HIRE, RECRUIT_POOL_SIZE, TICKS_PER_DAY } from '../engine/constants';
import { getMoodInfo } from '../engine/Character';
import { CROPS } from '../data/crops';

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

// 计算农田预计每日产量
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
  const farmers = game.characters.filter(c => c.hasRole('farmer'));
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
      {/* 统计条 */}
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

      {/* 农田网格 */}
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

      {/* 选中详情 */}
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
function PersonnelTab({ game }) {
  const farmers = game.characters.filter(c => c.hasRole('farmer'));
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
  const retiredCount = farmers.filter(f => f.isRetired).length;

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
          {retiredCount > 0 && <>{' / '}<span className="text-stone-600">退休 {retiredCount}</span></>}
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

          return (
            <div key={farmer.id} className={`p-2 rounded-lg border ${
              farmer.isRetired ? 'border-stone-800/30 bg-stone-900/20 opacity-60'
              : isRecruiting ? 'border-amber-700/50 bg-amber-900/10'
              : 'border-stone-700/30 bg-stone-900/30'
            }`}>
              {/* 第一行：名字 + 心情 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-stone-200">{farmer.name}</span>
                  <span className="text-xs text-stone-500">{genderIcon} {farmer.age}岁</span>
                </div>
                <span className="text-base" style={{ color: moodInfo.color }} title={`心情: ${farmer.mood} ${moodInfo.text}`}>{moodInfo.icon}</span>
              </div>

              {/* 第二行：特质标签 */}
              {farmer.traits && farmer.traits.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {farmer.traits.map(t => (
                    <span key={t.id} className="text-[9px] px-1 py-0.5 bg-stone-800 rounded text-stone-500" title={t.description}>
                      {t.icon}{t.name}
                    </span>
                  ))}
                </div>
              )}

              {/* 第三行：数据 + 状态 */}
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

              {/* 外貌描述 */}
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

// ========== 子面板：附近村庄（招募） ==========
function VillageTab({ game, onAction }) {
  const recruitTask = game.recruitTask;
  const candidatePool = game.recruitCandidatePool || [];
  const hiredCount = game.recruitHiredCount || 0;
  const poolRefreshTicks = game.recruitPoolRefreshTicks || 0;
  const poolRefreshDays = Math.ceil(poolRefreshTicks / TICKS_PER_DAY);
  const farmers = game.characters.filter(c => c.hasRole('farmer'));
  const recruitingIds = game.recruitingNPCIds;

  // 可派出的 NPC（空闲 + 不在招募中 + 不在开垦中）
  const availableDelegates = farmers.filter(f => {
    const hasPlots = game.farm.getPlotsForCharacter(f.id).length > 0;
    const isExpanding = game.farm.expandQueue.find(q => q.characterId === f.id);
    const isRecruiting = recruitingIds.has(f.id);
    return !hasPlots && !isExpanding && !isRecruiting;
  });

  const foodAmount = game.warehouse.getItemAmount('food', 'wheat');
  const canAfford = foodAmount >= RECRUIT_FOOD_COST;
  const canHireMore = hiredCount < RECRUIT_MAX_HIRE;
  const canStartRecruit = !recruitTask && canHireMore && canAfford;

  const [selectedDelegate, setSelectedDelegate] = useState(null);

  const handleSelfRecruit = () => {
    if (onAction) onAction('leader_recruit');
  };

  const handleDelegateRecruit = () => {
    if (selectedDelegate && onAction) onAction('delegate_recruit', { characterId: selectedDelegate.id });
  };

  // 进行中的任务
  const isTraveling = recruitTask && recruitTask.phase === 'traveling';

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={14} className="text-amber-400" />
        <h3 className="text-sm font-bold text-stone-300">附近村庄</h3>
      </div>

      {/* 村庄状态 */}
      <div className="p-3 bg-stone-900/50 rounded-lg border border-stone-700/30 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-400">候选村民</span>
          <span className={candidatePool.length > 0 && canHireMore ? 'text-green-400 font-bold' : 'text-stone-600'}>
            {candidatePool.length} 人（已招 {hiredCount}/{RECRUIT_MAX_HIRE}）
          </span>
        </div>
        {(!canHireMore || candidatePool.length === 0) && poolRefreshTicks > 0 && (
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <Clock size={10} />
            {hiredCount >= RECRUIT_MAX_HIRE ? '本批已招满' : '候选已选完'}，约 {poolRefreshDays} 天后刷新
          </div>
        )}
      </div>

      {/* 招募进行中 */}
      {isTraveling && (
        <div className="mb-4">
          {recruitTask.type === 'self' ? (
            <RecruitProgressCard
              label="你正前往村庄..."
              sublabel="出发招募期间，无法亲自操作农田"
              task={recruitTask}
            />
          ) : (
            <RecruitProgressCard
              label={`${game.characters.find(c => c.id === recruitTask.delegateId)?.name || '某人'}正前往村庄...`}
              sublabel="派人招募，带回随机村民"
              task={recruitTask}
            />
          )}
        </div>
      )}

      {/* 亲自招募 vs 派人招募 选择 */}
      {!recruitTask && (
        <div className="space-y-3">
          {/* 选项1：亲自去 */}
          <div className={`p-3 rounded-lg border transition-colors
            ${canStartRecruit ? 'bg-stone-900/30 border-stone-700/30' : 'bg-stone-900/20 border-stone-800/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-300 font-medium">亲自去村庄</span>
              <span className="text-[10px] text-stone-500 px-1.5 py-0.5 bg-stone-800 rounded">推荐</span>
            </div>
            <div className="text-xs text-stone-400 mb-3">
              亲自前往可以从候选人中挑选，但出发期间无法操作农田。每次最多选 {RECRUIT_MAX_HIRE} 人。
            </div>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-stone-500">花费：</span>
              <span className={canAfford ? 'text-green-400' : 'text-red-400'}>
                <Wheat size={10} className="inline mr-1" />{foodAmount} / {RECRUIT_FOOD_COST}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-stone-500">耗时：</span>
              <span className="text-stone-300">{RECRUIT_TICKS / TICKS_PER_DAY} 天</span>
            </div>
            <button
              onClick={handleSelfRecruit}
              disabled={!canStartRecruit}
              className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${canStartRecruit
                  ? 'bg-amber-700 hover:bg-amber-600 text-amber-100'
                  : 'bg-stone-700 text-stone-500 cursor-not-allowed'
                }`}
            >
              <UserPlus size={16} />
              {!canHireMore ? '本批已招满' : canAfford ? '出发招募' : '粮食不足'}
            </button>
          </div>

          {/* 选项2：派人去 */}
          <div className={`p-3 rounded-lg border transition-colors
            ${canStartRecruit ? 'bg-stone-900/30 border-stone-700/30' : 'bg-stone-900/20 border-stone-800/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-300 font-medium">派人去村庄</span>
              <span className="text-[10px] text-stone-500 px-1.5 py-0.5 bg-stone-800 rounded">随机</span>
            </div>
            <div className="text-xs text-stone-400 mb-3">
              派出一名空闲农民去招募，会随机带回一个人。你无法挑选，但自己可以继续照看农田。（本批最多 {RECRUIT_MAX_HIRE} 人）
            </div>

            {/* 选择派出的 NPC */}
            {availableDelegates.length > 0 ? (
              <div className="mb-3">
                <div className="text-xs text-stone-500 mb-1">选择派出的人：</div>
                <div className="flex flex-wrap gap-1">
                  {availableDelegates.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedDelegate(selectedDelegate?.id === f.id ? null : f)}
                      className={`px-2 py-1 rounded text-xs transition-colors
                        ${selectedDelegate?.id === f.id
                          ? 'bg-amber-700/60 text-amber-200 border border-amber-600/50'
                          : 'bg-stone-700/50 text-stone-400 border border-stone-700/30 hover:text-stone-300'
                        }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-stone-600 mb-3">没有可派出的空闲农民</div>
            )}

            <button
              onClick={handleDelegateRecruit}
              disabled={!canStartRecruit || !selectedDelegate}
              className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${canStartRecruit && selectedDelegate
                  ? 'bg-stone-600 hover:bg-stone-500 text-stone-200'
                  : 'bg-stone-700 text-stone-500 cursor-not-allowed'
                }`}
            >
              {selectedDelegate ? `派 ${selectedDelegate.name} 去招募` : '请先选择派出的人'}
            </button>
          </div>
        </div>
      )}

      {/* 底部信息 */}
      <div className="mt-4 pt-3 border-t border-stone-700/30">
        <div className="text-xs text-stone-500">
          已有队员：<span className="text-stone-300 font-bold">{farmers.length}</span> 人
        </div>
      </div>
    </div>
  );
}

// 招募进度条卡片
function RecruitProgressCard({ label, sublabel, task }) {
  const pct = Math.floor(((task.totalTicks - task.ticksRemaining) / task.totalTicks) * 100);
  const remainDays = Math.ceil(task.ticksRemaining / TICKS_PER_DAY);
  return (
    <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-800/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-amber-300 flex items-center gap-1">
          <Clock size={12} /> {label}
        </span>
        <span className="text-xs text-amber-400 font-bold">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between">
        <span>{sublabel}</span>
        <span>大约还需 {remainDays} 天</span>
      </div>
    </div>
  );
}

// ========== 候选人选择弹窗 ==========
function CandidateChoicePopup({ candidates, onChoose, onSkip, hiredCount, maxHire }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-amber-400">🏘 村民名单</h3>
          <button onClick={onSkip} className="text-stone-500 hover:text-stone-300 text-sm">离开</button>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          村长带你去见了这些愿意跟随的村民：
          <span className="text-amber-300 ml-1">（已选 {hiredCount}/{maxHire}，选人后可继续选或离开）</span>
        </p>
        <div className="space-y-2">
          {candidates.map((c, i) => (
            <div
              key={i}
              className="p-3 bg-stone-800/50 rounded-lg border border-stone-700/30 hover:border-amber-600/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-200 font-medium">{c.name}</span>
                  <span className="text-xs text-stone-500">
                    {c.gender === 'female' ? '♀' : '♂'} {c.age}岁
                  </span>
                </div>
                <button
                  onClick={() => onChoose(i)}
                  disabled={hiredCount >= maxHire}
                  className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                    hiredCount < maxHire
                      ? 'bg-green-800/60 hover:bg-green-700/60 text-green-300'
                      : 'bg-stone-700/40 text-stone-600 cursor-not-allowed'
                  }`}
                >
                  选择 <ChevronRight size={12} />
                </button>
              </div>
              {c.appearance && (
                <div className="text-[10px] text-stone-600 italic mb-1">{c.appearance}</div>
              )}
              {/* 只显示出身（表层），特质加入后才揭示 */}
              {c.originTrait && (
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/30 border border-amber-800/30 rounded text-amber-400/80">
                  {c.originTrait.icon} {c.originTrait.name}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onSkip}
            className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
          >
            没有合适的人选，返回
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== 主面板 ==========
const TABS = [
  { id: 'overview', label: '农田概览', icon: '🌾' },
  { id: 'personnel', label: '人员管理', icon: '👥' },
  { id: 'village', label: '附近村庄', icon: '🏘' },
];

export default function FarmLeaderPanel({ game, onAction }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const plots = game.farm.plots;

  // 切换到队长视角时，自动将目标农田数同步为当前实际农田数
  useEffect(() => {
    if (game.farm.targetPlotCount < plots.length) {
      game.farm.targetPlotCount = plots.length;
      if (onAction) onAction('set_target_plots', { count: plots.length });
    }
  }, []);

  // 候选人选择弹窗
  const showCandidatePopup = game.recruitTask?.phase === 'waiting_choice' && game.recruitCandidatePool?.length > 0;

  const handleChoose = (index) => {
    if (onAction) onAction('recruit_choose', { candidateIndex: index });
  };

  const handleSkip = () => {
    if (onAction) onAction('recruit_skip');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">👨‍🌾</span>
        <h2 className="text-lg font-bold text-amber-400">农田管理</h2>
        <span className="text-xs text-stone-500">（农民队长视角）</span>
        {game.isPlayerAway && (
          <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">🚶 外出中</span>
        )}
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${activeTab === tab.id
                ? 'bg-amber-700/60 text-amber-200 border border-amber-600/50'
                : 'bg-stone-800/50 text-stone-400 border border-stone-700/30 hover:text-stone-300 hover:bg-stone-700/50'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'overview' && (
        <OverviewTab
          game={game}
          selectedPlot={selectedPlot}
          setSelectedPlot={setSelectedPlot}
          onAction={onAction}
        />
      )}
      {activeTab === 'personnel' && (
        <PersonnelTab game={game} />
      )}
      {activeTab === 'village' && (
        <VillageTab game={game} onAction={onAction} />
      )}

      {/* 候选人选择弹窗 */}
      {showCandidatePopup && (
        <CandidateChoicePopup
          candidates={game.recruitCandidatePool}
          onChoose={handleChoose}
          onSkip={handleSkip}
          hiredCount={game.recruitHiredCount || 0}
          maxHire={RECRUIT_MAX_HIRE}
        />
      )}
    </div>
  );
}
