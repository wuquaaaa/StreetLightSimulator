import React from 'react';
import { Lightbulb, Lock } from 'lucide-react';
import { technologies } from '../data/technologies';

export default function TechPanel({ game, systems }) {
  const currentTech = game.currentResearch ? technologies.find(t => t.id === game.currentResearch) : null;
  const availableTechs = game.getAvailableTechs();

  const handleStartResearch = (techId) => {
    game.startResearch(techId);
  };

  const eras = ['ancient', 'classical', 'medieval', 'renaissance'];
  const eraNames = {
    ancient: '古代',
    classical: '古典',
    medieval: '中世纪',
    renaissance: '文艺复兴'
  };

  return (
    <div className="space-y-6">
      {currentTech && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-700/50 p-4">
          <h2 className="text-lg font-bold text-cyan-400 mb-4">当前研究</h2>
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">{currentTech.name}</span>
            <span className="text-amber-400">{Math.floor(game.researchProgress)}/{currentTech.cost}</span>
          </div>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
              style={{ width: `${(game.researchProgress / currentTech.cost) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{currentTech.description}</p>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-amber-400 font-bold mb-2">已研发科技</h3>
        <div className="grid grid-cols-4 gap-2">
          {game.researchedTechs.map(techId => {
            const tech = technologies.find(t => t.id === techId);
            return (
              <div key={techId} className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded p-2 border border-green-700/50 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="text-green-400">✓</span>
                  {tech?.name || techId}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {eras.map(era => (
          <div key={era}>
            <h3 className="text-sm font-bold text-amber-400 mb-2">{eraNames[era]}</h3>
            <div className="grid grid-cols-2 gap-2">
              {technologies
                .filter(t => t.era === era && !game.researchedTechs.includes(t.id))
                .map(tech => {
                  const canResearch = tech.requires.length === 0 || tech.requires.every(req => game.researchedTechs.includes(req));
                  return (
                    <div
                      key={tech.id}
                      className={`rounded p-2 border text-xs ${
                        canResearch
                          ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 hover:border-amber-600 cursor-pointer'
                          : 'bg-slate-900/50 border-slate-800 opacity-60'
                      }`}
                      onClick={() => canResearch && handleStartResearch(tech.id)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-bold text-slate-100 flex-1">{tech.name}</span>
                        {!canResearch && <Lock size={12} className="text-slate-500 flex-shrink-0" />}
                      </div>
                      <div className="text-slate-400">{tech.cost}科学点</div>
                      <div className="text-slate-500 text-xs mt-1">{tech.description}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
