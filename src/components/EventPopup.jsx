import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function EventPopup({ event, onResolve }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={24} className="text-amber-400" />
          <h2 className="text-2xl font-bold text-amber-400">{event.name}</h2>
        </div>

        <p className="text-slate-300 mb-6 text-lg">{event.description}</p>

        <div className="space-y-3">
          {event.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => onResolve(i)}
              className="w-full p-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 border border-slate-600 hover:border-amber-500 rounded transition-all text-left group"
            >
              <div className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                {choice.text}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {Object.entries(choice.effects).map(([key, value]) => {
                  const sign = value > 0 ? '+' : '';
                  return `${key}: ${sign}${value}`;
                }).join(' | ')}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
