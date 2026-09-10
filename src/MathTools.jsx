import React, { useEffect, useRef } from 'react';
import 'mathlive';
import { convertLatexToMarkup } from 'mathlive';

/* ------------------------------------------------------------------ */
/*  MathTools.jsx — matematik formulalarni kiritish va koʻrsatish       */
/*  uchun MathLive kutubxonasi ustiga qurilgan, saytimiz uslubiga       */
/*  moslashtirilgan ikkita komponent.                                   */
/*                                                                      */
/*  MUHIM: bu fayl App.jsx'da React.lazy() orqali, FAQAT foydalanuvchi  */
/*  matematik test bilan ishlaganda (yaratganda yoki yechganda)         */
/*  yuklanadi — LiveQuiz.jsx/AdminPanel.jsx bilan bir xil tamoyil.      */
/*  Oddiy kurs/test bilan ishlaydigan foydalanuvchi uchun bu fayl       */
/*  umuman yuklanmaydi, sahifa tezligiga taʼsir qilmaydi.               */
/* ------------------------------------------------------------------ */

/* MathLive'ning ichki CSS oʻzgaruvchilari orqali — saytimizning oltin/
   yashil uslubiga moslaymiz. Bir marta, modul yuklanganda qoʻyiladi. */
let themeInjected = false;
function injectTheme() {
  if (themeInjected) return;
  themeInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    math-field {
      --primary: #B8860B;
      --caret-color: #B8860B;
      --selection-color: #1F3D2B;
      --selection-background-color: rgba(184,134,11,0.16);
      --contains-highlight-background-color: rgba(184,134,11,0.10);
      --placeholder-color: #9CA3AF;
      font-size: 17px;
    }
  `;
  document.head.appendChild(style);
}

/* Tahrirlanadigan maydon — savol/javob yozish uchun. TextField bilan
   bir xil ko'rinishda (pastki chiziq uslubi) — formadan ajralib
   turmasligi uchun. LaTeX matnini (masalan "\\frac{1}{2}") saqlaydi. */
export function MathField({ label, value, onChange, placeholder }) {
  const ref = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => { injectTheme(); }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => onChangeRef.current(el.value);
    el.addEventListener('input', handler);
    return () => el.removeEventListener('input', handler);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && el.value !== (value || '')) el.value = value || '';
  }, [value]);

  return (
    <label className="block mb-4">
      {label && <span className="block text-xs mb-1 tracking-wide uppercase" style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: '#8A8578' }}>{label}</span>}
      {/* eslint-disable-next-line */}
      <math-field
        ref={ref}
        placeholder={placeholder}
        style={{ display: 'block', width: '100%', padding: '8px 2px', borderBottom: '1px solid #E4DFD1', background: 'transparent' }}
      />
    </label>
  );
}

/* Faqat koʻrsatish uchun — tahrirlab boʻlmaydigan, tez render
   qilinadigan formula. Testni yechuvchilarga savol/variantlarni
   chiroyli koʻrsatish uchun ishlatiladi. LaTeX matnini kiritadi. */
export function MathDisplay({ latex, className }) {
  useEffect(() => { injectTheme(); }, []);
  if (!latex) return null;
  let html;
  try {
    html = convertLatexToMarkup(latex);
  } catch (e) {
    html = latex; // LaTeX xato bo'lib qolsa ham, xom matnni ko'rsatib, sahifa buzilmaydi
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
