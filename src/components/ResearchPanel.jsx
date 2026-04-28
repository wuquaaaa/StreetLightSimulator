import { useState } from 'react';
import { getAllPosts, getPostInfo } from '../data/posts';
import { getAllGongfu, getGongfuInfo } from '../data/gongfu';
import { TICKS_PER_DAY } from '../engine/constants';

// ====== 岗位研究卡片 ======
function PostCard({ post, researched, canResearch, onResearch }) {
  const statusColor = researched ? 'border-green-600/50 bg-green-950/20' : canResearch ? 'border-amber-600/50 bg-amber-950/10' : 'border-stone-700/50 bg-stone-800/20';
  const statusBadge = researched
    ? <span className="text-[10px] px-2 py-0.5 rounded bg-green-800/50 text-green-300">已参悟</span>
    : canResearch
      ? <span className="text-[10px] px-2 py-0.5 rounded bg-amber-800/50 text-amber-300">可参悟</span>
      : <span className="text-[10px] px-2 py-0.5 rounded bg-stone-700/50 text-stone-500">未解锁</span>;

  return (
    <div className={`rounded-lg border p-3 ${statusColor} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{post.icon}</span>
          <div>
            <div className="text-sm text-stone-200 font-bold">{post.name}</div>
            <div className="text-[10px] text-stone-500">精力 {Math.round(post.energyCost * 100)}%{post.exclusive ? ' · 独占' : ''}</div>
          </div>
        </div>
        {statusBadge}
      </div>
      <div className="text-xs text-stone-400">{post.description}</div>
      {post.requires && post.requires.length > 0 && (
        <div className="text-[10px] text-stone-500">前置：{post.requires.map(id => getPostInfo(id)?.name || id).join(' → ')}</div>
      )}
      {post.energyCost < 1 && (
        <div className="text-[10px] text-cyan-400/70">可与其他非独占岗位兼任</div>
      )}
      {canResearch && !researched && (
        <button onClick={() => onResearch(post.id)}
          className="mt-auto px-3 py-1.5 text-xs bg-amber-700/60 hover:bg-amber-600/60 text-amber-200 rounded transition-colors">
          参悟 ({post.researchCost}天)
        </button>
      )}
    </div>
  );
}

// ====== 功法研究卡片 ======
function GongfuCard({ gongfu, researched, canResearch, isResearching, researchProgress, onResearch, onCancel }) {
  const statusColor = researched ? 'border-purple-600/50 bg-purple-950/20'
    : isResearching ? 'border-blue-600/50 bg-blue-950/20'
    : canResearch ? 'border-amber-600/50 bg-amber-950/10'
    : 'border-stone-700/50 bg-stone-800/20';

  const statusBadge = researched
    ? <span className="text-[10px] px-2 py-0.5 rounded bg-green-800/50 text-green-300">已参悟</span>
    : isResearching
      ? <span className="text-[10px] px-2 py-0.5 rounded bg-blue-800/50 text-blue-300">参悟中</span>
      : canResearch
        ? <span className="text-[10px] px-2 py-0.5 rounded bg-amber-800/50 text-amber-300">可参悟</span>
        : <span className="text-[10px] px-2 py-0.5 rounded bg-stone-700/50 text-stone-500">未解锁</span>;

  // 研究进度
  const pct = isResearching && researchProgress ? Math.floor((researchProgress.progress / researchProgress.totalTicks) * 100) : 0;
  const daysLeft = isResearching && researchProgress ? Math.ceil((researchProgress.totalTicks - researchProgress.progress) / TICKS_PER_DAY) : 0;

  return (
    <div className={`rounded-lg border p-3 ${statusColor} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{gongfu.icon}</span>
          <div>
            <div className="text-sm text-stone-200 font-bold">{gongfu.name}</div>
            <div className="text-[10px] text-stone-500">研究 {gongfu.researchCost}天 · 学习 {gongfu.learnTime}天</div>
          </div>
        </div>
        {statusBadge}
      </div>
      <div className="text-xs text-stone-400">{gongfu.description}</div>
      {gongfu.requires && gongfu.requires.length > 0 && (
        <div className="text-[10px] text-stone-500">前置：{gongfu.requires.map(id => getGongfuInfo(id)?.name || id).join('、')}</div>
      )}
      <div className="text-[10px] text-amber-400/70">
        效果：{gongfu.effect.type === 'farm_speed' ? `NPC负责的地块耕种速度 +${Math.round(gongfu.effect.value * 100)}%`
          : gongfu.effect.type === 'fertilize_efficiency' ? `NPC负责的地块施肥效率 +${Math.round(gongfu.effect.value * 100)}%`
          : gongfu.effect.type === 'pest_resistance' ? `NPC负责的地块虫害概率 -${Math.round(gongfu.effect.value * 100)}%`
          : gongfu.effect.type === 'spirit_regen' ? `NPC负责的地块灵气回复 +${Math.round(gongfu.effect.value * 100)}%`
          : gongfu.effect.type === 'winter_protection' ? 'NPC负责的地块冬季冻害免疫'
          : gongfu.effect.type === 'yield_bonus' ? `NPC负责的地块产量 +${Math.round(gongfu.effect.value * 100)}%`
          : gongfu.effect.type === 'spirit_plot_unlock' ? '解锁灵田升级功能（可将普通农田改造为灵田）'
          : gongfu.effect.value}
      </div>

      {/* 研究进度条 */}
      {isResearching && (
        <div>
          <div className="flex justify-between text-[10px] text-blue-300 mb-1">
            <span>参悟进度</span>
            <span>{pct}% · 还需 {daysLeft} 天</span>
          </div>
          <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {canResearch && !researched && !isResearching && (
        <button onClick={() => onResearch(gongfu.id)}
          className="mt-auto px-3 py-1.5 text-xs bg-amber-700/60 hover:bg-amber-600/60 text-amber-200 rounded transition-colors">
          开始参悟 ({gongfu.researchCost}天)
        </button>
      )}
      {isResearching && (
        <button onClick={onCancel}
          className="mt-auto px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-400 rounded transition-colors">
          停止参悟
        </button>
      )}
    </div>
  );
}

// ====== NPC 学习卡片 ======
function NPCLearningCard({ npc, learning, gongfuInfo, researchedGongfu, hasMentor, onStartLearn, onCancelLearn }) {
  const isLearning = !!learning;
  const pct = isLearning ? Math.floor((learning.progress / learning.totalTicks) * 100) : 0;
  const daysLeft = isLearning ? Math.ceil((learning.totalTicks - learning.progress) / TICKS_PER_DAY) : 0;

  // 可学习的功法列表
  const canLearnList = researchedGongfu.filter(gId => {
    if (npc.learnedGongfu && npc.learnedGongfu.includes(gId)) return false;
    if (isLearning && learning.gongfuId === gId) return false;
    return true;
  });

  return (
    <div className={`rounded-lg border p-3 ${npc.isRetired ? 'border-stone-700/30 bg-stone-800/10 opacity-50' : 'border-stone-700/50 bg-stone-800/30'} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-xs text-stone-300">
            {npc.gender === 'female' ? '♀' : '♂'}
          </div>
          <div>
            <div className="text-sm text-stone-200 font-bold">{npc.name}</div>
            <div className="text-[10px] text-stone-500">{npc.age}岁 · 耕种Lv.{npc.knowledgeAttributes.farming || 0}</div>
          </div>
        </div>
        {npc.isRetired && <span className="text-[10px] text-stone-500">已退休</span>}
        {npc.posts.length > 0 && (
          <div className="flex gap-1">
            {npc.posts.map(p => (
              <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-300">{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* 已学会的功法 */}
      {npc.learnedGongfu && npc.learnedGongfu.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {npc.learnedGongfu.map(gId => {
            const g = gongfuInfo[gId];
            return g ? (
              <span key={gId} className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/30">
                {g.icon} {g.name}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* 正在学习 */}
      {isLearning && (
        <div>
          <div className="flex justify-between text-[10px] text-blue-300 mb-1">
            <span>正在修习「{gongfuInfo[learning.gongfuId]?.name}」{learning.hasMentor ? '(有导师)' : ''}</span>
            <span>{pct}% · {daysLeft}天</span>
          </div>
          <div className="w-full h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <button onClick={() => onCancelLearn(npc.id)}
            className="mt-1.5 w-full px-2 py-1 text-[10px] bg-stone-700 hover:bg-stone-600 text-stone-400 rounded transition-colors">
            停止修习
          </button>
        </div>
      )}

      {/* 可学习的功法 */}
      {!isLearning && !npc.isRetired && canLearnList.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {canLearnList.map(gId => {
            const g = gongfuInfo[gId];
            return g ? (
              <button key={gId} onClick={() => onStartLearn(npc.id, gId)}
                className="text-[10px] px-2 py-1 rounded border border-stone-600/50 hover:border-purple-500/50 hover:bg-purple-900/20 text-stone-400 hover:text-purple-300 transition-colors">
                {g.icon} 学习{g.name}
              </button>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ====== 主面板 ======
export default function ResearchPanel({ game, onAction }) {
  const [activeTab, setActiveTab] = useState('posts'); // posts | gongfu | learning

  const rs = game.researchSystem;
  if (!rs || !rs.unlocked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <span className="text-4xl mb-3">🔒</span>
        <div className="text-sm">司务堂尚未开启</div>
        <div className="text-xs text-stone-600 mt-1">完成首次招募后解锁</div>
      </div>
    );
  }

  const allPosts = getAllPosts().filter(p => p.id !== 'farmer');
  const allGongfu = getAllGongfu();

  // 构建 gongfuInfo map
  const gongfuInfo = {};
  for (const g of allGongfu) gongfuInfo[g.id] = g;

  const handleResearchPost = (postId) => onAction('research_post', { postId });
  const handleResearchGongfu = (gongfuId) => onAction('start_gongfu_research', { gongfuId });
  const handleCancelGongfu = () => onAction('cancel_gongfu_research');
  const handleStartLearn = (charId, gongfuId) => onAction('start_learn_gongfu', { characterId: charId, gongfuId });
  const handleCancelLearn = (charId) => onAction('cancel_learn_gongfu', { characterId: charId });

  const TABS = [
    { id: 'posts', label: '执事册', icon: '📋' },
    { id: 'gongfu', label: '功法帖', icon: '📜' },
    { id: 'learning', label: '传功', icon: '🎓' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏛</span>
        <h2 className="text-lg font-bold text-cyan-400">司务堂</h2>
        <span className="text-xs text-stone-500">管理岗位与功法</span>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-4">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${activeTab === tab.id
                ? 'bg-cyan-700/60 text-cyan-200 border border-cyan-600/50'
                : 'bg-stone-800/50 text-stone-400 border border-stone-700/30 hover:text-stone-300 hover:bg-stone-700/50'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 执事册（岗位研究） */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allPosts.map(post => (
            <PostCard key={post.id} post={post}
              researched={rs.isPostResearched(post.id)}
              canResearch={rs.canResearchPost(post.id)}
              onResearch={handleResearchPost}
            />
          ))}
        </div>
      )}

      {/* 功法帖（功法研究） */}
      {activeTab === 'gongfu' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allGongfu.map(gongfu => {
            const isResearching = rs.currentGongfuResearch?.gongfuId === gongfu.id;
            return (
              <GongfuCard key={gongfu.id} gongfu={gongfu}
                researched={rs.isGongfuResearched(gongfu.id)}
                canResearch={rs.canResearchGongfu(gongfu.id)}
                isResearching={isResearching}
                researchProgress={isResearching ? rs.currentGongfuResearch : null}
                onResearch={handleResearchGongfu}
                onCancel={handleCancelGongfu}
              />
            );
          })}
        </div>
      )}

      {/* 传功（NPC 功法学习） */}
      {activeTab === 'learning' && (
        <div>
          <div className="text-xs text-stone-500 mb-3">
            安排 NPC 学习已参悟的功法。功法绑定个人，退休后失效。有已学会该功法的 NPC 在场时，学习速度加快。
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[game.player, ...game.characters].map(npc => (
              <NPCLearningCard key={npc.id} npc={npc}
                learning={rs.npcLearning.get(npc.id) || null}
                gongfuInfo={gongfuInfo}
                researchedGongfu={[...rs.researchedGongfu]}
                hasMentor={rs.hasMentor}
                onStartLearn={handleStartLearn}
                onCancelLearn={handleCancelLearn}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
