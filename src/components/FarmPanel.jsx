import { useState } from 'react';
import { Droplets, Scissors, Shovel, Sprout, Bug, X } from 'lucide-react';
import { FIELD_STATE } from '../engine/FarmSystem';
import { CROPS } from '../data/crops';

const STATE_LABELS = {
  [FIELD_STATE.EMPTY]: { text: '空地', color: 'text-stone-500', bg: 'bg-stone-800' },
  [FIELD_STATE.PLOWED]: { text: '已翻地', color: 'text-amber-600', bg: 'bg-amber-900/30' },
  [FIELD_STATE.PLANTED]: { text: '已播种', color: 'text-green-600', bg: 'bg-green-900/20' },
  [FIELD_STATE.GROWING]: { text: '生长中', color: 'text-green-400', bg: 'bg-green-900/30' },
  [FIELD_STATE.READY]: { text: '可收获', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  [FIELD_STATE.WITHERED]: { text: '已枯萎', color: 'text-red-500', bg: 'bg-red-900/20' },
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
                <div className="text-xs text-stone-500">产量 ~{crop.baseYield}</div>
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

function PlotCard({ plot, onAction, onPlant }) {
  const stateInfo = STATE_LABELS[plot.state] || STATE_LABELS[FIELD_STATE.EMPTY];
  const crop = plot.getCropDef();

  return (
    <div className={`rounded-lg border border-stone-700 p-4 ${stateInfo.bg} ${plot.pest ? 'ring-1 ring-red-500/50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-stone-300 text-sm font-medium">{plot.id.replace('_', ' #')}</span>
        <div className="flex items-center gap-2">
          {plot.pest && (
            <span className="text-xs font-bold px-2 py-0.5 rounded text-red-400 bg-red-900/40 flex items-center gap-1">
              <Bug size={10} /> 虫害
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${stateInfo.color} bg-stone-800/50`}>
            {stateInfo.text}
          </span>
        </div>
      </div>

      {/* 农田信息 */}
      <div className="space-y-2 mb-4 text-xs text-stone-400">
        <div className="flex justify-between">
          <span>肥力</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-600 rounded-full transition-all" style={{ width: `${plot.fertility}%` }} />
            </div>
            <span>{Math.floor(plot.fertility)}</span>
          </div>
        </div>

        {(plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING || plot.state === FIELD_STATE.READY) && (
          <>
            <div className="flex justify-between">
              <span>水分</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${plot.waterLevel}%` }} />
                </div>
                <span className={plot.waterLevel < 20 ? 'text-red-400' : ''}>{Math.floor(plot.waterLevel)}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span>生长</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${plot.growthProgress}%` }} />
                </div>
                <span>{Math.floor(plot.growthProgress)}%</span>
              </div>
            </div>
          </>
        )}

        {crop && <div className="flex justify-between"><span>作物</span><span className="text-green-400">{crop.icon} {crop.name}</span></div>}

        {/* 病虫害进度 */}
        {plot.pest && (
          <div className="flex justify-between items-center">
            <span className="text-red-400">虫害</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${(plot.pestLevel / plot.pestClicksNeeded) * 100}%` }} />
              </div>
              <span className="text-red-400">{plot.pestLevel}次</span>
            </div>
          </div>
        )}

        {plot.state === FIELD_STATE.READY && crop && (
          <div className="text-sm text-yellow-400 font-medium mt-1">✨ 作物已成熟！</div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        {/* 病虫害：除虫按钮优先显示 */}
        {plot.pest && (
          <button
            onClick={() => onAction('remove_pest', { plotId: plot.id })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-800/60 hover:bg-red-700/60 text-red-200 rounded transition-colors active:scale-95"
          >
            <Bug size={12} /> 除虫！({plot.pestLevel})
          </button>
        )}

        {(plot.state === FIELD_STATE.EMPTY || plot.state === FIELD_STATE.WITHERED) && (
          <button
            onClick={() => onAction('plow', { plotId: plot.id })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded transition-colors"
          >
            <Shovel size={12} /> 翻地
          </button>
        )}

        {plot.state === FIELD_STATE.PLOWED && (
          <button
            onClick={() => onPlant(plot.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-800/60 hover:bg-green-700/60 text-green-200 rounded transition-colors"
          >
            <Sprout size={12} /> 播种
          </button>
        )}

        {(plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) && !plot.pest && (
          <button
            onClick={() => onAction('water', { plotId: plot.id })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-800/60 hover:bg-blue-700/60 text-blue-200 rounded transition-colors"
          >
            <Droplets size={12} /> 浇水
          </button>
        )}

        {plot.state === FIELD_STATE.READY && (
          <button
            onClick={() => onAction('harvest', { plotId: plot.id })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 rounded transition-colors"
          >
            <Scissors size={12} /> 收获
          </button>
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
          <span className="text-xs text-stone-400">
            农田 {game.farm.plots.length}/{game.farm.maxPlots}
          </span>
          {game.farm.plots.length < game.farm.maxPlots && (
            <button
              onClick={() => onAction('expand_farm')}
              className="px-3 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded transition-colors"
            >
              + 开垦新田
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {game.farm.plots.map(plot => (
          <PlotCard key={plot.id} plot={plot} onAction={onAction} onPlant={handlePlant} />
        ))}
      </div>

      {/* 种子选择弹窗 */}
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
