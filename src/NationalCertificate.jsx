import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));
import { Award, ArrowLeft, CalendarClock, CheckCircle2, Clock3, ExternalLink, Eye, FileCheck2, LoaderCircle, Pause, Play, Search, Share2, ShieldCheck, UserRound, X, Plus, CalendarDays } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { C, NavContext, fontBody, fontDisplay, fontMono } from './App.jsx';

const card = { background: C.surface, border: `1px solid ${C.rule}` };
const CERT_BLUE = '#72549b';
const CERT_TINT = '#f4eff8';
const CERT_BORDER = '#ded3e9';
const CERT_CYAN = '#328c87';
const btn = { ...fontBody, minHeight: 42, minWidth: 0, maxWidth: '100%', padding: '8px 14px', borderRadius: 10, fontWeight: 650, overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.25 };
const localTime = (value) => value ? new Date(value).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const fullNameOf = (profile) => [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
const formatClock = (seconds) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

async function certificatePdf(attempt, exam, verifyUrl) {
  const canvas = document.createElement('canvas'); canvas.width = 1684; canvas.height = 1190;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0,0,1684,1190); bg.addColorStop(0,'#fffdf8'); bg.addColorStop(.56,'#f1f3fa'); bg.addColorStop(1,'#e7f2f1'); ctx.fillStyle=bg; ctx.fillRect(0,0,1684,1190);
  ctx.strokeStyle='#c9b88d'; ctx.lineWidth=6; ctx.strokeRect(34,34,1616,1122); ctx.strokeStyle='#ded3e9'; ctx.lineWidth=2; ctx.strokeRect(52,52,1580,1086);
  const center = (text,y,size,color='#26334a',weight='400') => {ctx.font=`${weight} ${size}px Arial, sans-serif`;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,842,y);};
  center('UPCOURSE UZ  ·  MILLIY SERTIFIKATGA TAYYORGARLIK',145,27,'#72549b','700');
  center('Mock test sertifikati',230,66,'#24304a','700');
  center('NAMUNAVIY IMTIHON NATIJASI',280,23,'#328c87','700');
  ctx.fillStyle='#72549b';ctx.fillRect(142,315,1400,2);
  ctx.textAlign='left';ctx.fillStyle='#536176';ctx.font='28px Arial';ctx.fillText('Ushbu sertifikat',170,390);
  ctx.fillStyle='#24304a';ctx.font='bold 58px Arial';ctx.fillText(attempt.full_name || '',170,465);
  ctx.fillStyle='#536176';ctx.font='27px Arial';ctx.fillText('UpCourse.uz platformasidagi namunaviy milliy sertifikat imtihoni natijasi',170,520);
  ctx.font='bold 30px Arial';ctx.fillStyle='#72549b';ctx.fillText(`${exam.subject} · ${exam.title}`,170,580);
  ctx.fillStyle='#fff';ctx.fillRect(170,625,620,170);ctx.fillRect(825,625,620,170);
  ctx.fillStyle='#536176';ctx.font='24px Arial';ctx.fillText('Natija',205,675);ctx.fillText('Daraja',860,675);
  ctx.fillStyle='#26334a';ctx.font='bold 48px Arial';ctx.fillText(`${Number(attempt.score).toFixed(1)} ball`,205,750);ctx.fillText(attempt.grade || '—',860,750);
  ctx.fillStyle='#536176';ctx.font='22px Arial';ctx.fillText(`Sertifikat ID: ${attempt.certificate_id}`,170,870);ctx.fillText(`Berilgan sana: ${localTime(attempt.submitted_at)}`,170,915);
  ctx.fillStyle='#536176';ctx.font='20px Arial';ctx.fillText('Haqiqiyligini tekshirish:',170,1010);ctx.fillStyle='#72549b';ctx.font='18px Arial';ctx.fillText(verifyUrl.slice(0,130),170,1045);
  ctx.textAlign='right';ctx.fillStyle='#24304a';ctx.font='bold 23px Arial';ctx.fillText('J. RUSTAMOV',1510,1084);ctx.fillStyle='#536176';ctx.font='18px Arial';ctx.fillText('UpCourse.uz',1510,1118);
  const jpeg = new Uint8Array(await new Promise((resolve) => canvas.toBlob((blob) => blob.arrayBuffer().then(resolve),'image/jpeg',.94)));
  const enc = (s) => new TextEncoder().encode(s); const chunks=[enc('%PDF-1.4\n%âãÏÓ\n')]; const offsets=[0]; let length=chunks[0].length;
  const add = (id, data) => { offsets[id]=length; const chunk=typeof data==='string'?enc(data):data;chunks.push(chunk);length+=chunk.length; };
  add(1,'1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  add(2,'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  add(3,'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
  add(4,'4 0 obj\n<< /Length 31 >>\nstream\nq 842 0 0 595 0 0 cm /Im0 Do Q\nendstream\nendobj\n');
  add(5,enc(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`)); chunks.push(jpeg);length+=jpeg.length; add(0,'\nendstream\nendobj\n');
  const xref=length; let table='xref\n0 6\n0000000000 65535 f \n'; for(let i=1;i<=5;i++)table+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  add(0,`${table}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks,{type:'application/pdf'});
}

function Button({ children, onClick, tone = 'dark', disabled, type = 'button', compact = false }) {
  const tones = { dark: { color: C.white, background: CERT_BLUE }, light: { color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }, gold: { color: C.ink, background: CERT_TINT }, red: { color: C.white, background: C.red } };
  return <button type={type} disabled={disabled} onClick={onClick} className="inline-flex max-w-full min-w-0 items-center justify-center gap-2 whitespace-normal break-words disabled:cursor-not-allowed disabled:opacity-50" style={{ ...btn, ...(compact ? { minHeight: 34, padding: '6px 10px', fontSize: 12 } : {}), ...tones[tone] }}>{children}</button>;
}

function Field({ label, ...props }) {
  return <label className="block text-sm" style={{ ...fontBody, color: C.ink }}>{label}<input {...props} className="mt-1.5 w-full rounded-lg px-3 py-2.5 outline-none" style={{ color: C.ink, background: C.paper, border: `1px solid ${C.rule}` }} /></label>;
}

function CertificateCard({ attempt, exam, onBack, previewOnly = false }) {
  const verifyUrl = `${window.location.origin}${window.location.pathname}?verifyCertificate=${encodeURIComponent(attempt.certificate_id)}`;
  const mockUrl = `${window.location.origin}${window.location.pathname}?section=testlar`;
  const shareText = `Men UpCourse.uz ta’lim platformasida ${exam.subject} fanidan Milliy sertifikat mock sinovida qatnashib, ${Number(attempt.score).toFixed(1)} ball — ${attempt.grade} natijani qo‘lga kiritdim. Siz ham quyidagi havola orqali mock testida qatnashib, Milliy sertifikat imtihoniga tayyorlaning:`;
  const downloadPdf = async () => {
    const blob = await certificatePdf(attempt, exam, verifyUrl); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `UpCourse-${exam.subject}-sertifikat.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  const share = async () => {
    const blob = await certificatePdf(attempt, exam, verifyUrl); const pdf = new File([blob], `UpCourse-${exam.subject}-sertifikat.pdf`, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [pdf] })) await navigator.share({ title: `${exam.subject} fanidan Milliy sertifikat natijam`, text: shareText, url: mockUrl, files: [pdf] }).catch(() => {});
    else {
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = pdf.name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      if (navigator.share) await navigator.share({ title: `${exam.subject} fanidan Milliy sertifikat natijam`, text: shareText, url: mockUrl }).catch(() => {});
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${shareText}\n${mockUrl}`);
    }
  };
  return <div>
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={16} /> Natijalarga qaytish</button>
    <article id="mock-certificate" className="mx-auto max-w-4xl overflow-hidden rounded-2xl p-5 sm:p-10" style={{ background: 'linear-gradient(135deg,#ffffff,#f0f4ff 58%,#eaf8fb)', border: `1px solid ${CERT_BORDER}`, color: '#24304a', boxShadow: '0 18px 45px #4966c81c' }}>
      <div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ color: '#fff', background: `linear-gradient(135deg,${CERT_BLUE},${CERT_CYAN})` }}><Award size={29} /></div><div className="mt-3 text-xs font-semibold tracking-[.16em]" style={{color:CERT_BLUE}}>UPCOURSE UZ · MOCK NATIJASI</div><h1 className="mt-3 text-2xl font-bold sm:text-4xl" style={fontDisplay}>Mock test sertifikati</h1><p className="mt-2 text-xs tracking-wide" style={{color:'#68748d'}}>MILLIY SERTIFIKATGA TAYYORGARLIK NATIJASI</p></div>
      <div className="my-6 h-px" style={{ background: CERT_BORDER }} />
      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm">Ushbu sertifikat</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">{attempt.full_name}</h2><p className="mt-3 text-sm">UpCourse.uz platformasida o‘tkazilgan namunaviy milliy sertifikat imtihonida muvaffaqiyatli natija ko‘rsatgani uchun ushbu sertifikat berildi.</p><p className="mt-2 text-sm"><strong>{exam.subject}</strong> · {exam.title}</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl p-3" style={{ background: '#ffffffa8' }}>Natija<strong className="mt-1 block text-xl">{Number(attempt.score).toFixed(1)} ball</strong></div><div className="rounded-xl p-3" style={{ background: '#ffffffa8' }}>Daraja<strong className="mt-1 block text-xl">{attempt.grade}</strong></div></div><p className="mt-4 text-xs">Sertifikat ID: <strong>{attempt.certificate_id}</strong></p><p className="mt-1 text-xs">Berilgan sana: {localTime(attempt.submitted_at)}</p></div><div className="flex flex-col items-center gap-2 rounded-xl p-4" style={{ background: '#fff' }}><div className="grid h-24 w-24 place-items-center rounded-full" style={{ color: '#64748b', background: '#edf0f1' }}><UserRound size={44} /></div><img className="h-28 w-28" src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`} alt={`Sertifikat ${attempt.certificate_id} tekshiruv QR kodi`} /><span className="max-w-32 break-all text-center text-[10px]">Tekshirish ID: {attempt.certificate_id}</span>{!previewOnly && <a className="text-xs underline" href={verifyUrl} target="_blank" rel="noreferrer">Sertifikatni tekshirish</a>}</div></div>
      <div className="mt-7 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: CERT_BORDER }}><p className="text-xs">Direktor<br /><strong className="mt-1 inline-block text-sm">J. RUSTAMOV</strong></p><p className="max-w-xl text-center text-xs font-bold">UpCourse.uz · Namunaviy milliy sertifikat imtihoni natijasi</p><p className="text-xs sm:text-right">Test: {exam.title}</p></div>
    </article>
    <div className="mx-auto mt-4 flex max-w-4xl flex-wrap gap-2">{previewOnly ? <Button tone="light" onClick={onBack}><ArrowLeft size={16} /> Orqaga</Button> : <><Button onClick={downloadPdf}><FileCheck2 size={16} /> PDF yuklab olish</Button><Button tone="light" onClick={share}><Share2 size={16} /> PDF va natijani ulashish</Button><Button tone="light" onClick={() => window.open(verifyUrl, '_blank', 'noopener,noreferrer')}><ShieldCheck size={16} /> Tekshirish sahifasi</Button></>}</div>
    <style>{`@media print { body * { visibility:hidden !important; } #mock-certificate,#mock-certificate * { visibility:visible !important; } #mock-certificate { position:absolute;inset:0;margin:0 auto;width:100%;box-shadow:none !important; } @page { size:A4 landscape; margin:12mm; } }`}</style>
  </div>;
}

function VerifyCertificate({ initialId = '' }) {
  const [id, setId] = useState(initialId);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);
  const verify = async (event) => {
    event?.preventDefault(); setBusy(true); setError(''); setResult(null);
    const { data, error: rpcError } = await supabase.rpc('certificate_mock_verify', { p_certificate_id: id.trim() });
    setBusy(false);
    if (rpcError) setError('Tekshirish xizmati hozircha mavjud emas. Tizim administratoriga murojaat qiling.');
    else if (!data?.valid) setError(data?.revoked ? 'Bu sertifikat bekor qilingan.' : 'Bu ID bo‘yicha berilgan sertifikat topilmadi.');
    else setResult(data);
  };
  useEffect(() => { if (initialId) verify(); }, [initialId]);
  if (showCertificate && result) return <CertificateCard attempt={{...result,submitted_at:result.issued_at}} exam={{subject:result.subject,title:result.exam_title}} onBack={()=>setShowCertificate(false)} />;
  const shareVerified = async () => { const url=`${window.location.origin}${window.location.pathname}?verifyCertificate=${encodeURIComponent(result.certificate_id)}`; const mockUrl=`${window.location.origin}${window.location.pathname}?section=testlar`; const exam={subject:result.subject,title:result.exam_title||'Milliy sertifikat mock'}; const attempt={...result,submitted_at:result.issued_at}; const blob=await certificatePdf(attempt,exam,url); const file=new File([blob],`UpCourse-${exam.subject}-sertifikat.pdf`,{type:'application/pdf'}); const text=`Men UpCourse.uz ta’lim platformasida ${exam.subject} fanidan Milliy sertifikat mock sinovida qatnashib, ${Number(result.score).toFixed(1)} ball — ${result.grade} natijani qo‘lga kiritdim. Siz ham quyidagi havola orqali mock testida qatnashib, Milliy sertifikat imtihoniga tayyorlaning:`; if(navigator.canShare?.({files:[file]})) await navigator.share({title:`${exam.subject} fanidan natijam`,text,url:mockUrl,files:[file]}).catch(()=>{}); else { const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000); if(navigator.share) await navigator.share({title:`${exam.subject} fanidan natijam`,text,url:mockUrl}).catch(()=>{}); else await navigator.clipboard?.writeText(`${text}\n${mockUrl}`); } };
  return <section className="mx-auto w-full min-w-0 max-w-xl rounded-2xl p-4 sm:p-7" style={card}><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ color: CERT_BLUE, background: CERT_TINT }}><ShieldCheck size={23} /></span><div className="min-w-0"><h2 className="text-xl font-semibold" style={{ ...fontDisplay, color: C.ink }}>Sertifikatni tekshirish</h2><p className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>ID orqali mock natijasini tasdiqlang.</p></div></div><form onSubmit={verify} className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"><input required value={id} onChange={(e) => setId(e.target.value)} placeholder="UC-MOCK-…" className="min-w-0 max-w-full rounded-lg px-3" style={{ background: C.paper, border: `1px solid ${C.rule}` }} /><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Tekshirish</Button></form>{error && <p role="alert" className="mt-4 rounded-lg p-3 text-sm" style={{ color: C.red, background: '#fcebea' }}>{error}</p>}{result && <div className="mt-4 min-w-0 rounded-xl p-4" style={{ background: CERT_TINT, border: `1px solid ${CERT_CYAN}` }}><p className="flex items-center gap-2 font-semibold" style={{ color: CERT_CYAN }}><CheckCircle2 size={18} /> Sertifikat tasdiqlandi · UpCourse Uz mock</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm" style={{ color: C.ink }}><span>Ism-familiya</span><strong className="break-words">{result.full_name}</strong><span>Fan</span><strong className="break-words">{result.subject}</strong><span>Natija</span><strong>{Number(result.score).toFixed(1)} · {result.grade}</strong><span>Berilgan sana</span><strong>{localTime(result.issued_at)}</strong></div><p className="mt-3 text-xs" style={{ color: C.inkSoft }}>Ball ushbu platformadagi namunaviy imtihon natijasini bildiradi.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>setShowCertificate(true)}><FileCheck2 size={16}/> Sertifikatni ko‘rish</Button><Button tone="light" onClick={async()=>{const url=`${window.location.origin}${window.location.pathname}?verifyCertificate=${encodeURIComponent(result.certificate_id)}`;const blob=await certificatePdf({...result,submitted_at:result.issued_at},{subject:result.subject,title:result.exam_title||'Milliy sertifikat mock'},url);const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`UpCourse-${result.subject}-sertifikat.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}}><FileCheck2 size={16}/> PDF yuklab olish</Button><Button tone="light" onClick={shareVerified}><Share2 size={16}/> PDF va natijani ulashish</Button></div></div>}</section>;
}

export default function NationalCertificate({ tests = [], session, profile, isAdmin, onBack, initialVerifyId = '' }) {
  const [exams, setExams] = useState([]); const [sessions, setSessions] = useState([]); const [attempts, setAttempts] = useState([]); const [auditEvents, setAuditEvents] = useState([]);
  const [view, setView] = useState(initialVerifyId ? 'verify' : 'home'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); const [attempt, setAttempt] = useState(null); const [activeExam, setActiveExam] = useState(null); const [questions, setQuestions] = useState([]); const [answers, setAnswers] = useState({}); const [seconds, setSeconds] = useState(0); const [leaveOpen, setLeaveOpen] = useState(false);
  const [examForm, setExamForm] = useState({ test_id: '', subject: 'Matematika', title: '', duration_minutes: 180, is_enabled: true });
  const [sessionForm, setSessionForm] = useState({ exam_id: '', title: '', starts_at: '', ends_at: '' });
  const [examQuery, setExamQuery] = useState(''); const [infoOpen, setInfoOpen] = useState(false); const [questionText, setQuestionText] = useState('');
  const finishLock = useRef(false);
  const { registerBackGuard } = useContext(NavContext);
  const currentName = fullNameOf(profile);
  const [fullName, setFullName] = useState(currentName);
  const sessionAttempts = useMemo(() => attempts.filter((a) => a.session_id), [attempts]);
  useEffect(() => {
    const root = document.documentElement;
    const previousKeyboardZIndex = root.style.getPropertyValue('--keyboard-zindex');
    const hideKeyboard = () => { try { window.mathVirtualKeyboard?.hide({ animate: false }); } catch {} };
    if (view === 'attempt') root.style.setProperty('--keyboard-zindex', '140');
    else hideKeyboard();
    return () => {
      if (view === 'attempt') {
        hideKeyboard();
        if (previousKeyboardZIndex) root.style.setProperty('--keyboard-zindex', previousKeyboardZIndex);
        else root.style.removeProperty('--keyboard-zindex');
      }
    };
  }, [view]);
  const localTests = useMemo(() => new Map(tests.map((t) => [String(t.id), t])), [tests]);

  const loadData = useCallback(async () => {
    setError('');
    const [ex, se, at, events, certificateRows] = await Promise.all([
      supabase.from('certificate_mock_exams').select('*').order('created_at', { ascending: false }),
      supabase.from('certificate_mock_sessions').select('*').order('starts_at', { ascending: true }),
      session?.user?.id ? supabase.from('certificate_mock_attempts').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
      isAdmin ? supabase.from('certificate_events').select('*').order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
      isAdmin ? supabase.from('certificates').select('certificate_id,status') : Promise.resolve({ data: [], error: null }),
    ]);
    const failed = ex.error || se.error || at.error || events.error || certificateRows.error;
    if (failed) { setError(/certificate_mock/i.test(failed.message) ? 'Milliy sertifikat jadvallari hali Supabase’da yaratilmagan. Yakundagi SQL migratsiyani qo‘llang.' : 'Ma’lumotlarni yuklab bo‘lmadi. Qayta urinib ko‘ring.'); return; }
    const certificateStatus = new Map((certificateRows.data || []).map((row) => [row.certificate_id, row.status]));
    setExams(ex.data || []); setSessions(se.data || []); setAttempts((at.data || []).map((row) => ({ ...row, certificate_status: certificateStatus.get(row.certificate_id) || null }))); setAuditEvents(events.data || []);
  }, [session?.user?.id, isAdmin]);
  useEffect(() => { loadData(); }, [loadData]);

  const makeAttempt = async (exam, examSession = null, resume = null) => {
    if (!session?.user?.id) { setError('Mock test uchun avval profilingizga kiring.'); return; }
    setBusy(true); setError('');
    const { data, error: rpcError } = resume
      ? await supabase.rpc('certificate_mock_resume', { p_attempt_id: resume.id })
      : await supabase.rpc('certificate_mock_begin', { p_exam_id: exam.id, p_session_id: examSession?.id || null, p_full_name: fullName.trim() });
    setBusy(false);
    if (rpcError) { setError(rpcError.message.includes('SESSION_CLOSED') ? 'Jonli testning kirish vaqti yopildi.' : rpcError.message.includes('ATTEMPT_ALREADY_FINISHED') ? 'Bu sessiyadagi urinishingiz allaqachon yakunlangan.' : 'Testni boshlab bo‘lmadi. Ism-familiya va test jadvalini tekshiring.'); return; }
    const nextAttempt = data.attempt; const testId = data.exam.test_id;
    const [{ data: safeQuestions, error: questionError }, { data: testInfo }] = await Promise.all([
      supabase.rpc('certificate_mock_get_questions', { p_attempt_id: nextAttempt.id }),
      supabase.from('tests').select('id,title,description').eq('id', testId).maybeSingle(),
    ]);
    if (questionError || !safeQuestions?.length) { setError('Mock savollarini yuklab bo‘lmadi. Sessiya oynasi yoki SQL migratsiyani tekshiring.'); return; }
    setSelected({ exam, session: examSession }); setActiveExam({ ...exam, testTitle: testInfo?.title || exam.title, description: testInfo?.description || '' }); setQuestions(safeQuestions); setAttempt(nextAttempt); setAnswers(nextAttempt.answers || resume?.answers || {}); setSeconds(Number(nextAttempt.active_seconds || 0)); setView('attempt');
  };

  const persistAnswers = useCallback(async (pause = false) => {
    if (!attempt) return null;
    const { data, error: rpcError } = await supabase.rpc('certificate_mock_save', { p_attempt_id: attempt.id, p_answers: answers, p_pause: pause });
    if (rpcError) { setError(rpcError.message.includes('TIME_EXPIRED') || rpcError.message.includes('SESSION_CLOSED') ? 'Test vaqti tugadi. Natija yakunlanmoqda.' : `Javoblar saqlanmadi: ${rpcError.message}`); return null; }
    setAttempt(data); return data;
  }, [attempt, answers]);

  const finish = useCallback(async () => {
    if (!attempt || finishLock.current) return;
    finishLock.current = true;
    setBusy(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('certificate_mock_finish', { p_attempt_id: attempt.id, p_answers: answers });
    setBusy(false); finishLock.current = false;
    if (rpcError) { setError(rpcError.message.includes('TIME_EXPIRED') ? 'Test vaqti tugadi. Yakuniy natija saqlanmoqda.' : `Testni yakunlab bo‘lmadi: ${rpcError.message}`); if (rpcError.message.includes('TIME_EXPIRED')) { await persistAnswers(true); } return; }
    setAttempt(data); setAttempts((prev) => [data, ...prev.filter((a) => a.id !== data.id)]); setView(data.grade ? 'certificate' : 'result'); await loadData();
  }, [attempt, answers, loadData, persistAnswers]);

  useEffect(() => {
    if (view !== 'attempt' || !attempt || attempt.status !== 'in_progress') return undefined;
    const tick = () => {
      const now = Date.now();
      const running = Number(attempt.active_seconds || 0) + Math.max(0, Math.floor((now - new Date(attempt.resumed_at || now).getTime()) / 1000));
      setSeconds(running);
      const scheduleExpired = selected?.session?.ends_at && now >= new Date(selected.session.ends_at).getTime();
      if (running >= Number(activeExam?.duration_minutes || 180) * 60 || scheduleExpired) finish();
    };
    const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [view, attempt?.id, attempt?.status, attempt?.active_seconds, attempt?.resumed_at, selected?.session?.ends_at, activeExam?.duration_minutes, finish]);

  useEffect(() => {
    if (view !== 'attempt') return undefined;
    const guard = registerBackGuard?.(() => setLeaveOpen(true));
    const beforeUnload = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { guard?.(); window.removeEventListener('beforeunload', beforeUnload); };
  }, [view, registerBackGuard]);

  useEffect(() => {
    if (view !== 'attempt' || !attempt) return undefined;
    const timer = setTimeout(async () => {
      const { error: saveError } = await supabase.rpc('certificate_mock_save', { p_attempt_id: attempt.id, p_answers: answers, p_pause: false });
      if (saveError && view === 'attempt') setError('Javobni serverga saqlashda uzilish bo‘ldi. Internetni tekshiring.');
    }, 700);
    return () => clearTimeout(timer);
  }, [answers, view, attempt?.id]);

  const pauseAndExit = async () => { setBusy(true); const saved = await persistAnswers(true); setBusy(false); if (saved) { await loadData(); setView('home'); setAttempt(null); setLeaveOpen(false); } };
  const createExam = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    const { error: insertError } = await supabase.from('certificate_mock_exams').insert({ ...examForm, duration_minutes: Number(examForm.duration_minutes), created_by: session.user.id });
    setBusy(false); if (insertError) setError('Mockni yaratib bo‘lmadi. Milliy sertifikat ruxsatlari uchun yangi SQL migratsiyani Supabase’da ishga tushiring.'); else { setExamForm({ test_id: '', subject: 'Matematika', title: '', duration_minutes: 180, is_enabled: true }); await loadData(); }
  };
  const createSession = async (event) => {
    event.preventDefault(); setError('');
    const startsAt = new Date(sessionForm.starts_at); const endsAt = new Date(sessionForm.ends_at);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt <= new Date() || endsAt <= startsAt) { setError('Boshlanish va tugash vaqtini tekshiring. Boshlanish hozirgi vaqtdan keyin bo‘lishi kerak.'); return; }
    setBusy(true);
    const { error: insertError } = await supabase.from('certificate_mock_sessions').insert({ exam_id: sessionForm.exam_id, title: sessionForm.title, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), created_by: session.user.id });
    setBusy(false); if (insertError) setError('Jonli sessiyani yaratib bo‘lmadi. Sana-vaqtlarni tekshiring.'); else { setSessionForm({ exam_id: '', title: '', starts_at: '', ends_at: '' }); await loadData(); }
  };
  const revokeCertificate = async (certificateId) => {
    const reason = window.prompt('Sertifikatni bekor qilish sababini yozing:');
    if (!reason || reason.trim().length < 5) return;
    setBusy(true);
    const { error: revokeError } = await supabase.rpc('certificate_revoke', { p_certificate_id: certificateId, p_reason: reason.trim() });
    setBusy(false);
    if (revokeError) setError('Sertifikatni bekor qilib bo‘lmadi. Admin ruxsati va SQL migratsiyani tekshiring.');
    else await loadData();
  };

  const onAnswer = (questionId, value) => setAnswers((old) => ({ ...old, [questionId]: value }));
  const activeSession = (s) => s.status === 'scheduled' && Date.now() >= new Date(s.starts_at).getTime() && Date.now() < new Date(s.ends_at).getTime();
  const sessionExam = (s) => exams.find((e) => e.id === s.exam_id);

  if (view === 'verify') return <div><button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={16} /> Testlar</button><VerifyCertificate initialId={initialVerifyId} /></div>;
  if (view === 'certificate') return <CertificateCard attempt={attempt} exam={activeExam} onBack={() => { setView('home'); loadData(); }} />;
  if (view === 'sample') return <CertificateCard previewOnly attempt={{full_name:'Bunyodbek Rustamov',score:81,grade:'A+',certificate_id:'UC-MOCK-NAMUNA-BUNYODBEK-RUSTAMOV',submitted_at:'2026-11-13T00:00:00Z'}} exam={{subject:'Matematika',title:'Namunaviy milliy sertifikat imtihoni'}} onBack={()=>setView('home')} />;
  if (view === 'result') return <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl p-5 sm:p-8" style={{ ...card, borderColor: CERT_BORDER, background: 'linear-gradient(135deg,#ffffff,#f7f1fb 62%,#edf8f6)' }}><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ color: CERT_BLUE, background: CERT_TINT }}><CheckCircle2 size={25} /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider" style={{color:CERT_CYAN}}>Mock sinov yakunlandi</p><h2 className="text-xl font-bold sm:text-2xl" style={{ ...fontDisplay, color: C.ink }}>Natijangiz</h2></div></div><p className="mt-4 break-words font-semibold" style={{ ...fontBody, color: C.ink }}>{activeExam?.subject} · {attempt?.full_name}</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><div className="rounded-2xl p-4" style={{background:'#ffffffd9',border:`1px solid ${CERT_BORDER}`}}><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-sm" style={{color:'#68748d'}}><Award size={17} style={{color:CERT_BLUE}}/> Mock balli</span><strong className="text-2xl" style={{...fontMono,color:CERT_BLUE}}>{Number(attempt?.score || 0).toFixed(1)}<span className="ml-1 text-sm">ball</span></strong></div></div><div className="flex min-w-32 items-center gap-3 rounded-2xl p-4" style={{background:'#ffffffd9',border:`1px solid ${CERT_BORDER}`}}><span className="grid h-10 w-10 place-items-center rounded-xl" style={{color:CERT_CYAN,background:CERT_TINT}}><FileCheck2 size={21}/></span><div><span className="block text-xs" style={{color:'#68748d'}}>Daraja</span><strong className="text-lg" style={{color:CERT_BLUE}}>{attempt?.grade || '—'}</strong></div></div></div><p className="mt-4 text-xs leading-5" style={{ ...fontBody, color: C.inkSoft }}>Natija ushbu namunaviy sinovdagi to‘g‘ri javoblar ulushiga asoslanadi va tayyorgarlik darajangizni ko‘rsatadi.</p><div className="mt-5 flex flex-wrap gap-2">{attempt?.certificate_id && <Button onClick={() => setView('certificate')}><FileCheck2 size={16} /> Sertifikatni ko‘rish</Button>}<Button tone="light" onClick={() => { setView('home'); loadData(); }}>Natijalarimga qaytish</Button>{attempt?.certificate_id && <Button tone="light" onClick={async()=>{const url=`${location.origin}${location.pathname}?verifyCertificate=${encodeURIComponent(attempt.certificate_id)}`;if(navigator.share)await navigator.share({title:'Mock natijasi',url}).catch(()=>{});else await navigator.clipboard?.writeText(url)}}><Share2 size={16}/> Ulashish</Button>}</div></section>;
  if (view === 'attempt') return <div className="fixed inset-0 z-[115] overflow-x-hidden overflow-y-auto" style={{ background: C.paper }}><div className="mx-auto w-full max-w-4xl min-w-0 px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2 sm:px-6"><header className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b py-2 sm:flex sm:justify-between sm:gap-3 sm:py-3" style={{ background: C.paper, borderColor: C.rule }}><div className="min-w-0 sm:flex-1"><p className="truncate text-sm font-bold" style={{ ...fontBody, color: C.ink }}>{activeExam?.title}</p><p className="hidden text-xs sm:block" style={{ ...fontBody, color: C.inkSoft }}>{activeExam?.subject} · {selected?.session ? 'Jonli mock' : 'Mustaqil mock'}{selected?.session ? ` · tugash ${localTime(selected.session.ends_at)}` : ''}</p></div><div className="col-span-1 flex min-w-0 items-center justify-end gap-1 sm:col-span-1 sm:gap-2"><span className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-bold sm:flex-none sm:px-3 sm:text-sm" style={{ ...fontMono, color: seconds > activeExam.duration_minutes * 60 - 300 ? C.red : CERT_BLUE, background: CERT_TINT }}><Clock3 size={15} />{formatClock(Math.max(0, activeExam.duration_minutes * 60 - seconds))}</span><Button tone="light" onClick={() => setLeaveOpen(true)} aria-label="Tanaffus"><Pause size={16} /><span className="hidden sm:inline">Tanaffus</span></Button><Button disabled={busy} onClick={finish} aria-label="Testni yakunlash"><CheckCircle2 size={16}/><span className="hidden sm:inline">Yakunlash</span></Button></div></header><div className="my-4 rounded-xl p-3 text-xs" style={{ color: C.inkSoft, background: C.surface }}>Ism-familiya: <strong style={{ color: C.ink }}>{attempt.full_name}</strong> · {Object.keys(answers).length} javob saqlandi <button type="button" onClick={()=>setInfoOpen(true)} aria-label="Test haqida" title="Test haqida" className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full" style={{color:CERT_CYAN}}><Eye size={17}/></button></div>{questions.map((q, index) => <article id={`cert-question-${index}`} key={q.id || index} className="mb-3 min-w-0 pb-3 last:border-b-0" style={{borderColor:CERT_BORDER}}><h2 className="font-semibold leading-relaxed" style={{ ...fontBody, color: C.ink }}><span className="inline-flex shrink-0 items-center gap-1.5 align-middle"><span className="rounded-full px-2 py-1 text-xs" style={{ background: CERT_TINT, color: CERT_BLUE }}>{index + 1}</span>{q.imageUrl && <button type="button" onClick={() => setQuestionText(q.text || "Savol matni berilmagan.")} className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ color: CERT_CYAN, background: "#e9f5f3" }} aria-label="Savol matnini ko‘rish"><Eye size={16} /></button>}</span>{!q.imageUrl && q.text}</h2>{q.imageUrl && <div className="mt-3 min-w-0"><Suspense fallback={<div className="h-28 animate-pulse rounded-xl" style={{background:C.rule}}/>}><PdfQuestionImage src={q.imageUrl} alt={q.text || 'Savol rasmi'} /></Suspense></div>}{q.mathFormula && <p className="mt-2 font-serif text-lg">{q.mathFormula}</p>}{q.type === 'matching' ? <div className="mt-4 space-y-2">{(q.pairs || []).map((pair, pi) => <label key={pair.id || pi} className="grid gap-2 rounded-xl p-3 sm:grid-cols-[1fr_1.2fr] sm:items-center" style={{ background: C.paper, border: `1px solid ${C.rule}` }}><span className="text-sm" style={{ ...fontBody, color: C.ink }}>{pair.text}</span><select value={answers[q.id]?.[pair.id] ?? ''} onChange={(e) => onAnswer(q.id, { ...(answers[q.id] || {}), [pair.id]: e.target.value === '' ? undefined : Number(e.target.value) })} className="rounded-lg px-3 py-2.5" style={{ color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}><option value="">Javobni tanlang</option>{(q.options || []).map((option, oi) => <option key={oi} value={oi}>{option}</option>)}</select></label>)}</div> : q.type === 'open' ? <div className="mt-4">{q.answerMode === 'math' ? <MathAnswer value={answers[q.id] || ''} onChange={(v) => onAnswer(q.id, v)} /> : <input value={answers[q.id] || ''} onChange={(e) => onAnswer(q.id, e.target.value)} className="w-full rounded-xl px-3 py-3" style={{ background: C.paper, border: `1px solid ${C.rule}` }} />}</div> : <div className="mt-4 grid gap-2">{(q.options || []).map((option, oi) => <button key={oi} type="button" onClick={() => onAnswer(q.id, oi)} className="flex items-start gap-3 rounded-xl p-3 text-left" style={{ ...fontBody, color: C.ink, background: answers[q.id] === oi ? CERT_TINT : C.paper, border: `1px solid ${answers[q.id] === oi ? CERT_BLUE : C.rule}` }}><span className="font-bold">{String.fromCharCode(65 + oi)}.</span>{option}</button>)}</div>}</article>)}{error && <p role="alert" className="mb-3 rounded-xl p-3 text-sm" style={{ color: C.red, background: '#fcebea' }}>{error}</p>}<div className="sticky bottom-0 flex justify-end border-t py-3" style={{ background: C.paper, borderColor: C.rule }}><Button disabled={busy} onClick={finish}><CheckCircle2 size={16} /> {busy ? 'Saqlanmoqda…' : 'Testni yakunlash'}</Button></div></div>{leaveOpen && <div className="fixed inset-0 z-20 grid place-items-center bg-black/50 p-4"><section className="w-full max-w-md rounded-2xl p-5" style={{ background: C.paper }}><h2 className="text-lg font-bold" style={{ ...fontDisplay, color: C.ink }}>Tanaffus qilasizmi?</h2><p className="mt-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Javoblar saqlanib, shaxsiy taymer toxtaydi. Jonli sessiya tugash vaqti esa davom etadi.</p><div className="mt-4 grid grid-cols-2 gap-2"><Button tone="light" onClick={() => setLeaveOpen(false)}>Testga qaytish</Button><Button disabled={busy} onClick={pauseAndExit}><Pause size={16} /> Tanaffus</Button></div></section></div>}{questionText && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/45 p-4" onClick={() => setQuestionText('')}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl p-5" style={{background:C.paper}} onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h2 style={{...fontDisplay,color:C.ink}}>Savol matni</h2><button aria-label="Yopish" onClick={() => setQuestionText('')}><X/></button></div><p className="mt-3 whitespace-pre-wrap text-sm" style={{...fontBody,color:C.inkSoft}}>{questionText}</p></section></div>}{infoOpen && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/45 p-4" onClick={()=>setInfoOpen(false)}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl p-5" style={{background:C.paper}} onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h2 style={{...fontDisplay,color:C.ink}}>Test haqida</h2><button aria-label="Yopish" onClick={()=>setInfoOpen(false)}><X/></button></div><p className="mt-3 text-sm" style={{...fontBody,color:C.inkSoft}}>{activeExam?.description || 'Qo‘shimcha ma’lumot berilmagan.'}</p></section></div>}</div>;
  const myResume = attempts.find((a) => ['in_progress','paused'].includes(a.status));
  const verifiedId = new URLSearchParams(window.location.search).get('verifyCertificate') || '';
  return <div className="w-full min-w-0 overflow-x-hidden">
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={16} /> Testlar</button>
     <section className="relative mb-4 min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5" style={{ ...card, background: 'linear-gradient(115deg,#ffffff 0%,#f0f4ff 58%,#eaf8fb 100%)' }}><div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ color:CERT_BLUE, background:CERT_TINT }}><Award size={22}/></span><div className="min-w-0"><p className="text-[11px] font-bold tracking-wide" style={{ ...fontBody, color:CERT_BLUE }}>UPCOURSE UZ · SERTIFIKATGA TAYYORGARLIK</p><h1 className="mt-1 break-words text-xl font-bold sm:text-2xl" style={{ ...fontDisplay, color:C.ink }}>Milliy sertifikat mock sinovlari</h1><p className="mt-1 max-w-2xl text-sm" style={{ ...fontBody, color:C.inkSoft }}>Mustaqil yoki jadvaldagi sinovni tanlang, natijangizni kuzating va mock sertifikatni ulashing.</p></div></div><Button compact tone="light" onClick={()=>setView('sample')}><FileCheck2 size={14}/> Namunaviy sertifikat</Button></div><div className="mt-3 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{color:CERT_BLUE,background:CERT_TINT}}><FileCheck2 size={14}/> Natija va sertifikat</span><span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{color:CERT_CYAN,background:CERT_TINT}}><CalendarClock size={14}/> Mustaqil va jonli sinovlar</span><span className="rounded-full px-2.5 py-1 text-xs" style={{color:C.inkSoft,background:'#ffffffa8'}}>UpCourse.uz · Namunaviy imtihon natijasi</span></div></section>
    {error && <div role="alert" className="mb-4 rounded-xl p-3 text-sm" style={{ color: C.red, background: '#fcebea' }}>{error} <button onClick={loadData} className="ml-2 underline">Qayta yuklash</button></div>}
    {myResume && <section className="mb-5 rounded-2xl p-4 sm:p-5" style={{ ...card, borderColor: CERT_BLUE }}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide" style={{ ...fontMono, color: CERT_BLUE }}>Davom ettiriladigan mock</p><h2 className="mt-1 font-semibold" style={{ ...fontBody, color: C.ink }}>{exams.find((e) => e.id === myResume.exam_id)?.title || 'Mock test'}</h2><p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{myResume.status === 'paused' ? 'Tanaffusda' : 'Davom etmoqda'} · {myResume.full_name}</p></div><Button onClick={() => makeAttempt(exams.find((e) => e.id === myResume.exam_id), sessions.find((s) => s.id === myResume.session_id) || null, myResume)}><Play size={16} /> Davom ettirish</Button></div></section>}
    <div className="mb-4 grid min-w-0 grid-cols-2 gap-2"><Button tone={view==='home'?'dark':'light'} onClick={()=>setView('home')}><FileCheck2 size={16}/> Testlar</Button><Button tone={view==='verify'?'dark':'light'} onClick={()=>setView('verify')}><ShieldCheck size={16}/> Sertifikat ID</Button></div>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold" style={{ ...fontDisplay, color: C.ink }}>{view==='schedule'?'Jadvaldagi jonli mocklar':'Fanlar va mock testlar'}</h2><span className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>{exams.filter((e) => e.is_enabled).length} ta</span></div>{view!=='schedule' && (exams.filter((e) => e.is_enabled).length ? <div className="grid gap-3">{exams.filter((e) => e.is_enabled).map((exam) => <article key={exam.id} className="min-w-0 rounded-2xl p-3 sm:p-4" style={card}><div className="flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3"><div className="min-w-0 flex-1"><span className="rounded-full px-2.5 py-1 text-xs" style={{ color: CERT_BLUE, background: CERT_TINT }}>{exam.subject}</span><h3 className="mt-2 font-semibold" style={{ ...fontBody, color: C.ink }}>{exam.title}</h3><p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{localTests.get(String(exam.test_id))?.title || 'Test savollari'} · {exam.duration_minutes} daqiqa</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0"><Button tone="light" aria-label="Mockni ulashish" onClick={async()=>{const url=`${location.origin}${location.pathname}?section=testlar`;if(navigator.share)await navigator.share({title:exam.title,url}).catch(()=>{});else await navigator.clipboard?.writeText(url)}}><Share2 size={16}/></Button><Button disabled={busy || !session} onClick={() => { setSelected({ exam, session: null }); setFullName(currentName); setView('start'); }}><Play size={16} /> Boshlash</Button></div></div></article>)}</div> : <div className="rounded-2xl p-5 text-sm" style={{ ...card, color: C.inkSoft }}>Hozircha ochiq mock test yo‘q.</div>)}
    <div className="mb-3 mt-7 flex items-center gap-2"><CalendarClock size={18} style={{ color: CERT_BLUE }} /><h2 className="text-xl font-semibold" style={{ ...fontDisplay, color: C.ink }}>Jadvaldagi jonli mocklar</h2></div>{sessions.filter((s) => s.status === 'scheduled' && sessionExam(s)?.is_enabled && new Date(s.ends_at) > new Date()).length ? <div className="grid gap-3">{sessions.filter((s) => s.status === 'scheduled' && sessionExam(s)?.is_enabled && new Date(s.ends_at) > new Date()).map((s) => { const exam = sessionExam(s); const joined = sessionAttempts.find((a) => a.session_id === s.id); return <article key={s.id} className="rounded-2xl p-4" style={card}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: activeSession(s) ? CERT_CYAN : CERT_BLUE }} /><h3 className="font-semibold" style={{ ...fontBody, color: C.ink }}>{s.title}</h3></div><p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{exam?.subject} · {localTime(s.starts_at)} – {localTime(s.ends_at)}</p><p className="mt-1 text-xs" style={{ ...fontBody, color: activeSession(s) ? CERT_CYAN : CERT_BLUE }}>{activeSession(s) ? 'Hozir qo‘shilish mumkin' : 'Boshlanishini kutmoqda'}{joined ? ` · Siz: ${joined.status === 'paused' ? 'tanaffusda' : 'qatnashyapsiz'}` : ''}</p></div><Button disabled={busy || !session || !activeSession(s) || joined?.status === 'submitted'} onClick={() => joined ? makeAttempt(exam, s, joined) : (setSelected({ exam, session: s }), setFullName(currentName), setView('start'))}>{joined ? <Play size={16} /> : <ExternalLink size={15} />}{joined ? 'Davom etish' : 'Qo‘shilish'}</Button></div></article>; })}</div> : <div className="rounded-2xl p-4 text-sm" style={{ ...card, color: C.inkSoft }}>Rejalashtirilgan jonli mocklar yo‘q.</div>}</section>
    <aside className="space-y-5"><section className="rounded-2xl p-4" style={card}><h2 className="font-semibold" style={{ ...fontBody, color: C.ink }}>Mening natijalarim</h2>{attempts.filter((a) => ['submitted','expired'].includes(a.status)).length ? <div className="mt-3 space-y-2">{attempts.filter((a) => ['submitted','expired'].includes(a.status)).map((a) => { const exam = exams.find((e) => e.id === a.exam_id); return <div key={a.id} className="rounded-xl p-3" style={{ background: C.paper }}><p className="text-sm font-medium" style={{ ...fontBody, color: C.ink }}>{exam?.subject || 'Fan'} · {a.grade || 'Darajasiz'}</p><p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{a.score == null ? 'Hisoblanmoqda' : `${Number(a.score).toFixed(1)} ball`} · {localTime(a.submitted_at)}</p>{a.certificate_id && <button onClick={() => { setAttempt(a); setActiveExam({ ...exam, testTitle: exam?.title }); setView('certificate'); }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline" style={{ color: CERT_BLUE }}><FileCheck2 size={14} /> Sertifikatni ko‘rish/yuklash</button>}</div>; })}</div> : <p className="mt-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Test yakunlangach natijalar shu yerda saqlanadi.</p>}</section>
    <VerifyCertificate initialId={verifiedId} />
    <section className="rounded-2xl p-4" style={{ ...card, background: CERT_TINT }}><h2 className="font-semibold" style={{ ...fontBody, color: C.ink }}>Ism-familiyangizni tekshiring</h2><p className="mt-1 text-xs leading-5" style={{ ...fontBody, color: C.inkSoft }}>Sertifikatdagi ism-familiya profilingizdan olinadi. Xato bo‘lsa, testni boshlashdan oldin profil sozlamalarida tuzating.</p><p className="mt-2 text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{currentName || 'Profil ism-familiyasi kiritilmagan'}</p><a href="/?section=profil" className="mt-2 inline-block text-sm font-semibold underline" style={{ color: CERT_BLUE }}>Profilni tahrirlash</a></section></aside></div>
    {view === 'start' && selected && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/45 p-4"><section className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-5" style={{ background: C.paper }}><button onClick={() => setView('home')} className="mb-3 inline-flex items-center gap-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}><X size={16} /> Bekor qilish</button><h2 className="text-xl font-bold" style={{ ...fontDisplay, color: C.ink }}>{selected.exam.title}</h2><p className="mt-1 text-sm" style={{ ...fontBody, color: C.inkSoft }}>{selected.session ? `${localTime(selected.session.starts_at)} – ${localTime(selected.session.ends_at)} · jonli sessiya` : 'Mustaqil mock'} · {selected.exam.duration_minutes} daqiqa</p><div className="mt-4 rounded-xl p-3 text-xs leading-5" style={{ color: C.inkSoft, background: CERT_TINT }}>Testdan “Yakunlash” orqali chiqasiz. Tanaffusda javoblar saqlanadi va taymer toxtaydi. Jonli sessiya yopilgach, keyin qayta kirib bo‘lmaydi. Natija qatnashuvchilar sonidan qat’i nazar bir xil shkala bilan hisoblanadi.</div><Field label="Sertifikatda chiqadigan ism-familiya" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ism Familiya" required /><p className="mt-1 text-xs" style={{ ...fontBody, color: CERT_BLUE }}>Profilni tahrirlash: <a href="/?section=profil" className="underline">Profil sozlamalariga oting</a>. Ism-familiya imlo xatosi bo‘lmasligini boshlashdan oldin tekshiring. Bu ma’lumot sertifikatga yoziladi.</p><div className="mt-4 flex justify-end"><Button disabled={busy || fullName.trim().length < 3} onClick={() => makeAttempt(selected.exam, selected.session)}><Play size={16} /> {busy ? 'Tayyorlanmoqda…' : 'Testni boshlash'}</Button></div></section></div>}
  </div>;
}

function MathAnswer({ value, onChange }) {
  const [Input, setInput] = useState(null);
  useEffect(() => { import('./MathInput.jsx').then((module) => setInput(() => module.default)); }, []);
  return Input ? <Input value={value} onChange={onChange} /> : <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl px-3 py-3" style={{ background: C.paper, border: `1px solid ${C.rule}` }} />;
}
