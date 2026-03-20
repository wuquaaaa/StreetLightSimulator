import { useState, useEffect } from 'react';
import { Save, Download, X, AlertTriangle } from 'lucide-react';
import { GameState } from '../engine/GameState';

export default function SaveLoadPanel({ game, defaultMode = 'save', onClose, onLoad }) {
  const [slots, setSlots] = useState([]);
  const [confirmSlot, setConfirmSlot] = useState(null); // 覆盖确认
  const [mode, setMode] = useState(defaultMode); // 'save' | 'load'
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSlots(GameState.getSaveSlots());
  }, []);

  const refresh = () => setSlots(GameState.getSaveSlots());

  const handleSave = (slot) => {
    const info = slots[slot];
    if (info && info.occupied) {
      setConfirmSlot(slot);
      return;
    }
    doSave(slot);
  };

  const doSave = (slot) => {
    const ok = game.save(slot);
    setConfirmSlot(null);
    if (ok) {
      game.addLog(`存档到栏位 ${slot + 1} 完成`);
      setMessage(`已保存到栏位 ${slot + 1}`);
    } else {
      setMessage('存档失败');
    }
    refresh();
    setTimeout(() => setMessage(''), 2000);
  };

  const handleLoad = (slot) => {
    const info = slots[slot];
    if (info && !info.occupied) {
      // 空栏位 → 新游戏
      const newGame = new GameState('旅人');
      onLoad(newGame);
      onClose();
      return;
    }
    const loaded = GameState.load(slot);
    if (loaded) {
      onLoad(loaded);
      onClose();
    } else {
      setMessage('加载失败');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-stone-600 rounded-lg shadow-2xl max-w-md w-full mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Save size={18} className="text-amber-400" />
            <h3 className="text-amber-400 font-bold">存档管理</h3>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X size={18} /></button>
        </div>

        {/* 模式切换 */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('save')}
            className={`flex-1 py-2 text-sm rounded transition-colors ${
              mode === 'save' ? 'bg-amber-700 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
            }`}>
            <Save size={14} className="inline mr-1" /> 保存
          </button>
          <button onClick={() => setMode('load')}
            className={`flex-1 py-2 text-sm rounded transition-colors ${
              mode === 'load' ? 'bg-blue-700 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
            }`}>
            <Download size={14} className="inline mr-1" /> 加载
          </button>
        </div>

        {/* 栏位列表 */}
        <div className="space-y-2">
          {slots.map((slot) => (
            <div key={slot.slot}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                slot.occupied
                  ? 'border-stone-600 bg-stone-900/50'
                  : 'border-stone-700/50 bg-stone-900/20'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-stone-500 text-sm font-mono w-6">#{slot.slot + 1}</span>
                {slot.occupied ? (
                  <div>
                    <div className="text-sm text-stone-200">
                      {slot.playerName} · 第{slot.day}天 · {slot.season}季
                    </div>
                    <div className="text-xs text-stone-500">{formatTime(slot.timestamp)}</div>
                  </div>
                ) : (
                  <span className="text-sm text-stone-600">空栏位</span>
                )}
              </div>
              <div>
                {mode === 'save' ? (
                  <button onClick={() => handleSave(slot.slot)}
                    className="px-3 py-1.5 text-xs bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded transition-colors">
                    保存
                  </button>
                ) : (
                  <button onClick={() => handleLoad(slot.slot)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      slot.occupied
                        ? 'bg-blue-800/60 hover:bg-blue-700/60 text-blue-200'
                        : 'bg-green-800/60 hover:bg-green-700/60 text-green-200'
                    }`}>
                    {slot.occupied ? '加载' : '新游戏'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {message && (
          <div className="mt-3 text-center text-sm text-green-400">{message}</div>
        )}

        {/* 覆盖确认 */}
        {confirmSlot !== null && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
            <div className="bg-stone-800 border border-amber-700 rounded-lg p-5 max-w-xs w-full mx-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-amber-400" />
                <span className="text-amber-400 font-bold text-sm">确认覆盖</span>
              </div>
              <p className="text-sm text-stone-300 mb-4">
                栏位 #{confirmSlot + 1} 已有存档，确定要覆盖吗？
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmSlot(null)}
                  className="flex-1 py-2 text-sm bg-stone-700 hover:bg-stone-600 text-stone-300 rounded">
                  取消
                </button>
                <button onClick={() => doSave(confirmSlot)}
                  className="flex-1 py-2 text-sm bg-amber-700 hover:bg-amber-600 text-white rounded">
                  确认覆盖
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
