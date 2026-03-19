import React from 'react';
import { Users, TrendingUp } from 'lucide-react';

export default function PopulationPanel({ game, systems }) {
  const popData = systems.population.getPopulationData();
  const classBonuses = systems.population.getClassBonuses();

  const classes = [
    { id: 'nobles', name: '贵族', color: 'text-purple-400', bgColor: 'bg-purple-900/20' },
    { id: 'merchants', name: '商人', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' },
    { id: 'peasants', name: '农民', color: 'text-green-400', bgColor: 'bg-green-900/20' },
    { id: 'workers', name: '工人', color: 'text-blue-400', bgColor: 'bg-blue-900/20' },
    { id: 'soldiers', name: '士兵', color: 'text-red-400', bgColor: 'bg-red-900/20' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
          <Users size={20} /> 人口统计
        </h2>

        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">总人口</span>
            <span className="text-amber-400 font-bold text-xl">{popData.total}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" style={{ width: '40%' }}></div>
          </div>
        </div>

        <div className="space-y-2">
          {classes.map(cls => (
            <div key={cls.id} className={`${cls.bgColor} rounded p-3 border border-slate-700`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-bold ${cls.color}`}>{cls.name}</span>
                <span className="text-amber-400">{popData.byClass[cls.id]}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>{popData.percentages[cls.id]}%</span>
                <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-slate-500 to-amber-400`}
                    style={{ width: `${(popData.byClass[cls.id] / popData.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-amber-400 font-bold mb-3">状态</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">满意度</span>
              <span className="text-amber-400 font-bold">{Math.floor(popData.happiness)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">稳定性</span>
              <span className="text-amber-400 font-bold">{Math.floor(popData.stability)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">不满度</span>
              <span className="text-red-400 font-bold">{Math.floor(popData.unrest)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-amber-400 font-bold mb-3">阶级加成</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">贸易加成</span>
              <span className="text-yellow-400">×{classBonuses.merchants.trade.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">农业加成</span>
              <span className="text-green-400">+{Math.floor(classBonuses.peasants.food)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">生产加成</span>
              <span className="text-blue-400">+{Math.floor(classBonuses.workers.production)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">军事加成</span>
              <span className="text-red-400">+{Math.floor(classBonuses.soldiers.military)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
