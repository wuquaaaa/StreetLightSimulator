import { Package, ArrowUpCircle } from 'lucide-react';

function WarehouseCard({ name, icon, level, capacity, used, items, onUpgrade }) {
  const usagePercent = capacity > 0 ? (used / capacity) * 100 : 0;
  const itemEntries = Object.entries(items);

  return (
    <div className="rounded-lg border border-stone-600 bg-stone-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-stone-200 font-medium">{name}</span>
          <span className="text-xs text-stone-500">Lv.{level}</span>
        </div>
        <button
          onClick={onUpgrade}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded transition-colors"
          title="升级仓库"
        >
          <ArrowUpCircle size={12} /> 升级
        </button>
      </div>

      {/* 容量条 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-stone-400 mb-1">
          <span>容量</span>
          <span>{used} / {capacity}</span>
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
      {itemEntries.length > 0 ? (
        <div className="space-y-1.5">
          {itemEntries.map(([itemId, item]) => (
            <div key={itemId} className="flex items-center justify-between text-sm">
              <span className="text-stone-300">{item.name}</span>
              <span className="text-amber-400 font-mono">{item.amount}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-stone-500 italic">空仓库</div>
      )}
    </div>
  );
}

export default function WarehousePanel({ game, onAction }) {
  const summary = game.warehouse.getSummary();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package size={20} className="text-amber-400" />
        <h2 className="text-lg font-bold text-amber-400">仓库</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 公共仓库（始终显示） */}
        <WarehouseCard
          name={summary.common.name}
          icon={summary.common.icon}
          level={summary.common.level}
          capacity={summary.common.capacity}
          used={summary.common.used}
          items={summary.common.items}
          onUpgrade={() => onAction('upgrade_common')}
        />

        {/* 已解锁的专用仓库 */}
        {Object.entries(summary.specialized).map(([catKey, data]) => (
          <WarehouseCard
            key={catKey}
            name={`${data.name}仓库`}
            icon={data.icon}
            level={data.level}
            capacity={data.capacity}
            used={data.used}
            items={data.items}
            onUpgrade={() => onAction('upgrade_warehouse', { category: catKey })}
          />
        ))}
      </div>

      {Object.keys(summary.specialized).length === 0 && (
        <p className="text-xs text-stone-600 mt-4 text-center">
          随着发展，更多专用仓库将陆续解锁...
        </p>
      )}
    </div>
  );
}
