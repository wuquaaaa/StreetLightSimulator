import { useState } from 'react';
import { Droplets, Scissors, Shovel, Sprout, Bug, Leaf, FlaskConical, X, Pencil, Check, Sparkles, Wind, ArrowUpCircle } from 'lucide-react';
import { FIELD_STATE, FIELD_DISPLAY, SPIRIT_LEVEL_NAMES } from '../engine/FarmSystem';
import { FarmSystem } from '../engine/FarmSystem';
import { FARM_EXPAND_TICKS, PLOT_TYPE_SPIRIT, SPIRIT_PLOT_MAX_LEVEL, SPIRIT_PLOT_UPGRADE_COSTS, SPIRIT_PLOT_LEVEL_BONUSES } from '../engine/constants';
import { CROPS, FOOD_CROPS, HERB_CROPS, HERB_QUALITY } from '../data/crops';

// ======================================================
// 灵田升级确认弹窗
// ======================================================
function UpgradeConfirmPopup({ plot, warehouse, onConfirm, onClose, showAura }) {
  const targetLevel = plot.plotLevel + 1;
  if (targetLevel > SPIRIT_PLOT_MAX_LEVEL) return null;

  const costs = FarmSystem.getUpgradeCost(targetLevel);
  const bonus = SPIRIT_PLOT_LEVEL_BONUSES[targetLevel];
  const targetName = SPIRIT_LEVEL_NAMES[targetLevel];

  // 检查每项材料
  const costChecks = costs.map(c => {
    const have = warehouse.getItemAmount(c.category, c.itemId);
    return { ...c, have, enough: have >= c.amount };
  });
  const allEnough = costChecks.every(c => c.enough);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-purple-700/50 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-purple-400 font-bold flex items-center gap-2">
            <Sparkles size={18} /> 灵田升级
          </h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X size={18} /></button>
        </div>

        <div className="text-sm text-stone-300 mb-3">
          将 <span className="text-amber-300">{plot.name}</span> 升级为
          <span className="text-purple-300 font-bold ml-1">{targetName}</span>
        </div>

        {/* 升级效果 */}
        <div className="bg-purple-950/40 border border-purple-800/30 rounded p-3 mb-3 text-xs space-y-1">
          <div className="text-purple-300 font-semibold mb-1">升级效果：</div>
          {showAura && (
          <div className="flex justify-between text-stone-400">
            <span>灵气回复</span>
            <span className="text-purple-300">×{bonus.auraRegenMul}</span>
          </div>
          )}
          {showAura && bonus.spiritCostReduction > 0 && (
            <div className="flex justify-between text-stone-400">
              <span>灵气消耗减免</span>
              <span className="text-green-400">-{Math.round(bonus.spiritCostReduction * 100)}%</span>
            </div>
          )}
          <div className="flex justify-between text-stone-400">
            <span>灵草产量加成</span>
            <span className="text-green-400">+{Math.round(bonus.herbYieldBonus * 100)}%</span>
          </div>
          <div className="flex justify-between text-stone-400">
            <span>灵蛊概率降低</span>
            <span className="text-green-400">-{Math.round(bonus.spiritBugReduction * 100)}%</span>
          </div>
        </div>

        {/* 材料消耗 */}
        <div className="bg-stone-900/50 rounded p-3 mb-4 text-xs space-y-1.5">
          <div className="text-stone-400 font-semibold mb-1">所需材料：</div>
          {costChecks.map((c, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-stone-300">{c.name}</span>
              <span className={c.enough ? 'text-green-400' : 'text-red-400'}>
                {c.have}/{c.amount}
              </span>
            </div>
          ))}
        </div>

        {/* 按钮 */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-3 py-2 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded transition-colors">
            取消
          </button>
          <button
            onClick={() => onConfirm(targetLevel)}
            disabled={!allEnough}
            className={`flex-1 px-3 py-2 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
              allEnough
                ? 'bg-purple-700 hover:bg-purple-600 text-purple-100'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}>
            <ArrowUpCircle size={14} /> 升级
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// 播种弹窗（分食物/灵草两栏）
// ======================================================
function SeedSelectPopup({ warehouse, onSelect, onClose, currentSeason, showAura }) {
  const [tab, setTab] = useState('food');

  const enrichCrops = (list) =>
    list.map(crop => {
      const amount = warehouse.getItemAmount('seed', crop.seedId);
      const seasonOk = crop.season.includes(currentSeason);
      return { ...crop, seedAmount: amount, seasonOk };
    });

  const foodList = enrichCrops(FOOD_CROPS);
  const herbList = enrichCrops(HERB_CROPS);
  const displayList = tab === 'food' ? foodList : herbList;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-stone-600 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-amber-400 font-bold flex items-center gap-2">
            <Sprout size={18} /> 选择种子
          </h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X size={18} /></button>
        </div>

        <div className="flex gap-1 mb-3 bg-stone-900/50 rounded-lg p-1">
          <button onClick={() => setTab('food')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'food' ? 'bg-amber-800 text-amber-200' : 'text-stone-400 hover:text-stone-300'}`}>
            🌾 食物作物
          </button>
          <button onClick={() => setTab('herb')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'herb' ? 'bg-purple-800 text-purple-200' : 'text-stone-400 hover:text-stone-300'}`}>
            ✨ 灵草药材
          </button>
        </div>

        <div className="text-[10px] text-stone-500 mb-2">当前季节：<span className="text-amber-300">{currentSeason}季</span>，带 ⚠️ 表示非当季作物，产量受影响</div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {displayList.map(crop => (
            <button key={crop.id}
              disabled={crop.seedAmount < crop.seedCost}
              onClick={() => onSelect(crop.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                crop.seedAmount >= crop.seedCost
                  ? (tab === 'herb'
                    ? 'border-purple-700/50 hover:border-purple-500 hover:bg-purple-900/20 cursor-pointer'
                    : 'border-stone-600 hover:border-green-600 hover:bg-green-900/20 cursor-pointer')
                  : 'border-stone-700/50 opacity-40 cursor-not-allowed'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{crop.icon}</span>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-stone-200">{crop.name}</span>
                    {!crop.seasonOk && <span className="text-[10px] text-orange-400">⚠️ 非当季</span>}
                    {crop.rarity >= 3 && <span className="text-[10px] text-purple-400">★稀有</span>}
                  </div>
                  <div className="text-xs text-stone-500">{crop.description}</div>
                  {crop.isHerb && (
                    <div className="text-[10px] text-purple-400 mt-0.5">
                      生长周期 {crop.growthTime}天{showAura ? ` · 消耗灵气 ${crop.spiritCost}/tick` : ' · 需要灵气滋养'}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-stone-400 shrink-0">
                种子: <span className={crop.seedAmount >= crop.seedCost ? 'text-green-400' : 'text-red-400'}>{crop.seedAmount}</span>/{crop.seedCost}
              </div>
            </button>
          ))}
        </div>

        {displayList.every(c => c.seedAmount < c.seedCost) && (
          <p className="text-xs text-red-400 text-center mt-3">没有足够的种子！</p>
        )}
      </div>
    </div>
  );
}

// ======================================================
// 带标签的进度条
// ======================================================
function LabeledBar({ label, value, max, color, suffix, warning }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] w-10 shrink-0 text-right ${warning ? 'text-orange-400' : 'text-stone-400'}`}>{label}</span>
      <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-stone-400 w-8 shrink-0">{suffix ?? Math.floor(value)}</span>
    </div>
  );
}

// ======================================================
// 农田卡片
// ======================================================
function PlotCard({ plot, onAction, onPlant, onUpgrade, characters, player, showAura, canSpiritUpgrade, tutorialStep }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(plot.name);

  const stateInfo = FIELD_DISPLAY[plot.state] || FIELD_DISPLAY[FIELD_STATE.EMPTY];
  const crop = plot.getCropDef();
  const isGrowing = plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.PLANTED;
  const isReady   = plot.state === FIELD_STATE.READY;
  const isEmpty   = plot.state === FIELD_STATE.EMPTY || plot.state === FIELD_STATE.WITHERED;
  const isPlowed  = plot.state === FIELD_STATE.PLOWED;
  const isHerb    = crop?.isHerb ?? false;
  const isSpirit  = plot.isSpiritPlot();
  const isTutorialPlow = tutorialStep === 2 && isEmpty; // 教程翻地高亮

  const auraLow = isHerb && plot.spiritAura < 20;

  const getManagerName = (managerId) => {
    if (managerId === player.id) return player.name;
    const char = characters.find(c => c.id === managerId);
    return char ? char.name : '未知';
  };
  const assignedManagers = plot.assignedTo.map(id => getManagerName(id));

  const handleRename = () => {
    onAction('rename_plot', { plotId: plot.id, newName: editName });
    setEditing(false);
  };

  // 卡片边框色：灵田紫色光晕
  const borderClass = isSpirit
    ? `border-purple-${plot.plotLevel >= 2 ? '400' : '600'}/60`
    : isHerb
      ? (isReady ? 'border-purple-500/70' : isGrowing ? 'border-purple-700/50' : 'border-stone-700')
      : (isReady ? 'border-yellow-600/50' : isGrowing ? 'border-green-700/50' : 'border-stone-700');

  // 灵田等级标签
  const spiritLevelName = SPIRIT_LEVEL_NAMES[plot.plotLevel];
  const canUpgrade = canSpiritUpgrade && !isGrowing && !isReady && plot.plotLevel < SPIRIT_PLOT_MAX_LEVEL;
  const nextLevelName = plot.plotLevel < SPIRIT_PLOT_MAX_LEVEL
    ? SPIRIT_LEVEL_NAMES[plot.plotLevel + 1] : null;

  return (
    <div className={`rounded-lg border p-3 bg-stone-800/50 flex flex-col ${borderClass} ${isSpirit ? 'shadow-purple-900/20 shadow-sm' : ''} ${isTutorialPlow ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse relative' : ''}`}>
      {/* 教程翻地箭头提示 */}
      {isTutorialPlow && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-stone-900 text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce z-10 whitespace-nowrap">
          点这里翻地 👆
        </div>
      )}
      {/* 头部：名称 + 状态 + 灵田标签 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <input className="bg-stone-700 text-stone-200 text-xs px-1.5 py-0.5 rounded w-20 outline-none focus:ring-1 focus:ring-amber-500"
                value={editName} onChange={e => setEditName(e.target.value)} maxLength={10} autoFocus
                onKeyDown={e => e.key === 'Enter' && handleRename()} />
              <button onClick={handleRename} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
            </div>
          ) : (
            <>
              <span className="text-stone-200 text-sm font-bold truncate">{plot.name}</span>
              <button onClick={() => { setEditName(plot.name); setEditing(true); }} className="text-stone-600 hover:text-stone-400"><Pencil size={10} /></button>
            </>
          )}
          {crop && <span className="text-sm ml-0.5">{crop.icon}</span>}
          {isHerb && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-900/60 text-purple-300 ml-0.5">灵草</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 灵田等级徽章 */}
          {isSpirit && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
              plot.plotLevel >= 3 ? 'bg-purple-600/80 text-purple-100'
                : plot.plotLevel >= 2 ? 'bg-purple-700/60 text-purple-200'
                  : 'bg-purple-800/50 text-purple-300'
            }`}>
              {spiritLevelName}
            </span>
          )}
          {plot.hasPest      && <Bug     size={11} className="text-red-400" title="虫害" />}
          {plot.hasSpiritBug && <Wind    size={11} className="text-purple-400" title="灵蛊" />}
          {showAura && auraLow && <Sparkles size={11} className="text-orange-400" title="灵气不足" />}
          <span className={`text-xs ${stateInfo.color}`}>{stateInfo.text}</span>
        </div>
      </div>

      {/* 管理者标签（始终显示） */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[10px] text-stone-500">👤 管理:</span>
        {assignedManagers.length > 0 ? (
          assignedManagers.map((name, idx) => (
            <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-300 rounded">{name}</span>
          ))
        ) : (
          <span className="text-[10px] text-stone-600">无</span>
        )}
      </div>

      {/* 灵田等级效果预览（空地/翻地状态显示） */}
      {isSpirit && (isEmpty || isPlowed) && (
        <div className="text-[10px] text-purple-400/70 mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {showAura && <span>灵气回复 ×{plot.getLevelBonus().auraRegenMul}</span>}
          {showAura && plot.getLevelBonus().spiritCostReduction > 0 && <span>灵耗-{Math.round(plot.getLevelBonus().spiritCostReduction * 100)}%</span>}
          <span>产量+{Math.round(plot.getLevelBonus().herbYieldBonus * 100)}%</span>
        </div>
      )}

      {/* 进度条 */}
      <div className="flex flex-col gap-1 mb-2">
        <LabeledBar label="水分" value={plot.waterLevel} max={100}
          color={plot.waterLevel < 30 ? '#ef4444' : '#3b82f6'}
          warning={crop?.waterRequirement && plot.waterLevel < crop.waterRequirement} />
        <LabeledBar label="肥力" value={plot.fertility} max={100}
          color={plot.fertility < 60 ? '#f59e0b' : '#16a34a'}
          warning={crop?.fertilityRequirement && plot.fertility < crop.fertilityRequirement} />
        <LabeledBar label="生长" value={isGrowing ? plot.growthProgress : isReady ? 100 : 0} max={100}
          color={isReady ? '#facc15' : (isHerb ? '#a855f7' : '#22c55e')}
          suffix={isGrowing ? `${Math.floor(plot.growthProgress)}%` : isReady ? '100%' : '-'} />
        <LabeledBar label="杂草" value={plot.weedGrowth} max={100}
          color={plot.weedGrowth > 40 ? '#84cc16' : '#4d7c0f'} />
        {/* 灵气进度条（研究灵植术后可见） */}
        {showAura && (isSpirit || isHerb || isPlowed || isEmpty) && (
          <LabeledBar label="灵气" value={plot.spiritAura} max={100}
            color={plot.spiritAura < 20 ? '#f97316' : isSpirit ? '#c084fc' : '#a855f7'}
            warning={auraLow} />
        )}
      </div>

      {/* 水分预警条 */}
      {isGrowing && plot.waterLevel < 30 && (
        <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/40 rounded px-2 py-1 mb-2 animate-pulse">
          <Droplets size={11} className="text-red-400 shrink-0" />
          <span className="text-[10px] text-red-300">严重缺水！作物即将枯萎</span>
        </div>
      )}
      {isGrowing && plot.waterLevel >= 30 && plot.waterLevel < 60 && (
        <div className="flex items-center gap-1.5 bg-yellow-950/30 border border-yellow-700/30 rounded px-2 py-1 mb-2">
          <Droplets size={11} className="text-yellow-400 shrink-0" />
          <span className="text-[10px] text-yellow-300">轻微干旱，产量开始下降</span>
        </div>
      )}

      {/* 杂草预警条 */}
      {isGrowing && plot.weedGrowth > 40 && plot.weedGrowth < 60 && (
        <div className="flex items-center gap-1.5 bg-lime-950/30 border border-lime-700/30 rounded px-2 py-1 mb-2">
          <Leaf size={11} className="text-lime-400 shrink-0" />
          <span className="text-[10px] text-lime-300">杂草丛生，影响产量</span>
        </div>
      )}
      {isGrowing && plot.weedGrowth >= 60 && (
        <div className="flex items-center gap-1.5 bg-orange-950/40 border border-orange-700/40 rounded px-2 py-1 mb-2 animate-pulse">
          <Leaf size={11} className="text-orange-400 shrink-0" />
          <span className="text-[10px] text-orange-300">杂草泛滥！产量大幅下降</span>
        </div>
      )}

      {/* 虫害预警条 */}
      {plot.hasPest && (
        <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/40 rounded px-2 py-1 mb-2">
          <Bug size={11} className="text-red-400 shrink-0" />
          <span className="text-[10px] text-red-300">病虫害！还需 <b>{plot.pestSeverity}</b> 次除虫</span>
        </div>
      )}

      {/* 灵蛊警告条 */}
      {plot.hasSpiritBug && (
        <div className="flex items-center gap-1.5 bg-purple-900/30 border border-purple-700/40 rounded px-2 py-1 mb-2">
          <Wind size={11} className="text-purple-400 shrink-0" />
          <span className="text-[10px] text-purple-300">灵蛊侵扰！还需驱除 <b>{plot.spiritBugSeverity}</b> 次，否则品质大降</span>
        </div>
      )}

      {/* 灵气不足警告条（研究灵植术后可见） */}
      {showAura && auraLow && isGrowing && (
        <div className="flex items-center gap-1.5 bg-orange-900/30 border border-orange-700/40 rounded px-2 py-1 mb-2">
          <Sparkles size={11} className="text-orange-400 shrink-0" />
          <span className="text-[10px] text-orange-300">灵气不足，灵草生长已停止！</span>
        </div>
      )}

      {/* 操作按钮行 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {isEmpty && (
          <button onClick={() => onAction('plow', { plotId: plot.id })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded transition-colors">
            <Shovel size={11} /> 翻地
          </button>
        )}
        {isPlowed && (
          <>
            <button onClick={() => onPlant(plot.id)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-800/60 hover:bg-green-700/60 text-green-200 rounded transition-colors">
              <Sprout size={11} /> 播种
            </button>
            {/* 灵田升级按钮（仅空地/翻地状态） */}
            {canUpgrade && (
              <button onClick={() => onUpgrade(plot)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-800/60 hover:bg-purple-700/60 text-purple-200 rounded transition-colors">
                <ArrowUpCircle size={11} /> 升灵田
              </button>
            )}
          </>
        )}
        {isReady && (
          <button onClick={() => onAction('harvest', { plotId: plot.id })}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isHerb ? 'bg-purple-700/60 hover:bg-purple-600/60 text-purple-200' : 'bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200'
            }`}>
            <Scissors size={11} /> 收获
          </button>
        )}

        <button onClick={() => onAction('water', { plotId: plot.id })}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            plot.waterLevel < 50 ? 'bg-blue-800/60 hover:bg-blue-700/60 text-blue-300' : 'bg-stone-700/40 hover:bg-stone-600/40 text-stone-500'
          }`}>
          <Droplets size={11} /> 浇水
        </button>
        <button onClick={() => onAction('fertilize', { plotId: plot.id })}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            plot.fertility < 60 ? 'bg-green-800/60 hover:bg-green-700/60 text-green-300' : 'bg-stone-700/40 hover:bg-stone-600/40 text-stone-500'
          }`}>
          <FlaskConical size={11} /> 施肥
        </button>
        <button onClick={() => onAction('remove_weeds', { plotId: plot.id })}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            plot.weedGrowth > 40 ? 'bg-lime-700/60 hover:bg-lime-600/60 text-lime-200' : 'bg-stone-700/40 hover:bg-stone-600/40 text-stone-500'
          }`}>
          <Leaf size={11} /> 除草
        </button>

        {plot.hasPest && (
          <button onClick={() => onAction('remove_pest', { plotId: plot.id })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-800/60 hover:bg-red-700/60 text-red-200 rounded transition-colors"
            title={`除虫(${plot.pestSeverity})`}>
            <Bug size={11} /> 除虫
          </button>
        )}

        {plot.hasSpiritBug && (
          <button onClick={() => onAction('remove_spirit_bug', { plotId: plot.id })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-800/60 hover:bg-purple-700/60 text-purple-200 rounded transition-colors"
            title={`驱蛊(${plot.spiritBugSeverity})`}>
            <Wind size={11} /> 驱蛊
          </button>
        )}

        {isReady && <span className="text-[10px] text-yellow-400 ml-auto">✨ 已成熟</span>}
        {plot.cropYieldMod < 0.99 && plot.cropId && !isReady && (
          <span className="ml-auto text-[10px] text-red-500/80">减产{Math.round((1 - plot.cropYieldMod) * 100)}%</span>
        )}
        {plot.cropYieldMod > 1.01 && !isReady && (
          <span className="ml-auto text-[10px] text-green-400/80">增产{Math.round((plot.cropYieldMod - 1) * 100)}%</span>
        )}
      </div>
    </div>
  );
}

// ======================================================
// 仓库灵草库存小组件
// ======================================================
function HerbInventoryBar({ warehouse }) {
  const herbs = HERB_CROPS.map(crop => {
    const amount = warehouse.getItemAmount(crop.category, crop.harvestItem);
    return { ...crop, amount };
  }).filter(h => h.amount > 0);

  if (herbs.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-purple-950/40 border border-purple-800/40 rounded-lg">
      <div className="text-xs text-purple-400 font-semibold mb-2 flex items-center gap-1.5">
        <Sparkles size={12} /> 药材库存
      </div>
      <div className="flex flex-wrap gap-2">
        {herbs.map(h => (
          <div key={h.id} className="flex items-center gap-1.5 bg-purple-900/40 border border-purple-700/40 rounded px-2 py-1">
            <span className="text-base">{h.icon}</span>
            <div>
              <div className="text-xs text-purple-200">{h.name}</div>
              <div className="text-[10px] text-purple-400">{h.amount} 份</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======================================================
// 主面板
// ======================================================
export default function FarmPanel({ game, onAction }) {
  const [plantingPlotId, setPlantingPlotId] = useState(null);
  const [upgradePlot, setUpgradePlot] = useState(null);
  const handlePlant = (plotId) => setPlantingPlotId(plotId);
  const handleSeedSelect = (cropId) => {
    if (plantingPlotId) {
      onAction('plant', { plotId: plantingPlotId, cropId });
      setPlantingPlotId(null);
    }
  };
  const handleUpgradeConfirm = (targetLevel) => {
    if (upgradePlot) {
      onAction('upgrade_spirit_plot', { plotId: upgradePlot.id, level: targetLevel });
      setUpgradePlot(null);
    }
  };

  const plots      = game.farm.plots;
  const characters = game.characters || [];
  const player     = game.player;
  const season     = game.season || '春';

  // 灵气可见性：研究完成灵植术后才能看到灵气值
  const showAura = game.researchSystem?.isGongfuResearched('lingshi') ?? false;

  // 聚灵术是否已研究（决定能否升级灵田）
  const canSpiritUpgrade = game.researchSystem?.isGongfuResearched('spirit_focus') ?? false;

  // 统计灵田数量
  const spiritPlotCount = plots.filter(p => p.isSpiritPlot()).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-amber-400">🌾 农田</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">
            {plots.length} 块农田
            {spiritPlotCount > 0 && <span className="text-purple-400 ml-1">· {spiritPlotCount}块灵田</span>}
            <span className="ml-1"><span className="text-amber-300">{season}季</span></span>
          </span>
          <button onClick={() => onAction('expand_farm')}
            className="px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded transition-colors">
            + 开垦新田
          </button>
        </div>
      </div>

      <HerbInventoryBar warehouse={game.warehouse} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plots.map(plot => (
          <PlotCard key={plot.id} plot={plot} onAction={onAction} onPlant={handlePlant}
            onUpgrade={setUpgradePlot} characters={characters} player={player} showAura={showAura}
            canSpiritUpgrade={canSpiritUpgrade} tutorialStep={game.tutorialStep ?? -1} />
        ))}
      </div>

      {/* 开垦中 */}
      {game.farm.expandQueue.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {game.farm.expandQueue.map((q, i) => {
            const pct = Math.floor(((FARM_EXPAND_TICKS - q.ticksRemaining) / FARM_EXPAND_TICKS) * 100);
            const allChars = [game.player, ...(game.characters || [])];
            const char = allChars.find(c => c.id === q.characterId);
            return (
              <div key={`expand_${i}`} className="rounded-lg border-2 border-dashed border-stone-600 p-3 bg-stone-800/30 flex flex-col items-center justify-center py-6">
                <span className="text-xl mb-1">⛏</span>
                <span className="text-xs text-stone-400 mb-1">开垦中</span>
                <div className="w-24 h-1.5 bg-stone-700 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-blue-400 font-bold">{pct}%</span>
                {char && <span className="text-[10px] text-stone-500 mt-0.5">{char.name}</span>}
              </div>
            );
          })}
        </div>
      )}

      {plantingPlotId && (
        <SeedSelectPopup
          warehouse={game.warehouse}
          onSelect={handleSeedSelect}
          onClose={() => setPlantingPlotId(null)}
          currentSeason={season}
          showAura={showAura}
        />
      )}

      {upgradePlot && (
        <UpgradeConfirmPopup
          plot={upgradePlot}
          warehouse={game.warehouse}
          onConfirm={handleUpgradeConfirm}
          onClose={() => setUpgradePlot(null)}
          showAura={showAura}
        />
      )}
    </div>
  );
}
