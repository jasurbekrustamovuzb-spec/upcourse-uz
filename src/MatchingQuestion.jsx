import React, { useEffect, useMemo, useState } from 'react';
import { Check, Link2, RotateCcw, X } from 'lucide-react';
import { C, fontBody, fontMono } from './App';

function shuffleArray(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function pairText(pair, side) {
  if (Array.isArray(pair)) return pair[side === 'left' ? 0 : 1] || '';
  return pair?.[side] || '';
}

export function isMatchingComplete(question, value) {
  const total = question?.pairs?.length || 0;
  return Array.isArray(value)
    && value.length === total
    && value.every((item) => Number.isInteger(item) && item >= 0 && item < total);
}

export default function MatchingQuestion({ question, value, onChange, disabled = false, showResult = false }) {
  const pairs = question?.pairs || [];
  const [selectedLeft, setSelectedLeft] = useState(null);
  const rightOrder = useMemo(() => shuffleArray(pairs.map((_, index) => index)), [question?.id, pairs.length]);
  const mapping = Array.isArray(value) ? value : [];

  useEffect(() => {
    setSelectedLeft(null);
  }, [question?.id]);

  function chooseLeft(index) {
    if (disabled) return;
    setSelectedLeft(index);
  }

  function chooseRight(rightIndex) {
    if (disabled || selectedLeft === null) return;
    const next = Array.from({ length: pairs.length }, (_, index) => mapping[index] ?? null);
    const previousLeft = next.findIndex((item) => Number(item) === rightIndex);
    if (previousLeft !== -1 && previousLeft !== selectedLeft) next[previousLeft] = null;
    next[selectedLeft] = rightIndex;
    onChange(next);
    const nextLeft = next.findIndex((item, index) => item === null && index !== selectedLeft);
    setSelectedLeft(nextLeft === -1 ? null : nextLeft);
  }

  function clearAll() {
    if (disabled) return;
    onChange(Array(pairs.length).fill(null));
    setSelectedLeft(0);
  }

  const complete = isMatchingComplete(question, mapping);
  const getPairStyle = (leftIndex) => {
    const correct = Number(mapping[leftIndex]) === leftIndex;
    if (showResult && complete) {
      return { background: correct ? C.successTint : C.dangerTint, border: correct ? C.accent : C.red };
    }
    if (selectedLeft === leftIndex) return { background: C.selectedTint, border: C.gold };
    if (mapping[leftIndex] !== null && mapping[leftIndex] !== undefined) return { background: C.liveTint, border: C.live };
    return { background: C.surface, border: C.rule };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          <Link2 size={14} className="inline mr-1" style={{ verticalAlign: '-2px', color: C.gold }} />
          Chap tomondagi bandni tanlang, keyin o‘ng tomondagi mos javobni bosing.
        </div>
        {!disabled && mapping.some((item) => item !== null && item !== undefined) && (
          <button onClick={clearAll} className="inline-flex items-center gap-1 text-xs flex-shrink-0" style={{ ...fontBody, color: C.inkSoft }}>
            <RotateCcw size={12} /> Tozalash
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Tushunchalar</div>
          {pairs.map((pair, leftIndex) => {
            const style = getPairStyle(leftIndex);
            const matched = mapping[leftIndex] !== null && mapping[leftIndex] !== undefined;
            return (
              <button
                key={leftIndex}
                onClick={() => chooseLeft(leftIndex)}
                disabled={disabled}
                aria-pressed={selectedLeft === leftIndex}
                className="w-full min-h-[48px] text-left flex items-center gap-2 px-3 py-2 rounded-xl text-[14px] transition-colors focus-visible:outline focus-visible:outline-2"
                style={{ ...fontBody, ...style, color: C.ink, outlineColor: C.gold }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px]" style={{ ...fontMono, color: matched ? C.white : C.inkSoft, background: matched ? C.live : C.paperSoft, border: '1px solid ' + (matched ? C.live : C.rule) }}>
                  {matched ? <Check size={12} /> : leftIndex + 1}
                </span>
                <span className="min-w-0">{pairText(pair, 'left')}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide" style={{ ...fontMono, color: C.inkSoft }}>Mos javoblar</div>
          {rightOrder.map((rightIndex) => {
            const usedBy = mapping.findIndex((item) => Number(item) === rightIndex);
            const correct = usedBy === rightIndex;
            const style = showResult && complete
              ? { background: correct ? C.successTint : C.dangerTint, border: correct ? C.accent : C.red }
              : { background: usedBy >= 0 ? C.liveTint : C.surface, border: usedBy >= 0 ? C.live : C.rule };
            return (
              <button
                key={rightIndex}
                onClick={() => chooseRight(rightIndex)}
                disabled={disabled || selectedLeft === null}
                className="w-full min-h-[48px] text-left flex items-center gap-2 px-3 py-2 rounded-xl text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 disabled:cursor-default"
                style={{ ...fontBody, ...style, color: C.ink, outlineColor: C.gold }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[11px]" style={{ ...fontMono, color: usedBy >= 0 ? C.white : C.inkSoft, background: usedBy >= 0 ? C.live : C.paperSoft, border: '1px solid ' + (usedBy >= 0 ? C.live : C.rule) }}>
                  {usedBy >= 0 ? usedBy + 1 : rightIndex + 1}
                </span>
                <span className="min-w-0">{pairText(pairs[rightIndex], 'right')}</span>
                {showResult && complete && (correct ? <Check size={14} className="ml-auto flex-shrink-0" style={{ color: C.accent }} /> : <X size={14} className="ml-auto flex-shrink-0" style={{ color: C.red }} />)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-xs" style={{ ...fontMono, color: showResult && complete ? (mapping.every((item, index) => Number(item) === index) ? C.accent : C.red) : C.inkSoft }}>
        {showResult && complete
          ? (mapping.every((item, index) => Number(item) === index) ? 'Barcha juftliklar to‘g‘ri.' : 'Ba’zi juftliklar mos kelmadi.')
          : mapping.filter((item) => item !== null && item !== undefined).length + '/' + pairs.length + ' juftlik tanlandi'}
      </div>
    </div>
  );
}
