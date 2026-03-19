import { WAREHOUSE_CATEGORIES } from '../engine/WarehouseSystem';
import { Package, ArrowUpCircle } from 'lucide-react';

function CategoryCard({ catKey, catData, onBuild }) {
  const catDef = WAREHOUSE_CATEGORIES[catKey];
  if (!catDef) return null;

  const usagePercent = catData.capacity > 0 ? (catData.used / catData.capacity) * 100 : 0;
  const items = Object.entries(catData.items);

  return (
    <div className={`rounded-lg border p-4 ${catData.built ? 'border-stone-600 bg-stone-800/50' : 'border-stone-700/50 bg-stone-900/30 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{catDef.icon}</span>
          <span className="text-stone-200 font-medium">{catDef.name}仓库</span>
          {catData.built && (
            <span className="text-xs text-stone-500">Lv.{catData.level}</span>
          )}
        </div>
        {catData.built ? (
          <button
            onClick={() => onBuild(catKey)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded transition-colors"
            title="升级仓库"
          >
            <ArrowUpCircle size={12} /> 升级
          </button>
        ) : (
          <button
            onClick={() => onBuild(catKey)}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded transition-colors"
          >
            建设
          </button>
        )}
      </div>

      {catData.built ? (
        <>
          {/* 容量条 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-stone-400 mb-1">
              <span>容量</span>
              <span>{catData.used} / {catData.capacity}</span>
            </div>
            <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#f59e0b' : '#22c55e',
                }}
              />
            </div>
          </div>

          {/* 物品列表 */}
          {items.length > 0 ? (
            <div className="space-y-1.5">
              {items.map(([itemId, item]) => (
                <div key={itemId} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{item.name}</span>
                  <span className="text-amber-400 font-mono">{item.amount}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic">空仓库</div>
          )}
        </>
      ) : (
        <div className="text-xs text-stone-500">尚未建设，点击"建设"来启用此仓库</div>
      )}
    </div>
  );
}

export default function WarehousePanel({ game, onAction }) {
  const summary = game.warehouse.getSummary();

  const handleBuild = (catKey) => {
    onAction('build_warehouse', { category: catKey });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package size={20} className="text-amber-400" />
        <h2 className="text-lg font-bold text-amber-400">仓库</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(summary).map(([catKey, catData]) => (
          <CategoryCard
            key={catKey}
            catKey={catKey}
            catData={catData}
            onBuild={handleBuild}
          />
        ))}
      </div>
    </div>
  );
}
