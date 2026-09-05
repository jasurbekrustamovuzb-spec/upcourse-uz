import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Award, Check, Clock3, Loader2, Search, Users, X, Trophy, Medal, BookOpen,
} from 'lucide-react';
import {
  C, fontBody, fontMono, fontDisplay, SectionHeading, EmptyState, GhostButton, SolidButton, TextField,
  ShareButton, buildShareUrl, randomRoomCode, liveRoomFromRow, liveParticipantFromRow,
  sbFindRoomByCode, sbGetRoom, subscribeToLiveRoom, sbSelectParticipants,
  sbInsert, sbUpdate, sbDelete, isQuestionCorrect, computeSyncScore,
  getDeviceKey, estimatedServerNow, advanceSyncPhase,
} from './App';

/* ------------------------------------------------------------------ */
/*  Ixcham QR-kod generatori (ISO/IEC 18004, Byte rejimi, "M" xato     */
/*  tuzatish darajasi) — hech qanday tashqi kutubxona shart emas,      */
/*  havola qurilmada, jonli ravishda chiziladi (hech qayerga           */
/*  saqlanmaydi). Bu shu faylga xos, faqat "Jonli test" bo'limi        */
/*  ochilganda yuklanadi — boshqa sahifalarga og'irlik solmaydi.       */
/*  Algoritm haqiqiy dekoder (OpenCV) bilan sinovdan o'tkazilgan.      */
/* ------------------------------------------------------------------ */
const QR = (() => {
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;
  const glog = (n) => { if (n < 1) throw new Error('glog'); return LOG_TABLE[n]; };
  const gexp = (n) => { while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP_TABLE[n]; };

  class Poly {
    constructor(num, shift) {
      let offset = 0;
      while (offset < num.length && num[offset] === 0) offset++;
      this.num = new Array(num.length - offset + (shift || 0));
      for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
      for (let i = 0; i < (shift || 0); i++) this.num[num.length - offset + i] = 0;
    }
    get(i) { return this.num[i]; }
    len() { return this.num.length; }
    multiply(e) {
      const num = new Array(this.len() + e.len() - 1).fill(0);
      for (let i = 0; i < this.len(); i++) for (let j = 0; j < e.len(); j++) num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      return new Poly(num, 0);
    }
    mod(e) {
      if (this.len() - e.len() < 0) return this;
      const ratio = glog(this.get(0)) - glog(e.get(0));
      const num = this.num.slice();
      for (let i = 0; i < e.len(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
      return new Poly(num, 0).mod(e);
    }
  }
  const rsGeneratorPoly = (ec) => { let a = new Poly([1], 0); for (let i = 0; i < ec; i++) a = a.multiply(new Poly([1, gexp(i)], 0)); return a; };

  const RS_BLOCK_TABLE = {
    1: { L: [[26, 19]], M: [[26, 16]], Q: [[26, 13]], H: [[26, 9]] },
    2: { L: [[44, 34]], M: [[44, 28]], Q: [[44, 22]], H: [[44, 16]] },
    3: { L: [[70, 55]], M: [[70, 44]], Q: [[35, 17], [35, 17]], H: [[35, 13], [35, 13]] },
    4: { L: [[100, 80]], M: [[50, 32], [50, 32]], Q: [[50, 24], [50, 24]], H: [[25, 9], [25, 9], [25, 9], [25, 9]] },
    5: { L: [[134, 108]], M: [[67, 43], [67, 43]], Q: [[33, 15], [33, 15], [34, 16], [34, 16]], H: [[33, 11], [33, 11], [34, 12], [34, 12]] },
    6: { L: [[86, 68], [86, 68]], M: [[43, 27], [43, 27], [43, 27], [43, 27]], Q: [[43, 19], [43, 19], [43, 19], [43, 19]], H: [[43, 15], [43, 15], [43, 15], [43, 15]] },
    7: { L: [[98, 78], [98, 78]], M: [[49, 31], [49, 31], [49, 31], [49, 31]], Q: [[32, 14], [32, 14], [33, 15], [33, 15], [33, 15], [33, 15]], H: [[39, 13], [39, 13], [39, 13], [39, 13], [39, 13]] },
    8: { L: [[121, 97], [121, 97]], M: [[60, 38], [60, 38], [61, 39], [61, 39]], Q: [[40, 18], [40, 18], [40, 18], [41, 19], [41, 19], [41, 19]], H: [[40, 14], [40, 14], [40, 14], [40, 14], [41, 15], [41, 15]] },
    9: { L: [[146, 116], [146, 116]], M: [[58, 36], [58, 36], [58, 36], [59, 37], [59, 37]], Q: [[36, 16], [36, 16], [36, 16], [36, 16], [37, 17], [37, 17], [37, 17], [37, 17]], H: [[36, 12], [36, 12], [36, 12], [36, 12], [37, 13], [37, 13], [37, 13], [37, 13]] },
    10: { L: [[86, 68], [86, 68], [87, 69], [87, 69]], M: [[69, 43], [69, 43], [69, 43], [70, 44], [70, 44], [70, 44]], Q: [[43, 19], [43, 19], [43, 19], [43, 19], [43, 19], [43, 19], [44, 20], [44, 20]], H: [[43, 15], [43, 15], [43, 15], [43, 15], [43, 15], [43, 15], [44, 16], [44, 16]] },
  };
  const EC_PER_BLOCK = {
    L: { 1: 7, 2: 10, 3: 15, 4: 20, 5: 26, 6: 18, 7: 20, 8: 24, 9: 30, 10: 18 },
    M: { 1: 10, 2: 16, 3: 26, 4: 18, 5: 24, 6: 16, 7: 18, 8: 22, 9: 22, 10: 26 },
    Q: { 1: 13, 2: 22, 3: 18, 4: 26, 5: 18, 6: 24, 7: 18, 8: 22, 9: 20, 10: 24 },
    H: { 1: 17, 2: 28, 3: 22, 4: 16, 5: 22, 6: 28, 7: 26, 8: 26, 9: 24, 10: 28 },
  };
  const getRSBlocks = (version, level) => {
    const blocks = RS_BLOCK_TABLE[version][level];
    const ec = EC_PER_BLOCK[level][version];
    return blocks.map(([total, data]) => ({ totalCount: total, dataCount: data, ecCount: ec }));
  };

  class BitBuffer {
    constructor() { this.buffer = []; this.length = 0; }
    put(num, length) { for (let i = 0; i < length; i++) this.putBit(((num >> (length - i - 1)) & 1) === 1); }
    putBit(bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  }

  const getLengthInBits = (version) => (version <= 9 ? 8 : 16);

  const createBytes = (buffer, rsBlocks) => {
    let offset = 0, maxDc = 0, maxEc = 0;
    const dcdata = new Array(rsBlocks.length), ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount, ecCount = rsBlocks[r].ecCount;
      maxDc = Math.max(maxDc, dcCount); maxEc = Math.max(maxEc, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;
      const rsPoly = rsGeneratorPoly(ecCount);
      const rawPoly = new Poly(dcdata[r], rsPoly.len() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.len() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.len() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    const total = rsBlocks.reduce((s, b) => s + b.totalCount, 0);
    const data = new Array(total); let index = 0;
    for (let i = 0; i < maxDc; i++) for (let r = 0; r < rsBlocks.length; r++) if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    for (let i = 0; i < maxEc; i++) for (let r = 0; r < rsBlocks.length; r++) if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    return data;
  };

  const PATTERN_POSITION_TABLE = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54]];
  const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
  const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
  const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
  const getBCHDigit = (data) => { let d = 0; while (data !== 0) { d++; data >>>= 1; } return d; };
  const getBCHTypeInfo = (data) => {
    let d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(G15) >= 0) d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15)));
    return ((data << 10) | d) ^ G15_MASK;
  };
  const getBCHTypeNumber = (data) => {
    let d = data << 12;
    while (getBCHDigit(d) - getBCHDigit(G18) >= 0) d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18)));
    return (data << 12) | d;
  };
  const getMask = (pattern, i, j) => {
    switch (pattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return (i * j) % 2 + (i * j) % 3 === 0;
      case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
      case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
      default: throw new Error('mask');
    }
  };
  const EC_LEVEL_BITS = { M: 0, L: 1, H: 2, Q: 3 };

  class QRCode {
    constructor(version, level) { this.version = version; this.level = level; this.moduleCount = version * 4 + 17; this.modules = null; this.dataCache = null; this.dataList = []; }
    addData(str) { const bytes = Array.from(new TextEncoder().encode(str)); this.dataList.push(bytes); }
    isDark(r, c) { return this.modules[r][c]; }
    make() { this.makeImpl(false, this.getBestMaskPattern()); }
    getBestMaskPattern() {
      let minLost = Infinity, pattern = 0;
      for (let i = 0; i < 8; i++) { this.makeImpl(true, i); const lost = this.getLostPoint(); if (lost < minLost) { minLost = lost; pattern = i; } }
      return pattern;
    }
    makeImpl(test, maskPattern) {
      this.moduleCount = this.version * 4 + 17;
      this.modules = Array.from({ length: this.moduleCount }, () => new Array(this.moduleCount).fill(null));
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.version >= 7) this.setupTypeNumber(test);
      if (this.dataCache == null) this.dataCache = this.createData();
      this.mapData(this.dataCache, maskPattern);
    }
    setupPositionProbePattern(row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          const dark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          this.modules[row + r][col + c] = dark;
        }
      }
    }
    setupTimingPattern() {
      for (let r = 8; r < this.moduleCount - 8; r++) { if (this.modules[r][6] != null) continue; this.modules[r][6] = (r % 2 === 0); }
      for (let c = 8; c < this.moduleCount - 8; c++) { if (this.modules[6][c] != null) continue; this.modules[6][c] = (c % 2 === 0); }
    }
    setupPositionAdjustPattern() {
      const positions = PATTERN_POSITION_TABLE[this.version - 1];
      for (const row of positions) for (const col of positions) {
        if (this.modules[row][col] != null) continue;
        for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
          this.modules[row + r][col + c] = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
        }
      }
    }
    setupTypeNumber(test) {
      const bits = getBCHTypeNumber(this.version);
      for (let i = 0; i < 18; i++) { const mod = (!test && ((bits >> i) & 1) === 1); this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod; }
      for (let i = 0; i < 18; i++) { const mod = (!test && ((bits >> i) & 1) === 1); this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod; }
    }
    setupTypeInfo(test, maskPattern) {
      const data = (EC_LEVEL_BITS[this.level] << 3) | maskPattern;
      const bits = getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = (!test && ((bits >> i) & 1) === 1);
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
      }
      for (let i = 0; i < 15; i++) {
        const mod = (!test && ((bits >> i) & 1) === 1);
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = (!test);
    }
    mapData(data, maskPattern) {
      let inc = -1, row = this.moduleCount - 1, bitIndex = 7, byteIndex = 0;
      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              let dark = false;
              if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              if (getMask(maskPattern, row, col - c)) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    }
    createData() {
      const rsBlocks = getRSBlocks(this.version, this.level);
      const buffer = new BitBuffer();
      for (const data of this.dataList) {
        buffer.put(4, 4);
        buffer.put(data.length, getLengthInBits(this.version));
        for (const b of data) buffer.put(b, 8);
      }
      const totalDataCount = rsBlocks.reduce((s, b) => s + b.dataCount, 0);
      if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.length % 8 !== 0) buffer.putBit(false);
      while (true) {
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0xEC, 8);
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0x11, 8);
      }
      return createBytes(buffer, rsBlocks);
    }
    getLostPoint() {
      const n = this.moduleCount; let lost = 0;
      for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
        let same = 0; const dark = this.isDark(row, col);
        for (let r = -1; r <= 1; r++) { if (row + r < 0 || n <= row + r) continue; for (let c = -1; c <= 1; c++) { if (col + c < 0 || n <= col + c) continue; if (r === 0 && c === 0) continue; if (dark === this.isDark(row + r, col + c)) same++; } }
        if (same > 5) lost += (3 + same - 5);
      }
      for (let row = 0; row < n - 1; row++) for (let col = 0; col < n - 1; col++) {
        let count = 0;
        if (this.isDark(row, col)) count++; if (this.isDark(row + 1, col)) count++;
        if (this.isDark(row, col + 1)) count++; if (this.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) lost += 3;
      }
      for (let row = 0; row < n; row++) for (let col = 0; col < n - 6; col++) {
        if (this.isDark(row, col) && !this.isDark(row, col + 1) && this.isDark(row, col + 2) && this.isDark(row, col + 3) && this.isDark(row, col + 4) && !this.isDark(row, col + 5) && this.isDark(row, col + 6)) lost += 40;
      }
      for (let col = 0; col < n; col++) for (let row = 0; row < n - 6; row++) {
        if (this.isDark(row, col) && !this.isDark(row + 1, col) && this.isDark(row + 2, col) && this.isDark(row + 3, col) && this.isDark(row + 4, col) && !this.isDark(row + 5, col) && this.isDark(row + 6, col)) lost += 40;
      }
      let darkCount = 0;
      for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (this.isDark(row, col)) darkCount++;
      lost += Math.floor(Math.abs(Math.floor((100 * darkCount) / (n * n)) - 50) / 5) * 10;
      return lost;
    }
  }

  function encode(text, level) {
    const lvl = level || 'M';
    for (let version = 1; version <= 10; version++) {
      const rsBlocks = getRSBlocks(version, lvl);
      const totalData = rsBlocks.reduce((s, b) => s + b.dataCount, 0);
      const lengthBits = getLengthInBits(version);
      const bytesLen = new TextEncoder().encode(text).length;
      const neededBits = 4 + lengthBits + bytesLen * 8;
      if (neededBits <= totalData * 8) {
        const qr = new QRCode(version, lvl);
        qr.addData(text);
        qr.make();
        return qr;
      }
    }
    throw new Error('Matn juda uzun — QR kodga sig\u02bbmaydi');
  }

  return { encode };
})();

/* QR kodni SVG sifatida chizadi — rasm fayli emas, hisoblangan
   to'rtburchaklar to'plami, shuning uchun har qanday o'lchamda
   xira bo'lmaydi va hech qayerga saqlanmaydi. */
function QRCodeSVG({ value }) {
  const qr = React.useMemo(() => {
    try { return QR.encode(value, 'M'); } catch (e) { return null; }
  }, [value]);
  if (!qr) return null;
  const count = qr.moduleCount;
  const quiet = 2; // oq chegara — skanerlash ishonchliligi uchun kerak
  const total = count + quiet * 2;
  const rects = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) rects.push(`M${c + quiet},${r + quiet}h1v1h-1z`);
    }
  }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Xonaga qo'shilish uchun QR kod"
      style={{ display: 'block', background: '#fff', borderRadius: 8 }}
    >
      <path d={rects.join('')} fill="#111" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Jonli test rejimi — App.jsx'dan 2c-bosqichda ajratildi.            */
/*  Faqat foydalanuvchi "Jonli test" tugmasini bosganda, alohida       */
/*  chunk sifatida yuklanadi (App.jsx'dagi lazy-load qatoriga qarang). */
/* ------------------------------------------------------------------ */

function LiveLeaderboardList({ participants, showAsPoints }) {
  const sorted = [...participants].sort((a, b) => {
    const as = a.score ?? -1, bs = b.score ?? -1;
    return bs - as;
  });
  const rankStyle = [
    { icon: Trophy, color: C.live },
    { icon: Medal, color: C.silver },
    { icon: Medal, color: C.bronze },
  ];
  return (
    <div className="space-y-2 max-w-sm">
      {sorted.map((p, i) => {
        const rank = rankStyle[i];
        return (
          <div
            key={p.id}
            className="app-fade-slide flex items-center justify-between px-4 py-2.5 rounded-2xl text-[14px]"
            style={{ ...fontBody, background: i < 3 ? C.cover : C.surface, border: `1px solid ${i < 3 ? C.live : C.rule}`, color: i < 3 ? C.white : C.ink }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {rank ? <rank.icon size={15} style={{ color: rank.color, flexShrink: 0 }} /> : <span style={{ ...fontMono, color: C.inkSoft }}>{i + 1}.</span>}
              <span className="truncate">{p.name}</span>
            </div>
            <span className="flex-shrink-0" style={{ ...fontMono, color: i < 3 ? C.liveSoft : C.inkSoft }}>
              {showAsPoints ? `${p.score ?? 0} ball` : (p.score != null ? `${p.score}/${p.total}` : 'ishlamoqda...')}
            </span>
          </div>
        );
      })}
      {sorted.length === 0 && <div className="text-[14px]" style={{ ...fontBody, color: C.inkSoft }}>Hali hech kim yoʻq.</div>}
    </div>
  );
}

/* "Barchaga bir xil" (Kahoot uslubi) rejimida tuzuvchi ekrani —
   savol/reyting almashtirish, avtomatik keyingi savolga o'tish,
   yakunda podium (3-2-1 o'rin) ko'rsatish. */
function LiveHostSyncPlay({ room, setRoom, test, participants, onExit }) {
  const [peekLeaderboard, setPeekLeaderboard] = useState(false);
  const [now, setNow] = useState(estimatedServerNow());
  const advancingRef = useRef(false);
  const [revealStage, setRevealStage] = useState(0);

  const order = room.questionOrder && room.questionOrder.length === test.questions.length
    ? room.questionOrder
    : test.questions.map((_, i) => i);
  const totalQuestions = test.questions.length;
  const currentQuestion = test.questions[order[room.currentIndex]] || null;
  const INTERMISSION_SECONDS = 6;
  const REVEAL_SECONDS = 3; // birinchi 3s — to'g'ri/xato javob, keyingi 3s — reyting

  useEffect(() => {
    const t = setInterval(() => setNow(estimatedServerNow()), 500);
    return () => clearInterval(t);
  }, []);

  /* Taymer endi shu qurilmaning o'zi "birinchi ko'rgan" lahzasidan emas,
     serverda yozilgan haqiqiy boshlanish vaqtidan (room.phaseStartedAt)
     hisoblanadi — shu bilan tuzuvchi va barcha ishtirokchilar bir xil,
     aniq vaqtni ko'radi. */
  const phaseStartedMs = room.phaseStartedAt ? new Date(room.phaseStartedAt).getTime() : now;
  const phaseLimitMs = room.phase === 'question' ? room.perQuestionSeconds * 1000 : INTERMISSION_SECONDS * 1000;
  const elapsedMs = now - phaseStartedMs;
  const secondsLeft = Math.max(0, Math.ceil((phaseLimitMs - elapsedMs) / 1000));
  const showingReveal = room.phase === 'intermission' && elapsedMs < REVEAL_SECONDS * 1000;

  const answeredCount = currentQuestion
    ? participants.filter((p) => p.answers && p.answers[currentQuestion.id] !== undefined).length
    : 0;
  const allAnswered = participants.length > 0 && answeredCount >= participants.length;

  useEffect(() => {
    if (room.status === 'finished') return;
    if (advancingRef.current) return;
    const shouldAdvance = (room.phase === 'question' && (secondsLeft <= 0 || allAnswered))
      || (room.phase === 'intermission' && secondsLeft <= 0);
    if (!shouldAdvance) return;

    advancingRef.current = true;
    advanceSyncPhase(room, totalQuestions)
      .then((updated) => { if (updated) setRoom(updated); })
      .finally(() => { advancingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, allAnswered, room.phase, room.status]);

  useEffect(() => {
    if (room.status !== 'finished') { setRevealStage(0); return; }
    const timers = [
      setTimeout(() => setRevealStage(1), 500),
      setTimeout(() => setRevealStage(2), 1700),
      setTimeout(() => setRevealStage(3), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [room.status]);

  /* currentQuestion vaqtincha topilmasa (masalan currentIndex bilan
     savollar tartibi orasida bir lahzalik nomuvofiqlik) — ekranni bo'sh
     qoldirmasdan, 1.8 soniyadan keyin xonani serverdan qayta o'qib,
     holatni yangilashga urinamiz. */
  useEffect(() => {
    if (room.status === 'finished') return;
    if (room.phase !== 'question' || currentQuestion) return;
    const t = setTimeout(async () => {
      try {
        const fresh = await sbGetRoom(room.id);
        if (fresh) setRoom(fresh);
      } catch (e) {
        // keyingi urinishda qayta tekshiriladi
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [room.status, room.phase, room.currentIndex, room.id, currentQuestion, setRoom]);

  if (room.status === 'finished') {
    const sorted = [...participants].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const podium = [sorted[1], sorted[0], sorted[2]]; // 2-1-3 tartibida (o'rtada 1-o'rin)
    const podiumHeights = ['h-24', 'h-32', 'h-16'];
    const podiumRanks = [2, 1, 3];
    return (
      <div>
        <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
        <SectionHeading eyebrow="Yakun" title="Test tugadi 🎉" />

        <div className="flex items-end justify-center gap-3 mb-8 mt-6" style={{ minHeight: '160px' }}>
          {podium.map((p, i) => {
            const shown = revealStage > i;
            if (!p) return <div key={i} className="w-24" />;
            return (
              <div key={p.id} className={`flex flex-col items-center transition-all duration-500 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <div className="text-sm mb-1 truncate max-w-[90px] text-center" style={{ ...fontBody, color: C.ink }}>{p.name}</div>
                <div className="text-xs mb-2" style={{ ...fontMono, color: C.live }}>{p.score ?? 0} ball</div>
                <div
                  className={`w-24 ${podiumHeights[i]} rounded-t-xl flex items-start justify-center pt-2`}
                  style={{ background: podiumRanks[i] === 1 ? C.live : podiumRanks[i] === 2 ? C.silver : C.bronze }}
                >
                  <span className="text-xl" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>{podiumRanks[i]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {revealStage >= 3 && (
          <div className="app-fade-slide">
            <GhostButton onClick={() => setPeekLeaderboard((v) => !v)} icon={Trophy}>
              {peekLeaderboard ? 'Yopish' : "Toʻliq reytingni koʻrish"}
            </GhostButton>
            {peekLeaderboard && (
              <div className="mt-4">
                <LiveLeaderboardList participants={participants} showAsPoints />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionHeading eyebrow={`${room.currentIndex + 1} / ${totalQuestions}-savol`} title={test.title} />
        {room.phase === 'question' && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[15px] flex-shrink-0 ${secondsLeft <= 5 ? 'live-pulse' : ''}`}
            style={{ ...fontMono, color: secondsLeft <= 5 ? C.white : C.live, background: secondsLeft <= 5 ? C.red : C.liveTint, fontWeight: 600 }}
          >
            <Clock3 size={14} /> {secondsLeft}s
          </div>
        )}
      </div>

      {room.phase === 'question' && (
        <div className="mb-4">
          <GhostButton onClick={() => setPeekLeaderboard((v) => !v)} icon={peekLeaderboard ? BookOpen : Trophy}>
            {peekLeaderboard ? 'Savolni koʻrsatish' : 'Reytingni koʻrish'}
          </GhostButton>
          <span className="ml-3 text-sm" style={{ ...fontMono, color: C.inkSoft }}>{answeredCount}/{participants.length} javob berdi</span>
        </div>
      )}

      {room.phase === 'question' && !peekLeaderboard && currentQuestion && (
        <div className="max-w-2xl">
          <div className="text-lg mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>{currentQuestion.text}</div>
          {currentQuestion.imageUrl && (
            <img src={currentQuestion.imageUrl} alt="" className="max-w-full sm:max-w-md rounded-2xl mb-3" style={{ border: `1px solid ${C.rule}` }} />
          )}
          {currentQuestion.type === 'open' ? (
            <div className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Yozma javobli savol — ishtirokchilar o'z ekranida javob yozmoqda.</div>
          ) : (
            <div className="space-y-2">
              {currentQuestion.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px]" style={{ ...fontBody, background: C.surface, border: `1px solid ${C.rule}`, color: C.ink }}>
                  <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + oi)}</span>
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {room.phase === 'question' && !peekLeaderboard && !currentQuestion && (
        <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
        </div>
      )}

      {room.phase === 'intermission' && showingReveal && !peekLeaderboard && currentQuestion && (
        <div className="max-w-2xl">
          {(() => {
            const correctText = currentQuestion.type === 'open'
              ? (currentQuestion.answers && currentQuestion.answers[0]) || ''
              : currentQuestion.options?.[currentQuestion.correct] ?? '';
            const correctCount = participants.filter((p) => p.answers && p.answers[currentQuestion.id]?.correct).length;
            return (
              <div className="px-4 py-3.5 rounded-2xl text-[15px]" style={{ ...fontBody, background: C.successTint, border: `1px solid ${C.accent}`, color: C.ink }}>
                <div className="flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <Check size={18} style={{ color: C.accent }} /> Toʻgʻri javob: {correctText}
                </div>
                <div className="text-sm mt-1" style={{ ...fontMono, color: C.inkSoft }}>{correctCount}/{participants.length} ishtirokchi toʻgʻri topdi</div>
              </div>
            );
          })()}
        </div>
      )}

      {((room.phase === 'intermission' && !showingReveal) || peekLeaderboard) && (
        <div>
          {room.phase === 'intermission' && !peekLeaderboard && (
            <div className="flex items-center gap-2 text-sm mb-3" style={{ ...fontBody, color: C.inkSoft }}>
              <span className="w-1.5 h-1.5 rounded-full live-pulse flex-shrink-0" style={{ background: C.live }} />
              Keyingi savolga oʻtilmoqda...
            </div>
          )}
          <LiveLeaderboardList participants={participants} showAsPoints />
        </div>
      )}
    </div>
  );
}

function LiveHostSetup({ tests, session, onCreated, onBack, ensureTestContent }) {
  const myId = session?.user?.id;
  const myTests = tests.filter((t) => t.authorId === myId);
  const [scope, setScope] = useState(myTests.length > 0 ? 'mine' : 'all');
  const [query, setQuery] = useState('');
  const [testId, setTestId] = useState('');
  const [duration, setDuration] = useState(300);
  const [liveMode, setLiveMode] = useState('sync');
  const [perQSeconds, setPerQSeconds] = useState(20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const scoped = scope === 'mine' ? myTests : tests;
  const q = query.trim().toLowerCase();
  const filtered = q ? scoped.filter((t) => t.title.toLowerCase().includes(q)) : scoped;
  const selectedTest = tests.find((t) => t.id === testId);

  function shuffledIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function create() {
    if (!testId) return;
    setBusy(true);
    setErr(null);
    try {
      // Jonli xona uchun savollarning to'liq matni albatta kerak (tartibni
      // aralashtirish uchun) — hali yuklanmagan bo'lsa, shu yerda kutamiz.
      let questionsForOrder = selectedTest?.questions;
      if (liveMode === 'sync' && questionsForOrder === undefined && ensureTestContent) {
        questionsForOrder = await ensureTestContent(testId);
      }
      let code = randomRoomCode();
      for (let i = 0; i < 3; i++) {
        const existing = await sbFindRoomByCode(code);
        if (!existing) break;
        code = randomRoomCode();
      }
      const meta = session.user?.user_metadata || {};
      const row = {
        code, test_id: testId, host_id: session.user.id,
        host_name: (meta.given_name || meta.full_name || meta.name || '').trim(),
        status: 'waiting', duration_seconds: duration,
        mode: liveMode, per_question_seconds: perQSeconds, phase: 'lobby', current_index: 0,
        question_order: liveMode === 'sync' && questionsForOrder ? shuffledIndices(questionsForOrder.length) : null,
      };
      const [created] = await sbInsert('live_rooms', row);
      onCreated(liveRoomFromRow(created));
    } catch (e) {
      setErr('Xona yaratishda xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  if (tests.length === 0) {
    return (
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Ortga</button>
        <EmptyState text="Hozircha hech qanday test yoʻq." cta="Avval Testlar boʻlimida kamida bitta test qoʻshing." />
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Ortga</button>
      <SectionHeading eyebrow="Xona ochish" title="Testni tanlang" />
      <div className="max-w-md">
        <div className="flex gap-1 p-1 rounded-full mb-3 w-fit" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
          <button
            onClick={() => setScope('mine')}
            className="px-3 py-1.5 rounded-full text-xs transition-colors"
            style={{ ...fontBody, background: scope === 'mine' ? C.cover : 'transparent', color: scope === 'mine' ? C.white : C.inkSoft }}
          >
            Mening testlarim
          </button>
          <button
            onClick={() => setScope('all')}
            className="px-3 py-1.5 rounded-full text-xs transition-colors"
            style={{ ...fontBody, background: scope === 'all' ? C.cover : 'transparent', color: scope === 'all' ? C.white : C.inkSoft }}
          >
            Hammasi
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkSoft }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Test nomi boʻyicha qidiring..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl text-[15px] outline-none"
            style={{ ...fontBody, border: `1px solid ${C.rule}`, background: C.paperSoft, color: C.ink }}
          />
        </div>

        <div className="rounded-2xl overflow-hidden mb-4" style={{ border: `1px solid ${C.rule}`, maxHeight: '260px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-center" style={{ ...fontBody, color: C.inkSoft }}>
              {scope === 'mine' ? 'Siz hali test yaratmagansiz.' : 'Hech narsa topilmadi.'}
            </div>
          ) : (
            filtered.map((t) => {
              const selected = t.id === testId;
              return (
                <button
                  key={t.id}
                  onClick={() => setTestId(t.id)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors"
                  style={{ ...fontBody, background: selected ? C.selectedTint : 'transparent', borderBottom: `1px solid ${C.rule}`, color: C.ink }}
                >
                  <div className="min-w-0">
                    <div className="truncate">{t.title}</div>
                    <div className="text-xs mt-0.5" style={{ ...fontMono, color: C.inkSoft }}>
                      {t.questionCount ?? t.questions?.length ?? 0} ta savol{t.status === 'pending' ? ' · Kutilmoqda' : ''}
                    </div>
                  </div>
                  {selected && <Check size={16} style={{ color: C.gold, flexShrink: 0 }} />}
                </button>
              );
            })
          )}
        </div>

        <label className="block text-xs mb-1.5" style={{ ...fontMono, color: C.inkSoft }}>Rejim</label>
        <div className="flex gap-1 p-1 rounded-full mb-4 w-fit" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
          <button
            onClick={() => setLiveMode('sync')}
            className="px-3 py-1.5 rounded-full text-xs transition-colors"
            style={{ ...fontBody, background: liveMode === 'sync' ? C.live : 'transparent', color: liveMode === 'sync' ? C.white : C.inkSoft }}
          >
            Barchaga bir xil
          </button>
          <button
            onClick={() => setLiveMode('free')}
            className="px-3 py-1.5 rounded-full text-xs transition-colors"
            style={{ ...fontBody, background: liveMode === 'free' ? C.live : 'transparent', color: liveMode === 'free' ? C.white : C.inkSoft }}
          >
            Erkin tezlik
          </button>
        </div>
        <div className="text-xs mb-4 -mt-2" style={{ ...fontBody, color: C.inkSoft }}>
          {liveMode === 'sync'
            ? 'Hammada bitta savol bir vaqtda chiqadi (Kahoot uslubi). Tez javob bergan koʻproq ball oladi.'
            : 'Har kim testni oʻzi xohlagan tezlikda, mustaqil ishlaydi.'}
        </div>

        {liveMode === 'sync' ? (
          <>
            <label className="block text-xs mb-1.5" style={{ ...fontMono, color: C.inkSoft }}>Har bir savolga vaqt</label>
            <select
              value={perQSeconds}
              onChange={(e) => setPerQSeconds(Number(e.target.value))}
              className="w-full mb-4 px-3 py-2.5 rounded-2xl text-[15px] outline-none"
              style={{ ...fontBody, border: `1px solid ${C.rule}`, background: C.paperSoft, color: C.ink }}
            >
              <option value={10}>10 soniya</option>
              <option value={15}>15 soniya</option>
              <option value={20}>20 soniya</option>
              <option value={30}>30 soniya</option>
              <option value={60}>60 soniya</option>
              <option value={120}>120 soniya</option>
              <option value={180}>180 soniya</option>
            </select>
          </>
        ) : (
          <>
            <label className="block text-xs mb-1.5" style={{ ...fontMono, color: C.inkSoft }}>Vaqt chegarasi</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full mb-4 px-3 py-2.5 rounded-2xl text-[15px] outline-none"
              style={{ ...fontBody, border: `1px solid ${C.rule}`, background: C.paperSoft, color: C.ink }}
            >
              <option value={180}>3 daqiqa</option>
              <option value={300}>5 daqiqa</option>
              <option value={600}>10 daqiqa</option>
              <option value={900}>15 daqiqa</option>
              <option value={1200}>20 daqiqa</option>
            </select>
          </>
        )}
        {err && <div className="text-xs mb-3" style={{ ...fontBody, color: C.red }}>{err}</div>}
        <SolidButton onClick={create} icon={Users} disabled={busy || !testId}>{busy ? 'Yaratilmoqda...' : 'Xona yaratish'}</SolidButton>
      </div>
    </div>
  );
}

function LiveHostLobby({ room, setRoom, tests, onExit, ensureTestContent }) {
  const [participants, setParticipants] = useState([]);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const test = tests.find((t) => t.id === room.testId);

  useEffect(() => {
    if (test) {
      if (test.questions === undefined && ensureTestContent) ensureTestContent(room.testId);
      return;
    }
    let cancelled = false;
    if (ensureTestContent) {
      ensureTestContent(room.testId);
      const t = setTimeout(() => { if (!cancelled) ensureTestContent(room.testId); }, 1500);
      return () => { cancelled = true; clearTimeout(t); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.testId, test, test?.questions, ensureTestContent]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([sbGetRoom(room.id), sbSelectParticipants(room.id)])
      .then(([freshRoom, list]) => {
        if (cancelled) return;
        if (freshRoom) setRoom(freshRoom);
        setParticipants(list);
      })
      .catch(() => { /* keyingi yangilanish (realtime yoki zaxira) orqali tuzatiladi */ });

    const unsubscribe = subscribeToLiveRoom(room.id, {
      onRoom: (r) => { if (!cancelled) setRoom(r); },
      onParticipants: (updater) => { if (!cancelled) setParticipants(updater); },
      pollFallbackMs: room.mode === 'sync' ? 1500 : 3000,
    });
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  async function start() {
    setStarting(true);
    try {
      const patch = { status: 'active', starts_at: new Date().toISOString() };
      if (room.mode === 'sync') {
        patch.phase = 'question';
        patch.current_index = 0;
        patch.phase_started_at = new Date().toISOString();
      }
      const [updated] = await sbUpdate('live_rooms', room.id, patch);
      setRoom(liveRoomFromRow(updated));
    } catch (e) {
      // xato bo'lsa, keyingi poll orqali holat baribir yangilanadi
    } finally {
      setStarting(false);
    }
  }

  function copyCode() {
    try {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard mavjud bo'lmasa e'tiborsiz qoldiriladi */ }
  }

  async function removeParticipant(id) {
    setRemovingId(id);
    try {
      await sbDelete('live_participants', id);
      setParticipants((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      // xato bo'lsa, keyingi poll orqali ro'yxat baribir yangilanadi
    } finally {
      setRemovingId(null);
    }
  }

  if ((room.status === 'active' || room.status === 'finished') && room.mode === 'sync' && test) {
    if (test.questions === undefined) {
      return (
        <div className="flex items-center gap-2 text-sm py-10 justify-center" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
        </div>
      );
    }
    return (
      <LiveHostSyncPlay
        room={room}
        setRoom={setRoom}
        test={test}
        participants={participants}
        onExit={onExit}
      />
    );
  }

  if (room.status === 'active' || room.status === 'finished') {
    return (
      <div>
        <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
        <SectionHeading eyebrow={room.status === 'active' ? 'Test davom etmoqda' : 'Test tugadi'} title="Jonli reyting" />
        <LiveLeaderboardList participants={participants} />
      </div>
    );
  }

  return (
    <div>
      <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Bekor qilish</button>
      <SectionHeading eyebrow="Kutish zali" title="Qatnashchilarni kuting" />
      <div className="p-6 rounded-3xl mb-6 text-center max-w-xs" style={{ background: `linear-gradient(135deg, ${C.coverDeep} 0%, ${C.liveDeep} 100%)`, border: `1px solid ${C.live}` }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ ...fontMono, color: C.liveSoft }}>Xona kodi</div>
        <div className="text-4xl mb-4" style={{ ...fontMono, color: C.live, fontWeight: 700, letterSpacing: '0.16em' }}>{room.code}</div>
        <div className="w-24 h-24 sm:w-36 sm:h-36 mx-auto mb-4 p-1.5" style={{ background: '#fff', borderRadius: 12 }}>
          <QRCodeSVG value={buildShareUrl({ live: room.code })} />
        </div>
        <p className="text-[11px] mb-3" style={{ ...fontBody, color: 'rgba(251,250,243,0.6)' }}>
          Telefon kamerasi bilan skanerlab ham qoʻshilish mumkin
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={copyCode} className="text-xs inline-flex items-center gap-1" style={{ ...fontBody, color: 'rgba(251,250,243,0.75)' }}>{copied ? 'Nusxalandi ✓' : 'Kodni nusxalash'}</button>
          <span style={{ color: 'rgba(251,250,243,0.35)' }}>·</span>
          <ShareButton url={buildShareUrl({ live: room.code })} title="Jonli testga qoʻshiling" small />
        </div>
      </div>
      <p className="text-[13px] mb-4 max-w-sm" style={{ ...fontBody, color: C.inkSoft }}>
        Havolani Telegram yoki boshqa ilovaga yuboring — bosgan odam toʻgʻridan-toʻgʻri shu xonaga tushadi, kod kiritish shart emas.
      </p>
      <div className="text-[14px] mb-3" style={{ ...fontMono, color: C.inkSoft }}>{participants.length} kishi qoʻshildi</div>
      <div className="space-y-2 mb-6 max-w-sm">
        {participants.map((p) => (
          <div key={p.id} className="app-fade-slide flex items-center justify-between gap-2 px-3 py-2 rounded-2xl text-[14px]" style={{ ...fontBody, background: C.surface, border: `1px solid ${C.rule}`, color: C.ink }}>
            <span className="min-w-0 truncate">{p.name}</span>
            <button
              onClick={() => removeParticipant(p.id)}
              disabled={removingId === p.id}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
              style={{ color: C.red }}
              title="Qatnashchini chiqarib yuborish"
              aria-label={`${p.name} ni chiqarib yuborish`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {participants.length === 0 && <div className="text-[14px]" style={{ ...fontBody, color: C.inkSoft }}>Hali hech kim qoʻshilmadi. Kodni ulashing...</div>}
      </div>
      <SolidButton onClick={start} icon={Award} disabled={starting || participants.length === 0}>{starting ? 'Boshlanmoqda...' : 'Testni boshlash'}</SolidButton>
    </div>
  );
}

/* "Barchaga bir xil" rejimida ishtirokchi (o'quvchi) ekrani.
   Har bir savol serverdan kelgan vaqt bo'yicha hammada bir xil
   chiqadi; javob bergan zahoti ball hisoblanadi (tezroq — ko'proq). */
function LiveSyncPlayer({ room, setRoom, test, participant, onExit }) {
  const [myAnswers, setMyAnswers] = useState({});
  const [openText, setOpenText] = useState('');
  const [now, setNow] = useState(estimatedServerNow());
  const [participants, setParticipants] = useState([]);
  const scoreRef = useRef(participant.score || 0);
  const submittingRef = useRef(false);
  const advancingRef = useRef(false);

  const order = room.questionOrder && room.questionOrder.length === test.questions.length
    ? room.questionOrder
    : test.questions.map((_, i) => i);
  const currentQuestion = test.questions[order[room.currentIndex]] || null;
  const INTERMISSION_SECONDS = 6;
  const REVEAL_SECONDS = 3; // birinchi 3s — to'g'ri/xato javob, keyingi 3s — reyting
  const totalQuestions = test.questions.length;

  /* Taymer endi serverda yozilgan haqiqiy boshlanish vaqtidan
     (room.phaseStartedAt) hisoblanadi — tuzuvchi ekranidagi bilan bir xil. */
  const phaseStartedMs = room.phaseStartedAt ? new Date(room.phaseStartedAt).getTime() : now;
  const phaseLimitMs = room.phase === 'question' ? room.perQuestionSeconds * 1000 : INTERMISSION_SECONDS * 1000;
  const elapsedMs = now - phaseStartedMs;
  const secondsLeft = Math.max(0, Math.ceil((phaseLimitMs - elapsedMs) / 1000));
  const showingReveal = room.phase === 'intermission' && elapsedMs < REVEAL_SECONDS * 1000;
  const hasAnswered = currentQuestion ? myAnswers[currentQuestion.id] !== undefined : false;

  const answeredCount = currentQuestion
    ? participants.filter((p) => p.answers && p.answers[currentQuestion.id] !== undefined).length
    : 0;
  const allAnswered = participants.length > 0 && answeredCount >= participants.length;

  useEffect(() => {
    let cancelled = false;
    Promise.all([sbGetRoom(room.id), sbSelectParticipants(room.id)])
      .then(([fresh, list]) => {
        if (cancelled) return;
        if (fresh) setRoom(fresh);
        setParticipants(list);
      })
      .catch(() => { /* keyingi yangilanish (realtime yoki zaxira) orqali tuzatiladi */ });

    const unsubscribe = subscribeToLiveRoom(room.id, {
      onRoom: (r) => { if (!cancelled) setRoom(r); },
      onParticipants: (updater) => { if (!cancelled) setParticipants(updater); },
      pollFallbackMs: 1500,
    });
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(estimatedServerNow()), 300);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setOpenText('');
  }, [room.currentIndex]);

  async function submitAnswer(answerValue) {
    if (!currentQuestion || submittingRef.current) return;
    if (myAnswers[currentQuestion.id] !== undefined) return;
    submittingRef.current = true;
    const timeTakenMs = Math.min(phaseLimitMs, Math.max(0, now - phaseStartedMs));
    const correct = isQuestionCorrect(currentQuestion, answerValue);
    const points = computeSyncScore(correct, timeTakenMs, phaseLimitMs);
    const newAnswers = { ...myAnswers, [currentQuestion.id]: { answer: answerValue, correct, points } };
    setMyAnswers(newAnswers);
    try {
      const newScore = scoreRef.current + points;
      scoreRef.current = newScore;
      await sbUpdate('live_participants', participant.id, { score: newScore, total: test.questions.length, answers: newAnswers });
    } catch (e) { /* keyingi savolda qayta urinish mumkin */ }
    submittingRef.current = false;
  }

  useEffect(() => {
    if (room.phase !== 'question' || !currentQuestion || secondsLeft > 0 || hasAnswered) return;
    submitAnswer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, room.phase, hasAnswered]);

  /* Bosqichni faqat tuzuvchi emas — istalgan faol ishtirokchi ham
     oldinga surishi mumkin (masalan tuzuvchining tabi fonda qolib
     ketgan bo'lsa). advanceSyncPhase() ichidagi shartli so'rov ikki
     kishi bir vaqtda urinib qolsa ham xavfsiz — faqat bittasi
     muvaffaqiyatli bo'ladi. */
  useEffect(() => {
    if (room.status === 'finished') return;
    if (advancingRef.current) return;
    const shouldAdvance = (room.phase === 'question' && (secondsLeft <= 0 || allAnswered))
      || (room.phase === 'intermission' && secondsLeft <= 0);
    if (!shouldAdvance) return;

    advancingRef.current = true;
    advanceSyncPhase(room, totalQuestions)
      .then((updated) => { if (updated) setRoom(updated); })
      .finally(() => { advancingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, allAnswered, room.phase, room.status]);

  if (room.status === 'finished') {
    return <LiveSyncFinished participants={participants} myId={participant.id} onExit={onExit} />;
  }

  return (
    <div>
      <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="text-xl sm:text-2xl min-w-0 truncate" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{room.currentIndex + 1}-savol</h3>
        {room.phase === 'question' && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[15px] flex-shrink-0 ${secondsLeft <= 5 ? 'live-pulse' : ''}`}
            style={{ ...fontMono, color: secondsLeft <= 5 ? C.white : C.live, background: secondsLeft <= 5 ? C.red : C.liveTint, fontWeight: 600 }}
          >
            <Clock3 size={14} /> {secondsLeft}s
          </div>
        )}
      </div>

      {room.phase === 'question' && currentQuestion && (
        <div className="max-w-2xl">
          <div className="text-lg mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>{currentQuestion.text}</div>
          {currentQuestion.imageUrl && (
            <img src={currentQuestion.imageUrl} alt="" className="max-w-full sm:max-w-md rounded-2xl mb-3" style={{ border: `1px solid ${C.rule}` }} />
          )}

          {hasAnswered ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[15px]" style={{ ...fontBody, background: C.liveTint, border: `1px solid ${C.live}`, color: C.ink }}>
              <Check size={16} style={{ color: C.live }} /> Javobingiz qabul qilindi. Kuting...
            </div>
          ) : currentQuestion.type === 'open' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && openText.trim()) submitAnswer(openText); }}
                placeholder="Javobingizni yozing"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl text-[15px] outline-none"
                style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              />
              <SolidButton onClick={() => submitAnswer(openText)} icon={Check} disabled={!openText.trim()}>Yuborish</SolidButton>
            </div>
          ) : (
            <div className="space-y-2">
              {currentQuestion.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => submitAnswer(oi)}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
                  style={{ ...fontBody, background: C.surface, border: `1px solid ${C.rule}`, color: C.ink, outlineColor: C.live }}
                >
                  <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + oi)}</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {room.phase === 'question' && !currentQuestion && (
        <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
        </div>
      )}

      {room.phase === 'intermission' && showingReveal && currentQuestion && (
        <div className="max-w-2xl">
          {(() => {
            const myAnswer = myAnswers[currentQuestion.id];
            const wasCorrect = !!myAnswer?.correct;
            const correctText = currentQuestion.type === 'open'
              ? (currentQuestion.answers && currentQuestion.answers[0]) || ''
              : currentQuestion.options?.[currentQuestion.correct] ?? '';
            return (
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[15px]"
                style={{ ...fontBody, background: wasCorrect ? C.successTint : C.dangerTint, border: `1px solid ${wasCorrect ? C.accent : C.red}`, color: C.ink }}
              >
                {wasCorrect ? <Check size={18} style={{ color: C.accent, flexShrink: 0 }} /> : <X size={18} style={{ color: C.red, flexShrink: 0 }} />}
                <div className="min-w-0">
                  <div style={{ fontWeight: 600 }}>{wasCorrect ? "Toʻgʻri javob!" : 'Xato javob'}</div>
                  {!wasCorrect && correctText !== '' && (
                    <div className="text-sm mt-0.5" style={{ color: C.inkSoft }}>Toʻgʻri javob: {correctText}</div>
                  )}
                  {wasCorrect && myAnswer?.points > 0 && (
                    <div className="text-sm mt-0.5" style={{ ...fontMono, color: C.inkSoft }}>+{myAnswer.points} ball</div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {room.phase === 'intermission' && !showingReveal && (
        <div>
          <div className="text-sm mb-3" style={{ ...fontBody, color: C.inkSoft }}>Joriy reyting — keyingi savol tez orada...</div>
          <LiveLeaderboardList participants={participants} showAsPoints />
        </div>
      )}
    </div>
  );
}

function LiveSyncFinished({ participants, myId, onExit }) {
  const [showFull, setShowFull] = useState(false);
  const sorted = [...participants].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const myIndex = sorted.findIndex((p) => p.id === myId);
  const me = sorted[myIndex];
  return (
    <div>
      <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
      <SectionHeading eyebrow="Yakun" title="Test tugadi 🎉" />
      {me && (
        <div className="p-5 rounded-2xl mb-5 max-w-xs text-center" style={{ background: C.cover, border: `1px solid ${C.live}` }}>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ ...fontMono, color: C.liveSoft }}>Sizning oʻringiz</div>
          <div className="text-3xl mb-1" style={{ ...fontDisplay, color: C.white, fontWeight: 700 }}>{myIndex + 1}-oʻrin</div>
          <div className="text-sm" style={{ ...fontMono, color: C.liveSoft }}>{me.score ?? 0} ball</div>
        </div>
      )}
      <GhostButton onClick={() => setShowFull((v) => !v)} icon={Trophy}>{showFull ? 'Yopish' : "Toʻliq reytingni koʻrish"}</GhostButton>
      {showFull && (
        <div className="mt-4">
          <LiveLeaderboardList participants={participants} showAsPoints />
        </div>
      )}
    </div>
  );
}


function LiveJoinForm({ initialCode, onJoined, onBack }) {
  const [code, setCode] = useState(initialCode || '');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function join() {
    const c = code.trim().toUpperCase();
    const n = name.trim();
    if (!c || !n) return;
    setBusy(true);
    setErr(null);
    try {
      const room = await sbFindRoomByCode(c);
      if (!room) { setErr('Bunday kodli xona topilmadi.'); setBusy(false); return; }
      if (room.status === 'finished') { setErr('Bu test allaqachon yakunlangan.'); setBusy(false); return; }
      const deviceKey = getDeviceKey();
      const row = { room_id: room.id, name: n, device_key: deviceKey };
      const [created] = await sbInsert('live_participants', row);
      onJoined(room, liveParticipantFromRow(created));
    } catch (e) {
      setErr('Qoʻshilishda xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Ortga</button>
      <SectionHeading eyebrow="Xonaga qoʻshilish" title="Kod va ismingizni kiriting" />
      <div className="max-w-xs">
        <TextField label="Xona kodi" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="MASALAN: A1B2C3" />
        <TextField label="Ismingiz" value={name} onChange={setName} placeholder="Ismingiz" />
        {err && <div className="text-xs mb-3" style={{ ...fontBody, color: C.red }}>{err}</div>}
        <SolidButton onClick={join} icon={Check} disabled={busy || !code.trim() || !name.trim()}>{busy ? 'Qoʻshilmoqda...' : 'Qoʻshilish'}</SolidButton>
      </div>
    </div>
  );
}

function LiveQuizPlayer({ room, test, participant, onDone }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState(9999);

  async function submit(currentAnswers) {
    if (submitted) return;
    setSubmitted(true);
    const score = test.questions.reduce((s, q) => s + (isQuestionCorrect(q, currentAnswers[q.id]) ? 1 : 0), 0);
    try {
      await sbUpdate('live_participants', participant.id, { score, total: test.questions.length, submitted_at: new Date().toISOString() });
    } catch (e) { /* natija topshirilmasa ham foydalanuvchi natijalar ekraniga o'tadi */ }
    onDone();
  }

  useEffect(() => {
    function tick() {
      if (!room.startsAt) return;
      const end = new Date(room.startsAt).getTime() + room.durationSeconds * 1000;
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) submit(answers);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  function select(qid, idx) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: idx }));
  }

  function setOpenAnswer(qid, text) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: text }));
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h3 className="text-xl sm:text-2xl min-w-0 truncate" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>{test.title}</h3>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[15px] flex-shrink-0 ${remaining <= 10 && remaining > 0 ? 'live-pulse' : ''}`}
          style={{ ...fontMono, color: remaining <= 10 ? C.white : C.live, background: remaining <= 10 ? C.red : C.liveTint, fontWeight: 600 }}
        >
          <Clock3 size={14} /> {mm}:{ss}
        </div>
      </div>
      <div className="space-y-6 max-w-2xl">
        {test.questions.map((q, qi) => (
          <div key={q.id}>
            <div className="text-base mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>
              <span style={{ ...fontMono, color: C.live }}>{qi + 1}.</span> {q.text}
            </div>
            {q.imageUrl && (
              <img src={q.imageUrl} alt="" className="max-w-full sm:max-w-md rounded-2xl mb-3" style={{ border: `1px solid ${C.rule}` }} />
            )}
            {q.type === 'open' ? (
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={(e) => setOpenAnswer(q.id, e.target.value)}
                disabled={submitted}
                placeholder="Javobingizni yozing (masalan: 1/2 yoki 0,5)"
                className="w-full px-4 py-2.5 rounded-2xl text-[15px] outline-none"
                style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              />
            ) : (
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = answers[q.id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => select(q.id, oi)}
                    disabled={submitted}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
                    style={{ ...fontBody, background: isSelected ? C.liveTint : C.surface, border: `1px solid ${isSelected ? C.live : C.rule}`, color: C.ink, outlineColor: C.live }}
                  >
                    <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + oi)}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <SolidButton onClick={() => submit(answers)} icon={Check} disabled={submitted}>{submitted ? 'Yuborildi' : 'Yakunlash'}</SolidButton>
      </div>
    </div>
  );
}

function LiveParticipant({ room, setRoom, participant, tests, onExit, ensureTestContent }) {
  const [phase, setPhase] = useState(room.status === 'waiting' ? 'waiting' : 'quiz');
  const [participants, setParticipants] = useState([]);
  const test = tests.find((t) => t.id === room.testId);

  useEffect(() => {
    if (test) {
      if (test.questions === undefined && ensureTestContent) ensureTestContent(room.testId);
      return;
    }
    // Test hali umuman topilmagan bo'lsa ham — jim o'tirmasdan, uni
    // to'g'ridan-to'g'ri so'rashga urinamiz, va topilmasa 1.5 soniyadan
    // keyin qayta urinamiz (masalan tarmoq/vaqt sabab kechikkan bo'lsa).
    let cancelled = false;
    if (ensureTestContent) {
      ensureTestContent(room.testId);
      const t = setTimeout(() => { if (!cancelled) ensureTestContent(room.testId); }, 1500);
      return () => { cancelled = true; clearTimeout(t); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.testId, test, test?.questions, ensureTestContent]);

  useEffect(() => {
    /* MUHIM: "Hammaga bir xil" (sync) rejimida, savol boshlangach
       (phase === 'quiz'), quyida LiveSyncPlayer ko'rsatiladi va u
       xonani O'ZI kuzatib boradi (o'zining Realtime obunasi bilan).
       Shuning uchun shu holatda LiveParticipant o'z obunasini ochiq
       qoldirmasligi kerak — aks holda bitta xonaga ikkita bir xil
       WebSocket obuna ochilib qolib, ekranni "qotirib" (oq sahifa)
       qo'yadi. Shu bois bu effekt shu holatda ishga tushmaydi. */
    if (room.mode === 'sync' && phase === 'quiz') return undefined;

    let cancelled = false;
    Promise.all([sbGetRoom(room.id), sbSelectParticipants(room.id)])
      .then(([fresh, list]) => {
        if (cancelled) return;
        if (fresh) {
          setRoom(fresh);
          if (fresh.status !== 'waiting') setPhase((p) => (p === 'waiting' ? 'quiz' : p));
        }
        setParticipants(list);
      })
      .catch(() => { /* keyingi yangilanish (realtime yoki zaxira) orqali tuzatiladi */ });

    const unsubscribe = subscribeToLiveRoom(room.id, {
      onRoom: (r) => {
        if (cancelled) return;
        setRoom(r);
        if (r.status !== 'waiting') setPhase((p) => (p === 'waiting' ? 'quiz' : p));
      },
      onParticipants: (updater) => { if (!cancelled) setParticipants(updater); },
      pollFallbackMs: 2000,
    });
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.mode, phase]);

  if (phase === 'waiting') {
    return (
      <div>
        <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
        <SectionHeading eyebrow="Xonadasiz" title={`Xona: ${room.code}`} />
        <div className="flex items-center gap-2 text-[15px]" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 className="animate-spin" size={16} />
          Boshqaruvchi testni boshlashini kuting...
        </div>
      </div>
    );
  }

  if (phase === 'quiz' && !test) {
    return (
      <div className="flex items-center gap-2 text-sm py-10 justify-center" style={{ ...fontBody, color: C.inkSoft }}>
        <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
      </div>
    );
  }

  if (phase === 'quiz' && test) {
    if (test.questions === undefined) {
      return (
        <div className="flex items-center gap-2 text-sm py-10 justify-center" style={{ ...fontBody, color: C.inkSoft }}>
          <Loader2 size={15} className="animate-spin" /> Yuklanmoqda...
        </div>
      );
    }
    if (room.mode === 'sync') {
      return <LiveSyncPlayer room={room} setRoom={setRoom} test={test} participant={participant} onExit={onExit} />;
    }
    return <LiveQuizPlayer room={room} test={test} participant={participant} onDone={() => setPhase('results')} />;
  }

  return (
    <div>
      <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
      <SectionHeading eyebrow="Yakun" title="Natijalar" />
      <LiveLeaderboardList participants={participants} />
    </div>
  );
}

function LiveQuizHub({ tests, session, onExit, initialCode, ensureTestContent }) {
  const [mode, setMode] = useState(initialCode ? 'join-form' : null);
  const [room, setRoom] = useState(null);
  const [participant, setParticipant] = useState(null);

  if (!mode) {
    return (
      <div>
        <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Testlar</button>
        <SectionHeading eyebrow="Yangi" title="Jonli test rejimi" />
        <p className="text-[15px] mb-6 max-w-md" style={{ ...fontBody, color: C.inkSoft }}>
          Bir nechta odam bitta testni bir vaqtda ishlashi uchun xona oching, yoki mavjud xona kodi bilan qoʻshiling.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
          {session ? (
            <button onClick={() => setMode('host-setup')} className="min-w-0 p-5 rounded-2xl text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <Users size={20} style={{ color: C.live }} className="mb-2" />
              <div className="font-medium" style={{ ...fontBody, color: C.ink }}>Xona ochish</div>
              <div className="text-[13px] mt-1" style={{ ...fontBody, color: C.inkSoft }}>Testni tanlang, kod yarating, qatnashchilarni kuting.</div>
            </button>
          ) : (
            <div className="p-5 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <div className="text-[14px]" style={{ ...fontBody, color: C.inkSoft }}>Xona ochish uchun tizimga kiring.</div>
            </div>
          )}
          <button onClick={() => setMode('join-form')} className="min-w-0 p-5 rounded-2xl text-left transition-transform hover:-translate-y-0.5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
            <Award size={20} style={{ color: C.live }} className="mb-2" />
            <div className="font-medium" style={{ ...fontBody, color: C.ink }}>Xonaga qoʻshilish</div>
            <div className="text-[13px] mt-1" style={{ ...fontBody, color: C.inkSoft }}>6 xonali kodni kiriting, ismingizni yozing — hisob shart emas.</div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'host-setup') {
    return <LiveHostSetup tests={tests} session={session} onCreated={(r) => { setRoom(r); setMode('host-lobby'); }} onBack={() => setMode(null)} ensureTestContent={ensureTestContent} />;
  }
  if (mode === 'host-lobby' && room) {
    return <LiveHostLobby room={room} setRoom={setRoom} tests={tests} onExit={() => { setMode(null); setRoom(null); }} ensureTestContent={ensureTestContent} />;
  }
  if (mode === 'join-form') {
    return <LiveJoinForm initialCode={initialCode} onJoined={(r, p) => { setRoom(r); setParticipant(p); setMode('participant'); }} onBack={() => setMode(null)} />;
  }
  if (mode === 'participant' && room && participant) {
    return <LiveParticipant room={room} setRoom={setRoom} participant={participant} tests={tests} onExit={() => { setMode(null); setRoom(null); setParticipant(null); }} ensureTestContent={ensureTestContent} />;
  }
  return null;
}


export default LiveQuizHub;
