import { Hammer, Lock, Clock, CheckCircle2 } from 'lucide-react';
import { BUILDING_DEFS } from '../data/buildings';
import { TICKS_PER_DAY } from '../engine/constants';

/**
 * 建筑卡片
 */
function BuildingCard({ def, game, onBuild, isBuilding }) {
  const canBuild = !isBuilding && !game.buildings.includes(def.id) && def.requires(game);
  const isBuilt = game.buildings.includes(def.id);
  const locked = !def.requires(game) && !isBuilt;

  // 计算材料是否足够
  const costsStatus = def.costs.map(cost => {
    const have = game.warehouse.getItemAmount(cost.category, cost.itemId);
    return { ...cost, have, enough: have >= cost.amount };
  });
  const allMaterialsEnough = costsStatus.every(c => c.enough);

  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      isBuilt
        ? 'border-green-700/40 bg-green-950/10'
        : isBuilding
          ? 'border-amber-700/40 bg-amber-950/10'
          : locked
            ? 'border-stone-700/30 bg-stone-900/30 opacity-60'
            : 'border-stone-600 bg-stone-800/50 hover:border-stone-500'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{def.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-stone-200 font-bold text-sm">{def.name}</span>
            {isBuilt && <CheckCircle2 size={14} className="text-green-500" />}
            {locked && <Lock size={12} className="text-stone-600" />}
          </div>
          <p className="text-xs text-stone-400 mb-2">{def.description}</p>

          {/* 材料列表 */}
          {!isBuilt && (
            <div className="space-y-1 mb-2">
              {costsStatus.map((cost, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500">{cost.name}</span>
                  <span className={cost.enough ? 'text-green-400' : 'text-red-400'}>
                    {cost.have} / {cost.amount}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 建造信息 */}
          {!isBuilt && !locked && (
            <div className="flex items-center gap-1 text-[10px] text-stone-500 mb-2">
              <Clock size={10} />
              <span>建造耗时 {def.buildDays} 天</span>
            </div>
          )}

          {/* 锁定原因 */}
          {locked && def.lockedReason && (
            <div className="text-[10px] text-stone-600 mb-2">
              🔒 {def.lockedReason}
            </div>
          )}

          {/* 操作按钮 */}
          {!isBuilt && !isBuilding && (
            <button
              onClick={() => canBuild && onBuild(def.id)}
              disabled={!canBuild || !allMaterialsEnough}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                canBuild && allMaterialsEnough
                  ? 'bg-amber-700/60 hover:bg-amber-600/60 text-amber-200'
                  : 'bg-stone-800/50 text-stone-600 cursor-not-allowed'
              }`}
            >
              <Hammer size={12} />
              {canBuild && allMaterialsEnough ? '开始建造' : '材料不足'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 建造进度卡片
 */
function BuildProgressCard({ def, progress, totalTicks }) {
  const percent = Math.floor((progress / totalTicks) * 100);
  const daysLeft = Math.ceil((totalTicks - progress) / TICKS_PER_DAY);

  return (
    <div className="rounded-lg border border-amber-700/40 bg-amber-950/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{def.icon}</span>
        <span className="text-amber-300 font-bold text-sm">{def.name}</span>
        <span className="text-[10px] text-amber-400/70 bg-amber-900/20 px-2 py-0.5 rounded ml-auto">
          建造中
        </span>
      </div>
      <p className="text-xs text-stone-400 mb-2 italic">"{def.story}"</p>
      <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-stone-500">
        <span>{percent}%</span>
        <span>还需 {daysLeft} 天</span>
      </div>
    </div>
  );
}

export default function BuildPanel({ game, onAction }) {
  // 找出建造中的建筑
  const buildingItem = game.buildQueue && game.buildQueue.length > 0
    ? game.buildQueue[0]
    : null;
  const buildingDef = buildingItem
    ? BUILDING_DEFS.find(d => d.id === buildingItem.buildingId)
    : null;

  const handleBuild = (buildingId) => {
    onAction('start_build', { buildingId });
  };

  // 分类展示
  const categories = [
    { key: 'production', label: '生产', color: 'text-green-400' },
    { key: 'storage', label: '仓储', color: 'text-amber-400' },
    { key: 'research', label: '研究', color: 'text-cyan-400' },
  ];

  const getBuildingsByCategory = (cat) => {
    return BUILDING_DEFS.filter(d => d.category === cat);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Hammer size={20} className="text-amber-400" />
        <h2 className="text-lg font-bold text-amber-400">建筑</h2>
      </div>

      {/* 建造进度 */}
      {buildingDef && buildingItem && (
        <div className="mb-6">
          <BuildProgressCard
            def={buildingDef}
            progress={buildingItem.progress}
            totalTicks={buildingItem.totalTicks}
          />
        </div>
      )}

      {/* 已建造建筑 */}
      {game.buildings && game.buildings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm text-stone-400 mb-3 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-500" />
            已建成
          </h3>
          <div className="flex flex-wrap gap-2">
            {game.buildings.map(bId => {
              const def = BUILDING_DEFS.find(d => d.id === bId);
              if (!def) return null;
              return (
                <span key={bId} className="text-xs px-3 py-1.5 rounded-lg border border-green-700/30 bg-green-950/10 text-green-300">
                  {def.icon} {def.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 可建造列表 */}
      <div className="space-y-6">
        {categories.map(cat => {
          const buildings = getBuildingsByCategory(cat.key);
          if (buildings.length === 0) return null;
          return (
            <div key={cat.key}>
              <h3 className={`text-sm font-medium mb-3 ${cat.color}`}>{cat.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {buildings.map(def => (
                  <BuildingCard
                    key={def.id}
                    def={def}
                    game={game}
                    onBuild={handleBuild}
                    isBuilding={buildingItem?.buildingId === def.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {(!game.buildings || game.buildings.length === 0) && !buildingItem && (
        <p className="text-xs text-stone-600 mt-4 text-center">
          建造设施可以让你的领地更加强大……
        </p>
      )}
    </div>
  );
}
