import { useState } from 'react';
import { Flame, Pickaxe, Wrench, Plus, Minus, AlertTriangle, CheckCircle, Clock, Thermometer, Fuel, Hammer } from 'lucide-react';
import { ORE_VEINS, RAW_ORES, SMELTED_PRODUCTS, TOOLS } from '../data/materials';
import { FURNACE_EQUIPMENT } from '../engine/RepairSystem';
import { QUALITY_TIERS } from '../data/productQuality';

// ========== 矿脉卡片 ==========
function VeinCard({ veinId, veinData, veinDef, onMine, onRepairTool, toolDurability }) {
  const durabilityPct = Math.round((veinData.durability / veinDef.maxDurability) * 100);
  const isDepleted = veinData.depleted;
  const durColor = durabilityPct > 60 ? '#22c55e' : durabilityPct > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`rounded-lg border p-3 bg-stone-800/50 flex flex-col ${
      isDepleted ? 'border-stone-700/30 opacity-50' : 'border-stone-700'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{veinDef.icon}</span>
          <div>
            <div className="text-sm text-stone-200 font-bold">{veinDef.name}</div>
            <div className="text-[10px] text-stone-500">
              产出 {veinDef.baseYield.min}-{veinDef.baseYield.max} · 危险 Lv.{veinDef.dangerLevel}
            </div>
          </div>
        </div>
        {isDepleted && <span className="text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded">已枯竭</span>}
      </div>

      {/* 耐久条 */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-stone-500">矿脉耐久</span>
          <span className="text-stone-400">{Math.round(veinData.durability)}/{veinDef.maxDurability}</span>
        </div>
        <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${durabilityPct}%`, backgroundColor: durColor }} />
        </div>
      </div>

      {/* 工具耐久 */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-stone-500">⛏ 铁镐耐久</span>
          <span className="text-stone-400">{toolDurability}/{TOOLS.pickaxe.durability}</span>
        </div>
        <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all bg-amber-500" style={{ width: `${(toolDurability / TOOLS.pickaxe.durability) * 100}%` }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onMine(veinId)}
          disabled={isDepleted || toolDurability <= 0}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
            isDepleted || toolDurability <= 0
              ? 'bg-stone-700/30 text-stone-600 cursor-not-allowed'
              : 'bg-amber-800/60 hover:bg-amber-700/60 text-amber-200'
          }`}>
          <Pickaxe size={12} /> 开采
        </button>
        <button
          onClick={() => onRepairTool('pickaxe')}
          disabled={toolDurability >= TOOLS.pickaxe.durability}
          className={`px-3 py-2 text-xs rounded transition-colors ${
            toolDurability >= TOOLS.pickaxe.durability
              ? 'bg-stone-700/30 text-stone-600 cursor-not-allowed'
              : 'bg-stone-700/50 hover:bg-stone-600/50 text-stone-300'
          }`}>
          <Wrench size={12} /> 维修
        </button>
      </div>
    </div>
  );
}

// ========== 矿场Tab ==========
function MiningTab({ game, onAction }) {
  const mining = game.miningSystem;
  const warehouse = game.warehouse;
  const toolDur = mining.toolDurability?.pickaxe || 0;
  const [miningLog, setMiningLog] = useState([]);

  const handleMine = (veinId) => {
    const result = onAction('mine_ore', { veinId });
    if (result?.success && result?.qualitySummary) {
      setMiningLog(prev => [`开采 ${result.qualitySummary}`, ...prev].slice(0, 10));
    }
    if (result?.accident) {
      setMiningLog(prev => [`⚠️ ${result.accident.name}！`, ...prev].slice(0, 10));
    }
  };

  // 统计仓库中的矿石库存（按品质）
  const oreStock = {};
  for (const [id, def] of Object.entries(RAW_ORES)) {
    const qualities = ['inferior', 'standard', 'premium', 'supreme'];
    for (const q of qualities) {
      const batchId = `${id}_${q}`;
      const amt = warehouse.getItemAmount(def.category, batchId);
      if (amt > 0) {
        if (!oreStock[id]) oreStock[id] = { name: def.name, icon: def.icon, total: 0, qualities: {} };
        oreStock[id].qualities[q] = amt;
        oreStock[id].total += amt;
      }
    }
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Pickaxe size={14} className="text-amber-400" />
        <h3 className="text-sm font-bold text-stone-300">矿场开采</h3>
      </div>

      {/* 矿脉 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {Object.entries(ORE_VEINS).map(([id, def]) => {
          const data = mining.veins?.[id] || { durability: def.maxDurability, depleted: false };
          return (
            <VeinCard
              key={id}
              veinId={id}
              veinData={data}
              veinDef={def}
              onMine={handleMine}
              onRepairTool={(toolId) => onAction('repair_tool', { toolId })}
              toolDurability={toolDur}
            />
          );
        })}
      </div>

      {/* 开采日志 */}
      {miningLog.length > 0 && (
        <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
          <div className="text-xs text-stone-400 font-semibold mb-2">📋 开采记录</div>
          <div className="space-y-0.5">
            {miningLog.map((log, i) => (
              <div key={i} className="text-[10px] text-stone-500">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* 矿石库存（按品质） */}
      {Object.keys(oreStock).length > 0 && (
        <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
          <div className="text-xs text-stone-400 font-semibold mb-2">🪨 矿石库存</div>
          <div className="space-y-1.5">
            {Object.entries(oreStock).map(([id, ore]) => (
              <div key={id} className="bg-stone-800/50 rounded px-2 py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span>{ore.icon}</span>
                    <span className="text-xs text-stone-300">{ore.name}</span>
                  </div>
                  <span className="text-xs text-amber-400">共 {ore.total}</span>
                </div>
                <div className="flex gap-1.5">
                  {Object.entries(ore.qualities).map(([q, amt]) => {
                    const tier = QUALITY_TIERS[q];
                    return (
                      <span key={q} className={`text-[9px] px-1.5 py-0.5 rounded ${tier?.color || 'text-stone-400'} bg-stone-700/50`}>
                        {tier?.icon} {tier?.name} ×{amt}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 冶炼Tab ==========
function SmeltingTab({ game, onAction }) {
  const smelting = game.smeltingSystem;
  const [targetTemp, setTargetTemp] = useState(smelting.furnaceTemp);

  const getTempStatus = (temp) => {
    if (temp < 200) return { label: '冷炉', color: 'text-stone-400', bg: 'bg-stone-700' };
    if (temp < 400) return { label: '文火', color: 'text-blue-400', bg: 'bg-blue-900/30' };
    if (temp <= 600) return { label: ' optimal', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (temp <= 800) return { label: '武火', color: 'text-orange-400', bg: 'bg-orange-900/30' };
    return { label: '过热!', color: 'text-red-400', bg: 'bg-red-900/30' };
  };

  const tempStatus = getTempStatus(smelting.furnaceTemp);
  const optimalRange = smelting.furnaceTemp >= 400 && smelting.furnaceTemp <= 600;

  // 当前库存
  const oreStock = {};
  for (const [id, def] of Object.entries(RAW_ORES)) {
    if (def.smeltYield) {
      const amt = game.warehouse.getItemAmount(def.category, id);
      if (amt > 0) oreStock[id] = { ...def, amount: amt };
    }
  }
  const coalAmount = game.warehouse.getItemAmount('fuel', 'coal');

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={14} className="text-orange-400" />
        <h3 className="text-sm font-bold text-stone-300">冶炼炉</h3>
      </div>

      {/* 炉温控制 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Thermometer size={14} className={tempStatus.color} />
            <span className="text-xs text-stone-400">炉温</span>
            <span className={`text-sm font-bold ${tempStatus.color}`}>{smelting.furnaceTemp}°</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${tempStatus.bg} ${tempStatus.color}`}>{tempStatus.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Fuel size={12} className="text-stone-500" />
            <span className="text-xs text-stone-400">燃料 <span className={coalAmount > 0 ? 'text-amber-400' : 'text-red-400'}>{smelting.fuelLevel}</span></span>
          </div>
        </div>

        {/* 温度条 */}
        <div className="relative h-3 bg-stone-700 rounded-full overflow-hidden mb-2">
          {/* 最佳区间标记 */}
          <div className="absolute h-full bg-green-900/30" style={{ left: '40%', width: '20%' }} />
          <div className="h-full rounded-full transition-all" style={{
            width: `${Math.min(100, smelting.furnaceTemp / 10)}%`,
            backgroundColor: optimalRange ? '#22c55e' : smelting.furnaceTemp > 800 ? '#ef4444' : '#f59e0b',
          }} />
          <div className="absolute top-0 h-full border-l border-stone-500" style={{ left: '40%' }} />
          <div className="absolute top-0 h-full border-l border-stone-500" style={{ left: '60%' }} />
        </div>
        <div className="flex justify-between text-[9px] text-stone-600">
          <span>0°</span>
          <span className="text-green-700">最佳 400-600°</span>
          <span>1000°</span>
        </div>

        {/* 温度调节 */}
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => { const t = Math.max(0, smelting.furnaceTemp - 100); setTargetTemp(t); onAction('adjust_smelt_temp', { temp: t }); }}
            className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center">
            <Minus size={14} />
          </button>
          <div className="flex-1 text-center text-xs text-stone-500">目标 {targetTemp}°</div>
          <button onClick={() => { const t = Math.min(1000, smelting.furnaceTemp + 100); setTargetTemp(t); onAction('adjust_smelt_temp', { temp: t }); }}
            className="w-8 h-8 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 flex items-center justify-center">
            <Plus size={14} />
          </button>
          <button onClick={() => onAction('add_smelt_fuel', { amount: 5 })}
            className="px-3 h-8 rounded bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 text-xs flex items-center gap-1">
            <Fuel size={11} /> +5
          </button>
        </div>
      </div>

      {/* 冶炼进度 */}
      {Object.entries(smelting.smeltingProgress || {}).length > 0 && (
        <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
          <div className="text-xs text-stone-400 font-semibold mb-2">⏳ 冶炼中</div>
          {Object.entries(smelting.smeltingProgress).map(([npcId, prog]) => {
            const pct = Math.min(100, Math.round((prog.progress / prog.total) * 100));
            const product = SMELTED_PRODUCTS[prog.yieldProduct];
            return (
              <div key={npcId} className="flex items-center gap-2 text-xs">
                <span className="text-stone-400">{product?.icon} {product?.name}</span>
                <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-orange-400 w-8">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 库存矿石 */}
      <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">🪨 矿石库存</div>
        {Object.keys(oreStock).length === 0 && coalAmount === 0 ? (
          <div className="text-center text-stone-600 text-xs py-3">暂无矿石</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(oreStock).map(([id, ore]) => (
              <div key={id} className="flex items-center justify-between bg-stone-800/50 rounded px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span>{ore.icon}</span>
                  <span className="text-xs text-stone-300">{ore.name}</span>
                </div>
                <span className="text-xs text-amber-400">{ore.amount}</span>
              </div>
            ))}
            {coalAmount > 0 && (
              <div className="flex items-center justify-between bg-stone-800/50 rounded px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span>⚫</span>
                  <span className="text-xs text-stone-300">煤炭</span>
                </div>
                <span className="text-xs text-amber-400">{coalAmount}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 设备维修Tab ==========
function RepairTab({ game, onAction }) {
  const repair = game.repairSystem;

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Wrench size={14} className="text-blue-400" />
        <h3 className="text-sm font-bold text-stone-300">设备维修</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(FURNACE_EQUIPMENT).map(([id, def]) => {
          const equip = repair.equipment?.[id] || { durability: def.maxDurability };
          const durabilityPct = Math.round((equip.durability / def.maxDurability) * 100);
          const isLow = equip.durability < def.failureThreshold;
          const durColor = durabilityPct > 60 ? '#22c55e' : durabilityPct > 30 ? '#f59e0b' : '#ef4444';

          // 检查维修材料
          const canRepair = Object.entries(def.repairCost).every(([itemId, amount]) => {
            return (game.warehouse.getItemAmount('mineral', itemId) || 0) >= amount;
          });

          return (
            <div key={id} className={`rounded-lg border p-3 bg-stone-800/50 ${isLow ? 'border-red-700/50' : 'border-stone-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{def.icon}</span>
                  <div>
                    <div className="text-sm text-stone-200 font-bold">{def.name}</div>
                    {isLow && (
                      <div className="flex items-center gap-1 text-[10px] text-red-400">
                        <AlertTriangle size={10} /> 故障风险!
                      </div>
                    )}
                  </div>
                </div>
                {equip.repairProgress && (
                  <span className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">维修中...</span>
                )}
              </div>

              {/* 耐久条 */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-stone-500">耐久度</span>
                  <span className="text-stone-400">{Math.round(equip.durability)}/{def.maxDurability}</span>
                </div>
                <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${durabilityPct}%`, backgroundColor: durColor }} />
                </div>
              </div>

              {/* 维修材料 */}
              <div className="text-[10px] text-stone-600 mb-2">
                需要: {Object.entries(def.repairCost).map(([itemId, amount]) => {
                  const have = game.warehouse.getItemAmount('mineral', itemId) || 0;
                  return (
                    <span key={itemId} className={have >= amount ? 'text-green-600' : 'text-red-500'}>
                      {itemId}({have}/{amount})
                    </span>
                  );
                }).reduce((prev, curr) => [prev, ' ', curr], [])}
              </div>

              <button
                onClick={() => onAction('repair_equipment', { equipId: id })}
                disabled={!canRepair || equip.durability >= def.maxDurability * 0.9}
                className={`w-full flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
                  !canRepair || equip.durability >= def.maxDurability * 0.9
                    ? 'bg-stone-700/30 text-stone-600 cursor-not-allowed'
                    : 'bg-blue-800/60 hover:bg-blue-700/60 text-blue-200'
                }`}>
                <Hammer size={12} /> {equip.durability >= def.maxDurability * 0.9 ? '状态良好' : '开始维修'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== 主面板 ==========
export default function CrafterPanel({ game, onAction }) {
  const [activeTab, setActiveTab] = useState('mining');

  const tabs = [
    { id: 'mining', label: '矿场', icon: '⛏️' },
    { id: 'smelting', label: '冶炼', icon: '🔥' },
    { id: 'repair', label: '维修', icon: '🛠️' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚒️</span>
        <h2 className="text-lg font-bold text-amber-400">工坊</h2>
        <span className="text-xs text-stone-500">（矿工/炼铁匠/炉工）</span>
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

      {activeTab === 'mining' && <MiningTab game={game} onAction={onAction} />}
      {activeTab === 'smelting' && <SmeltingTab game={game} onAction={onAction} />}
      {activeTab === 'repair' && <RepairTab game={game} onAction={onAction} />}
    </div>
  );
}
