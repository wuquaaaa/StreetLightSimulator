import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

function Toast({ message, onDone }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // 淡入
    requestAnimationFrame(() => setOpacity(1));
    // 停留0.5秒后淡出
    const fadeTimer = setTimeout(() => setOpacity(0), 500);
    // 淡出完成后移除（0.5秒淡出）
    const removeTimer = setTimeout(() => onDone(), 1000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 border border-amber-700/50 rounded-lg shadow-xl text-sm text-stone-200 pointer-events-auto cursor-pointer hover:bg-stone-700/80 transition-colors"
      style={{
        opacity,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function NotificationPopup({ notifications, onDismiss }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    const newToasts = notifications.map((msg, i) => ({
      id: Date.now() + i,
      message: msg,
    }));
    setToasts(prev => [...prev, ...newToasts]);
    onDismiss();
  }, [notifications, onDismiss]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-h-60 overflow-hidden">
      {toasts.slice(-3).map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          onDone={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
