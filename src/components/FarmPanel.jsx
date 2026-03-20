import { useState } from 'react';
import { Droplets, Scissors, Shovel, Sprout, Bug, Leaf, FlaskConical, X, Pencil, Check } from 'lucide-react';
import { FIELD_STATE } from '../engine/FarmSystem';
import { CROPS } from '../data/crops';

const STATE_LABELS = {
  [FIELD_STATE.EMPTY]: { text: '空地', color: 'text-stone-500' },
  [FIELD_STATE.PLOWED]: { text: '已翻地', color: 'text-amber-600' },
  [FIELD_STATE.PLANTED]: { text: '已播种', color: 'text-green-600' },
  [FIELD_STATE.GROWING]: { text: '生长中', color: 'text-green-400' },
  [FIELD_STATE.READY]: { text: '可收获', color: 'text-yellow-400' },
  [FIELD_STATE.WITHERED]: { text: '已枯萎', color: 'text-red-500' },
};

// 种子选择弹窗
function SeedSelectPopup({ warehouse, onSelect, onClose }) {
  const availableSeeds = CROPS.map(crop => {
    const amount = warehouse.getItemAmount('seed', crop.seedId);
    return { ...crop, seedAmount: amount };
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-stone-600 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-amber-400 font-bold flex items-center gap-2">
            <Sprout size={18} /> 选择种子
          </h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {availableSeeds.map(crop => (
            <button
              key={crop.id}
              disabled={crop.seedAmount < crop.seedCost}
              onClick={() => onSelect(crop.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                crop.seedAmount >= crop.seedCost
                  ? 'border-stone-600 hover:border-green-600 hover:bg-green-900/20 cursor-pointer'
                  : 'border-stone-700/50 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{crop.icon}</span>
                <div className="text-left">
                  <div className="text-sm text-stone-200">{crop.name}</div>
                  <div className="text-xs text-stone-500">{crop.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-400">
                  种子: <span className={crop.seedAmount >= crop.seedCost ? 'text-green-400' : 'text-red-400'}>
                    {crop.seedAmount}
                  </span>/{crop.seedCost}
                </div>
              </div>
            </button>
          ))}
        </div>
        {availableSeeds.every(c => c.seedAmount < c.seedCost) && (
          <p className="text-xs text-red-400 text-center mt-3">没有足够的种子！</p>
        )}
      </div>
    </div>
  );
}

// 进度条行 + 旁边的操作按钮
function BarRow({ label, value, max, color, warning, btn }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5 h-5">
      <span className={`text-xs w-10 shrink-0 ${warning ? 'text-orange-400' : 'text-stone-500'}`}>{label}</span>
      <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className={`text-xs w-7 text-right shrink-0 ${warning ? 'text-orange-400' : 'text-stone-500'}`}>
        {typeof value === 'number' ? Math.floor(value) : value}
      </span>
      {btn && (
        <button
          onClick={btn.onClick}
          className={`ml-1 px-1.5 py-0.5 text-xs rounded transition-colors active:scale-95 shrink-0 ${btn.className}`}
          title={btn.title}
        >
          {btn.icon}
        </button>
      )}
    </div>
  );
}

function PlotCard({ plot, onAction, onPlant }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(plot.name);
  const stateInfo = STATE_LABELS[plot.state] || STATE_LABELS[FIELD_STATE.EMPTY];
  const crop = plot.getCropDef();
  const yieldPct = plot.getYieldPercent();
  const isGrowing = plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.PLANTED;
  const isActive = isGrowing || plot.state === FIELD_STATE.READY;

  const handleRename = () => {
    onAction('rename_plot', { plotId: plot.id, newName: editName });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-stone-700 p-3 bg-stone-800/50 h-56 flex flex-col">
      {/* 头部：名称 + 状态 */}
      <div className="flex items-center justify-between mb-2 h-6">
        <div className="flex items-center gap-1.5 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                className="bg-stone-700 text-stone-200 text-xs px-1.5 py-0.5 rounded w-20 outline-none focus:ring-1 focus:ring-amber-500"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={10}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleRename()}
              />
              <button onClick={handleRename} className="text-green-400 hover:text-green-300">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <>
              <span className="text-stone-300 text-sm font-medium truncate">{plot.name}</span>
              <button onClick={() => { setEditName(plot.name); setEditing(true); }} className="text-stone-600 hover:text-stone-400">
                <Pencil size={10} />
              </button>
            </>
          )}
          {crop && <span className="text-xs ml-1">{crop.icon}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {plot.hasPest && <Bug size={12} className="text-red-400" />}
          {plot.hasWeeds && <Leaf size={12} className="text-lime-400" />}
          <span className={`text-xs font-medium ${stateInfo.color}`}>{stateInfo.text}</span>
        </div>
      </div>

      {/* 进度条区域 - 固定内容 */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {/* 增/减产条 - 始终显示 */}
        <div className="flex items-center gap-1.5 h-5">
          <span className={`text-xs w-10 shrink-0 ${yieldPct < 0 ? 'text-red-400' : yieldPct > 0 ? 'text-green-400' : 'text-stone-500'}`}>
            产量
          </span>
          <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden relative">
            {/* 基准线在60%位置表示1.0 */}
            <div className="absolute left-1/2 top-0 w-px h-full bg-stone-500 z-10" />
            {yieldPct >= 0 ? (
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${50 + Math.min(50, yieldPct)}%` }} />
            ) : (
              <div className="h-full bg-red-500 rounded-r-full transition-all ml-auto"
                style={{ width: `${50 + Math.max(-50, yieldPct)}%` }} />
            )}
          </div>
          <span className={`text-xs w-10 text-right shrink-0 ${yieldPct < 0 ? 'text-red-400' : yieldPct > 0 ? 'text-green-400' : 'text-stone-500'}`}>
            {yieldPct > 0 ? '+' : ''}{yieldPct}%
          </span>
        </div>

        {/* 肥力 + 施肥按钮 */}
        <BarRow
          label="肥力"
          value={plot.fertility}
          max={100}
          color={plot.fertility < 60 ? '#f59e0b' : '#16a34a'}
          warning={plot.fertility < 60}
          btn={plot.state !== FIELD_STATE.EMPTY ? {
            onClick: () => onAction('fertilize', { plotId: plot.id }),
            className: 'bg-green-800/60 hover:bg-green-700/60 text-green-300',
            icon: <FlaskConical size={10} />,
            title: '施肥',
          } : null}
        />

        {/* 水分 + 浇水按钮（有作物时显示） */}
        {isActive && (
          <BarRow
            label="水分"
            value={plot.waterLevel}
            max={100}
            color={plot.waterLevel < 30 ? '#ef4444' : plot.waterLevel < 60 ? '#f59e0b' : '#3b82f6'}
            warning={plot.waterLevel < 60}
            btn={isGrowing ? {
              onClick: () => onAction('water', { plotId: plot.id }),
              className: 'bg-blue-800/60 hover:bg-blue-700/60 text-blue-300',
              icon: <Droplets size={10} />,
              title: '浇水',
            } : null}
          />
        )}

        {/* 生长进度 */}
        {isActive && (
          <BarRow label="生长" value={plot.growthProgress} max={100} color="#22c55e" />
        )}

        {/* 杂草 + 除草按钮（有作物时常驻） */}
        {isActive && (
          <BarRow
            label="杂草"
            value={plot.hasWeeds ? plot.weedLevel : plot.weedGrowth}
            max={plot.hasWeeds ? 150 : 100}
            color={plot.hasWeeds ? '#84cc16' : '#4d7c0f'}
            warning={plot.weedGrowth > 60 || plot.hasWeeds}
            btn={{
              onClick: () => onAction('remove_weeds', { plotId: plot.id }),
              className: plot.hasWeeds
                ? 'bg-lime-800/60 hover:bg-lime-700/60 text-lime-300'
                : 'bg-stone-700/60 hover:bg-stone-600/60 text-stone-400',
              icon: <Leaf size={10} />,
              title: plot.hasWeeds ? `除草 (${plot.weedClicks})` : '清理',
            }}
          />
        )}

        {/* 病虫害严重度 + 除虫按钮 */}
        {plot.hasPest && (
          <BarRow
            label="虫害"
            value={plot.pestSeverity}
            max={100}
            color="#ef4444"
            warning
            btn={{
              onClick: () => onAction('remove_pest', { plotId: plot.id }),
              className: 'bg-red-800/60 hover:bg-red-700/60 text-red-300',
              icon: <Bug size={10} />,
              title: `除虫 (${plot.pestClicks})`,
            }}
          />
        )}

        {/* 成熟提示 */}
        {plot.state === FIELD_STATE.READY && (
          <div className="text-xs text-yellow-400 font-medium">✨ 已成熟</div>
        )}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex gap-2 mt-2 pt-2 border-t border-stone-700/50">
        {(plot.state === FIELD_STATE.EMPTY || plot.state === FIELD_STATE.WITHERED) && (
          <button
            onClick={() => onAction('plow', { plotId: plot.id })}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded transition-colors"
          >
            <Shovel size={11} /> 翻地
          </button>
        )}

        {plot.state === FIELD_STATE.PLOWED && (
          <button
            onClick={() => onPlant(plot.id)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-800/60 hover:bg-green-700/60 text-green-200 rounded transition-colors"
          >
            <Sprout size={11} /> 播种
          </button>
        )}

        {plot.state === FIELD_STATE.READY && (
          <button
            onClick={() => onAction('harvest', { plotId: plot.id })}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 rounded transition-colors"
          >
            <Scissors size={11} /> 收获
          </button>
        )}

        {/* 永久减产提示 */}
        {plot.permanentYieldMod < 0.99 && (
          <span className="ml-auto text-xs text-red-500/70" title="累积永久减产，无法恢复">
            永久减产 {Math.round((1 - plot.permanentYieldMod) * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function FarmPanel({ game, onAction }) {
  const [plantingPlotId, setPlantingPlotId] = useState(null);

  const handlePlant = (plotId) => {
    setPlantingPlotId(plotId);
  };

  const handleSeedSelect = (cropId) => {
    if (plantingPlotId) {
      onAction('plant', { plotId: plantingPlotId, cropId });
      setPlantingPlotId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-amber-400">🌾 农田</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">{game.farm.plots.length} 块农田</span>
          <button
            onClick={() => onAction('expand_farm')}
            className="px-3 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded transition-colors"
          >
            + 开垦新田
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {game.farm.plots.map(plot => (
          <PlotCard key={plot.id} plot={plot} onAction={onAction} onPlant={handlePlant} />
        ))}
      </div>

      {plantingPlotId && (
        <SeedSelectPopup
          warehouse={game.warehouse}
          onSelect={handleSeedSelect}
          onClose={() => setPlantingPlotId(null)}
        />
      )}
    </div>
  );
}
