import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Toast式通知：出现后自动渐隐消失，不阻塞游戏
 */
function Toast({ message, onDone }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // 淡入
    requestAnimationFrame(() => setOpacity(1));
    // 停留2秒后开始淡出
    const fadeTimer = setTimeout(() => setOpacity(0), 2500);
    // 淡出动画结束后移除
    const removeTimer = setTimeout(() => onDone(), 3500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onDone]);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 border border-amber-700/50 rounded-lg shadow-xl text-sm text-stone-200 pointer-events-auto"
      style={{
        opacity,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function NotificationPopup({ notifications, onDismiss }) {
  const [toasts, setToasts] = useState([]);

  // 新通知进来时添加到toasts队列
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    const newToasts = notifications.map((msg, i) => ({
      id: Date.now() + i,
      message: msg,
    }));
    setToasts(prev => [...prev, ...newToasts]);
    // 通知已被消费，立即清除源数据
    onDismiss();
  }, [notifications, onDismiss]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-h-80 overflow-hidden">
      {toasts.slice(-5).map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          onDone={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
