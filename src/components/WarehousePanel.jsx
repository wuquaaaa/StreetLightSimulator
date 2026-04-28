import { Package, ArrowUpCircle, BookOpen, Hammer } from 'lucide-react';
import { TICKS_PER_DAY } from '../engine/constants';

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

      {/* 建造司务堂 */}
      {!game.hallBuilt && (
        <div className="mt-6 rounded-lg border border-cyan-700/50 bg-cyan-950/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-cyan-400" />
            <span className="text-sm font-bold text-cyan-300">建造司务堂</span>
          </div>
          <p className="text-xs text-stone-400 mb-3">
            建造司务堂后，你将获得「司录」身份，可以参悟岗位与功法。
          </p>
          <div className="text-[10px] text-stone-500 mb-2">所需材料：木材 30 + 石材 15 · 建造耗时 3 天</div>
          {game.hallBuildProgress ? (
            <div>
              <div className="flex justify-between text-[10px] text-cyan-300 mb-1">
                <span>建造进度</span>
                <span>{Math.floor((game.hallBuildProgress.progress / game.hallBuildProgress.totalTicks) * 100)}% · 还需 {Math.ceil((game.hallBuildProgress.totalTicks - game.hallBuildProgress.progress) / TICKS_PER_DAY)} 天</span>
              </div>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${Math.floor((game.hallBuildProgress.progress / game.hallBuildProgress.totalTicks) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <button onClick={() => onAction('build_hall')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-700/60 hover:bg-cyan-600/60 text-cyan-200 rounded transition-colors">
              <Hammer size={12} /> 开始建造
            </button>
          )}
        </div>
      )}
    </div>
  );
}
