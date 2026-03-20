import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState } from '../engine/GameState';
import TopBar from './TopBar';
import FarmPanel from './FarmPanel';
import FarmLeaderPanel from './FarmLeaderPanel';
import WarehousePanel from './WarehousePanel';
import CharacterPanel from './CharacterPanel';
import GameLog from './GameLog';
import NotificationPopup from './NotificationPopup';
import SaveLoadPanel from './SaveLoadPanel';
import EventPopup from './EventPopup';
import { Wheat, Package, User, Pause, Play, Save, Download } from 'lucide-react';

const ROLE_TAB_MAP = {
  farmer: { label: '农田', icon: '🌾' },
  farmer_leader: { label: '管理', icon: '👨‍🌾' },
};

const TICK_INTERVAL = 2000;
const AUTOSAVE_INTERVAL = 5 * 60 * 1000;

export default function GameApp() {
  const [game, setGame] = useState(() => {
    const loaded = GameState.loadAny();
    return loaded || new GameState('旅人');
  });
  const [, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState('farm');
  const [activeRoleTab, setActiveRoleTab] = useState(null); // 当多身份时，当前激活的角色子tab
  const [pendingNotifs, setPendingNotifs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [saveLoadDefaultMode, setSaveLoadDefaultMode] = useState('save');
  const [activeEvent, setActiveEvent] = useState(null);
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const forceUpdate = useCallback(() => setVersion(v => v + 1), []);

  // 定时器驱动时间流逝
  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      const g = gameRef.current;
      g.tick();

      const eventNotifs = g.notifications.filter(n => n.startsWith('event:'));
      const normalNotifs = g.notifications.filter(n => !n.startsWith('event:'));

      if (eventNotifs.length > 0) {
        const eventType = eventNotifs[0].replace('event:', '');
        setActiveEvent(eventType);
        g.notifications = normalNotifs;
      }

      if (normalNotifs.length > 0) {
        setPendingNotifs(normalNotifs);
        g.notifications = g.notifications.filter(n => n.startsWith('event:'));
      }

      setVersion(v => v + 1);
    }, TICK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game, paused]);

  // 自动存档
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      const g = gameRef.current;
      g.save(0);
      g.addLog('自动存档完成（栏位1）');
      setVersion(v => v + 1);
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);

  const handleAction = useCallback((action, params = {}) => {
    const g = gameRef.current;
    g.doAction(action, params);
    forceUpdate();
  }, [forceUpdate]);

  const handleDismissNotifications = useCallback(() => {
    setPendingNotifs([]);
  }, []);

  const togglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

  const handleEventAction = useCallback((action, params = {}) => {
    if (action === 'dismiss_event') {
      setActiveEvent(null);
      return;
    }
    const g = gameRef.current;
    g.doAction(action, params);
    forceUpdate();
  }, [forceUpdate]);

  const handleLoadGame = useCallback((loadedGame) => {
    setGame(loadedGame);
    gameRef.current = loadedGame;
    forceUpdate();
  }, [forceUpdate]);

  // 计算农田tab的角色子页签
  const farmRoles = game.player.roles.filter(r => r === 'farmer' || r === 'farmer_leader');
  const hasMultiFarmRoles = farmRoles.length > 1;
  // 确定当前有效的角色子tab
  const currentRoleTab = hasMultiFarmRoles
    ? (activeRoleTab && farmRoles.includes(activeRoleTab) ? activeRoleTab : farmRoles[0])
    : farmRoles[0] || 'farmer';

  const renderFarmContent = () => {
    if (currentRoleTab === 'farmer_leader') {
      return <FarmLeaderPanel game={game} onAction={handleAction} />;
    }
    return <FarmPanel game={game} onAction={handleAction} />;
  };

  return (
    <div className="w-full h-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden">
      <TopBar game={game} onAction={handleAction} />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-28 bg-stone-900 border-r border-stone-700/50 flex flex-col py-2 shrink-0">
          {[
            { id: 'farm', label: '农田', icon: Wheat },
            { id: 'warehouse', label: '仓库', icon: Package },
            { id: 'character', label: '角色', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-900/20 text-amber-400 border-r-2 border-amber-500'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            onClick={() => { setSaveLoadDefaultMode('save'); setShowSaveLoad(true); }}
            className="flex flex-col items-center gap-1 py-3 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            title="保存存档"
          >
            <Save size={18} />
            存档
          </button>

          <button
            onClick={() => { setSaveLoadDefaultMode('load'); setShowSaveLoad(true); }}
            className="flex flex-col items-center gap-1 py-3 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            title="读取存档"
          >
            <Download size={18} />
            读档
          </button>

          <button
            onClick={togglePause}
            className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              paused
                ? 'text-amber-400 hover:bg-stone-800'
                : 'text-stone-500 hover:bg-stone-800 hover:text-stone-300'
            }`}
            title={paused ? '继续' : '暂停'}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
            {paused ? '继续' : '暂停'}
          </button>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 多角色子tab（仅农田页签且有多个农田相关角色时显示） */}
          {activeTab === 'farm' && hasMultiFarmRoles && (
            <div className="bg-stone-900/50 border-b border-stone-700/30 px-5 pt-2 flex gap-1 shrink-0">
              {farmRoles.map(r => {
                const info = ROLE_TAB_MAP[r] || { label: r, icon: '👤' };
                const active = currentRoleTab === r;
                return (
                  <button
                    key={r}
                    onClick={() => setActiveRoleTab(r)}
                    className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
                      active
                        ? 'bg-stone-800 text-amber-400 border-t border-x border-amber-700/30'
                        : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
                    }`}
                  >
                    {info.icon} {info.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'farm' && renderFarmContent()}
            {activeTab === 'warehouse' && <WarehousePanel game={game} onAction={handleAction} />}
            {activeTab === 'character' && <CharacterPanel game={game} />}
          </div>

          {/* 底部日志 */}
          <div className="h-28 bg-stone-900 border-t border-stone-700/50 p-3 shrink-0">
            <GameLog log={game.log} />
          </div>
        </div>
      </div>

      <NotificationPopup
        notifications={pendingNotifs}
        onDismiss={handleDismissNotifications}
      />

      {showSaveLoad && (
        <SaveLoadPanel
          game={game}
          defaultMode={saveLoadDefaultMode}
          onClose={() => setShowSaveLoad(false)}
          onLoad={handleLoadGame}
        />
      )}

      {activeEvent && (
        <EventPopup
          eventType={activeEvent}
          onAction={handleEventAction}
        />
      )}
    </div>
  );
}
