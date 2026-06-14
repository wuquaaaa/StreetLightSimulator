import { useState } from 'react';
import { Store, Package, TrendingUp, Users, MapPin, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { TRANSPORT_ROUTES } from '../engine/TransportSystem';

const TIER_LABELS = {
  poor: { label: '穷人', icon: '👤', color: 'text-stone-400' },
  normal: { label: '普通人', icon: '🧑', color: 'text-stone-300' },
  rich: { label: '富人', icon: '🎩', color: 'text-amber-400' },
  wealthy: { label: '豪商', icon: '👑', color: 'text-yellow-400' },
};

// ========== 贩子Tab ==========
function TraderTab({ game, onAction }) {
  const sales = game.salesSystem;
  const [haggleIdx, setHaggleIdx] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');

  // 仓库中可上架的商品
  const warehouseItems = [];
  const categories = [
    { cat: 'food', items: ['wheat', 'corn', 'turnip'] },
    { cat: 'herb', items: ['pill_heal', 'pill_buff', 'pill_fortune'] },
    { cat: 'mineral', items: ['iron_ingot', 'copper_ingot', 'spirit_stone'] },
  ];
  for (const { cat, items } of categories) {
    for (const itemId of items) {
      const amt = game.warehouse.getItemAmount(cat, itemId);
      if (amt > 0) {
        warehouseItems.push({ id: itemId, category: cat, amount: amt });
      }
    }
  }

  const handleHaggle = (idx) => {
    if (!offerPrice || isNaN(offerPrice)) return;
    onAction('haggle_customer', { customerIndex: idx, offerPrice: parseInt(offerPrice) });
    setHaggleIdx(null);
    setOfferPrice('');
  };

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Store size={14} className="text-yellow-400" />
        <h3 className="text-sm font-bold text-stone-300">商铺售卖</h3>
      </div>

      {/* 声望 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-400">声望</span>
          <span className="text-sm text-yellow-400 font-bold">{Math.round(sales.reputation)}/100</span>
        </div>
        <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${sales.reputation}%` }} />
        </div>
        <div className="text-[10px] text-stone-600 mt-1">
          声望影响客流量: 每日约 {3 + Math.floor(sales.reputation / 20)} 位顾客
        </div>
      </div>

      {/* 上架商品 + 竞品价格 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">📦 上架管理</div>
        {Object.keys(sales.shopStock).length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {Object.entries(sales.shopStock).map(([id, stock]) => {
              const myPrice = sales.pricing[id] || stock.price;
              const competitors = sales.getCompetitorPrices?.(id) || [];
              return (
                <div key={id} className="bg-stone-800/50 rounded px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-300">{stock.name}</span>
                      <span className="text-[10px] text-stone-500">×{stock.amount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500">定价:</span>
                      <input
                        type="number"
                        value={myPrice}
                        onChange={(e) => onAction('set_item_price', { itemId: id, price: parseFloat(e.target.value) || 1 })}
                        className="w-14 bg-stone-700 text-xs text-amber-400 px-1.5 py-0.5 rounded text-center outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-stone-600">两</span>
                    </div>
                  </div>
                  {competitors.length > 0 && (
                    <div className="flex gap-2 mt-1 text-[9px]">
                      {competitors.map((c, i) => (
                        <span key={i} className={`px-1.5 py-0.5 rounded ${
                          myPrice > c.price ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                        }`}>
                          {c.name}: {c.price.toFixed(2)}两
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-stone-600 text-xs py-2 mb-2">货架空空如也</div>
        )}

        {/* 可上架商品 */}
        {warehouseItems.length > 0 && (
          <div>
            <div className="text-[10px] text-stone-500 mb-1">从仓库上架:</div>
            <div className="flex flex-wrap gap-1">
              {warehouseItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onAction('stock_shop_item', { itemId: item.id, category: item.category, amount: 1 })}
                  className="px-2 py-1 text-[10px] bg-stone-700/50 hover:bg-stone-600/50 text-stone-300 rounded transition-colors"
                >
                  +{item.id} ({item.amount})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 今日顾客 */}
      <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-stone-400 font-semibold flex items-center gap-1.5">
            <Users size={12} /> 今日顾客 ({sales.dailyCustomers?.length || 0})
          </div>
        </div>
        {(!sales.dailyCustomers || sales.dailyCustomers.length === 0) ? (
          <div className="text-center text-stone-600 text-xs py-3">今天没有顾客</div>
        ) : (
          <div className="space-y-2">
            {sales.dailyCustomers.map((customer, idx) => {
              const tier = TIER_LABELS[customer.tier] || TIER_LABELS.normal;
              const wantItem = customer.wantItem ? (sales.shopStock[customer.wantItem]?.name || customer.wantItem) : '无目标';
              const isHaggling = haggleIdx === idx;

              return (
                <div key={idx} className="bg-stone-800/50 rounded-lg p-2 border border-stone-700/20">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{tier.icon}</span>
                      <span className="text-xs text-stone-200">{customer.name}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${tier.color} bg-stone-700/50`}>{tier.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-stone-500">预算</span>
                      <span className="text-xs text-amber-400">{customer.budget}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-stone-500">
                      想买: <span className="text-stone-300">{wantItem}</span>
                      {customer.wantItem && (
                        <span className="ml-2">出价: <span className="text-green-400">{customer.offerPrice}</span></span>
                      )}
                    </div>
                    {customer.wantItem && !isHaggling && (
                      <button
                        onClick={() => { setHaggleIdx(idx); setOfferPrice(customer.offerPrice); }}
                        className="text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        议价
                      </button>
                    )}
                  </div>
                  {isHaggling && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-700/30">
                      <input
                        type="number"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        className="flex-1 bg-stone-700 text-xs text-amber-400 px-2 py-1 rounded outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="你的报价"
                        autoFocus
                      />
                      <button onClick={() => handleHaggle(idx)}
                        className="px-2 py-1 text-[10px] bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 rounded">
                        出价
                      </button>
                      <button onClick={() => { setHaggleIdx(null); setOfferPrice(''); }}
                        className="px-2 py-1 text-[10px] bg-stone-700/50 text-stone-400 rounded">
                        取消
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 运工Tab ==========
function PorterTab({ game, onAction }) {
  const transport = game.transportSystem;

  // 仓库库存概览
  const stockSummary = [];
  const cats = [
    { cat: 'mineral', label: '矿石' },
    { cat: 'herb', label: '草药' },
    { cat: 'food', label: '食物' },
    { cat: 'fuel', label: '燃料' },
  ];
  for (const { cat, label } of cats) {
    const storage = game.warehouse.storage?.[cat];
    if (storage?.items) {
      for (const [id, item] of Object.entries(storage.items)) {
        if (item.amount > 0) {
          stockSummary.push({ id, name: item.name || id, category: cat, amount: item.amount, label });
        }
      }
    }
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Package size={14} className="text-blue-400" />
        <h3 className="text-sm font-bold text-stone-300">运输管理</h3>
      </div>

      {/* 运输路线 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">🗺️ 运输路线</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(TRANSPORT_ROUTES).map(([id, route]) => {
            const activeTrip = Object.values(transport.activeTrips || {}).find(t => t.routeId === id);
            const progress = activeTrip ? Math.round((activeTrip.progress / activeTrip.total) * 100) : 0;

            return (
              <div key={id} className={`rounded-lg border p-2 ${activeTrip ? 'border-blue-700/40 bg-blue-900/10' : 'border-stone-700/30 bg-stone-900/20'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{route.icon}</span>
                    <span className="text-xs text-stone-200">{route.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {route.risk > 0.05 && <AlertTriangle size={10} className="text-orange-400" />}
                    <span className="text-[9px] text-stone-600">风险 {Math.round(route.risk * 100)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                  <span>距离 {route.distance} · 负重 {route.maxLoad}</span>
                </div>
                {activeTrip && (
                  <div className="mt-1">
                    <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] mt-0.5">
                      <span className="text-blue-400">运输中 {activeTrip.cargo} ×{activeTrip.load}</span>
                      <span className="text-stone-500">{progress}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 仓库库存概览 */}
      <div className="bg-stone-900/50 rounded-lg p-3 mb-4 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">📦 仓库库存</div>
        {stockSummary.length === 0 ? (
          <div className="text-center text-stone-600 text-xs py-3">仓库空空如也</div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {stockSummary.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-stone-800/50 rounded px-2 py-1">
                <span className="text-[10px] text-stone-300 truncate">{item.name}</span>
                <span className="text-[10px] text-amber-400 shrink-0">{item.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 手动发起运输 */}
      <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/30">
        <div className="text-xs text-stone-400 font-semibold mb-2">🚀 发起运输</div>
        <div className="text-[10px] text-stone-600 mb-2">选择路线和货物，手动发起运输任务</div>
        <div className="space-y-1.5">
          {Object.entries(TRANSPORT_ROUTES).map(([id, route]) => {
            const isActive = Object.values(transport.activeTrips || {}).some(t => t.routeId === id);
            return (
              <div key={id} className="flex items-center justify-between bg-stone-800/50 rounded px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{route.icon}</span>
                  <span className="text-xs text-stone-300">{route.name}</span>
                </div>
                <button
                  disabled={isActive}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                    isActive ? 'bg-stone-700/30 text-stone-600 cursor-not-allowed' : 'bg-blue-800/60 hover:bg-blue-700/60 text-blue-200'
                  }`}>
                  {isActive ? '运输中' : '出发'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== 主面板 ==========
export default function ShopPanel({ game, onAction }) {
  const [activeTab, setActiveTab] = useState('trader');

  const tabs = [
    { id: 'trader', label: '贩子', icon: '💰' },
    { id: 'porter', label: '运工', icon: '📦' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏪</span>
        <h2 className="text-lg font-bold text-amber-400">商铺</h2>
        <span className="text-xs text-stone-500">（贩子/运工）</span>
      </div>

      <div className="flex gap-1 mb-4 bg-stone-900/50 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-800/60 text-amber-200'
                : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'trader' && <TraderTab game={game} onAction={onAction} />}
      {activeTab === 'porter' && <PorterTab game={game} onAction={onAction} />}
    </div>
  );
}
