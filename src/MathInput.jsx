import { useContext, useEffect, useRef } from 'react';
import 'mathlive';
import 'mathlive/fonts.css';
import { convertAsciiMathToLatex } from 'mathlive';
import { C, fontBody, NavContext } from './App.jsx';

const mathKeyboardLayouts = [
  {
    id: 'upcourse-numeric',
    label: '123',
    labelClass: 'MLK__tex-math',
    tooltip: 'keyboard.tooltip.numeric',
    rows: [
      [
        { latex: 'x', shift: 'y', variants: ['y', 'z', 't', 'r', 'x^2', 'x^n', 'x^{#?}', 'x_n', 'x_i', 'x_{#?}'] },
        { latex: 'n', shift: 'a', variants: ['i', 'j', 'p', 'k', 'a', 'u'] }, '[7]', '[8]', '[9]', '[/]',
        { latex: '\\exponentialE', shift: '\\ln', variants: ['\\ln', '\\log_{#?}', '\\lg'] },
        { latex: '\\imaginaryI', shift: '\\ln', variants: ['\\ln', '\\lg'] },
        { latex: '\\pi', shift: '\\sin', variants: ['\\sin', '\\cos', '\\tan', { latex: '\\cot', label: 'ctg' }] }, { latex: '\\infty' },
      ],
      [
        { label: '<', latex: '<', class: 'hide-shift', variants: [{ latex: '\\le', label: '≤' }, { latex: '>', label: '>' }, { latex: '\\ge', label: '≥' }] },
        { label: '>', latex: '>', class: 'hide-shift', variants: [{ latex: '\\ge', label: '≥' }, { latex: '<', label: '<' }, { latex: '\\le', label: '≤' }] },
        '[4]', '[5]', '[6]', '[*]',
        { class: 'hide-shift', latex: '#@^2', shift: '#@^{#?}', variants: ['#@^{#?}', '#@^3', '#@^4', '#@^n'] },
        { latex: '#@_{#?}', class: 'hide-shift', shift: '#@_{#?}' },
        { class: 'hide-shift', latex: '\\sqrt{#?}', shift: { latex: '\\sqrt[#?]{#?}', label: 'ⁿ√' }, variants: [{ latex: '\\sqrt[3]{#?}', label: '³√' }, { latex: '\\sqrt[4]{#?}', label: '⁴√' }, { latex: '\\sqrt[#?]{#?}', label: 'ⁿ√' }] },
        { class: 'hide-shift', latex: '\\log_{#?}', label: 'logₐ' },
      ],
      [
        { label: '(', latex: '(', variants: ['[', '{'] }, { label: ')', latex: ')', variants: [']', '}'] }, '[1]', '[2]', '[3]', '[-]',
        { class: 'small', latex: '\\frac{#?}{#?}', variants: [{ latex: '\\frac{#?}{#?}' }, { latex: '#?\\,\\frac{#?}{#?}' }] },
        { latex: '\\int\\!#?\\,\\mathrm{d}x', class: 'small hide-shift', shift: '\\int', variants: [{ latex: '\\int_{#?}^{#?}', class: 'small' }, { latex: '\\iint', class: 'small' }, { latex: '\\oint', class: 'small' }, '\\partial'] },
        { latex: '\\cot', label: 'ctg' }, { label: '[backspace]' },
      ],
      [
        '[0]', '[.]', '[=]', '[+]', { latex: '\\sin', label: 'sin' }, { latex: '\\cos', label: 'cos' }, '[left]', '[right]', '[up]', '[down]',
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
  const { registerOverlayBackHandler } = useContext(NavContext);
  const fieldRef = useRef(null);
  const unregisterKeyboardBackRef = useRef(null);
  const emittedValueRef = useRef(value);
  const initializedRef = useRef(false);
  const mountedMathfieldRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    let mounted = true;
    let unregister = null;
    const syncState = (event) => {
      const ascii = event.target.getValue('ascii-math').trim();
      emittedValueRef.current = ascii;
      onChangeRef.current?.(ascii);
    };
    const handleBlur = () => onBlurRef.current?.();
    const closeKeyboard = () => {
      try { window.mathVirtualKeyboard?.hide(); } catch {}
      if (document.activeElement === field) field.blur();
      unregisterKeyboardBackRef.current?.();
      unregisterKeyboardBackRef.current = null;
    };
    const handleFocus = () => {
      try { window.mathVirtualKeyboard?.show({ animate: true }); } catch {}
      window.requestAnimationFrame(() => {
        if (mounted && field.isConnected) {
          try { window.mathVirtualKeyboard?.update(field); } catch {}
        }
      });
      if (unregisterKeyboardBackRef.current) return;
      unregisterKeyboardBackRef.current = registerOverlayBackHandler?.(closeKeyboard) || null;
    };
    const handleFocusOut = (event) => {
      handleBlur();
      if (event.relatedTarget !== field) {
        unregisterKeyboardBackRef.current?.();
        unregisterKeyboardBackRef.current = null;
      }
    };
    field.addEventListener('input', syncState);
    field.addEventListener('focusin', handleFocus);
    field.addEventListener('focusout', handleFocusOut);
    let menuObserver = null;
    const hideMenuToggle = () => {
      // MathLive places these controls in light DOM, so shadowRoot lookup misses them.
      const menu = field.querySelector('[part=\"menu-toggle\"]');
      if (menu && menu.style.display !== 'none') menu.style.display = 'none';
    };
    const initializeMathfield = () => {
      if (!mounted || mountedMathfieldRef.current) return;
      // Configure nonessential options independently so one unsupported option
      // cannot prevent focus handling or the touch keyboard from working.
      try { field.mathVirtualKeyboardPolicy = 'manual'; } catch {}
      try { field.menuItems = []; } catch {}
      try { field.smartFence = true; } catch {}
      try { field.smartMode = false; } catch {}
      try { field.onScrollIntoView = () => {}; } catch {}
      try { if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.layouts = mathKeyboardLayouts; } catch (error) { console.warn('Klaviatura sxemasi yuklanmadi:', error); }
      hideMenuToggle();
      if (!menuObserver) {
        menuObserver = new MutationObserver(hideMenuToggle);
        menuObserver.observe(field, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
      }
      mountedMathfieldRef.current = true;
    };
    field.addEventListener('mount', initializeMathfield);
    // The effect can run after MathLive already emitted mount.
    try { field.getValue('latex'); initializeMathfield(); } catch {}
    return () => {
      mounted = false;
      try { window.mathVirtualKeyboard?.hide({ animate: false }); } catch {}
      field.removeEventListener('mount', initializeMathfield);
      field.removeEventListener('input', syncState);
      field.removeEventListener('focusin', handleFocus);
      field.removeEventListener('focusout', handleFocusOut);
      menuObserver?.disconnect();
      mountedMathfieldRef.current = false;
      unregisterKeyboardBackRef.current?.();
      unregisterKeyboardBackRef.current = null;
    };
  }, [registerOverlayBackHandler]);

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
    <>
    <style>{`.upcourse-math-field::part(menu-toggle){display:none!important}`}</style>
    <div className={compact ? 'min-w-0 max-w-full' : 'mb-3 min-w-0 max-w-full'} style={{ overflowAnchor: 'none' }}>
      {label && <label className="block text-xs mb-1.5" style={{ ...fontBody, color: C.inkSoft }}>{label}</label>}
      <div className="relative">
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
    </div>
    </>
  );
}


