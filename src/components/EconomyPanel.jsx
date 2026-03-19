import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function EconomyPanel({ game, systems }) {
  const [taxRate, setTaxRate] = useState(game.taxRate);
  const economicData = systems.economy.getEconomicData();

  const handleTaxChange = (e) => {
    const newRate = parseFloat(e.target.value);
    setTaxRate(newRate);
    systems.economy.updateTaxRate(newRate);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-amber-400 mb-4">税收管理</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">税率</span>
              <span className="text-amber-400 font-bold">{Math.floor(taxRate * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.7"
              step="0.05"
              value={taxRate}
              onChange={handleTaxChange}
              className="w-full"
            />
            <div className="text-xs text-slate-400 mt-1">
              更高的税率增加金币收入但降低民众满意度
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
            <TrendingUp size={16} /> 收入
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">税收</span>
              <span className="text-green-400">{Math.floor(economicData.incomeBreakdown.taxes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">建筑</span>
              <span className="text-green-400">{Math.floor(economicData.incomeBreakdown.buildings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">贸易</span>
              <span className="text-green-400">{Math.floor(economicData.incomeBreakdown.trade)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
            <TrendingDown size={16} /> 开支
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">军事</span>
              <span className="text-red-400">-{Math.floor(economicData.expenses.military)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">建筑</span>
              <span className="text-red-400">-{Math.floor(economicData.expenses.buildings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">人口</span>
              <span className="text-red-400">-{Math.floor(economicData.expenses.population)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-amber-400 mb-4">GDP和市场</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
            <span className="text-slate-300">国内生产总值</span>
            <span className="text-amber-400 font-bold">{Math.floor(economicData.gdp)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
            <span className="text-slate-300">贸易路线</span>
            <span className="text-blue-400 font-bold">{economicData.tradeRoutes}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">市场价格波动</div>
          <div className="grid grid-cols-5 gap-2 text-xs mt-2">
            {Object.entries(economicData.marketPrices).map(([resource, price]) => (
              <div key={resource} className="bg-slate-700/50 p-2 rounded text-center">
                <div className="text-slate-400 text-xs capitalize">{resource}</div>
                <div className="text-amber-400 font-bold">{Math.floor(price)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
