import { useState, useCallback } from 'react';
import { Package, ArrowUpCircle, BookOpen, Hammer, GripVertical } from 'lucide-react';
import { TICKS_PER_DAY } from '../engine/constants';

// ======================================================
// ShelfRow — 单个货架（支持拖拽放入）
// ======================================================
function ShelfRow({ shelf, isFangshi, onDragStart, onDrop }) {
  const [dragOver, setDragOver] = useState(false);
  const itemEntries = Object.entries(shelf.items);
  const usagePercent = shelf.capacity > 0 ? (shelf.used / shelf.capacity) * 100 : 0;

  const handleDragOver = useCallback((e) => {
    if (!isFangshi) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, [isFangshi]);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (!isFangshi) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/warehouse-item'));
      if (data.shelfId !== shelf.id) {
        onDrop?.(data.shelfId, data.itemId, data.amount, shelf.id);
      }
    } catch { /* ignore invalid drops */ }
  }, [isFangshi, shelf.id, onDrop]);

  return (
    <div
      className={`rounded border p-2 transition-colors ${
        dragOver ? 'border-purple-400 bg-purple-900/20' : 'border-stone-700/50 bg-stone-900/40'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-stone-400 font-medium">{shelf.name}</span>
        <span className="text-[10px] text-stone-500">{shelf.used}/{shelf.capacity}</span>
      </div>

      {/* 容量条 */}
      <div className="w-full h-1.5 bg-stone-700 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, usagePercent)}%`,
            backgroundColor: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#f59e0b' : '#22c55e',
          }}
        />
      </div>

      {/* 物品列表（房事可拖拽） */}
      {itemEntries.length > 0 ? (
        <div className="space-y-1">
          {itemEntries.map(([itemId, item]) => (
            <div
              key={itemId}
              draggable={isFangshi}
              onDragStart={isFangshi ? (e) => {
                e.dataTransfer.setData('application/warehouse-item', JSON.stringify({
                  shelfId: shelf.id, itemId, amount: item.amount,
                }));
                e.dataTransfer.effectAllowed = 'move';
                onDragStart?.();
              } : undefined}
              className={`flex items-center justify-between text-xs rounded px-1 py-0.5 group ${
                isFangshi
                  ? 'cursor-grab active:cursor-grabbing hover:bg-purple-900/30 hover:text-purple-200 text-stone-300'
                  : 'text-stone-300'
              }`}
              title={isFangshi ? '拖拽到其他货架' : ''}
            >
              <div className="flex items-center gap-1">
                {isFangshi && <GripVertical size={10} className="text-stone-600" />}
                <span>{item.name}</span>
              </div>
              <span className="text-amber-400 font-mono">{item.amount}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-stone-600 italic">
          {isFangshi && dragOver ? '放入此处' : '空货架'}
        </div>
      )}
    </div>
  );
}

// ======================================================
// WarehouseCard
// ======================================================
function WarehouseCard({ name, icon, level, shelves, totalUsed, totalCapacity, isFangshi, onUpgrade, onDrop }) {
  const [collapsed, setCollapsed] = useState(false);
  const [, setDragActive] = useState(false);

  return (
    <div className="rounded-lg border border-stone-600 bg-stone-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-stone-200 font-medium">{name}</span>
          <span className="text-xs text-stone-500">Lv.{level}</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[10px] text-stone-500 hover:text-stone-300 ml-1"
          >
            {collapsed ? '展开' : '折叠'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isFangshi && (
            <span className="text-[10px] text-purple-400">拖拽物品来搬运</span>
          )}
          <button
            onClick={onUpgrade}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded transition-colors"
            title="升级仓库"
          >
            <ArrowUpCircle size={12} /> 升级
          </button>
        </div>
      </div>

      {/* 总容量条 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-stone-400 mb-1">
          <span>总容量</span>
          <span>{totalUsed} / {totalCapacity}</span>
        </div>
        <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0}%`,
              backgroundColor: (totalUsed / totalCapacity) > 0.8 ? '#ef4444' : (totalUsed / totalCapacity) > 0.5 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
      </div>

      {/* 货架列表 */}
      {!collapsed && (
        <div className="space-y-2">
          {shelves.map(shelf => (
            <ShelfRow
              key={shelf.id}
              shelf={shelf}
              isFangshi={isFangshi}
              onDragStart={() => setDragActive(true)}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================================
// WarehousePanel
// ======================================================
export default function WarehousePanel({ game, onAction }) {
  const summary = game.warehouse.getSummary();
  const isFangshi = game.player.hasPost?.('fangshi') || game.player.hasRole?.('fangshi')
    || game.characters?.some(c => !c.isRetired && c.hasPost?.('fangshi'));

  const handleDrop = useCallback((fromShelfId, itemId, amount, toShelfId) => {
    onAction('move_item', { fromShelfId, toShelfId, itemId, amount });
  }, [onAction]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Package size={20} className="text-amber-400" />
        <h2 className="text-lg font-bold text-amber-400">仓库</h2>
        {isFangshi && (
          <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-700/30">
            房事·拖拽物品搬运
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 公共仓库 */}
        <WarehouseCard
          name={summary.common.name}
          icon={summary.common.icon}
          level={summary.common.level}
          shelves={summary.common.shelves || []}
          totalUsed={summary.common.totalUsed}
          totalCapacity={summary.common.totalCapacity}
          isFangshi={isFangshi}
          onUpgrade={() => onAction('upgrade_common')}
          onDrop={handleDrop}
        />

        {/* 已解锁的专用仓库 */}
        {Object.entries(summary.specialized).map(([catKey, data]) => (
          <WarehouseCard
            key={catKey}
            name={`${data.name}仓库`}
            icon={data.icon}
            level={data.level}
            shelves={data.shelves || []}
            totalUsed={data.totalUsed}
            totalCapacity={data.totalCapacity}
            isFangshi={isFangshi}
            onUpgrade={() => onAction('upgrade_warehouse', { category: catKey })}
            onDrop={handleDrop}
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
