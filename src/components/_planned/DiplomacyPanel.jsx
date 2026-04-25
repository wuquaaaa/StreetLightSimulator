import React, { useState } from 'react';
import { HandshakeIcon as Handshake, Users } from 'lucide-react';

export default function DiplomacyPanel({ game, systems }) {
  const diplomacyData = systems.diplomacy.getDiplomacyData();
  const [selectedNation, setSelectedNation] = useState(diplomacyData.nations[0]?.id);

  const selectedNationData = diplomacyData.nations.find(n => n.id === selectedNation);

  const handleProposeAlliance = () => {
    systems.diplomacy.proposeAlliance(selectedNation);
  };

  const handleProposeTrade = () => {
    systems.diplomacy.proposeTradeAgreement(selectedNation);
  };

  const handleBreakAlliance = () => {
    if (confirm('确定要破坏联盟吗？')) {
      systems.diplomacy.breakAlliance(selectedNation);
    }
  };

  const handleSendGift = () => {
    systems.diplomacy.sendGiftDiplomacy(selectedNation, 100);
  };

  const getRelationColor = (status) => {
    if (status === '盟友') return 'text-green-400';
    if (status === '友好') return 'text-lime-400';
    if (status === '中立') return 'text-slate-300';
    if (status === '冷淡') return 'text-yellow-400';
    if (status === '敌对') return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
          <Users size={20} /> 外交关系
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {diplomacyData.nations.map(nation => (
            <button
              key={nation.id}
              onClick={() => setSelectedNation(nation.id)}
              className={`p-3 rounded border transition-all text-left ${
                selectedNation === nation.id
                  ? 'bg-slate-700 border-amber-600'
                  : 'bg-slate-700/50 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <div className="font-bold text-slate-100">{nation.name}</div>
              <div className={`text-sm ${getRelationColor(nation.relationStatus)}`}>
                {nation.relationStatus}
              </div>
              <div className="text-xs text-slate-400">{nation.relation > 0 ? '+' : ''}{nation.relation}</div>
            </button>
          ))}
        </div>

        {selectedNationData && (
          <div className="bg-slate-700/30 rounded p-4 border border-slate-700">
            <h3 className="text-amber-400 font-bold mb-3">{selectedNationData.name}</h3>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">个性:</span>
                <span className="text-slate-100 capitalize">{selectedNationData.personality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">关系:</span>
                <span className={`font-bold ${getRelationColor(selectedNationData.relationStatus)}`}>
                  {selectedNationData.relationStatus} ({selectedNationData.relation})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">状态:</span>
                <span className="text-slate-100">
                  {selectedNationData.atWar ? '⚔️ 战争中' : '✓ 和平'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">条约:</span>
                <span className="text-slate-100 capitalize">
                  {selectedNationData.treaty === 'alliance' && '联盟'}
                  {selectedNationData.treaty === 'trade' && '贸易协议'}
                  {selectedNationData.treaty === 'none' && '无'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {selectedNationData.treaty !== 'alliance' && (
                <button
                  onClick={handleProposeAlliance}
                  className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-2 rounded transition-all text-sm"
                >
                  提议联盟
                </button>
              )}
              {selectedNationData.treaty !== 'trade' && (
                <button
                  onClick={handleProposeTrade}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2 rounded transition-all text-sm"
                >
                  贸易协议
                </button>
              )}
              {selectedNationData.treaty === 'alliance' && (
                <button
                  onClick={handleBreakAlliance}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-2 rounded transition-all text-sm"
                >
                  打破联盟
                </button>
              )}
              <button
                onClick={handleSendGift}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-2 rounded transition-all text-sm"
              >
                赠送礼物 (100金)
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {diplomacyData.alliances.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-green-400 font-bold mb-2">我的联盟</h3>
            <div className="space-y-1 text-sm text-slate-300">
              {diplomacyData.alliances.map(name => (
                <div key={name}>✓ {name}</div>
              ))}
            </div>
          </div>
        )}

        {diplomacyData.trades.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-blue-400 font-bold mb-2">贸易伙伴</h3>
            <div className="space-y-1 text-sm text-slate-300">
              {diplomacyData.trades.map(name => (
                <div key={name}>↔️ {name}</div>
              ))}
            </div>
          </div>
        )}

        {diplomacyData.wars.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h3 className="text-red-400 font-bold mb-2">宣战</h3>
            <div className="space-y-1 text-sm text-slate-300">
              {diplomacyData.wars.map(name => (
                <div key={name}>⚔️ {name}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
