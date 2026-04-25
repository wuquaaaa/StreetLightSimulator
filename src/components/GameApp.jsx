import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState } from '../engine/GameState';
import { sfxForAction, sfxTab, sfxSave, sfxNotify, toggleBGM, isBGMPlaying, sfxClick } from '../engine/AudioSystem';
import TopBar from './TopBar';
import FarmPanel from './FarmPanel';
import FarmLeaderPanel from './FarmLeaderPanel';
import WarehousePanel from './WarehousePanel';
import CharacterPanel from './CharacterPanel';
import GameLog from './GameLog';
import NotificationPopup from './NotificationPopup';
import SaveLoadPanel from './SaveLoadPanel';
import EventPopup from './EventPopup';
import { Wheat, Package, User, Pause, Play, Save, Download, Music } from 'lucide-react';

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
  const [activeRoleTab, setActiveRoleTab] = useState(null);
  const [pendingNotifs, setPendingNotifs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [saveLoadDefaultMode, setSaveLoadDefaultMode] = useState('save');
  const [activeEvent, setActiveEvent] = useState(null);
  const [bgmOn, setBgmOn] = useState(false);
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const forceUpdate = useCallback(() => setVersion(v => v + 1), []);

  // 全局按钮点击音效：所有 button 点击都播放 sfxClick
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('button');
      if (btn) sfxClick();
    };
    document.addEventListener('click', handler, true); // capture phase
    return () => document.removeEventListener('click', handler, true);
  }, []);

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
        sfxNotify();
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
    sfxForAction(action);
    g.doAction(action, params);
    forceUpdate();
  }, [forceUpdate]);

  const handleDismissNotifications = useCallback(() => {
    setPendingNotifs([]);
  }, []);

  const togglePause = useCallback(() => {
    sfxClick();
    setPaused(p => !p);
  }, []);

  const handleEventAction = useCallback((action, params = {}) => {
    if (action === 'dismiss_event') {
      sfxClick();
      setActiveEvent(null);
      return;
    }
    const g = gameRef.current;
    sfxForAction(action);
    const result = g.doAction(action, params);
    forceUpdate();
    // 招募+升职操作完成后自动关闭弹窗
    if (action === 'recruit_accept_with_promote' && result && result.success) {
      setActiveEvent(null);
    }
  }, [forceUpdate]);

  const handleLoadGame = useCallback((loadedGame) => {
    sfxSave();
    setGame(loadedGame);
    gameRef.current = loadedGame;
    forceUpdate();
  }, [forceUpdate]);

  const handleToggleBGM = useCallback(() => {
    toggleBGM();
    setBgmOn(isBGMPlaying());
  }, []);

  // 计算农田tab的角色子页签：按玩家实际身份决定
  const farmRoles = game.player.roles.filter(r => r === 'farmer' || r === 'farmer_leader');
  const showFarmSubTabs = farmRoles.length > 1;
  const currentRoleTab = (activeRoleTab && farmRoles.includes(activeRoleTab)) ? activeRoleTab : farmRoles[0] || 'farmer';

  const renderFarmContent = () => {
    // 农民 → 详细视图(带进度条)；农民队长 → 管理页面(紧凑方格)
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
                onClick={() => { sfxTab(); setActiveTab(tab.id); }}
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

          {/* BGM 开关 */}
          <button
            onClick={handleToggleBGM}
            className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              bgmOn ? 'text-amber-400 hover:bg-stone-800' : 'text-stone-500 hover:bg-stone-800 hover:text-stone-300'
            }`}
            title={bgmOn ? '关闭音乐' : '播放音乐'}
          >
            <Music size={18} />
            {bgmOn ? '音乐开' : '音乐'}
          </button>

          <button
            onClick={() => { sfxClick(); setSaveLoadDefaultMode('save'); setShowSaveLoad(true); }}
            className="flex flex-col items-center gap-1 py-3 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            title="保存存档"
          >
            <Save size={18} />
            存档
          </button>

          <button
            onClick={() => { sfxClick(); setSaveLoadDefaultMode('load'); setShowSaveLoad(true); }}
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
          {/* 多角色子tab */}
          {activeTab === 'farm' && showFarmSubTabs && (
            <div className="bg-stone-900/50 border-b border-stone-700/30 px-5 pt-2 flex gap-1 shrink-0">
              {farmRoles.map(r => {
                const info = ROLE_TAB_MAP[r] || { label: r, icon: '👤' };
                const active = currentRoleTab === r;
                return (
                  <button
                    key={r}
                    onClick={() => { sfxTab(); setActiveRoleTab(r); }}
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
