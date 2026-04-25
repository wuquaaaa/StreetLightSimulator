import React from 'react';
import { TrendingUp, Users, Zap, Shield } from 'lucide-react';

export default function OverviewPanel({ game, systems }) {
  const stats = [
    {
      label: '国家强力',
      value: Math.floor(game.militaryPower),
      icon: Shield,
      color: 'text-red-400'
    },
    {
      label: '总人口',
      value: game.population.total,
      icon: Users,
      color: 'text-cyan-400'
    },
    {
      label: '科学进度',
      value: game.currentResearch ? `${Math.floor(game.researchProgress)}/${game.currentResearch}` : '无',
      icon: Zap,
      color: 'text-blue-400'
    },
    {
      label: '外交地位',
      value: Object.values(game.relations).reduce((a, b) => a + b, 0),
      icon: TrendingUp,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">{stat.label}</span>
                <Icon size={20} className={stat.color} />
              </div>
              <div className="text-3xl font-bold text-amber-400">{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-amber-400 mb-4">国家信息</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">税率:</span>
            <span className="text-slate-100">{Math.floor(game.taxRate * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">稳定性:</span>
            <span className="text-slate-100">{Math.floor(game.stability)}/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">民众不满:</span>
            <span className="text-slate-100">{Math.floor(game.unrest)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">已研发科技:</span>
            <span className="text-slate-100">{game.researchedTechs.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">已建造建筑:</span>
            <span className="text-slate-100">{Object.values(game.buildings).reduce((a, b) => a + b, 0)}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-amber-400 mb-4">近期事件</h2>
        <div className="space-y-2">
          {game.log.slice(-5).reverse().map((log, i) => (
            <div key={i} className="text-sm text-slate-300 border-l-2 border-amber-700/50 pl-2">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-700/30 p-4">
        <h3 className="text-amber-400 font-bold mb-2">游戏提示</h3>
        <p className="text-xs text-slate-300">
          注意民众满意度，高税率会降低满意度。建设建筑需要满足前置科技要求。与其他国家建立联盟以增强势力！
        </p>
      </div>
    </div>
  );
}
