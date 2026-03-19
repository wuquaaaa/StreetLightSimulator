import React from 'react';
import { Coins, Leaf, Factory, Lightbulb, Palette, Users } from 'lucide-react';

export default function TopBar({ game }) {
  const resources = [
    { icon: Coins, label: '金币', value: Math.floor(game.gold), color: 'text-yellow-400' },
    { icon: Leaf, label: '食物', value: Math.floor(game.food), color: 'text-green-400' },
    { icon: Factory, label: '生产', value: Math.floor(game.production), color: 'text-red-400' },
    { icon: Lightbulb, label: '科学', value: Math.floor(game.science), color: 'text-blue-400' },
    { icon: Palette, label: '文化', value: Math.floor(game.culture), color: 'text-purple-400' },
    { icon: Users, label: '人口', value: game.population.total, color: 'text-cyan-400' }
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-amber-700/30 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-amber-400">文明策略</h1>
          <div className="text-slate-400">
            <span className="text-amber-400 font-bold">{game.year}</span> 年 ·
            第 <span className="text-amber-400 font-bold">{game.turn}</span> 回合
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-amber-500" style={{ width: `${game.happiness}%` }}></div>
            </div>
            <span className="text-slate-300">满意度 {Math.floor(game.happiness)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {resources.map((resource, i) => {
          const Icon = resource.icon;
          return (
            <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded px-3 py-2 border border-slate-700">
              <Icon size={18} className={resource.color} />
              <div className="flex-1">
                <div className="text-xs text-slate-400">{resource.label}</div>
                <div className="text-sm font-bold text-slate-100">{resource.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
