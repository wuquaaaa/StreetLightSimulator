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

function SeedSelectPopup({ warehouse, onSelect, onClose }) {
  const availableSeeds = CROPS.map(crop => {
    const amount = warehouse.getItemAmount('seed', crop.seedId);
    return { ...crop, seedAmount: amount };
  });
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-stone-600 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-amber-400 font-bold flex items-center gap-2"><Sprout size={18} /> 选择种子</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {availableSeeds.map(crop => (
            <button key={crop.id} disabled={crop.seedAmount < crop.seedCost} onClick={() => onSelect(crop.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                crop.seedAmount >= crop.seedCost ? 'border-stone-600 hover:border-green-600 hover:bg-green-900/20 cursor-pointer' : 'border-stone-700/50 opacity-40 cursor-not-allowed'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{crop.icon}</span>
                <div className="text-left">
                  <div className="text-sm text-stone-200">{crop.name}</div>
                  <div className="text-xs text-stone-500">{crop.description}</div>
                </div>
              </div>
              <div className="text-xs text-stone-400">
                种子: <span className={crop.seedAmount >= crop.seedCost ? 'text-green-400' : 'text-red-400'}>{crop.seedAmount}</span>/{crop.seedCost}
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

// 统一进度条行，右侧按钮区固定宽度
function BarRow({ label, value, max, color, warning, btn }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5 h-7">
      <span className={`text-xs w-8 shrink-0 ${warning ? 'text-orange-400' : 'text-stone-500'}`}>{label}</span>
      <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className={`text-xs w-6 text-right shrink-0 tabular-nums ${warning ? 'text-orange-400' : 'text-stone-500'}`}>
        {typeof value === 'number' ? Math.floor(value) : value}
      </span>
      <div className="w-14 shrink-0 flex justify-end">
        {btn ? (
          <button onClick={btn.onClick}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors active:scale-95 ${btn.className}`}>
            {btn.icon} {btn.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PlotCard({ plot, onAction, onPlant }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(plot.name);
  const stateInfo = STATE_LABELS[plot.state] || STATE_LABELS[FIELD_STATE.EMPTY];
  const crop = plot.getCropDef();
  const yieldPct = plot.getYieldPercent();
  const isActive = plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.READY;

  const handleRename = () => {
    onAction('rename_plot', { plotId: plot.id, newName: editName });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-stone-700 p-3 bg-stone-800/50 h-64 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-1.5 h-6">
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
              <span className="text-stone-300 text-sm font-medium truncate">{plot.name}</span>
              <button onClick={() => { setEditName(plot.name); setEditing(true); }} className="text-stone-600 hover:text-stone-400"><Pencil size={10} /></button>
            </>
          )}
          {crop && <span className="text-sm ml-1">{crop.icon}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {plot.hasPest && <Bug size={12} className="text-red-400" />}
          {plot.weedGrowth >= 100 && <Leaf size={12} className="text-lime-400" />}
          <span className={`text-xs font-medium ${stateInfo.color}`}>{stateInfo.text}</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="flex-1 space-y-0.5 overflow-hidden">
        {/* 产量条 */}
        <div className="flex items-center gap-1.5 h-7">
          <span className={`text-xs w-8 shrink-0 ${yieldPct < 0 ? 'text-red-400' : yieldPct > 0 ? 'text-green-400' : 'text-stone-500'}`}>产量</span>
          <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden relative">
            <div className="absolute left-1/2 top-0 w-px h-full bg-stone-400 z-10" style={{ transform: 'translateX(-0.5px)' }} />
            {yieldPct > 0 ? (
              <div className="absolute h-full bg-green-500 rounded-r-full" style={{ left: '50%', width: `${Math.min(50, yieldPct / 2)}%` }} />
            ) : yieldPct < 0 ? (
              <div className="absolute h-full bg-red-500 rounded-l-full" style={{ right: '50%', width: `${Math.min(50, Math.abs(yieldPct) / 2)}%` }} />
            ) : null}
          </div>
          <span className={`text-xs w-10 text-right shrink-0 tabular-nums ${yieldPct < 0 ? 'text-red-400' : yieldPct > 0 ? 'text-green-400' : 'text-stone-500'}`}>
            {yieldPct > 0 ? '+' : ''}{yieldPct}%
          </span>
          <div className="w-14 shrink-0" />
        </div>

        {/* 肥力 + 施肥 */}
        <BarRow label="肥力" value={plot.fertility} max={100}
          color={plot.fertility < 60 ? '#f59e0b' : '#16a34a'} warning={plot.fertility < 60}
          btn={{ onClick: () => onAction('fertilize', { plotId: plot.id }),
            className: 'bg-green-800/60 hover:bg-green-700/60 text-green-300',
            icon: <FlaskConical size={12} />, label: '施肥' }} />

        {/* 水分 + 浇水 */}
        <BarRow label="水分" value={plot.waterLevel} max={100}
          color={plot.waterLevel < 30 ? '#ef4444' : plot.waterLevel < 60 ? '#f59e0b' : '#3b82f6'}
          warning={plot.waterLevel < 60}
          btn={{ onClick: () => onAction('water', { plotId: plot.id }),
            className: 'bg-blue-800/60 hover:bg-blue-700/60 text-blue-300',
            icon: <Droplets size={12} />, label: '浇水' }} />

        {/* 生长进度 */}
        {isActive && <BarRow label="生长" value={plot.growthProgress} max={100} color="#22c55e" />}

        {/* 杂草 0-100 + 除草（点击减20） */}
        <BarRow label="杂草" value={plot.weedGrowth} max={100}
          color={plot.weedGrowth > 40 ? '#84cc16' : '#4d7c0f'}
          warning={plot.weedGrowth > 40}
          btn={{ onClick: () => onAction('remove_weeds', { plotId: plot.id }),
            className: plot.weedGrowth > 40
              ? 'bg-lime-700/60 hover:bg-lime-600/60 text-lime-200'
              : 'bg-stone-700/60 hover:bg-stone-600/60 text-stone-400',
            icon: <Leaf size={12} />, label: '除草' }} />

        {/* 病虫害 + 除虫（显示剩余点击次数） */}
        {plot.hasPest && (
          <BarRow label="虫害" value={plot.pestSeverity} max={100} color="#ef4444" warning
            btn={{ onClick: () => onAction('remove_pest', { plotId: plot.id }),
              className: 'bg-red-800/60 hover:bg-red-700/60 text-red-200',
              icon: <Bug size={12} />, label: `除虫` }} />
        )}
      </div>

      {/* 底部 */}
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-stone-700/50">
        {(plot.state === FIELD_STATE.EMPTY || plot.state === FIELD_STATE.WITHERED) && (
          <button onClick={() => onAction('plow', { plotId: plot.id })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded transition-colors">
            <Shovel size={12} /> 翻地
          </button>
        )}
        {plot.state === FIELD_STATE.PLOWED && (
          <button onClick={() => onPlant(plot.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-800/60 hover:bg-green-700/60 text-green-200 rounded transition-colors">
            <Sprout size={12} /> 播种
          </button>
        )}
        {plot.state === FIELD_STATE.READY && (
          <button onClick={() => onAction('harvest', { plotId: plot.id })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 rounded transition-colors">
            <Scissors size={12} /> 收获
          </button>
        )}
        {plot.state === FIELD_STATE.READY && <span className="text-xs text-yellow-400 ml-auto">✨ 已成熟</span>}
        {plot.cropYieldMod < 0.99 && plot.cropId && (
          <span className="ml-auto text-xs text-red-500/80">本季减产 {Math.round((1 - plot.cropYieldMod) * 100)}%</span>
        )}
      </div>
    </div>
  );
}

export default function FarmPanel({ game, onAction }) {
  const [plantingPlotId, setPlantingPlotId] = useState(null);
  const handlePlant = (plotId) => setPlantingPlotId(plotId);
  const handleSeedSelect = (cropId) => {
    if (plantingPlotId) { onAction('plant', { plotId: plantingPlotId, cropId }); setPlantingPlotId(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-amber-400">🌾 农田</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">{game.farm.plots.length} 块农田</span>
          <button onClick={() => onAction('expand_farm')}
            className="px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded transition-colors">
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
        <SeedSelectPopup warehouse={game.warehouse} onSelect={handleSeedSelect} onClose={() => setPlantingPlotId(null)} />
      )}
    </div>
  );
}
