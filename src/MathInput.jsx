import { useEffect, useRef } from 'react';
import 'mathlive';
import 'mathlive/fonts.css';
import { convertAsciiMathToLatex } from 'mathlive';
import { C, fontBody } from './App.jsx';

const mathKeyboardLayouts = [
  {
    id: 'upcourse-numeric',
    label: '123',
    labelClass: 'MLK__tex-math',
    tooltip: 'keyboard.tooltip.numeric',
    rows: [
      [
        { latex: 'x', shift: 'y', variants: ['y', 'z', 't', 'r', 'x^2', 'x^n', 'x^{#?}', 'x_n', 'x_i', 'x_{#?}'] },
        { latex: 'n', shift: 'a', variants: ['i', 'j', 'p', 'k', 'a', 'u'] },
        '[separator-5]', '[7]', '[8]', '[9]', '[/]', '[separator-5]',
        { latex: '\\exponentialE', shift: '\\ln', variants: ['\\exp', '\\times 10^{#?}', '\\ln', '\\log_{10}', '\\log'] },
        { latex: '\\imaginaryI', variants: ['\\Re', '\\Im', '\\imaginaryJ'] },
        { latex: '\\pi', shift: '\\sin', variants: ['\\prod', '\\theta', '\\rho', '\\tau', '\\sin', '\\cos', '\\tan'] },
      ],
      [
        { label: '<', latex: '<', class: 'hide-shift', shift: { latex: '\\le', label: '≤' } },
        { label: '>', latex: '>', class: 'hide-shift', shift: { latex: '\\ge', label: '≥' } },
        '[separator-5]', '[4]', '[5]', '[6]', '[*]', '[separator-5]',
        { class: 'hide-shift', latex: '#@^2}', shift: '#@^{\\prime}}' },
        { latex: '#@^{#0}}', class: 'hide-shift', shift: '#@_{#?}' },
        { class: 'hide-shift', latex: '\\sqrt{#0}', shift: { latex: '\\sqrt[#0]{#?}}' } },
      ],
      [
        '[(]', '[)]', '[separator-5]', '[1]', '[2]', '[3]', '[-]',
        { label: 'a⁄b', class: 'small', insert: '\\frac{#?}{#?}', tooltip: 'Kasr' },
        { latex: '\\int^{\\infty}_{0}\\!#?\\,\\mathrm{d}x', class: 'small hide-shift', shift: '\\int', variants: [{ latex: '\\int_{#?}^{#?}', class: 'small' }, { latex: '\\iint', class: 'small' }, { latex: '\\oint', class: 'small' }, '\\partial'] },
        { label: '≈', latex: '\\approx', class: 'hide-shift' },
        { label: '[backspace]', width: 1 },
      ],
      [
        { label: '[shift]', width: 2 }, '[separator-5]', '[0]', '[.]', '[=]', '[+]', '[separator-5]', '[left]', '[right]', { label: '[action]', width: 1 },
      ],
    ],
  },
  'symbols',
  'alphabetic',
  'greek',
];

/**
 * MathLive is imported only by lazy-loaded math forms and math questions.
 * App state stores compact AsciiMath strings; the editor renders them as
 * structured notation and offers MathLive's touch keyboard on phones.
 */
export default function MathInput({ value = '', onChange, onBlur, placeholder, label, disabled = false, readOnly = false, compact = false, scale = 1 }) {
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
    // MathLive reads layouts from the shared virtual keyboard, not from the
    // field element. Configure it only when a math input is actually mounted
    // (this component is lazy-loaded, so it does not add work to the homepage).
    if (typeof window !== 'undefined' && window.mathVirtualKeyboard) {
      window.mathVirtualKeyboard.layouts = mathKeyboardLayouts;
    }
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
          fontSize: Math.round((compact ? 16 : 19) * scale), boxSizing: 'border-box',
          opacity: disabled ? 0.7 : 1,
        }}
      />
    </div>
  );
}


