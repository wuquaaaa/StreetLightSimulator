import { Droplets, Scissors, Shovel, Sprout } from 'lucide-react';
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

function PlotCard({ plot, onAction }) {
  const stateInfo = STATE_LABELS[plot.state] || STATE_LABELS[FIELD_STATE.EMPTY];
  const crop = plot.getCropDef();

  return (
    <div className={`rounded-lg border border-stone-700 p-4 ${stateInfo.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-stone-300 text-sm font-medium">{plot.id.replace('_', ' #')}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${stateInfo.color} bg-stone-800/50`}>
          {stateInfo.text}
        </span>
      </div>

      {/* 农田信息 */}
      <div className="space-y-2 mb-4 text-xs text-stone-400">
        <div className="flex justify-between">
          <span>肥力</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-600 rounded-full" style={{ width: `${plot.fertility}%` }} />
            </div>
            <span>{Math.floor(plot.fertility)}</span>
          </div>
        </div>

        {(plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) && (
          <>
            <div className="flex justify-between">
              <span>水分</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${plot.waterLevel}%` }} />
                </div>
                <span>{Math.floor(plot.waterLevel)}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span>生长</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${plot.growthProgress}%` }} />
                </div>
                <span>{Math.floor(plot.growthProgress)}%</span>
              </div>
            </div>
          </>
        )}

        {crop && (
          <div className="flex justify-between">
            <span>作物</span>
            <span className="text-green-400">{crop.icon} {crop.name}</span>
          </div>
        )}

        {plot.state === FIELD_STATE.READY && crop && (
          <div className="text-sm text-yellow-400 font-medium mt-1">✨ 作物已成熟！</div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
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
            onClick={() => onAction('plant', { plotId: plot.id, cropId: 'wheat' })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-800/60 hover:bg-green-700/60 text-green-200 rounded transition-colors"
          >
            <Sprout size={12} /> 播种小麦
          </button>
        )}

        {(plot.state === FIELD_STATE.PLANTED || plot.state === FIELD_STATE.GROWING) && (
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
  const farm = game.farm;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-amber-400">🌾 农田</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">
            农田 {farm.plots.length}/{farm.maxPlots}
          </span>
          {farm.plots.length < farm.maxPlots && (
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
        {farm.plots.map(plot => (
          <PlotCard key={plot.id} plot={plot} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}
