import { useState } from 'react';
import { Leaf, FlaskConical, Beaker, Thermometer, Fuel, Clock, Sparkles, ChevronRight, AlertTriangle } from 'lucide-react';
import { HERB_MATERIALS, PREPARED_HERBS, PILL_RECIPES } from '../data/materials';

const STAGE_LABELS = {
  sorting: '分拣',
  washing: '清洗',
  drying: '晾晒/研磨',
  done: '完成',
};

const STAGE_ICONS = {
  sorting: '🔍',
  washing: '💧',
  drying: '☀️',
  done: '✅',
};

const QUALITY_COLORS = {
  poor: 'text-stone-400',
  low: 'text-green-400',
  medium: 'text-blue-400',
  high: 'text-yellow-400',
  supreme: 'text-red-400',
};

// ========== 药童Tab ==========
function HerbPrepTab({ game, onAction }) {
  const herbPrep = game.herbPrepSystem;

  // 仓库中的原始草药库存
  const herbStock = {};
  for (const [id, def] of Object.entries(HERB_MATERIALS)) {
    const amt = game.warehouse.getItemAmount(def.category, id);
    if (amt > 0) herbStock[id] = { ...def, amount: amt };
  }

  // 处理好的材料库存
  const preparedStock = {};
  for (const [id, def] of Object.entries(PREPARED_HERBS)) {
    const amt = game.warehouse.getItemAmount(def.category, id);
    if (amt > 0) preparedStock[id] = { ...def, amount: amt };
  }

  // 当前处理进度
  const processing = herbPrep.processing || {};
  const playerProc = processing[game.player?.id];

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Leaf size={14} className="text-green-400" />
        <h3 className="text-sm font-bold text-stone-300">药材处理</h3>
        <span className="text-[10px] text-stone-500">（分拣 → 清洗 → 晾晒）</span>
      </div>

      {/* 当前处理进度 */}
      {playerProc && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{STAGE_ICONS[playerProc.stage]}</span>
              <div>
                <div className="text-xs text-green-300 font-bold">处理中: {HERB_MATERIALS[playerProc.herbId]?.name || playerProc.herbId}</div>
                <div className="text-[10px] text-green-400/70">阶段: {STAGE_LABELS[playerProc.stage]}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-400">品质</div>
              <div className={`text-sm font-bold ${playerProc.quality > 80 ? 'text-green-400' : playerProc.quality > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {Math.round(playerProc.quality)}
              </div>
            </div>
          </div>
          <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, (playerProc.progress / playerProc.total) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-stone-500">{Math.round((playerProc.progress / playerProc.total) * 100)}%</span>
            <button onClick={() => onAction('rush_herb_prep')}
              className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors">
              ⚡ 加速 (品质-20)
            </button>
          </div>
        </div>
      )}

      {/* 原始草药库存 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">🌿 原始草药</div>
        {Object.keys(herbStock).length === 0 ? (
          <div className="text-center text-stone-600 text-xs py-3">暂无草药</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(herbStock).map(([id, herb]) => (
              <button
                key={id}
                onClick={() => onAction('start_herb_prep', { herbId: id })}
                disabled={!!playerProc}
                className={`flex items-center justify-between bg-stone-800/50 rounded px-2 py-2 text-left transition-colors ${
                  playerProc ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-700/50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{herb.icon}</span>
                  <div>
                    <div className="text-xs text-stone-300">{herb.name}</div>
                    <div className="text-[9px] text-stone-600">处理 {herb.prepTime}周期</div>
                  </div>
                </div>
                <span className="text-xs text-amber-400">{herb.amount}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 处理好的材料库存 */}
      <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">✨ 处理好的材料</div>
        {Object.keys(preparedStock).length === 0 ? (
          <div className="text-center text-stone-600 text-xs py-3">暂无处理好的材料</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(preparedStock).map(([id, herb]) => (
              <div key={id} className="flex items-center justify-between bg-stone-800/50 rounded px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span>{herb.icon}</span>
                  <span className="text-xs text-stone-300">{herb.name}</span>
                </div>
                <span className="text-xs text-green-400">{herb.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 炼丹师Tab ==========
function AlchemyTab({ game, onAction }) {
  const alchemy = game.alchemySystem;
  const [targetTemp, setTargetTemp] = useState(alchemy.furnaceTemp);

  const getTempStatus = (temp) => {
    if (temp < 100) return { label: '冷炉', color: 'text-stone-400', desc: '无法炼丹' };
    if (temp < 300) return { label: '文火', color: 'text-blue-400', desc: '效率 60%' };
    if (temp <= 500) return { label: '中火', color: 'text-green-400', desc: '最佳效率' };
    if (temp <= 700) return { label: '武火', color: 'text-orange-400', desc: '效率 120%' };
    return { label: '猛火', color: 'text-red-400', desc: '效率 50% 过热!' };
  };

  const tempStatus = getTempStatus(alchemy.furnaceTemp);
  const coalAmount = game.warehouse.getItemAmount('fuel', 'coal');

  // 检查每个配方的材料是否足够
  const recipeStatus = Object.entries(PILL_RECIPES).map(([id, recipe]) => {
    const canCraft = recipe.ingredients.every(ing => {
      return (game.warehouse.getItemAmount('herb', ing.id) || 0) >= ing.amount;
    });
    const ingredients = recipe.ingredients.map(ing => {
      const def = PREPARED_HERBS[ing.id];
      const have = game.warehouse.getItemAmount('herb', ing.id) || 0;
      return { name: def?.name || ing.id, icon: def?.icon || '?', need: ing.amount, have, enough: have >= ing.amount };
    });
    return { id, ...recipe, canCraft, ingredients };
  });

  // 当前炼制进度
  const crafting = alchemy.crafting || {};
  const playerCraft = crafting[game.player?.id];

  // 已产出的丹药
  const output = alchemy.outputBuffer || {};

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical size={14} className="text-purple-400" />
        <h3 className="text-sm font-bold text-stone-300">丹房炼丹</h3>
      </div>

      {/* 炉温控制 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Thermometer size={14} className={tempStatus.color} />
            <span className="text-xs text-stone-400">炉温</span>
            <span className={`text-sm font-bold ${tempStatus.color}`}>{alchemy.furnaceTemp}°</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-stone-800 ${tempStatus.color}`}>{tempStatus.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Fuel size={12} className="text-stone-500" />
            <span className="text-xs text-stone-400">燃料 <span className={coalAmount > 0 ? 'text-amber-400' : 'text-red-400'}>{alchemy.fuelLevel}</span></span>
          </div>
        </div>

        {/* 温度条 */}
        <div className="relative h-3 bg-stone-700 rounded-full overflow-hidden mb-2">
          <div className="absolute h-full bg-green-900/30" style={{ left: '30%', width: '20%' }} />
          <div className="absolute h-full bg-orange-900/20" style={{ left: '50%', width: '20%' }} />
          <div className="h-full rounded-full transition-all" style={{
            width: `${Math.min(100, alchemy.furnaceTemp / 10)}%`,
            backgroundColor: alchemy.furnaceTemp > 700 ? '#ef4444' : alchemy.furnaceTemp >= 300 && alchemy.furnaceTemp <= 500 ? '#22c55e' : '#f59e0b',
          }} />
        </div>
        <div className="flex justify-between text-[9px] text-stone-600 mb-2">
          <span>0°</span>
          <span className="text-green-700">中火 300-500°</span>
          <span>1000°</span>
        </div>

        <div className="text-[10px] text-stone-600 mb-2">{tempStatus.desc}</div>

        {/* 温度调节 */}
        <div className="flex items-center gap-2">
          <button onClick={() => { const t = Math.max(0, alchemy.furnaceTemp - 100); setTargetTemp(t); onAction('adjust_alchemy_temp', { temp: t }); }}
            className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center text-xs">-100</button>
          <div className="flex-1 text-center text-xs text-stone-500">目标 {targetTemp}°</div>
          <button onClick={() => { const t = Math.min(1000, alchemy.furnaceTemp + 100); setTargetTemp(t); onAction('adjust_alchemy_temp', { temp: t }); }}
            className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center text-xs">+100</button>
          <button onClick={() => onAction('add_alchemy_fuel', { amount: 5 })}
            className="px-3 h-8 rounded bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 text-xs flex items-center gap-1">
            <Fuel size={11} /> +5
          </button>
        </div>
      </div>

      {/* 当前炼制进度 */}
      {playerCraft && (
        <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚗️</span>
            <div>
              <div className="text-xs text-purple-300 font-bold">炼制中: {PILL_RECIPES[playerCraft.recipeId]?.name || playerCraft.recipeId}</div>
            </div>
          </div>
          <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${Math.min(100, (playerCraft.progress / playerCraft.total) * 100)}%` }} />
          </div>
          <div className="text-[10px] text-stone-500 mt-1 text-right">{Math.round((playerCraft.progress / playerCraft.total) * 100)}%</div>
        </div>
      )}

      {/* 配方列表 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">📜 配方</div>
        <div className="space-y-2">
          {recipeStatus.map(recipe => (
            <div key={recipe.id} className={`rounded-lg border p-2 ${recipe.canCraft ? 'border-purple-700/40 bg-purple-900/10' : 'border-stone-700/30 bg-stone-900/20'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{recipe.icon}</span>
                  <span className="text-xs text-stone-200 font-bold">{recipe.name}</span>
                  <span className="text-[9px] text-stone-600">炼制 {recipe.craftTime}周期</span>
                </div>
                <button
                  onClick={() => onAction('start_alchemy', { recipeId: recipe.id })}
                  disabled={!recipe.canCraft || !!playerCraft || alchemy.furnaceTemp < 100}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${
                    recipe.canCraft && !playerCraft && alchemy.furnaceTemp >= 100
                      ? 'bg-purple-700/60 hover:bg-purple-600/60 text-purple-200'
                      : 'bg-stone-700/30 text-stone-600 cursor-not-allowed'
                  }`}>
                  炼制
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {recipe.ingredients.map((ing, i) => (
                  <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded ${ing.enough ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {ing.icon} {ing.name} {ing.have}/{ing.need}
                  </span>
                ))}
              </div>
              {recipe.effects && (
                <div className="text-[9px] text-stone-600 mt-1">
                  效果: {recipe.effects.mood && `心情+${recipe.effects.mood}`}
                  {recipe.effects.efficiency && ` 效率+${Math.round(recipe.effects.efficiency * 100)}%`}
                  {recipe.effects.luck && ` 幸运+${Math.round(recipe.effects.luck * 100)}%`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 已产出丹药 */}
      {Object.keys(output).length > 0 && (
        <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
          <div className="text-xs text-stone-400 font-semibold mb-2">💊 丹药库存</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(output).map(([id, data]) => {
              const recipe = PILL_RECIPES[id];
              if (!recipe || data.amount <= 0) return null;
              return (
                <div key={id} className="flex items-center justify-between bg-stone-800/50 rounded px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span>{recipe.icon}</span>
                    <div>
                      <div className="text-xs text-stone-300">{recipe.name}</div>
                      <div className={`text-[9px] ${QUALITY_COLORS[data.quality > 80 ? 'supreme' : data.quality > 60 ? 'high' : data.quality > 40 ? 'medium' : 'low']}`}>
                        品质 {Math.round(data.quality)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400">{data.amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 主面板 ==========
export default function HerbAlchemyPanel({ game, onAction }) {
  const [activeTab, setActiveTab] = useState('herb_prep');

  const tabs = [
    { id: 'herb_prep', label: '药童', icon: '🌿' },
    { id: 'alchemy', label: '炼丹师', icon: '⚗️' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🌿</span>
        <h2 className="text-lg font-bold text-amber-400">丹房</h2>
        <span className="text-xs text-stone-500">（药童/炼丹师）</span>
      </div>

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

      {activeTab === 'herb_prep' && <HerbPrepTab game={game} onAction={onAction} />}
      {activeTab === 'alchemy' && <AlchemyTab game={game} onAction={onAction} />}
    </div>
  );
}
