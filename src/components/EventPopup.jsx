import { useState } from 'react';
import { Users, X } from 'lucide-react';

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
            接受后，你将获得一名农民伙伴，你的身份将变为农民队长。
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

/**
 * 身份选择弹窗：成为农民队长后，选择是否同时保留农民身份
 */
function RoleChoicePopup({ onChoice }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-800 border border-amber-700/50 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">👨‍🌾</span>
          <h3 className="text-amber-400 font-bold text-lg">身份变化</h3>
        </div>
        <div className="bg-stone-900/50 rounded-lg p-4 mb-4">
          <p className="text-stone-200 text-sm leading-relaxed mb-2">
            你现在有了第一个队员！你需要决定自己的身份：
          </p>
          <p className="text-stone-400 text-xs mb-3">
            作为农民队长，你可以查看团队的整体状况。如果同时保留农民身份，你依然可以亲自管理农田。
          </p>
        </div>
        <div className="space-y-2">
          <button onClick={() => onChoice(['farmer_leader', 'farmer'])}
            className="w-full py-3 text-sm bg-green-800/60 hover:bg-green-700/60 text-green-200 rounded-lg transition-colors text-left px-4">
            <div className="font-bold">👨‍🌾 农民队长 + 🌾 农民</div>
            <div className="text-xs text-green-400/70 mt-0.5">同时管理团队和亲自种地</div>
          </button>
          <button onClick={() => onChoice(['farmer_leader'])}
            className="w-full py-3 text-sm bg-amber-800/60 hover:bg-amber-700/60 text-amber-200 rounded-lg transition-colors text-left px-4">
            <div className="font-bold">👨‍🌾 仅农民队长</div>
            <div className="text-xs text-amber-400/70 mt-0.5">专心管理团队，不再亲自种地</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventPopup({ eventType, onAction }) {
  const [showRoleChoice, setShowRoleChoice] = useState(false);

  if (showRoleChoice) {
    return <RoleChoicePopup onChoice={(roles) => {
      onAction('set_player_roles', { roles });
      onAction('dismiss_event');
    }} />;
  }

  if (eventType === 'day10_recruit') {
    return <RecruitEvent
      onAccept={() => {
        onAction('recruit_accept');
        setShowRoleChoice(true);
      }}
      onReject={() => {
        onAction('recruit_reject');
        onAction('dismiss_event');
      }}
    />;
  }

  return null;
}
