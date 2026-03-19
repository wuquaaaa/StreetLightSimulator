import { useState, useCallback } from 'react';
import { GameState } from '../engine/GameState';
import TopBar from './TopBar';
import FarmPanel from './FarmPanel';
import WarehousePanel from './WarehousePanel';
import CharacterPanel from './CharacterPanel';
import GameLog from './GameLog';
import NotificationPopup from './NotificationPopup';
import { Wheat, Package, User, Coffee } from 'lucide-react';

const TABS = [
  { id: 'farm', label: '农田', icon: Wheat },
  { id: 'warehouse', label: '仓库', icon: Package },
  { id: 'character', label: '角色', icon: User },
];

export default function GameApp() {
  const [game] = useState(() => new GameState('旅人'));
  const [, setVersion] = useState(0); // 用于强制刷新
  const [activeTab, setActiveTab] = useState('farm');
  const [showNotifications, setShowNotifications] = useState(false);

  const forceUpdate = useCallback(() => setVersion(v => v + 1), []);

  const handleAction = useCallback((action, params = {}) => {
    game.doAction(action, params);
    forceUpdate();
  }, [game, forceUpdate]);

  const handleNextTurn = useCallback(() => {
    game.nextTurn();
    if (game.notifications.length > 0) {
      setShowNotifications(true);
    }
    forceUpdate();
  }, [game, forceUpdate]);

  const handleDismissNotifications = useCallback(() => {
    game.clearNotifications();
    setShowNotifications(false);
    forceUpdate();
  }, [game, forceUpdate]);

  const handleRest = useCallback(() => {
    handleAction('rest');
  }, [handleAction]);

  return (
    <div className="w-full h-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <TopBar game={game} onNextTurn={handleNextTurn} />

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

          {/* 休息按钮 */}
          <button
            onClick={handleRest}
            className="flex flex-col items-center gap-1 py-3 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            title="休息恢复体力"
          >
            <Coffee size={18} />
            休息
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
