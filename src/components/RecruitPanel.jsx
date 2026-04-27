import { useState } from 'react';
import { MapPin, Clock, UserPlus, Wheat, ChevronRight, ArrowUpCircle } from 'lucide-react';
import { RECRUIT_FOOD_COST, TICKS_PER_DAY } from '../engine/constants';
import { getVehicleInfo, getNextVehicle } from '../data/transport';
import { getHRLevel, getHRLevelProgress } from '../data/hr-levels';

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

// 候选人选择弹窗
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

// ========== 附近村庄面板（顶级） ==========
export default function RecruitPanel({ game, onAction }) {
  const recruitTask = game.recruitTask;
  const candidatePool = game.recruitCandidatePool || [];
  const hiredCount = game.recruitHiredCount || 0;
  const farmers = game.characters.filter(c => c.hasRole('farmer'));
  const recruitingIds = game.recruitingNPCIds;
  const vehicle = getVehicleInfo(game.currentVehicle);
  const nextVehicle = getNextVehicle(game.currentVehicle);
  const maxHire = vehicle.passengerCapacity;
  const hrLevel = game.currentHRLevel;
  const hrProgress = getHRLevelProgress(Math.max(...farmers.map(f => f.hrExp || 0), 0));
  const visibility = game.recruitVisibility;

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

  const handleSelfRecruit = () => {
    if (onAction) onAction('leader_recruit');
  };

  const handleDelegateRecruit = () => {
    if (selectedDelegate && onAction) onAction('delegate_recruit', { characterId: selectedDelegate.id });
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

  // 候选人选择弹窗
  const showCandidatePopup = game.recruitTask?.phase === 'waiting_choice' && game.recruitCandidatePool?.length > 0;

  const handleChoose = (index) => {
    if (onAction) onAction('recruit_choose', { candidateIndex: index });
  };

  const handleSkip = () => {
    if (onAction) onAction('recruit_skip');
  };

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

      {/* 载具信息 */}
      <div className="p-3 bg-stone-800/50 rounded-lg border border-stone-700/30 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-400">{vehicle.icon} {vehicle.name}</span>
          <span className="text-amber-400 font-bold">载量 {maxHire} 人/趟</span>
        </div>
        <div className="text-xs text-stone-500 mt-1">
          {vehicle.description}
        </div>

        {/* 知客等级 */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-stone-400">
            知客等级 <span className="text-cyan-400">{hrLevel.icon} {hrLevel.name}</span>
          </span>
          <span className="text-stone-500">{hrLevel.description}</span>
        </div>
        {hrLevel.level < 3 && (
          <div className="mt-1 w-full h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-600 rounded-full transition-all" style={{ width: `${hrProgress * 100}%` }} />
          </div>
        )}

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
              sublabel="派人招募，带回随机村民"
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
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-stone-500">耗时：</span>
              <span className="text-stone-300">去1天 + 回1天</span>
            </div>
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
              <span className="text-[10px] text-stone-500 px-1.5 py-0.5 bg-stone-800 rounded">随机</span>
            </div>
            <div className="text-xs text-stone-400 mb-3">
              派人赶{vehicle.icon}{vehicle.name}去村庄随机带回一人，你无法挑选，但可以继续照看农田。一趟最多招 {maxHire} 人。
            </div>

            {/* 选择派出的 NPC */}
            {availableDelegates.length > 0 ? (
              <div className="mb-3">
                <div className="text-xs text-stone-500 mb-1">选择派出的人：</div>
                <div className="flex flex-wrap gap-1">
                  {availableDelegates.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedDelegate(selectedDelegate?.id === f.id ? null : f)}
                      className={`px-2 py-1 rounded text-xs transition-colors
                        ${selectedDelegate?.id === f.id
                          ? 'bg-amber-700/60 text-amber-200 border border-amber-600/50'
                          : 'bg-stone-700/50 text-stone-400 border border-stone-700/30 hover:text-stone-300'
                        }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-stone-600 mb-3">没有可派出的空闲农民</div>
            )}

            <button
              onClick={handleDelegateRecruit}
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

      {/* 候选人选择弹窗 */}
      {showCandidatePopup && (
        <CandidateChoicePopup
          candidates={game.recruitCandidatePool}
          onChoose={handleChoose}
          onSkip={handleSkip}
          hiredCount={game.recruitHiredCount || 0}
          maxHire={game.maxRecruitHire}
          visibility={game.recruitVisibility}
        />
      )}
    </div>
  );
}
