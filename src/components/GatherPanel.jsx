import { useState } from 'react';
import { Mountain, UserPlus, UserMinus, Users, Package } from 'lucide-react';
import { RESOURCE_TYPES } from '../data/gather-nodes';

/**
 * NPC 分配弹窗
 */
function AssignModal({ node, game, onAssign, onUnassign, onClose }) {
  const allChars = [game.player, ...game.characters].filter(c => !c.isRetired);
  const assignedSet = new Set(node.assignedTo);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-stone-600 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-green-400 font-bold flex items-center gap-2">
            <span className="text-lg">{node.icon}</span>
            {node.name} — 分配人手
          </h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">关闭</button>
        </div>

        <div className="text-[10px] text-stone-500 mb-3">
          已分配 {node.assignedTo.length}/{node.maxAssignees} 人
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allChars.map(char => {
            const isAssigned = assignedSet.has(char.id);
            const name = char.isPlayer ? `${char.name}（你）` : char.name;

            return (
              <div key={char.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                  isAssigned
                    ? 'border-green-700/40 bg-green-950/20'
                    : 'border-stone-700/40 bg-stone-900/30 hover:border-stone-500'
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    char.isPlayer ? 'bg-amber-800/60 text-amber-200' : 'bg-stone-700 text-stone-300'
                  }`}>
                    {name[0]}
                  </div>
                  <div>
                    <div className="text-sm text-stone-200">{name}</div>
                    <div className="text-[10px] text-stone-500">
                      {char.isPlayer ? '玩家' : `${char.age}岁`}
                    </div>
                  </div>
                </div>
                {isAssigned ? (
                  <button onClick={() => onUnassign(char.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-900/40 hover:bg-red-800/50 text-red-300 rounded transition-colors">
                    <UserMinus size={12} /> 撤回
                  </button>
                ) : (
                  <button onClick={() => onAssign(char.id)}
                    disabled={!node.canAssign()}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                      node.canAssign()
                        ? 'bg-green-800/50 hover:bg-green-700/50 text-green-200'
                        : 'bg-stone-800/50 text-stone-600 cursor-not-allowed'
                    }`}>
                    <UserPlus size={12} /> {node.canAssign() ? '分配' : '已满'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {allChars.length === 0 && (
          <p className="text-xs text-stone-500 text-center mt-3">暂无可分配的角色</p>
        )}
      </div>
    </div>
  );
}

/**
 * 资源点卡片
 */
function ResourceNodeCard({ node, game, onAction }) {
  const [showModal, setShowModal] = useState(false);
  const typeDef = node.getTypeDef();

  const assignedChars = node.assignedTo.map(id => {
    const char = [game.player, ...game.characters].find(c => c.id === id);
    return char;
  }).filter(Boolean);

  const handleAssign = (charId) => {
    onAction('assign_gather_node', { nodeId: node.id, characterId: charId });
  };

  const handleUnassign = (charId) => {
    onAction('unassign_gather_node', { nodeId: node.id, characterId: charId });
  };

  return (
    <>
      <div className="rounded-lg border border-stone-600 bg-stone-800/50 p-4 hover:border-stone-500 transition-colors">
        {/* 头部 */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{node.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-stone-200 font-bold text-sm">{node.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                node.type === 'lumber'
                  ? 'bg-amber-900/30 text-amber-400'
                  : 'bg-slate-700/50 text-slate-300'
              }`}>
                {typeDef.icon} {typeDef.name}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">{node.description}</p>
          </div>
        </div>

        {/* 产量信息 */}
        <div className="flex items-center gap-3 text-[11px] text-stone-400 mb-3">
          <span>基础产量：{node.baseDailyYield} {typeDef.name}/天/人</span>
          <span>上限：{node.maxAssignees}人</span>
        </div>

        {/* 已分配的 NPC */}
        <div className="mb-3">
          {assignedChars.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {assignedChars.map(char => (
                <span key={char.id}
                  className="text-[11px] px-2 py-0.5 rounded border border-green-700/30 bg-green-950/10 text-green-300">
                  {char.isPlayer ? '👤' : '🧑'} {char.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-stone-600">暂无人分配</span>
          )}
        </div>

        {/* 分配按钮 */}
        <button
          onClick={() => setShowModal(true)}
          disabled={!node.canAssign() && assignedChars.length === 0}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
            assignedChars.length > 0
              ? 'bg-stone-700/50 hover:bg-stone-700 text-stone-300'
              : node.canAssign()
                ? 'bg-green-800/50 hover:bg-green-700/50 text-green-200'
                : 'bg-stone-800/50 text-stone-600 cursor-not-allowed'
          }`}>
          <Users size={12} />
          {assignedChars.length > 0 ? '管理人手' : '分配人手'}
        </button>
      </div>

      {showModal && (
        <AssignModal
          node={node}
          game={game}
          onAssign={(charId) => { handleAssign(charId); }}
          onUnassign={(charId) => { handleUnassign(charId); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/**
 * 后山采集面板
 */
export default function GatherPanel({ game, onAction }) {
  const { gatherSystem } = game;

  // 未解锁状态
  if (!gatherSystem.unlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Mountain size={48} className="text-stone-700 mb-4" />
        <h2 className="text-lg font-bold text-stone-500 mb-2">后山尚未开通</h2>
        <p className="text-sm text-stone-600 max-w-xs">
          前往【建筑】Tab 建造「🛤️ 后山小径」，即可解锁后山采集点，派NPC采集木材和石材。
        </p>
      </div>
    );
  }

  // 计算每日预计总产出
  const allChars = [game.player, ...game.characters];
  const summary = gatherSystem.getDailySummary(allChars);

  return (
    <div>
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <Mountain size={20} className="text-green-400" />
        <h2 className="text-lg font-bold text-green-400">后山采集</h2>
      </div>

      {/* 每日产出摘要 */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-700/30 bg-amber-950/10">
          <span className="text-lg">🪵</span>
          <div>
            <div className="text-[10px] text-stone-500">木材/天</div>
            <div className="text-sm font-bold text-amber-300">{summary.lumber}</div>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600/30 bg-slate-900/20">
          <span className="text-lg">🪨</span>
          <div>
            <div className="text-[10px] text-stone-500">石材/天</div>
            <div className="text-sm font-bold text-slate-300">{summary.stone}</div>
          </div>
        </div>
      </div>

      {/* 仓库储量 */}
      <div className="flex gap-2 mb-5">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <Package size={11} />
          仓库：{game.warehouse.getItemAmount('material', 'lumber')} 木材
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <Package size={11} />
          {game.warehouse.getItemAmount('material', 'stone')} 石材
        </div>
      </div>

      {/* 资源点网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {gatherSystem.nodes.map(node => (
          <ResourceNodeCard
            key={node.id}
            node={node}
            game={game}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}
