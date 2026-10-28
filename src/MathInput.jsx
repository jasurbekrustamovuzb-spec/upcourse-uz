import { useRef, useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { C, fontBody } from './App.jsx';

const KEYS = [
  ['+', '+'], ['−', '−'], ['×', '×'], ['÷', '÷'], ['/', '/'], ['xʸ', '^'],
  ['√', '√('], ['π', 'π'], ['e', 'e'], ['°', '°'], ['(', '('], [')', ')'], ['sin', 'sin('], ['cos', 'cos('],
  ['tan', 'tan('], ['log', 'log('], ['ln', 'ln('],
];

/** Small, on-demand math symbol pad. The text field remains usable with the native keyboard. */
export default function MathInput({ value, onChange, onBlur, placeholder, label, rows = 2, disabled = false }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);

  function insert(token) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="mb-3">
      {label && <label className="block text-xs mb-1.5" style={{ ...fontBody, color: C.inkSoft }}>{label}</label>}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-xl text-[15px] outline-none resize-y disabled:opacity-70"
        style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, minHeight: rows === 1 ? 44 : 72 }}
      />
      <div className="mt-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs disabled:opacity-50"
          style={{ ...fontBody, color: C.mathDeep, background: C.mathTint, border: `1px solid ${C.mathSoft}` }}
        >
          <Calculator size={14} /> Belgilar {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-5 gap-1.5 rounded-xl p-2" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
          {KEYS.map(([caption, token]) => (
            <button
              type="button"
              key={caption}
              onClick={() => insert(token)}
              className="min-h-10 rounded-lg px-1 text-sm active:scale-95 focus-visible:outline focus-visible:outline-2"
              style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              aria-label={`${caption} belgisini kiritish`}
            >{caption}</button>
          ))}
        </div>
      )}
    </div>
  );
}