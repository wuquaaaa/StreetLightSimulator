/**
 * 新手教程引导组件
 * 可操作指引：教程步骤与游戏状态联动
 *
 * 教程分为三个阶段：
 *  阶段一：种田教学（step 0-4）
 *  阶段二：招募教学（step 5-9），第3天才触发
 *  阶段三：建筑教学（step 10-11），第10天才触发
 */
import { ChevronRight, X } from 'lucide-react';

// 教程步骤定义
// ---- 阶段一：种田教学 ----
// step 0: 欢迎语，引导先种田
// step 1: 看看农田，介绍界面
// step 2: 翻地（等玩家操作）
// step 3: 播种（等玩家操作）
// step 4: 浇水与照料
// ---- 阶段二：招募教学（第3天触发）----
// step 5: 几天过去了，该去招人了
// step 6: 指向"附近村庄" tab
// step 7: 到达村庄，引导选人
// step 8: 回程中
// step 9: 村民加入！获得农民队长，提示身份切换
// ---- 阶段三：建筑教学（第10天触发）----
// step 10: 指向"建筑"tab，介绍建造
// step 11: 建筑Tab界面引导，完成教程
const TUTORIAL_STEPS = [
  // ===== 阶段一：种田教学 =====
  {
    id: 0,
    title: '👋 欢迎来到路灯计划！',
    content: '你刚刚踏上这片陌生的土地。这里有几块农田和一间仓库，仓库里还有些粮食和种子。\n\n第一件事——先把田种上！填饱肚子才是一切的基础。',
    position: 'center',
    nextLabel: '好的，去种田',
  },
  {
    id: 1,
    title: '🌾 看看你的农田',
    content: '你面前有2块空闲的农田。种田的流程很简单：\n\n1️⃣ 翻地 —— 把空地翻松\n2️⃣ 播种 —— 选好种子种下去\n3️⃣ 浇水 —— 定期浇水保持湿润\n4️⃣ 等待 —— 作物成熟后收获\n\n先试试翻地吧！点击地块上的【翻地】按钮。',
    position: 'center',
    nextLabel: '开始翻地',
  },
  {
    id: 2,
    title: '🔨 翻地',
    content: '点击任意空地上的【翻地】按钮，把土地翻松！\n\n翻地是播种前的必要步骤。',
    position: 'center',
    nextLabel: null,
    autoLabel: '等待翻地…',
  },
  {
    id: 3,
    title: '🌱 播种',
    content: '翻好地了！现在点击地块上的【播种】按钮，选择一种种子种下去。\n\n小麦🌾是最基础的选择，仓库里有现成的种子。',
    position: 'center',
    nextLabel: null,
    autoLabel: '等待播种…',
  },
  {
    id: 4,
    title: '💧 浇水与照料',
    content: '播种完成！作物生长期间别忘了定期浇水💧，水不够会影响产量。\n\n此外还要注意除草🌿和除虫🐛，保持作物健康。\n\n先自己干着吧，等攒够了粮食，再去招些帮手。',
    position: 'center',
    nextLabel: '我知道了',
    isLastPhase: true, // 阶段一结束
  },
  // ===== 阶段二：招募教学（第3天触发）=====
  {
    id: 5,
    title: '😴 几天过去了…',
    content: '你一个人起早贪黑地种田，虽然勉强能维持生计，但效率实在太低了。\n\n是时候去附近的村庄招募几个帮手了！人多力量大嘛。\n\n粮食够的话就出发吧！',
    position: 'center',
    nextLabel: '去招人帮忙',
  },
  {
    id: 6,
    title: '🏘 前往"附近村庄"',
    content: '点击左侧导航栏的【附近村庄】，然后选择【亲自前往】出发招募！\n\n你的驴车🫏最多能带 3 个人回来。',
    position: 'left',
    nextLabel: null,
    autoLabel: '前往村庄中…',
  },
  {
    id: 7,
    title: '☑ 挑选村民',
    content: '你到达了村庄！村长带了几位愿意跟随的村民来见你。\n\n点击你想带走的村民，勾选之后点底部的【带他们回家！】按钮。\n\n💡 驴车最多带 3 人，想清楚了再选！',
    position: 'center',
    nextLabel: null,
    autoLabel: '已选好人…',
  },
  {
    id: 8,
    title: '🚗 赶驴车回家中…',
    content: '回程大约需要1天时间，面板上会显示进度条。\n\n到家后，你带回来的村民才会正式加入队伍，可以分配农田开始劳作。',
    position: 'center',
    nextLabel: null,
    autoLabel: '等待到家…',
  },
  {
    id: 9,
    title: '🎉 村民加入队伍！',
    content: '恭喜！你成功带回了村民，队伍壮大了！\n\n你获得了「👨‍🌾 农民队长」身份！可以在右上角点击你的身份标签，切换到队长视角来管理整个农田。\n\n接下来：\n• 去【农田】分配地块给村民\n• 人员多了还可以建造【司务堂】研究岗位和功法',
    position: 'center',
    nextLabel: '开始发展！',
    isLastPhase: true, // 阶段二结束
  },
  // ===== 阶段三：建筑教学（第10天触发）=====
  {
    id: 10,
    title: '🏗 该建造些设施了',
    content: '你的小领地已经初具规模，是时候建造一些设施来提升效率了！\n\n点击左侧导航栏的【建筑】，看看能建造什么吧。\n\n仓库扩容、司务堂……每一座建筑都会让你的领地更加强大。',
    position: 'left',
    nextLabel: null,
    autoLabel: '前往建筑…',
  },
  {
    id: 11,
    title: '✨ 建筑概览',
    content: '这里是建筑管理界面。\n\n• 选择想建造的建筑，确认后开始施工\n• 建造需要消耗材料和一定天数\n• 建好的建筑会永久提升你的领地能力\n\n教程到此结束！接下来的路，就靠你自己走了。祝你在路灯计划一切顺利！🌟',
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

  // 阶段一：种田教学（step 0-4）
  if (step <= 1) return step;
  if (step === 2) return 2; // 等翻地
  if (step === 3) return 3; // 等播种
  if (step === 4) return 4; // 手动推进

  // 阶段二：招募教学（step 5-9）
  // step 5: 等第3天（day >= 3才显示）
  if (step === 5) {
    if (game.day < 3) return null; // 第3天前不显示，正常游戏
    return 5;
  }

  // step 6: 等玩家前往村庄
  if (step === 6) {
    if (game.recruitTask && game.recruitTask.phase === 'traveling') {
      return null; // 隐藏教程，让玩家看进度条
    }
    return 6;
  }

  // step 7: 到达村庄，引导选人
  if (step === 7) return 7;

  // step 8: 回程中
  if (step === 8) {
    if (game.recruitTask && game.recruitTask.phase === 'returning') return 8;
    return null;
  }

  // step 9: 完成（村民到家后显示）
  if (step === 9) return 9;

  // 阶段三：建筑教学（step 10-11）
  // step 10: 等第10天
  if (step === 10) {
    if (game.day < 10) return null; // 第10天前不显示
    return 10;
  }

  // step 11: 建筑界面引导
  if (step === 11) return 11;

  return null;
}

/**
 * 获取教程总步数（用于进度点显示）
 * 根据当前阶段只显示对应阶段的点
 */
export function getTutorialPhaseSteps(step) {
  if (step <= 4) return TUTORIAL_STEPS.slice(0, 5); // 阶段一
  if (step <= 9) return TUTORIAL_STEPS.slice(5, 10); // 阶段二
  return TUTORIAL_STEPS.slice(10); // 阶段三
}

export default function TutorialOverlay({ step, onNext, onSkip, game }) {
  if (step < 0 || step >= TUTORIAL_STEPS.length) return null;

  const current = TUTORIAL_STEPS[step];
  const phaseSteps = getTutorialPhaseSteps(step);
  const phaseOffset = step <= 4 ? 0 : step <= 9 ? 5 : 10;

  // 步骤 7（挑选村民）：检查已选人数
  const selectedCount = game?.recruitCandidatePool?.filter(c => c._selected).length || 0;

  // 决定遮罩深浅：种田步骤（2-3）和选人步骤（7）用轻遮罩
  const lightOverlay = (step >= 2 && step <= 3) || step === 7;

  // 决定弹窗位置
  const getPositionClass = () => {
    if (step === 6 || step === 10) return 'left-36 top-1/2 -translate-y-1/2'; // 左侧导航旁边
    if (step === 7) return 'left-1/2 -translate-x-1/2 top-4'; // 靠上，不遮挡候选人弹窗
    if (step === 3) return 'left-4 bottom-4'; // 左下角，不遮挡种子选择弹窗
    return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'; // 居中
  };

  return (
    <>
      {/* 半透明遮罩 */}
      <div className={`fixed inset-0 z-40 pointer-events-none ${lightOverlay ? 'bg-black/20' : 'bg-black/50'}`} />

      {/* 左侧导航高亮提示（步骤6/10：指向tab） */}
      {(step === 6 || step === 10) && (
        <div className="fixed left-0 top-0 h-full z-41 pointer-events-none flex items-start pt-40">
          <div className="w-28 h-12 rounded-r-lg border-2 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)] animate-pulse" />
          <div className="ml-2 mt-1 text-amber-400 text-2xl animate-bounce">👈</div>
        </div>
      )}

      {/* 弹窗 */}
      <div
        className={`fixed z-50 pointer-events-auto ${getPositionClass()}`}
        style={{ maxWidth: 380, width: 'calc(100vw - 48px)' }}
      >
        <div className="bg-stone-900 border border-amber-700/60 rounded-2xl shadow-2xl overflow-hidden">
          {/* 阶段标签 */}
          <div className="px-5 pt-3">
            <div className="text-[10px] text-stone-600">
              {step <= 4 ? '第一幕 · 耕种' : step <= 9 ? '第二幕 · 招募' : '第三幕 · 建设'}
            </div>
          </div>

          {/* 进度点（仅显示当前阶段） */}
          <div className="flex items-center justify-between px-5 pt-2 pb-0">
            <div className="flex gap-1.5">
              {phaseSteps.map((s) => {
                const i = s.id - phaseOffset;
                return (
                  <div
                    key={s.id}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === (step - phaseOffset)
                        ? 'bg-amber-400'
                        : i < (step - phaseOffset)
                          ? 'bg-amber-700/60'
                          : 'bg-stone-700'
                    }`}
                  />
                );
              })}
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

            {/* 步骤7：提示已选人数 */}
            {step === 7 && (
              <div className="mt-3 text-xs text-amber-300/80 bg-amber-900/20 rounded-lg px-3 py-2">
                💡 已勾选 {selectedCount} 人{selectedCount > 0 ? '，可以点下方弹窗的"带他们回家"了！' : ''}
              </div>
            )}

            {/* 步骤9：身份切换提示 */}
            {step === 9 && (
              <div className="mt-3 text-xs text-amber-300/80 bg-amber-900/20 rounded-lg px-3 py-2">
                💡 点击右上角你的名字旁边的身份标签，可以切换农民/农民队长视角
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
                    : current.isLastPhase
                      ? 'bg-cyan-700 hover:bg-cyan-600 text-cyan-100'
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
