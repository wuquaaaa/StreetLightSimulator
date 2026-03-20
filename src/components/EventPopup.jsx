import { Users } from 'lucide-react';

/**
 * 第10天招工事件弹窗
 */
function RecruitEvent({ onAccept, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-amber-700/50 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-amber-400" />
          <h3 className="text-amber-400 font-bold text-lg">特殊事件</h3>
        </div>
        <div className="bg-stone-900/50 rounded-lg p-4 mb-4">
          <p className="text-stone-200 text-sm leading-relaxed mb-2">
            一个衣衫褴褛的旅人来到了你的农田边。
          </p>
          <p className="text-stone-300 text-sm leading-relaxed mb-2">
            "你好，我叫...呃...我在找工作。我会种地，可以帮你干活。你愿意收留我吗？"
          </p>
          <p className="text-stone-500 text-xs italic">
            接受后，你将获得一名农民伙伴，你的身份将自动变为农民队长。
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onReject}
            className="flex-1 py-2.5 text-sm bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors">
            拒绝
          </button>
          <button onClick={onAccept}
            className="flex-1 py-2.5 text-sm bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors">
            接受
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventPopup({ eventType, onAction }) {
  if (eventType === 'recruit' || eventType === 'day10_recruit') {
    return <RecruitEvent
      onAccept={() => {
        onAction('recruit_accept');
        // 自动成为农民队长+农民
        onAction('set_player_roles', { roles: ['farmer_leader', 'farmer'] });
        onAction('dismiss_event');
      }}
      onReject={() => {
        onAction('recruit_reject');
        onAction('dismiss_event');
      }}
    />;
  }

  return null;
}
