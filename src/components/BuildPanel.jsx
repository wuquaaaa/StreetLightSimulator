import React, { useState } from 'react';
import { Hammer, Lock } from 'lucide-react';
import { buildings } from '../data/buildings';

export default function BuildPanel({ game, systems }) {
  const categories = ['经济', '科技', '文化', '军事', '民生'];

  const handleBuild = (buildingId) => {
    game.buildBuilding(buildingId);
  };

  const availableBuildings = game.getAvailableBuildings();

  const getBuildingsByCategory = (category) => {
    return buildings.filter(b => b.category === category);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
          <Hammer size={20} /> 建造队列
        </h2>

        {game.buildingQueue.length > 0 ? (
          <div className="space-y-3">
            {game.buildingQueue.map((building, i) => {
              const buildingDef = buildings.find(b => b.id === building.id);
              return (
                <div key={i} className="bg-slate-700/30 rounded p-3 border border-slate-700">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-slate-100">{buildingDef?.name || building.id}</span>
                    <span className="text-amber-400 text-sm">
                      {Math.floor(building.progress)}/{building.cost}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-600 to-amber-400"
                      style={{ width: `${(building.progress / building.cost) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">没有建造任务</p>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-amber-400 font-bold mb-2">已建造的建筑</h3>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(game.buildings).map(([buildingId, count]) => {
            if (count === 0) return null;
            const buildingDef = buildings.find(b => b.id === buildingId);
            return (
              <div key={buildingId} className="bg-slate-700/30 rounded p-2 border border-emerald-700/50 text-xs text-slate-300 text-center">
                <div className="font-bold">{buildingDef?.name}</div>
                <div className="text-amber-400">×{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {categories.map(category => {
          const categoryBuildings = getBuildingsByCategory(category);
          return (
            <div key={category}>
              <h3 className="text-amber-400 font-bold mb-2">{category}</h3>
              <div className="grid grid-cols-2 gap-2">
                {categoryBuildings.map(building => {
                  const canBuild = !building.requires || building.requires.length === 0 || building.requires.every(req => game.researchedTechs.includes(req));
                  const isAvailable = availableBuildings.find(b => b.id === building.id);

                  return (
                    <div
                      key={building.id}
                      onClick={() => isAvailable && handleBuild(building.id)}
                      className={`rounded p-3 border text-xs cursor-pointer transition-all ${
                        isAvailable
                          ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 hover:border-amber-600'
                          : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-100 flex-1">{building.name}</span>
                        {!isAvailable && <Lock size={12} className="text-slate-500 flex-shrink-0" />}
                      </div>
                      <div className="text-slate-400 mb-1">
                        {building.cost}生产 | 维护 {building.upkeep}
                      </div>
                      <div className="text-slate-500 text-xs mb-1">{building.description}</div>
                      {building.requires && building.requires.length > 0 && (
                        <div className="text-slate-600 text-xs">需要: {building.requires.join(', ')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
