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

// 带标签的进度条
function LabeledBar({ label, value, max, color, suffix }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-stone-400 w-10 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-stone-400 w-8 shrink-0">{suffix ?? Math.floor(value)}</span>
    </div>
  );
}

// 详细模式卡片（农民视角，带名称+进度条+操作按钮）
function PlotCard({ plot, onAction, onPlant, characters, player }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(plot.name);
  const stateInfo = STATE_LABELS[plot.state] || STATE_LABELS[FIELD_STATE.EMPTY];
  const crop = plot.getCropDef();
  const isGrowing = plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.PLANTED;
  const isReady = plot.state === FIELD_STATE.READY;
  const isEmpty = plot.state === FIELD_STATE.EMPTY || plot.state === FIELD_STATE.WITHERED;
  const isPlowed = plot.state === FIELD_STATE.PLOWED;

  // 获取管理者名称
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

  return (
    <div className={`rounded-lg border p-3 bg-stone-800/50 flex flex-col ${
      isGrowing ? 'border-green-700/50' : isReady ? 'border-yellow-600/50' : 'border-stone-700'
    }`}>
      {/* 头部：名称 + 状态 */}
      <div className="flex items-center justify-between mb-2 h-5">
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
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {plot.hasPest && <Bug size={11} className="text-red-400" />}
          <span className={`text-xs ${stateInfo.color}`}>{stateInfo.text}</span>
        </div>
      </div>

      {/* 管理者标签 */}
      {assignedManagers.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-stone-500">👤 管理:</span>
          {assignedManagers.map((name, idx) => (
            <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-300 rounded">
              {name}
            </span>
          ))}
        </div>
      )}

      {/* 四维度进度条 */}
      <div className="flex flex-col gap-1 mb-2">
        <LabeledBar label="水分" value={plot.waterLevel} max={100}
          color={plot.waterLevel < 30 ? '#ef4444' : '#3b82f6'} />
        <LabeledBar label="肥力" value={plot.fertility} max={100}
          color={plot.fertility < 60 ? '#f59e0b' : '#16a34a'} />
        <LabeledBar label="生长" value={isGrowing ? plot.growthProgress : isReady ? 100 : 0} max={100}
          color={isReady ? '#facc15' : '#22c55e'}
          suffix={isGrowing ? `${Math.floor(plot.growthProgress)}%` : isReady ? '100%' : '-'} />
        <LabeledBar label="杂草" value={plot.weedGrowth} max={100}
          color={plot.weedGrowth > 40 ? '#84cc16' : '#4d7c0f'} />
      </div>

      {/* 操作按钮行 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {isEmpty && (
          <button onClick={() => onAction('plow', { plotId: plot.id })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded transition-colors">
            <Shovel size={11} /> 翻地
          </button>
        )}
        {isPlowed && (
          <button onClick={() => onPlant(plot.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-800/60 hover:bg-green-700/60 text-green-200 rounded transition-colors">
            <Sprout size={11} /> 播种
          </button>
        )}
        {isReady && (
          <button onClick={() => onAction('harvest', { plotId: plot.id })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 rounded transition-colors">
            <Scissors size={11} /> 收获
          </button>
        )}

        <button onClick={() => onAction('water', { plotId: plot.id })}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${plot.waterLevel < 50 ? 'bg-blue-800/60 hover:bg-blue-700/60 text-blue-300' : 'bg-stone-700/40 hover:bg-stone-600/40 text-stone-500'}`}
          title="浇水">
          <Droplets size={11} /> 浇水
        </button>
        <button onClick={() => onAction('fertilize', { plotId: plot.id })}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${plot.fertility < 60 ? 'bg-green-800/60 hover:bg-green-700/60 text-green-300' : 'bg-stone-700/40 hover:bg-stone-600/40 text-stone-500'}`}
          title="施肥">
          <FlaskConical size={11} /> 施肥
        </button>
        <button onClick={() => onAction('remove_weeds', { plotId: plot.id })}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${plot.weedGrowth > 40 ? 'bg-lime-700/60 hover:bg-lime-600/60 text-lime-200' : 'bg-stone-700/40 hover:bg-stone-600/40 text-stone-500'}`}
          title="除草">
          <Leaf size={11} /> 除草
        </button>
        {plot.hasPest && (
          <button onClick={() => onAction('remove_pest', { plotId: plot.id })}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-800/60 hover:bg-red-700/60 text-red-200 rounded transition-colors"
            title={`除虫(${plot.pestSeverity})`}>
            <Bug size={11} /> 除虫
          </button>
        )}

        {isReady && <span className="text-[10px] text-yellow-400 ml-auto">✨ 已成熟</span>}
        {plot.cropYieldMod < 0.99 && plot.cropId && !isReady && (
          <span className="ml-auto text-[10px] text-red-500/80">减产{Math.round((1 - plot.cropYieldMod) * 100)}%</span>
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

  const plots = game.farm.plots;
  const characters = game.characters || [];
  const player = game.player;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-amber-400">🌾 农田</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">{plots.length} 块农田</span>
          <button onClick={() => onAction('expand_farm')}
            className="px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded transition-colors">
            + 开垦新田
          </button>
        </div>
      </div>

      {/* 详细视图（农民视角，带进度条和名称） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plots.map(plot => (
          <PlotCard key={plot.id} plot={plot} onAction={onAction} onPlant={handlePlant} characters={characters} player={player} />
        ))}
      </div>

      {/* 开垦中 */}
      {game.farm.expandQueue.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {game.farm.expandQueue.map((q, i) => {
            const pct = Math.floor(((50 - q.ticksRemaining) / 50) * 100);
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
        <SeedSelectPopup warehouse={game.warehouse} onSelect={handleSeedSelect} onClose={() => setPlantingPlotId(null)} />
      )}
    </div>
  );
}
