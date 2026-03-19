import React, { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';

export default function GameLog({ game }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [game.log.length]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
        <ScrollText size={16} className="text-amber-400" />
        <h3 className="text-sm font-bold text-amber-400">游戏日志</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 text-xs">
        {game.log.map((log, i) => (
          <div key={i} className="text-slate-400 leading-relaxed">
            <span className="text-slate-500">[{game.log.length - i}]</span> {log}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
