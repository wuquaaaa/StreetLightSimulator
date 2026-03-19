import React, { useState } from 'react';
import { Shield, Sword } from 'lucide-react';

export default function MilitaryPanel({ game, systems }) {
  const militaryData = systems.military.getMilitaryData();
  const [recruitCount, setRecruitCount] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState('militia');

  const handleRecruit = () => {
    systems.military.recruitUnit(selectedUnit, recruitCount);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-lg border border-red-700/50 p-4">
        <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
          <Shield size={20} /> 军事力量
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">总军事力量</div>
            <div className="text-3xl font-bold text-red-400">{militaryData.totalPower}</div>
          </div>
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">防御等级</div>
            <div className="text-3xl font-bold text-amber-400">{militaryData.defense}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-amber-400 font-bold mb-4">招募部队</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-400">单位类型</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
            >
              <option value="militia">民兵 (20金) 战力1</option>
              <option value="infantry">步兵 (50金) 战力3</option>
              <option value="cavalry">骑兵 (80金) 战力4</option>
              <option value="artillery">炮兵 (120金) 战力6</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400">数量</label>
            <input
              type="number"
              min="1"
              value={recruitCount}
              onChange={(e) => setRecruitCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
            />
          </div>
          <button
            onClick={handleRecruit}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-2 rounded transition-all"
          >
            招募部队
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-amber-400 font-bold mb-4">军队组成</h3>
        <div className="space-y-2">
          {militaryData.unitDetails.map((unit, i) => (
            <div key={i} className="bg-slate-700/30 rounded p-3 border border-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-100">{unit.name}</span>
                <span className="text-amber-400">{unit.count}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>战力: {unit.power}</span>
                <span>维护: {unit.upkeep}金/回合</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-slate-700/50 rounded border border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">总维护费</span>
            <span className="text-amber-400 font-bold">{militaryData.totalUpkeep}</span>
          </div>
        </div>
      </div>

      {militaryData.wars.length > 0 && (
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-lg border border-red-700/50 p-4">
          <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
            <Sword size={16} /> 当前战争
          </h3>
          <div className="space-y-1 text-sm">
            {militaryData.wars.map(nation => (
              <div key={nation} className="text-slate-300">
                ⚔️ 对战: {nation}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
