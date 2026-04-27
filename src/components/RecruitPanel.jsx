import { useState } from 'react';
import { Clock, UserPlus, Wheat, ChevronRight, ArrowUpCircle } from 'lucide-react';
import { RECRUIT_FOOD_COST, TICKS_PER_DAY } from '../engine/constants';
import { getVehicleInfo, getNextVehicle } from '../data/transport';
import { getHRLevel, getHRLevelProgress, getRecruitVisibility, getAvailablePreferences, RECRUIT_PREFERENCES } from '../data/hr-levels';

// 招募进度条卡片
function RecruitProgressCard({ label, sublabel, task }) {
  const pct = Math.floor(((task.totalTicks - task.ticksRemaining) / task.totalTicks) * 100);
  const remainDays = Math.ceil(task.ticksRemaining / TICKS_PER_DAY);
  return (
    <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-800/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-amber-300 flex items-center gap-1">
          <Clock size={12} /> {label}
        </span>
        <span className="text-xs text-amber-400 font-bold">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between">
        <span>{sublabel}</span>
        <span>大约还需 {remainDays} 天</span>
      </div>
    </div>
  );
}

// 候选人选择弹窗（亲自招募用）
function CandidateChoicePopup({ candidates, onChoose, onSkip, hiredCount, maxHire, visibility }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-amber-400">🏘 村民名单</h3>
          <button onClick={onSkip} className="text-stone-500 hover:text-stone-300 text-sm">离开</button>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          村长带你去见了这些愿意跟随的村民：
          <span className="text-amber-300 ml-1">（已选 {hiredCount}/{maxHire}，选人后可继续选或离开）</span>
        </p>
        <div className="space-y-2">
          {candidates.map((c, i) => (
            <div
              key={i}
              className="p-3 bg-stone-800/50 rounded-lg border border-stone-700/30 hover:border-amber-600/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-200 font-medium">{c.name}</span>
                  <span className="text-xs text-stone-500">
                    {c.gender === 'female' ? '♀' : '♂'} {c.age}岁
                  </span>
                </div>
                <button
                  onClick={() => onChoose(i)}
                  disabled={hiredCount >= maxHire}
                  className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                    hiredCount < maxHire
                      ? 'bg-green-800/60 hover:bg-green-700/60 text-green-300'
                      : 'bg-stone-700/40 text-stone-600 cursor-not-allowed'
                  }`}
                >
                  选择 <ChevronRight size={12} />
                </button>
              </div>
              {c.appearance && (
                <div className="text-[10px] text-stone-600 italic mb-1">{c.appearance}</div>
              )}
              {/* 知客等级2+：看出身 */}
              {visibility.showOrigin && c.originTrait && (
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/30 border border-amber-800/30 rounded text-amber-400/80">
                  {c.originTrait.icon} {c.originTrait.name}
                </span>
              )}
              {/* 知客等级3+：看通用特质 */}
              {visibility.showTraits && c.generalTraits && c.generalTraits.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {c.generalTraits.map((t, ti) => (
                    <span key={ti} className="text-[9px] px-1.5 py-0.5 bg-stone-800 rounded text-stone-400">
                      {t.icon} {t.name}
                      {visibility.showTraitDesc && t.description && (
                        <span className="text-stone-500 ml-1">({t.description})</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onSkip}
            className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
          >
            没有合适的人选，返回
          </button>
        </div>
      </div>
    </div>
  );
}

// NPC出发前询问招募偏好的弹窗
function PreferencePopup({ npcName, npcHrLevel, onConfirm, onCancel }) {
  const [selectedPref, setSelectedPref] = useState('any');
  const hrLevel = getHRLevel(npcHrLevel || 0);
  const availablePrefs = getAvailablePreferences(hrLevel.level);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🗣</span>
          <h3 className="text-sm font-bold text-amber-400">{npcName}的请示</h3>
          <span className="text-[10px] px-1.5 py-0.5 bg-cyan-900/30 rounded text-cyan-400">
            {hrLevel.icon} 知客{hrLevel.name}
          </span>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          {npcName}向你行礼："老板，我准备出发了。以我{hrLevel.icon}{hrLevel.name}的眼力，
          {hrLevel.level === 1
            ? '只能分辨男女老少，您有什么吩咐？'
            : hrLevel.level === 2
              ? '能看出身来历，您有什么吩咐？'
              : '能看出各人特质潜力，您有什么吩咐？'
          }"
        </p>
        <div className="space-y-1.5 mb-4">
          {availablePrefs.map(pref => (
            <button
              key={pref.id}
              onClick={() => setSelectedPref(pref.id)}
              className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center gap-2 ${
                selectedPref === pref.id
                  ? 'bg-amber-900/30 border border-amber-700/50 text-amber-200'
                  : 'bg-stone-800/50 border border-stone-700/30 text-stone-400 hover:bg-stone-800 hover:text-stone-300'
              }`}
            >
              <span className={`text-base ${selectedPref === pref.id ? 'text-amber-400' : 'text-stone-500'}`}>
                {selectedPref === pref.id ? '●' : '○'}
              </span>
              <div>
                <span className="font-medium">{pref.label}</span>
                <span className="text-stone-500 ml-1">— {pref.desc}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-xs bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
          >
            先不去了
          </button>
          <button
            onClick={() => onConfirm(selectedPref)}
            className="flex-1 py-2 rounded-lg text-xs bg-amber-700 hover:bg-amber-600 text-amber-100 font-medium transition-colors"
          >
            出发！
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== 附近村庄面板（顶级） ==========
export default function RecruitPanel({ game, onAction }) {
  const recruitTask = game.recruitTask;
  const farmers = game.characters.filter(c => c.hasRole('farmer'));
  const recruitingIds = game.recruitingNPCIds;
  const vehicle = getVehicleInfo(game.currentVehicle);
  const nextVehicle = getNextVehicle(game.currentVehicle);
  const maxHire = vehicle.passengerCapacity;

  // 亲自招募的可见性 = 全队最高知客等级
  let maxHrExp = 0;
  for (const npc of farmers) { if ((npc.hrExp || 0) > maxHrExp) maxHrExp = npc.hrExp; }
  const bestHrLevel = getHRLevel(maxHrExp);
  const bestHrProgress = getHRLevelProgress(maxHrExp);
  const selfVisibility = getRecruitVisibility(bestHrLevel.level);

  // 可派出的 NPC（空闲 + 不在招募中 + 不在开垦中）
  const availableDelegates = farmers.filter(f => {
    const hasPlots = game.farm.getPlotsForCharacter(f.id).length > 0;
    const isExpanding = game.farm.expandQueue.find(q => q.characterId === f.id);
    const isRecruiting = recruitingIds.has(f.id);
    return !hasPlots && !isExpanding && !isRecruiting;
  });

  const foodAmount = game.warehouse.getItemAmount('food', 'wheat');
  const canAfford = foodAmount >= RECRUIT_FOOD_COST;
  const canStartRecruit = !recruitTask && canAfford;

  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const [showPrefPopup, setShowPrefPopup] = useState(false);

  const handleSelfRecruit = () => {
    if (onAction) onAction('leader_recruit');
  };

  const handleDelegateClick = () => {
    if (selectedDelegate && canStartRecruit) {
      setShowPrefPopup(true);
    }
  };

  const handlePrefConfirm = (preference) => {
    setShowPrefPopup(false);
    if (onAction && selectedDelegate) {
      onAction('delegate_recruit', { characterId: selectedDelegate.id, preference });
    }
  };

  const handlePrefCancel = () => {
    setShowPrefPopup(false);
  };

  const handleUpgradeVehicle = () => {
    if (onAction) onAction('upgrade_vehicle');
  };

  // 进行中的任务
  const isTraveling = recruitTask && recruitTask.phase === 'traveling';
  const isReturning = recruitTask && recruitTask.phase === 'returning';

  // 检查升级材料是否足够
  const canUpgradeVehicle = nextVehicle && nextVehicle.upgradeCost.every(
    cost => game.warehouse.getItemAmount(cost.category, cost.itemId) >= cost.amount
  );

  // 候选人选择弹窗（亲自招募）
  const showCandidatePopup = game.recruitTask?.phase === 'waiting_choice' && game.recruitCandidatePool?.length > 0;

  const handleChoose = (index) => {
    if (onAction) onAction('recruit_choose', { candidateIndex: index });
  };

  const handleSkip = () => {
    if (onAction) onAction('recruit_skip');
  };

  // 当前派出NPC的知客信息
  const selectedDelegateHr = selectedDelegate ? getHRLevel(selectedDelegate.hrExp || 0) : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏘</span>
        <h2 className="text-lg font-bold text-amber-400">附近村庄</h2>
        <span className="text-xs text-stone-500">（招募村民）</span>
        {game.isPlayerAway && (
          <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">🚶 外出中</span>
        )}
      </div>

      {/* 载具信息（不含知客等级） */}
      <div className="p-3 bg-stone-800/50 rounded-lg border border-stone-700/30 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-400">{vehicle.icon} {vehicle.name}</span>
          <span className="text-amber-400 font-bold">载量 {maxHire} 人/趟</span>
        </div>
        <div className="text-xs text-stone-500 mt-1">
          {vehicle.description}
        </div>

        {/* 升级载具按钮 */}
        {nextVehicle && (
          <div className="mt-2 pt-2 border-t border-stone-700/30">
            <button
              onClick={handleUpgradeVehicle}
              disabled={!canUpgradeVehicle || !!recruitTask}
              className={`w-full py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors ${
                canUpgradeVehicle && !recruitTask
                  ? 'bg-amber-800/40 hover:bg-amber-700/50 text-amber-300'
                  : 'bg-stone-800/40 text-stone-600 cursor-not-allowed'
              }`}
            >
              <ArrowUpCircle size={12} />
              {canUpgradeVehicle
                ? `升级为 ${nextVehicle.icon}${nextVehicle.name}（载量${nextVehicle.passengerCapacity}人）`
                : `升级为${nextVehicle.icon}${nextVehicle.name}（材料不足）`
              }
            </button>
          </div>
        )}

        {recruitTask && (
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <Clock size={10} />
            {isTraveling ? `${vehicle.name}在路上...` : isReturning ? `赶着${vehicle.name}回程中...` : '已到达村庄，正在选人'}
          </div>
        )}
      </div>

      {/* 招募进行中 */}
      {isTraveling && (
        <div className="mb-4">
          {recruitTask.type === 'self' ? (
            <RecruitProgressCard
              label="你正前往村庄..."
              sublabel="出发招募期间，无法亲自操作农田"
              task={recruitTask}
            />
          ) : (
            <RecruitProgressCard
              label={`${game.characters.find(c => c.id === recruitTask.delegateId)?.name || '某人'}正前往村庄...`}
              sublabel={`派人招募，${recruitTask.preference === 'any' ? '随机带回' : `按要求挑选${RECRUIT_PREFERENCES.find(p => p.id === recruitTask.preference)?.label || ''}`}`}
              task={recruitTask}
            />
          )}
        </div>
      )}

      {/* 亲自招募 vs 派人招募 选择 */}
      {!recruitTask && (
        <div className="space-y-3">
          {/* 选项1：亲自去 */}
          <div className={`p-3 rounded-lg border transition-colors
            ${canStartRecruit ? 'bg-stone-900/30 border-stone-700/30' : 'bg-stone-900/20 border-stone-800/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-300 font-medium">亲自去村庄</span>
              <span className="text-[10px] text-stone-500 px-1.5 py-0.5 bg-stone-800 rounded">推荐</span>
            </div>
            <div className="text-xs text-stone-400 mb-3">
              亲自赶{vehicle.icon}{vehicle.name}前往村庄挑选村民，但出发期间无法操作农田。一趟最多招 {maxHire} 人。
            </div>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-stone-500">花费：</span>
              <span className={canAfford ? 'text-green-400' : 'text-red-400'}>
                <Wheat size={10} className="inline mr-1" />{foodAmount} / {RECRUIT_FOOD_COST}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-stone-500">耗时：</span>
              <span className="text-stone-300">去1天 + 回1天</span>
            </div>
            {/* 队伍最佳知客等级提示 */}
            {farmers.length > 0 && (
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-stone-500">你的眼力：</span>
                <span className="text-cyan-400">{bestHrLevel.icon} 知客{bestHrLevel.name}</span>
              </div>
            )}
            <button
              onClick={handleSelfRecruit}
              disabled={!canStartRecruit}
              className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${canStartRecruit
                  ? 'bg-amber-700 hover:bg-amber-600 text-amber-100'
                  : 'bg-stone-700 text-stone-500 cursor-not-allowed'
                }`}
            >
              <UserPlus size={16} />
              {canAfford ? `赶${vehicle.name}出发` : '粮食不足'}
            </button>
          </div>

          {/* 选项2：派人去 */}
          <div className={`p-3 rounded-lg border transition-colors
            ${canStartRecruit ? 'bg-stone-900/30 border-stone-700/30' : 'bg-stone-900/20 border-stone-800/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-300 font-medium">派人去村庄</span>
              <span className="text-[10px] text-stone-500 px-1.5 py-0.5 bg-stone-800 rounded">派NPC</span>
            </div>
            <div className="text-xs text-stone-400 mb-3">
              派人赶{vehicle.icon}{vehicle.name}去村庄带回村民。派出前他会根据眼力询问你的要求。一趟最多招 {maxHire} 人。
            </div>

            {/* 选择派出的 NPC */}
            {availableDelegates.length > 0 ? (
              <div className="mb-3">
                <div className="text-xs text-stone-500 mb-1">选择派出的人：</div>
                <div className="flex flex-wrap gap-1">
                  {availableDelegates.map(f => {
                    const hr = getHRLevel(f.hrExp || 0);
                    const isSelected = selectedDelegate?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedDelegate(isSelected ? null : f)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          isSelected
                            ? 'bg-amber-700/60 text-amber-200 border border-amber-600/50'
                            : 'bg-stone-700/50 text-stone-400 border border-stone-700/30 hover:text-stone-300'
                        }`}
                      >
                        {f.name} <span className="text-cyan-500">{hr.icon}{hr.name}</span>
                      </button>
                    );
                  })}
                </div>
                {/* 选中 NPC 后显示其知客等级详情 */}
                {selectedDelegateHr && (
                  <div className="mt-2 p-2 bg-stone-900/50 rounded border border-stone-700/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">
                        {selectedDelegate.name}的知客等级：
                      </span>
                      <span className="text-cyan-400">{selectedDelegateHr.icon} {selectedDelegateHr.name}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">{selectedDelegateHr.description}</div>
                    {selectedDelegateHr.level < 3 && (
                      <div className="mt-1 w-full h-1 bg-stone-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full transition-all" style={{ width: `${getHRLevelProgress(selectedDelegate.hrExp || 0) * 100}%` }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-stone-600 mb-3">没有可派出的空闲农民</div>
            )}

            <button
              onClick={handleDelegateClick}
              disabled={!canStartRecruit || !selectedDelegate}
              className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${canStartRecruit && selectedDelegate
                  ? 'bg-stone-600 hover:bg-stone-500 text-stone-200'
                  : 'bg-stone-700 text-stone-500 cursor-not-allowed'
                }`}
            >
              {selectedDelegate ? `派 ${selectedDelegate.name} 去招募` : '请先选择派出的人'}
            </button>
          </div>
        </div>
      )}

      {/* 底部信息 */}
      <div className="mt-4 pt-3 border-t border-stone-700/30">
        <div className="text-xs text-stone-500">
          已有队员：<span className="text-stone-300 font-bold">{farmers.length}</span> 人
        </div>
      </div>

      {/* 候选人选择弹窗（亲自招募） */}
      {showCandidatePopup && (
        <CandidateChoicePopup
          candidates={game.recruitCandidatePool}
          onChoose={handleChoose}
          onSkip={handleSkip}
          hiredCount={game.recruitHiredCount || 0}
          maxHire={game.maxRecruitHire}
          visibility={selfVisibility}
        />
      )}

      {/* 偏好选择弹窗（派人招募） */}
      {showPrefPopup && selectedDelegate && (
        <PreferencePopup
          npcName={selectedDelegate.name}
          npcHrLevel={selectedDelegate.hrExp || 0}
          onConfirm={handlePrefConfirm}
          onCancel={handlePrefCancel}
        />
      )}
    </div>
  );
}
