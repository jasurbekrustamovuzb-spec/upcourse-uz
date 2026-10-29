import { useEffect, useRef } from 'react';
import 'mathlive';
import 'mathlive/fonts.css';
import { convertAsciiMathToLatex } from 'mathlive';
import { C, fontBody } from './App.jsx';

const mathKeyboardLayouts = [
  {
    label: 'Asosiy',
    tooltip: 'Asosiy matematik belgilar',
    rows: [
      ['\\frac{#@}{#?}', '\\sqrt{#0}', '#@^{#?}', '\\log(#0)', '\\sin(#0)', '\\cos(#0)', '\\pi', '='],
      ['7', '8', '9', '−', '\\times', '\\div', '(', ')'],
      ['4', '5', '6', '+', '.', ',', '<', '>'],
      ['1', '2', '3', '0', 'x', 'y', '\\le', '\\ge'],
    ],
  },
  'numeric',
  'symbols',
  'greek',
];

/**
 * MathLive is imported only by lazy-loaded math forms and math questions.
 * App state stores compact AsciiMath strings; the editor renders them as
 * structured notation and offers MathLive's touch keyboard on phones.
 */
export default function MathInput({ value = '', onChange, onBlur, placeholder, label, disabled = false, readOnly = false, compact = false }) {
  const fieldRef = useRef(null);
  const emittedValueRef = useRef(value);
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.mathVirtualKeyboardPolicy = 'auto';
    field.mathVirtualKeyboardLayouts = mathKeyboardLayouts;
    field.smartFence = true;
    field.smartMode = false;
    // MathLive's default scroll-into-view can move a long test while its
    // virtual keyboard opens. Keep the question anchored in place instead.
    field.onScrollIntoView = () => {};
    const syncState = (event) => {
      const ascii = event.target.getValue('ascii-math').trim();
      emittedValueRef.current = ascii;
      onChangeRef.current?.(ascii);
    };
    const handleBlur = () => onBlurRef.current?.();
    field.addEventListener('input', syncState);
    field.addEventListener('focusout', handleBlur);
    return () => {
      field.removeEventListener('input', syncState);
      field.removeEventListener('focusout', handleBlur);
    };
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    if (field) { field.readOnly = readOnly; field.disabled = disabled; }
  }, [readOnly, disabled]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      emittedValueRef.current = value;
      field.value = value ? convertAsciiMathToLatex(value) : '';
      return;
    }
    if (value === emittedValueRef.current) return;
    emittedValueRef.current = value;
    field.value = value ? convertAsciiMathToLatex(value) : '';
  }, [value]);

  return (
    <div className={compact ? 'min-w-0 max-w-full' : 'mb-3 min-w-0 max-w-full'} style={{ overflowAnchor: 'none' }}>
      {label && <label className="block text-xs mb-1.5" style={{ ...fontBody, color: C.inkSoft }}>{label}</label>}
      <math-field
        ref={fieldRef}
        aria-label={label || 'Matematik ifoda'}
        placeholder={placeholder}
        read-only={readOnly ? '' : undefined}
        disabled={disabled ? '' : undefined}
        className="upcourse-math-field"
        style={{
          display: 'block', width: '100%', minWidth: 0, maxWidth: '100%', minHeight: compact ? 38 : 48,
          padding: compact ? '6px 9px' : '9px 12px', borderRadius: 10,
          color: C.ink, background: readOnly ? 'transparent' : C.surface,
          border: readOnly ? '0' : `1px solid ${C.rule}`,
          fontSize: compact ? 16 : 19, boxSizing: 'border-box',
          opacity: disabled ? 0.7 : 1,
        }}
      />
    </div>
  );
}


