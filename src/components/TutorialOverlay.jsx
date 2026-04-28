/**
 * 新手教程引导组件
 * 分步骤引导玩家完成首次招募流程
 */
import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';

// 教程步骤定义
// position: 'center' | 'top' | 'bottom' | 'left-highlight' | 'right-highlight'
// highlight: CSS selector hint (仅用于 UI 显示提示箭头，不做真实 DOM 定位)
const TUTORIAL_STEPS = [
  {
    id: 0,
    title: '👋 欢迎来到路灯计划！',
    content: '你刚刚踏上这片土地。这里有几块农田，但光靠你一个人干活效率太低了。\n\n你需要去附近村庄招募一些村民来帮忙！',
    position: 'center',
    highlight: null,
    nextLabel: '明白了，去哪招募？',
  },
  {
    id: 1,
    title: '🏘 前往"附近村庄"',
    content: '点击左侧导航栏的【附近村庄】标签，那里可以召集到愿意跟随你的村民。',
    position: 'left',
    highlight: 'village',   // tab id
    arrow: 'left',
    nextLabel: '我看到了',
  },
  {
    id: 2,
    title: '🚗 选择出发方式',
    content: '招募有两种方式：\n\n• 【亲自前往】你骑驴车亲自去，到了可以亲眼挑人，出发和回程各1天\n• 【派人前往】选一名村民代你去，他会按你的偏好挑人，往返2天\n\n第一次可以先试试"亲自前往"！',
    position: 'center',
    highlight: null,
    nextLabel: '好，我先去看看',
  },
  {
    id: 3,
    title: '⏳ 等待抵达',
    content: '出发后，面板会显示进度条——大约1天（10个游戏时间刻）后你就会抵达村庄。\n\n游戏时间一直在流逝，不要惊慌，等着就好！',
    position: 'center',
    highlight: null,
    nextLabel: '收到，然后呢？',
  },
  {
    id: 4,
    title: '☑ 选择你喜欢的村民',
    content: '到达村庄后，会弹出一份村民名单。\n\n点击村民可以勾选/取消勾选，你的驴车最多带 3 人。\n\n选好之后，点击底部的【带 N 人回家！】按钮，开始回程。',
    position: 'center',
    highlight: null,
    nextLabel: '明白，选好就走',
  },
  {
    id: 5,
    title: '🏡 回到家——村民加入！',
    content: '回程又需要1天时间，面板会显示"赶驴车回家中…"的进度条。\n\n到家后，你带回来的村民才正式加入队伍，可以分配农田开始劳作！\n\n💡 提示：多招募几个人后，还会解锁"司务堂"，可以给村民分配岗位、学习功法！',
    position: 'center',
    highlight: null,
    nextLabel: '好的，我知道了！',
    isLast: true,
  },
];

export default function TutorialOverlay({ step, onNext, onSkip }) {
  if (step < 0 || step >= TUTORIAL_STEPS.length) return null;

  const current = TUTORIAL_STEPS[step];

  return (
    <>
      {/* 半透明遮罩 */}
      <div className="fixed inset-0 bg-black/50 z-40 pointer-events-none" />

      {/* 左侧导航高亮提示（步骤1：指向"附近村庄"） */}
      {step === 1 && (
        <div className="fixed left-0 top-0 h-full z-41 pointer-events-none flex items-start pt-40">
          <div className="w-28 h-12 rounded-r-lg border-2 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)] animate-pulse" />
          <div className="ml-2 mt-1 text-amber-400 text-2xl animate-bounce">👈</div>
        </div>
      )}

      {/* 弹窗 */}
      <div
        className={`fixed z-50 pointer-events-auto ${
          current.position === 'left'
            ? 'left-36 top-1/2 -translate-y-1/2'
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={{ maxWidth: 420, width: 'calc(100vw - 48px)' }}
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
          </div>

          {/* 按钮 */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={onSkip}
              className="px-3 py-2 rounded-lg text-xs text-stone-500 hover:text-stone-300 bg-stone-800/50 hover:bg-stone-800 transition-colors"
            >
              跳过教程
            </button>
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
          </div>
        </div>
      </div>
    </>
  );
}
