/**
 * 新手教程引导组件
 * 可操作指引：教程步骤与游戏状态联动
 */
import { ChevronRight, X } from 'lucide-react';

// 教程步骤定义
// step 0: 欢迎
// step 1: 指向"附近村庄" tab
// step 2: 到达村庄后，引导选人（waiting_choice 阶段）
// step 3: 已选好人，引导点确认带走
// step 4: 回程中，提示等待
// step 5: 回到家，完成
const TUTORIAL_STEPS = [
  {
    id: 0,
    title: '👋 欢迎来到路灯计划！',
    content: '你刚刚踏上这片陌生的土地。这里有几块农田和一间仓库，仓库里还有些粮食和种子。\n\n不过光靠你一个人干活太慢了，你需要去附近的村庄招募一些村民来帮忙！',
    position: 'center',
    nextLabel: '好的，去哪招募？',
  },
  {
    id: 1,
    title: '🏘 前往"附近村庄"',
    content: '点击左侧导航栏的【附近村庄】，然后选择【亲自前往】出发招募！\n\n你的驴车🫏最多能带 3 个人回来。',
    position: 'left',
    nextLabel: null, // 不显示"下一步"按钮，等玩家自己操作
    autoLabel: '前往村庄中…',
  },
  // 以下步骤由游戏状态自动触发
  {
    id: 2,
    title: '☑ 挑选村民',
    content: '你到达了村庄！村长带了几位愿意跟随的村民来见你。\n\n点击你想带走的村民，勾选之后点底部的【带他们回家！】按钮。\n\n💡 驴车最多带 3 人，想清楚了再选！',
    position: 'center',
    nextLabel: null, // 等玩家自己操作
    autoLabel: '已选好人…',
  },
  {
    id: 3,
    title: '✅ 确认带走',
    content: '选好村民后，点击底部的【带 N 人回家！】按钮，赶着驴车出发回程！\n\n如果没看中合适的人，也可以点【没有合适的，回去吧】空手返回。',
    position: 'center',
    nextLabel: null, // 等玩家自己操作
    autoLabel: '回程中…',
  },
  {
    id: 4,
    title: '🚗 赶驴车回家中…',
    content: '回程大约需要1天时间，面板上会显示进度条。\n\n到家后，你带回来的村民才会正式加入队伍，可以分配农田开始劳作。',
    position: 'center',
    nextLabel: null, // 自动推进
    autoLabel: '等待到家…',
  },
  {
    id: 5,
    title: '🎉 村民加入队伍！',
    content: '恭喜！你成功带回了村民，队伍壮大了！\n\n接下来你可以：\n• 去【农田】分配地块给他们\n• 人员多了还会解锁【司务堂】，分配岗位和学习功法\n\n教程到此结束，祝你在路灯计划一切顺利！',
    position: 'center',
    nextLabel: '开始冒险！',
    isLast: true,
  },
];

/**
 * 判断教程当前应处于哪个步骤（基于游戏状态）
 * 返回 null 表示教程应暂停/不显示
 */
export function getTutorialStepFromGameState(game) {
  const step = game.tutorialStep ?? 0;
  if (step < 0) return null; // 已完成

  // step 0: 初始欢迎，需要玩家手动点下一步
  if (step === 0) return 0;

  // step 1: 等玩家点击前往村庄
  if (step === 1) {
    // 玩家已出发 → 自动推进到等待阶段
    if (game.recruitTask && game.recruitTask.phase === 'traveling') {
      return null; // 隐藏教程，让玩家看进度条
    }
    return 1;
  }

  // step 2+: 根据招募阶段自动判断
  if (!game.recruitTask) {
    // 招募任务已完成（returning 结束后 recruitTask 被设为 null）
    // 检查是否刚带回了人
    if (step >= 4 && game.characters && game.characters.length > 0) {
      return 5; // 完成
    }
    return null;
  }

  if (game.recruitTask.phase === 'waiting_choice') {
    return 2; // 到达村庄，引导选人
  }

  if (game.recruitTask.phase === 'returning') {
    return 4; // 回程中
  }

  return null; // 其他情况（traveling 等）隐藏教程
}

export default function TutorialOverlay({ step, onNext, onSkip, game }) {
  if (step < 0 || step >= TUTORIAL_STEPS.length) return null;

  const current = TUTORIAL_STEPS[step];

  // 步骤 3（确认带走）：检查是否已选了人
  const selectedCount = game?.recruitCandidatePool?.filter(c => c._selected).length || 0;
  const showConfirmHint = step === 2 && selectedCount > 0;

  return (
    <>
      {/* 半透明遮罩（步骤 2/3 时用较浅遮罩，让玩家还能操作弹窗） */}
      <div className={`fixed inset-0 z-40 pointer-events-none ${step >= 2 && step <= 3 ? 'bg-black/20' : 'bg-black/50'}`} />

      {/* 左侧导航高亮提示（步骤1：指向"附近村庄"） */}
      {step === 1 && (
        <div className="fixed left-0 top-0 h-full z-41 pointer-events-none flex items-start pt-40">
          <div className="w-28 h-12 rounded-r-lg border-2 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)] animate-pulse" />
          <div className="ml-2 mt-1 text-amber-400 text-2xl animate-bounce">👈</div>
        </div>
      )}

      {/* 弹窗——步骤 2/3 时靠上显示，不遮挡候选人弹窗 */}
      <div
        className={`fixed z-50 pointer-events-auto ${
          step >= 2 && step <= 3
            ? 'left-1/2 -translate-x-1/2 top-4'
            : step === 1
              ? 'left-36 top-1/2 -translate-y-1/2'
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={{ maxWidth: 380, width: 'calc(100vw - 48px)' }}
      >
        <div className="bg-stone-900 border border-amber-700/60 rounded-2xl shadow-2xl overflow-hidden">
          {/* 进度点 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-0">
            <div className="flex gap-1.5">
              {TUTORIAL_STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step
                      ? 'bg-amber-400'
                      : i < step
                        ? 'bg-amber-700/60'
                        : 'bg-stone-700'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onSkip}
              className="text-stone-500 hover:text-stone-300 transition-colors p-1 rounded"
              title="跳过教程"
            >
              <X size={16} />
            </button>
          </div>

          {/* 内容 */}
          <div className="px-5 py-4">
            <h3 className="text-base font-bold text-amber-400 mb-3">{current.title}</h3>
            <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">
              {current.content}
            </p>

            {/* 步骤2/3：提示当前状态 */}
            {step === 2 && (
              <div className="mt-3 text-xs text-amber-300/80 bg-amber-900/20 rounded-lg px-3 py-2">
                💡 已勾选 {selectedCount} 人{selectedCount > 0 ? '，可以点下方弹窗的"带他们回家"了！' : ''}
              </div>
            )}
          </div>

          {/* 按钮 */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-2 rounded-lg text-xs text-stone-500 hover:text-stone-300 bg-stone-800/50 hover:bg-stone-800 transition-colors"
            >
              跳过教程
            </button>
            {current.nextLabel ? (
              <button
                onClick={onNext}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1 ${
                  current.isLast
                    ? 'bg-green-700 hover:bg-green-600 text-green-100'
                    : 'bg-amber-700 hover:bg-amber-600 text-amber-100'
                }`}
              >
                {current.nextLabel}
                {!current.isLast && <ChevronRight size={16} />}
              </button>
            ) : (
              <div className="flex-1 py-2 rounded-lg text-xs text-stone-500 bg-stone-800/30 text-center">
                {current.autoLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
