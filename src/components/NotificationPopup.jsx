import { AlertTriangle, X } from 'lucide-react';

export default function NotificationPopup({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-amber-700/50 rounded-lg shadow-2xl max-w-md w-full mx-4 p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-amber-400" />
          <h3 className="text-amber-400 font-bold">通知</h3>
        </div>
        <div className="space-y-2 mb-4">
          {notifications.map((msg, i) => (
            <div key={i} className="text-sm text-stone-300 bg-stone-900/50 rounded p-2">
              {msg}
            </div>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold rounded transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
