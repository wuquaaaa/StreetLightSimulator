import React, { useState, useEffect } from 'react';
import { GameState } from '../engine/GameState';
import { EconomySystem } from '../engine/EconomySystem';
import { PopulationSystem } from '../engine/PopulationSystem';
import { MilitarySystem } from '../engine/MilitarySystem';
import { DiplomacySystem } from '../engine/DiplomacySystem';
import TopBar from './TopBar';
import OverviewPanel from './OverviewPanel';
import EconomyPanel from './EconomyPanel';
import PopulationPanel from './PopulationPanel';
import TechPanel from './TechPanel';
import MilitaryPanel from './MilitaryPanel';
import DiplomacyPanel from './DiplomacyPanel';
import BuildPanel from './BuildPanel';
import EventPopup from './EventPopup';
import GameLog from './GameLog';
import { Menu } from 'lucide-react';

export default function GameApp() {
  const [game, setGame] = useState(null);
  const [systems, setSystems] = useState(null);
  const [activePanel, setActivePanel] = useState('overview');
  const [gameState, setGameState] = useState(null);

  // Initialize game
  useEffect(() => {
    const newGame = new GameState();
    setGame(newGame);

    const economySystem = new EconomySystem(newGame);
    const populationSystem = new PopulationSystem(newGame);
    const militarySystem = new MilitarySystem(newGame);
    const diplomacySystem = new DiplomacySystem(newGame);

    setSystems({
      economy: economySystem,
      population: populationSystem,
      military: militarySystem,
      diplomacy: diplomacySystem
    });

    setGameState({ ...newGame });
  }, []);

  const handleNextTurn = () => {
    if (!game || !systems) return;

    game.nextTurn();

    // Update all systems
    systems.population.updatePopulation();
    systems.economy.processTradeRoutes();
    systems.economy.fluctuateMarketPrices();

    setGameState({ ...game });
  };

  const handleResolveEvent = (choiceIndex) => {
    if (!game) return;
    game.resolveEvent(choiceIndex);
    setGameState({ ...game });
  };

  if (!game || !systems) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-2xl">加载游戏中...</div>
      </div>
    );
  }

  const panels = {
    overview: <OverviewPanel game={game} systems={systems} />,
    economy: <EconomyPanel game={game} systems={systems} />,
    population: <PopulationPanel game={game} systems={systems} />,
    tech: <TechPanel game={game} systems={systems} />,
    military: <MilitaryPanel game={game} systems={systems} />,
    diplomacy: <DiplomacyPanel game={game} systems={systems} />,
    build: <BuildPanel game={game} systems={systems} />
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100 flex flex-col overflow-hidden">
      <TopBar game={game} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-32 bg-slate-900 border-r border-amber-700/30 flex flex-col py-2 overflow-y-auto">
          {[
            { id: 'overview', label: '概览' },
            { id: 'economy', label: '经济' },
            { id: 'population', label: '人口' },
            { id: 'tech', label: '科技' },
            { id: 'build', label: '建筑' },
            { id: 'military', label: '军事' },
            { id: 'diplomacy', label: '外交' }
          ].map(panel => (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              className={`px-3 py-3 text-sm text-left border-l-2 transition-colors ${
                activePanel === panel.id
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-slate-950 p-4">
            {panels[activePanel]}
          </div>

          {/* Bottom Game Log */}
          <div className="h-32 bg-slate-900 border-t border-amber-700/30 overflow-y-auto p-3">
            <GameLog game={game} />
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="h-16 bg-slate-900 border-t border-amber-700/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            第 <span className="text-amber-400 font-bold">{game.turn}</span> 回合
          </div>
        </div>

        <button
          onClick={handleNextTurn}
          className="px-8 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg hover:shadow-amber-500/50"
        >
          下一回合 →
        </button>
      </div>

      {/* Event Popup */}
      {game.currentEvent && (
        <EventPopup event={game.currentEvent} onResolve={handleResolveEvent} />
      )}
    </div>
  );
}
