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

const TABS = [
  { id: 'farm', label: '农田', icon: Wheat },
  { id: 'warehouse', label: '仓库', icon: Package },
  { id: 'character', label: '角色', icon: User },
];

const TICK_INTERVAL = 2000;
const AUTOSAVE_INTERVAL = 5 * 60 * 1000; // 5分钟

export default function GameApp() {
  const [game, setGame] = useState(() => {
    const loaded = GameState.loadAny();
    return loaded || new GameState('旅人');
  });
  const [, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState('farm');
  const [showNotifications, setShowNotifications] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
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

      // 检查事件通知
      const eventNotifs = g.notifications.filter(n => n.startsWith('event:'));
      const normalNotifs = g.notifications.filter(n => !n.startsWith('event:'));

      if (eventNotifs.length > 0) {
        const eventType = eventNotifs[0].replace('event:', '');
        setActiveEvent(eventType);
        // 移除事件通知
        g.notifications = normalNotifs;
      }

      if (normalNotifs.length > 0) {
        setShowNotifications(true);
      }

      setVersion(v => v + 1);
    }, TICK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game, paused]);

  // 自动存档（5分钟）到栏位0
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
    const g = gameRef.current;
    g.notifications = g.notifications.filter(n => !n.startsWith('event:'));
    g.clearNotifications();
    setShowNotifications(false);
    forceUpdate();
  }, [forceUpdate]);

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

  // 判断是否显示农民队长视图
  const showLeaderView = game.player.hasRole('farmer_leader') && !game.player.hasRole('farmer');

  return (
    <div className="w-full h-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden">
      <TopBar game={game} />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-28 bg-stone-900 border-r border-stone-700/50 flex flex-col py-2 shrink-0">
          {TABS.map(tab => {
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

          {/* 存档管理按钮 */}
          <button
            onClick={() => setShowSaveLoad(true)}
            className="flex flex-col items-center gap-1 py-3 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            title="存档管理"
          >
            <Save size={18} />
            存档
          </button>

          {/* 暂停/继续按钮 */}
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
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'farm' && (
              showLeaderView
                ? <FarmLeaderPanel game={game} />
                : <FarmPanel game={game} onAction={handleAction} />
            )}
            {activeTab === 'warehouse' && <WarehousePanel game={game} onAction={handleAction} />}
            {activeTab === 'character' && <CharacterPanel game={game} />}
          </div>

          {/* 底部日志 */}
          <div className="h-28 bg-stone-900 border-t border-stone-700/50 p-3 shrink-0">
            <GameLog log={game.log} />
          </div>
        </div>
      </div>

      {/* 通知弹窗 */}
      {showNotifications && (
        <NotificationPopup
          notifications={game.notifications.filter(n => !n.startsWith('event:'))}
          onDismiss={handleDismissNotifications}
        />
      )}

      {/* 存档管理面板 */}
      {showSaveLoad && (
        <SaveLoadPanel
          game={game}
          onClose={() => setShowSaveLoad(false)}
          onLoad={handleLoadGame}
        />
      )}

      {/* 事件弹窗 */}
      {activeEvent && (
        <EventPopup
          eventType={activeEvent}
          onAction={handleEventAction}
        />
      )}
    </div>
  );
}
