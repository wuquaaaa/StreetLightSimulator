import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState } from '../engine/GameState';
import TopBar from './TopBar';
import FarmPanel from './FarmPanel';
import WarehousePanel from './WarehousePanel';
import CharacterPanel from './CharacterPanel';
import GameLog from './GameLog';
import NotificationPopup from './NotificationPopup';
import { Wheat, Package, User, Pause, Play } from 'lucide-react';

const TABS = [
  { id: 'farm', label: '农田', icon: Wheat },
  { id: 'warehouse', label: '仓库', icon: Package },
  { id: 'character', label: '角色', icon: User },
];

const TICK_INTERVAL = 2000; // 2秒一个tick

export default function GameApp() {
  const [game] = useState(() => new GameState('旅人'));
  const [, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState('farm');
  const [showNotifications, setShowNotifications] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const forceUpdate = useCallback(() => setVersion(v => v + 1), []);

  // 定时器驱动时间流逝
  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      game.tick();

      // 如果有通知，暂停并弹出
      if (game.notifications.length > 0) {
        setShowNotifications(true);
        setPaused(true);
      }

      setVersion(v => v + 1);
    }, TICK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game, paused]);

  const handleAction = useCallback((action, params = {}) => {
    game.doAction(action, params);
    forceUpdate();
  }, [game, forceUpdate]);

  const handleDismissNotifications = useCallback(() => {
    game.clearNotifications();
    setShowNotifications(false);
    setPaused(false);
    forceUpdate();
  }, [game, forceUpdate]);

  const togglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

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
            {activeTab === 'farm' && <FarmPanel game={game} onAction={handleAction} />}
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
          notifications={game.notifications}
          onDismiss={handleDismissNotifications}
        />
      )}
    </div>
  );
}
