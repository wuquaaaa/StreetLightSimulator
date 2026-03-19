import { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';

export default function GameLog({ log }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
        <ScrollText size={12} className="text-stone-500" />
        <span className="text-xs text-stone-500 font-medium">日志</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5 text-xs text-stone-400">
        {log.map((msg, i) => (
          <div key={i} className={`leading-relaxed ${i === log.length - 1 ? 'text-stone-200' : ''}`}>
            {msg}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
