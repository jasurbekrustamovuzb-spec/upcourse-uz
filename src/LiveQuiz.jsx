import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  ArrowLeft, Award, Check, Clock3, Loader2, Search, Users, X, Trophy, Medal, BookOpen, SkipForward,
} from 'lucide-react';
import {
  C, fontBody, fontMono, fontDisplay, SectionHeading, EmptyState, GhostButton, SolidButton, TextField, SectionLoading,
  MatchingTestQuestion, getQuestionCount, getQuestionScore,
  ShareButton, buildShareUrl, randomRoomCode, liveRoomFromRow, liveParticipantFromRow,
  sbFindRoomByCode, sbGetRoom, subscribeToLiveRoom, sbSelectParticipants, sbFindParticipantByDevice, sbClaimLiveParticipantDevice,
  sbInsert, sbUpdate, sbDelete, computeSyncScore, startScheduledLiveRoom,
  getDeviceKey, estimatedServerNow, advanceSyncPhase,
} from './App';

const MathInput = lazy(() => import('./MathInput.jsx'));
const PdfQuestionImage = lazy(() => import('./PdfQuestionImage.jsx'));

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

function liveParticipantKey(session) {
  // Bir xil brauzerda turli akkauntlar qatnashsa ham har biri alohida
  // qatnashchi bo'lib qoladi. Mehmonlarda avvalgi qurilma kaliti saqlanadi.
  return session?.user?.id ? `account:${session.user.id}` : getDeviceKey();
}

async function findOrClaimLiveParticipant(roomId, session, preferredKey = null) {
  // Kirilgan akkauntning identifikatori doim joriy auth user'dan olinadi.
  // Oldingi akkauntdan qolgan tiklash kaliti boshqa foydalanuvchini
  // tasodifan shu qatnashchi deb ko'rsatmasligi kerak.
  const participantKey = session?.user?.id
    ? liveParticipantKey(session)
    : (preferredKey || liveParticipantKey(session));
  let existing = await sbFindParticipantByDevice(roomId, participantKey);
  if (existing) return { participant: existing, participantKey };

  // Eski build umumiy device_key yozgan bo'lsa, shu qatorni shartli va
  // atomar tarzda bir akkauntga ko'chiramiz. Keyingi akkaunt o'z qatorini oladi.
  if (session?.user?.id) {
    const legacyKey = getDeviceKey();
    if (legacyKey !== participantKey) {
      const legacy = await sbFindParticipantByDevice(roomId, legacyKey);
      if (legacy) {
        try {
          const claimed = await sbClaimLiveParticipantDevice(roomId, legacy.id, legacyKey, participantKey);
          if (claimed) return { participant: claimed, participantKey };
        } catch (error) {
          // Claim ruxsat etilmasa, yangi akkaunt kaliti bilan alohida qator ochamiz.
        }
        existing = await sbFindParticipantByDevice(roomId, participantKey);
        if (existing) return { participant: existing, participantKey };
      }
    }
  }
  return { participant: null, participantKey };
}

function liveShuffledOptionIndices(question, roomId, participantId, questionKey = '') {
  const length = Array.isArray(question?.options) ? question.options.length : 0;
  const indices = Array.from({ length }, (_, index) => index);
  if (length < 2) return indices;

  const seedText = `${roomId}:${participantId}:${questionKey || question?.id || question?.text || ''}`;
  const hashText = (value) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return hash >>> 0;
  };
  let seed = hashText(seedText);
  const random = () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = (items) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };

  const correctIndex = Number.isInteger(question?.correct) && question.correct >= 0 && question.correct < length
    ? question.correct
    : null;
  if (correctIndex === null) return shuffle(indices);

  const alternatives = shuffle(indices.filter((index) => index !== correctIndex));
  const positionOffset = hashText(`${seedText}:correct-position`) % length;
  alternatives.splice(positionOffset, 0, correctIndex);
  return alternatives;
}

/* "Barchaga bir xil" (Kahoot uslubi) rejimida tuzuvchi ekrani —
   savol/reyting almashtirish, avtomatik keyingi savolga o'tish,
   yakunda podium (3-2-1 o'rin) ko'rsatish. */
function LiveHostSyncPlay({ room, setRoom, test, participants, onExit }) {
  const [peekLeaderboard, setPeekLeaderboard] = useState(false);
  const [manualAdvancing, setManualAdvancing] = useState(false);
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
  const waitingAnswerCount = Math.max(0, participants.length - answeredCount);
  // Presence bir lahza uzilishi odamni javoblar sonidan chiqarib yubormasligi
  // kerak. Faqat bazadagi barcha qatnashchilar javob bersa yoki taymer tugasa o'tamiz.
  const allAnswered = participants.length > 0 && answeredCount >= participants.length;

  async function advanceNow() {
    if (advancingRef.current || room.status === 'finished') return;
    advancingRef.current = true;
    setManualAdvancing(true);
    try {
      const updated = await advanceSyncPhase(room, totalQuestions, { skipIntermission: true });
      if (updated) setRoom(updated);
    } finally {
      setManualAdvancing(false);
      advancingRef.current = false;
    }
  }

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
          <span className="ml-3 text-sm" style={{ ...fontMono, color: C.inkSoft }}>{answeredCount}/{participants.length} javob berdi{waitingAnswerCount > 0 ? ` · ${waitingAnswerCount} javob kutilyapti` : ''}</span>
          <button type="button" onClick={advanceNow} disabled={manualAdvancing} className="ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}>
            <SkipForward size={15} /> {manualAdvancing ? 'Oʻtilmoqda…' : 'Keyingi savol'}
          </button>
        </div>
      )}

      {room.phase === 'intermission' && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Natijani koʻrib, kerak boʻlsa keyingi savolga oʻting.</span>
          <button type="button" onClick={advanceNow} disabled={manualAdvancing} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm disabled:opacity-50" style={{ ...fontBody, color: C.white, background: C.cover }}>
            <SkipForward size={15} /> {manualAdvancing ? 'Oʻtilmoqda…' : 'Keyingi savol'}
          </button>
        </div>
      )}

      {room.phase === 'question' && !peekLeaderboard && currentQuestion && (
        <div className="max-w-2xl">
          {currentQuestion.type !== 'matching' && !currentQuestion.pdfSourceImageOnly && <div className="text-lg mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>{currentQuestion.text}{currentQuestion.mathFormula && <Suspense fallback={null}><MathInput value={currentQuestion.mathFormula} readOnly compact /></Suspense>}</div>}
          {currentQuestion.imageUrl && (currentQuestion.pdfSourceImageOnly
            ? <Suspense fallback={<div className="mb-3 h-28 animate-pulse rounded-xl bg-[#e8e2d2]" />}><PdfQuestionImage src={currentQuestion.imageUrl} alt={currentQuestion.text || 'PDFdagi savol'} /></Suspense>
            : <img src={currentQuestion.imageUrl} alt="" loading="lazy" className="mb-3 max-w-full rounded-2xl sm:max-w-md" style={{ border: `1px solid ${C.rule}` }} />)}
          {currentQuestion.type === 'matching' ? (
            <MatchingTestQuestion question={currentQuestion} answer={{}} onChange={() => {}} disabled accent="live" />
          ) : currentQuestion.type === 'open' ? (
            <div className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Yozma javobli savol — ishtirokchilar o'z ekranida javob yozmoqda.</div>
          ) : (
            <div className="space-y-2">
              {(Array.isArray(currentQuestion.options) ? currentQuestion.options : []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px]" style={{ ...fontBody, background: C.surface, border: `1px solid ${C.rule}`, color: C.ink }}>
                  <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + oi)}</span>
                  {currentQuestion.pdfSourceImageOnly ? null : currentQuestion.optionsAreMath ? <Suspense fallback={<span>{opt}</span>}><MathInput value={opt} readOnly compact /></Suspense> : <span>{opt}</span>}
                </div>
              ))}
              {!Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0 ? <div className="text-sm" style={{ ...fontBody, color: C.red }}>Bu savolning javob variantlari topilmadi.</div> : null}
            </div>
          )}
        </div>
      )}

      {room.phase === 'question' && !peekLeaderboard && !currentQuestion && (
        <div role="alert" className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="text-sm" style={{ ...fontBody, color: C.red }}>Savol tartibi sinxronlashmadi. Xona egasidan savolni qayta ochishini so‘rang.</div>
          <button type="button" onClick={onExit} className="mt-3 rounded-full px-3 py-2 text-sm" style={{ ...fontBody, color: C.white, background: C.cover }}>Xonadan chiqish</button>
        </div>
      )}

      {room.phase === 'intermission' && showingReveal && !peekLeaderboard && currentQuestion && (
        <div className="max-w-2xl">
          {(() => {
            const correctText = currentQuestion.type === 'open'
              ? (currentQuestion.answers && currentQuestion.answers[0]) || ''
              : currentQuestion.type === 'matching'
                ? currentQuestion.pairs
                  ? currentQuestion.pairs.map((pair, index) => `${index + 1}${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[pair.correct]}`).join(', ')
                  : currentQuestion.options?.[currentQuestion.correct] ?? ''
                : currentQuestion.options?.[currentQuestion.correct] ?? '';
            const correctCount = participants.filter((p) => p.answers && p.answers[currentQuestion.id]?.correct).length;
            return (
              <div className="px-4 py-3.5 rounded-2xl text-[15px]" style={{ ...fontBody, background: C.successTint, border: `1px solid ${C.accent}`, color: C.ink }}>
                <div className="flex items-center gap-2 mb-2" style={{ fontWeight: 600, color: C.accent }}>
                  <Check size={18} /> Toʻgʻri javob
                </div>
                <div className="text-sm mt-1"><span style={{ color: C.inkSoft }}>Toʻgʻri javob: </span><strong>{correctText || 'Javob kiritilmagan'}</strong></div>
                <div className="text-xs mt-2" style={{ ...fontMono, color: C.inkSoft }}>{correctCount}/{participants.length} qatnashchi toʻgʻri topdi</div>
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

function useLiveTestContent(testId, test, ensureTestContent) {
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const existingQuestions = test?.questions;
    if (Array.isArray(existingQuestions) && existingQuestions.length > 0) {
      setStatus('ready');
      return undefined;
    }
    if (!ensureTestContent || !testId) {
      setStatus('error');
      return undefined;
    }
    setStatus('loading');
    Promise.resolve()
      // Metadata-only lists sometimes contain an empty placeholder array. Force
      // one fresh read in that case, so a live room does not fail on stale data.
      .then(() => ensureTestContent(testId, attempt > 0 || Array.isArray(existingQuestions)))
      .then((questions) => {
        if (!cancelled) setStatus(Array.isArray(questions) && questions.length ? 'ready' : 'error');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [testId, test?.questions, ensureTestContent, attempt]);
  return { status, retry: () => { setStatus('loading'); setAttempt((count) => count + 1); } };
}

function LiveContentLoadState({ status, retry, onExit }) {
  if (status === 'loading') return <SectionLoading label="Savollar yuklanmoqda…" compact />;
  return (
    <div role="alert" className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
      <div className="text-sm" style={{ ...fontBody, color: C.ink }}>Bu testning savollarini yuklab bo‘lmadi.</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={retry} className="rounded-full px-3 py-2 text-sm" style={{ ...fontBody, color: C.white, background: C.cover }}>Qayta urinish</button>
        <button type="button" onClick={onExit} className="rounded-full px-3 py-2 text-sm" style={{ ...fontBody, color: C.inkSoft, border: `1px solid ${C.rule}` }}>Chiqish</button>
      </div>
    </div>
  );
}

function LiveHostSetup({ tests, testsLoading, testsLoadError, onRetryTests, session, onCreated, onBack, ensureTestContent }) {
  const myId = session?.user?.id;
  const myTests = tests.filter((t) => t.authorId === myId);
  const [scope, setScope] = useState(myTests.length > 0 ? 'mine' : 'all');
  const [query, setQuery] = useState('');
  const [testId, setTestId] = useState('');
  const [duration, setDuration] = useState(300);
  const [liveMode, setLiveMode] = useState('sync');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [perQSeconds, setPerQSeconds] = useState(30);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
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
      if ((!Array.isArray(questionsForOrder) || questionsForOrder.length === 0) && ensureTestContent) {
        // Older catalog rows can carry [] as a placeholder even though the
        // database has question content. Force a fetch for that stale value.
        questionsForOrder = await ensureTestContent(testId, Array.isArray(questionsForOrder));
      }
      if (!Array.isArray(questionsForOrder) || questionsForOrder.length === 0) {
        throw new Error('Tanlangan testda jonli ishlash uchun savollar topilmadi. Testni ochib, savollari saqlanganini tekshiring.');
      }
      const scheduledAt = scheduledLocal ? new Date(scheduledLocal) : null;
      if (scheduledAt && (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now())) {
        throw new Error('Boshlanish vaqti hozirgi vaqtdan keyin bo‘lishi kerak.');
      }
      const matchingPairs = (questionsForOrder || []).reduce((sum, question) => sum + (question.type === 'matching' ? getQuestionCount([question]) : 0), 0);
      const roomQuestionSeconds = matchingPairs ? Math.max(perQSeconds, Math.min(180, matchingPairs * 8)) : perQSeconds;
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
        mode: liveMode, per_question_seconds: roomQuestionSeconds, phase: 'lobby', current_index: 0,
        question_order: liveMode === 'sync' && questionsForOrder
          ? shuffleQuestions ? shuffledIndices(questionsForOrder.length) : questionsForOrder.map((_, i) => i)
          : null,
        shuffle_questions: liveMode === 'sync' && shuffleQuestions,
        shuffle_options: shuffleOptions,
      };
      if (scheduledAt) row.scheduled_at = scheduledAt.toISOString();
      const [created] = await sbInsert('live_rooms', row);
      onCreated(liveRoomFromRow(created));
    } catch (e) {
      console.error('Jonli test xonasini yaratib boʻlmadi:', e);
      setErr(e?.message || 'Xona yaratishda xatolik yuz berdi. Qayta urinib koʻring.');
    } finally {
      setBusy(false);
    }
  }

  if (testsLoading && tests.length === 0) {
    return <div><button onClick={onBack} className="inline-flex items-center gap-1 text-[15px] mb-5" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={15} /> Ortga</button><SectionLoading label="Testlar yuklanmoqda…" /></div>;
  }
  if (testsLoadError && tests.length === 0) {
    return <div><button onClick={onBack} className="inline-flex items-center gap-1 text-[15px] mb-5" style={{ ...fontBody, color: C.inkSoft }}><ArrowLeft size={15} /> Ortga</button><div role="alert" className="flex flex-wrap items-center gap-3 py-6 text-sm" style={{ ...fontBody, color: C.red }}><span>{testsLoadError}</span><button type="button" onClick={onRetryTests} className="px-3 py-1.5 rounded-sm" style={{ color: C.white, background: C.cover }}>Qayta yuklash</button></div></div>;
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

        <div className="mb-4 space-y-3 rounded-2xl p-3" style={{ background: C.paperSoft, border: `1px solid ${C.rule}` }}>
          <label className={`flex items-start gap-3 ${liveMode === 'sync' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
            <input
              type="checkbox"
              checked={shuffleQuestions}
              disabled={liveMode !== 'sync'}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="mt-1 accent-amber-600"
            />
            <span>
              <span className="block text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>Savollar tartibini aralashtirish</span>
              <span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Hamma qatnashchida bir xil ketma-ketlik boʻladi.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="mt-1 accent-amber-600"
            />
            <span>
              <span className="block text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>Javob variantlarini aralashtirish</span>
              <span className="mt-0.5 block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Har qatnashchida variantlar joyi turlicha; toʻgʻri javob hisobiga taʼsir qilmaydi.</span>
            </span>
          </label>
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
              <option value={240}>4 daqiqa</option>
              <option value={300}>5 daqiqa</option>
            </select>
            <div className="text-xs -mt-2 mb-4" style={{ ...fontBody, color: C.inkSoft }}>Moslik topshiriqlarida juftliklar soniga qarab vaqt avtomatik uzaytiriladi.</div>
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
              <option value={1800}>30 daqiqa</option>
              <option value={2700}>45 daqiqa</option>
              <option value={3600}>1 soat</option>
              <option value={5400}>1 soat 30 daqiqa</option>
              <option value={7200}>2 soat</option>
            </select>
            <div className="text-xs -mt-2 mb-4" style={{ ...fontBody, color: C.inkSoft }}>Vaqt test boshlanganda yuradi. Chiqib qaytsangiz ham shu muddat davom etadi.</div>
          </>
        )}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowSchedule((open) => !open)}
            aria-expanded={showSchedule}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left"
            style={{ ...fontBody, color: C.ink, background: C.paperSoft, border: `1px solid ${C.rule}` }}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Clock3 size={16} className="shrink-0" style={{ color: C.gold }} />
              <span className="truncate">{scheduledLocal ? `Boshlanish: ${new Date(scheduledLocal).toLocaleString()}` : 'Boshlanish vaqtini rejalashtirish'}</span>
            </span>
            <span aria-hidden="true" className="text-lg leading-none" style={{ color: C.inkSoft }}>{showSchedule ? '−' : '+'}</span>
          </button>
          {showSchedule && (
            <div className="mt-2">
              <label className="mb-1.5 block text-xs" style={{ ...fontMono, color: C.inkSoft }}>Boshlanish vaqti (ixtiyoriy)</label>
              <input
                type="datetime-local"
                value={scheduledLocal}
                min={(() => { const d = new Date(Date.now() + 60000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })()}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl text-[15px] outline-none"
                style={{ ...fontBody, border: `1px solid ${C.rule}`, background: C.paperSoft, color: C.ink }}
              />
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <div className="text-xs" style={{ ...fontBody, color: C.inkSoft }}>Vaqt tanlansa, qatnashchilar kutish zaliga kiradi va test shu vaqtda boshlanadi.</div>
                {scheduledLocal && <button type="button" onClick={() => setScheduledLocal('')} className="shrink-0 text-xs underline" style={{ ...fontBody, color: C.inkSoft }}>Olib tashlash</button>}
              </div>
            </div>
          )}
        </div>
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
  const [ending, setEnding] = useState(false);
  const [finishError, setFinishError] = useState('');
  const finishingRef = useRef(false);
  const test = tests.find((t) => t.id === room.testId);
  const testContent = useLiveTestContent(room.testId, test, ensureTestContent);

  useEffect(() => {
    if (room.status !== 'waiting' || !room.scheduledAt) return undefined;
    const checkStart = async () => {
      const updated = await startScheduledLiveRoom(room);
      if (updated) setRoom(updated);
    };
    checkStart();
    const timer = setInterval(checkStart, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.status, room.scheduledAt]);

  useEffect(() => {
    if (room.mode === 'sync' || room.status !== 'active') return undefined;
    let cancelled = false;
    async function refreshLiveStatus() {
      try {
        const [freshRoom, list] = await Promise.all([sbGetRoom(room.id), sbSelectParticipants(room.id)]);
        if (cancelled) return;
        if (freshRoom) setRoom(freshRoom);
        setParticipants(list);
      } catch (e) { /* Realtime yoki keyingi polling urinishida yangilanadi */ }
    }
    const timer = setInterval(refreshLiveStatus, 2000);
    return () => { cancelled = true; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.mode, room.status]);

  useEffect(() => {
    let cancelled = false;
    let participantEventVersion = 0;
    let rosterReadVersion = 0;
    async function refreshRoster() {
      const readVersion = ++rosterReadVersion;
      const eventVersion = participantEventVersion;
      try {
        const [freshRoom, list] = await Promise.all([sbGetRoom(room.id), sbSelectParticipants(room.id)]);
        if (cancelled || readVersion !== rosterReadVersion || eventVersion !== participantEventVersion) return;
        if (freshRoom) setRoom(freshRoom);
        setParticipants(list);
      } catch (e) { /* Realtime yoki zaxira so'rov yangilaydi */ }
    }
    refreshRoster();

    const unsubscribe = subscribeToLiveRoom(room.id, {
      onRoom: (r) => { if (!cancelled) setRoom(r); },
      onParticipants: (updater) => {
        if (cancelled) return;
        participantEventVersion += 1;
        setParticipants(updater);
      },
      // Obuna tasdiqlangandan keyin ro'yxatni yangidan olib, GET va
      // WebSocket ulanishi oralig'ida qo'shilganlarni ham qo'shamiz.
      onSubscribed: refreshRoster,
      pollFallbackMs: room.mode === 'sync' ? 1500 : 3000,
    });
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  async function start() {
    setStarting(true);
    try {
      const patch = { status: 'active', starts_at: new Date().toISOString() };
      if (room.scheduledAt) patch.scheduled_at = null;
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

  async function finishRoom() {
    if (room.status !== 'active' || finishingRef.current) return;
    finishingRef.current = true;
    setFinishError('');
    setEnding(true);
    try {
      const [updated] = await sbUpdate('live_rooms', room.id, { status: 'finished' });
      if (updated) setRoom(liveRoomFromRow(updated));
      else {
        finishingRef.current = false;
        setFinishError('Testni yakunlab boʻlmadi. Qayta urinib koʻring.');
      }
    } catch (e) {
      finishingRef.current = false;
      setFinishError('Testni yakunlab boʻlmadi. Internetni tekshirib, qayta urinib koʻring.');
    } finally {
      setEnding(false);
    }
  }

  const allParticipantsSubmitted = participants.length > 0 && participants.every((p) => !!p.submittedAt);
  useEffect(() => {
    if (room.mode === 'sync' || room.status !== 'active' || !allParticipantsSubmitted) return;
    finishRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.mode, room.status, room.id, allParticipantsSubmitted, participants]);

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

  if ((room.status === 'active' || room.status === 'finished') && room.mode === 'sync') {
    if (testContent.status !== 'ready' || !test) {
      return <LiveContentLoadState status={testContent.status === 'ready' ? 'error' : testContent.status} retry={testContent.retry} onExit={onExit} />;
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
        {room.status === 'active' && room.mode !== 'sync' && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>
              Topshirganlar: {participants.filter((p) => p.submittedAt).length}/{participants.length}
            </span>
            <SolidButton onClick={finishRoom} icon={Check} disabled={ending}>
              {ending ? 'Yakunlanmoqda...' : 'Testni hozir yakunlash'}
            </SolidButton>
            {finishError && <span role="alert" className="text-sm" style={{ ...fontBody, color: C.red }}>{finishError}</span>}
          </div>
        )}
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
        <div className="w-32 h-32 sm:w-56 sm:h-56 mx-auto mb-4 p-2" style={{ background: '#fff', borderRadius: 12 }}>
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
      {room.scheduledAt && room.status === 'waiting' && (
        <div className="max-w-sm rounded-2xl p-3 mb-4 text-sm" style={{ ...fontBody, color: C.ink, background: C.liveTint, border: `1px solid ${C.rule}` }}>
          Rejalashtirilgan start: <strong>{new Date(room.scheduledAt).toLocaleString()}</strong>. Belgilangan paytda xona avtomatik ochiladi.
        </div>
      )}
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
      {testContent.status === 'error' && <LiveContentLoadState status={testContent.status} retry={testContent.retry} onExit={onExit} />}
      {testContent.status === 'loading' && <div className="mb-3"><SectionLoading label="Savollar tekshirilmoqda…" compact /></div>}
      <SolidButton onClick={start} icon={Award} disabled={starting || participants.length === 0 || testContent.status !== 'ready'}>{starting ? 'Boshlanmoqda...' : room.scheduledAt ? 'Hozir boshlash' : 'Testni boshlash'}</SolidButton>
    </div>
  );
}

/* "Barchaga bir xil" rejimida ishtirokchi (o'quvchi) ekrani.
   Har bir savol serverdan kelgan vaqt bo'yicha hammada bir xil
   chiqadi; javob bergan zahoti ball hisoblanadi (tezroq — ko'proq). */
function LiveSyncPlayer({ room, setRoom, test, participant, onExit }) {
  const draftKey = `upcourse_live_sync_drafts:${room.id}:${participant.id}`;
  const [myAnswers, setMyAnswers] = useState(() => participant.answers || {});
  const [matchingDraft, setMatchingDraft] = useState({});
  const [openText, setOpenText] = useState('');
  const [drafts, setDrafts] = useState(() => {
    try { const stored = JSON.parse(localStorage.getItem(draftKey) || '{}'); return stored && typeof stored === 'object' ? stored : {}; }
    catch (e) { return {}; }
  });
  const [now, setNow] = useState(estimatedServerNow());
  const [participants, setParticipants] = useState([]);
  const scoreRef = useRef(participant.score || 0);
  const draftsRef = useRef(drafts);
  const matchingDraftRef = useRef(matchingDraft);
  const submittingRef = useRef(false);
  const advancingRef = useRef(false);

  const order = room.questionOrder && room.questionOrder.length === test.questions.length
    ? room.questionOrder
    : test.questions.map((_, i) => i);
  const currentQuestion = test.questions[order[room.currentIndex]] || null;
  const currentOptionOrder = currentQuestion && currentQuestion.type !== 'matching' && currentQuestion.type !== 'open'
    ? room.shuffleOptions ? liveShuffledOptionIndices(
      currentQuestion,
      room.id,
      participant.id,
      `${room.currentIndex}:${order[room.currentIndex]}`
    ) : (Array.isArray(currentQuestion.options) ? currentQuestion.options.map((_, i) => i) : [])
    : [];
  const INTERMISSION_SECONDS = 6;
  const REVEAL_SECONDS = 3; // birinchi 3s — to'g'ri/xato javob, keyingi 3s — reyting
  const totalQuestions = test.questions.length;

  function saveDraft(questionId, patch) {
    const next = { ...draftsRef.current, [questionId]: { ...(draftsRef.current[questionId] || {}), ...patch } };
    draftsRef.current = next;
    setDrafts(next);
    try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch (e) { /* qurilma xotirasi ixtiyoriy zaxira */ }
  }

  function clearDraft(questionId) {
    const next = { ...draftsRef.current };
    delete next[questionId];
    draftsRef.current = next;
    setDrafts(next);
    try { if (Object.keys(next).length) localStorage.setItem(draftKey, JSON.stringify(next)); else localStorage.removeItem(draftKey); }
    catch (e) { /* serverda javob saqlangan bo'lsa, mahalliy nusxa shart emas */ }
  }

  function changeOpenText(value) {
    setOpenText(value);
    if (currentQuestion) saveDraft(currentQuestion.id, { openText: value });
  }

  function changeMatchingDraft(pairId, optionIndex) {
    if (!currentQuestion) return;
    const qid = currentQuestion.id;
    const next = { ...matchingDraftRef.current, [qid]: { ...(matchingDraftRef.current[qid] || {}) } };
    if (optionIndex === undefined) delete next[qid][pairId];
    else next[qid][pairId] = optionIndex;
    matchingDraftRef.current = next;
    setMatchingDraft(next);
    saveDraft(qid, { matching: next[qid] });
  }

  /* Taymer endi serverda yozilgan haqiqiy boshlanish vaqtidan
     (room.phaseStartedAt) hisoblanadi — tuzuvchi ekranidagi bilan bir xil. */
  const phaseStartedMs = room.phaseStartedAt ? new Date(room.phaseStartedAt).getTime() : now;
  const phaseLimitMs = room.phase === 'question' ? room.perQuestionSeconds * 1000 : INTERMISSION_SECONDS * 1000;
  const elapsedMs = now - phaseStartedMs;
  const secondsLeft = Math.max(0, Math.ceil((phaseLimitMs - elapsedMs) / 1000));
  const showingReveal = room.phase === 'intermission' && elapsedMs < REVEAL_SECONDS * 1000;
  const hasAnswered = currentQuestion ? myAnswers[currentQuestion.id] !== undefined : false;

  useEffect(() => {
    let cancelled = false;
    let participantEventVersion = 0;
    let rosterReadVersion = 0;
    async function refreshSnapshot() {
      const readVersion = ++rosterReadVersion;
      const eventVersion = participantEventVersion;
      try {
        const [fresh, list] = await Promise.all([sbGetRoom(room.id), sbSelectParticipants(room.id)]);
        if (cancelled || readVersion !== rosterReadVersion || eventVersion !== participantEventVersion) return;
        if (fresh) setRoom(fresh);
        setParticipants(list);
      } catch (e) { /* Realtime yoki zaxira so'rov yangilaydi */ }
    }
    refreshSnapshot();

    const unsubscribe = subscribeToLiveRoom(room.id, {
      onRoom: (r) => { if (!cancelled) setRoom(r); },
      onParticipants: (updater) => {
        if (cancelled) return;
        participantEventVersion += 1;
        setParticipants(updater);
      },
      onSubscribed: refreshSnapshot,
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
    if (!currentQuestion) return;
    const qid = currentQuestion.id;
    const saved = myAnswers[qid]?.answer;
    const draft = draftsRef.current[qid] || {};
    setOpenText(typeof saved === 'string' ? saved : typeof draft.openText === 'string' ? draft.openText : '');
    const matching = saved && typeof saved === 'object' ? saved : draft.matching || matchingDraftRef.current[qid] || {};
    const next = { ...matchingDraftRef.current, [qid]: matching };
    matchingDraftRef.current = next;
    setMatchingDraft(next);
  }, [room.currentIndex, currentQuestion?.id]);

  async function submitAnswer(answerValue) {
    if (!currentQuestion || submittingRef.current) return;
    if (myAnswers[currentQuestion.id] !== undefined) return;
    submittingRef.current = true;
    const timeTakenMs = Math.min(phaseLimitMs, Math.max(0, now - phaseStartedMs));
    const correctUnits = getQuestionScore(currentQuestion, answerValue);
    const totalUnits = getQuestionCount([currentQuestion]);
    const accuracy = totalUnits ? correctUnits / totalUnits : 0;
    const correct = accuracy === 1;
    const points = computeSyncScore(accuracy, timeTakenMs, phaseLimitMs);
    const newAnswers = { ...myAnswers, [currentQuestion.id]: { answer: answerValue, correct, points, correctUnits, totalUnits } };
    setMyAnswers(newAnswers);
    try {
      const newScore = scoreRef.current + points;
      scoreRef.current = newScore;
      await sbUpdate('live_participants', participant.id, { score: newScore, total: getQuestionCount(test.questions), answers: newAnswers });
      clearDraft(currentQuestion.id);
    } catch (e) { /* keyingi savolda qayta urinish mumkin */ }
    submittingRef.current = false;
  }

  useEffect(() => {
    if (room.phase !== 'question' || !currentQuestion || secondsLeft > 0 || hasAnswered) return;
    submitAnswer(currentQuestion.type === 'matching' ? matchingDraft[currentQuestion.id] || {} : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, room.phase, hasAnswered, matchingDraft]);

  /* Ishtirokchi brauzeridagi qisman roster barcha javoblar berildi deb
     noto'g'ri xulosa qilmasin. Savolni muddatidan oldin faqat tuzuvchi,
     to'liq rosterdagi barcha javoblarni olgach, siljitadi; tuzuvchi uzilsa
     server taymeri tugaganda ishtirokchilar zaxira bo'lib siljitadi. */
  useEffect(() => {
    if (room.status === 'finished') return;
    if (advancingRef.current) return;
    const shouldAdvance = (room.phase === 'question' && secondsLeft <= 0)
      || (room.phase === 'intermission' && secondsLeft <= 0);
    if (!shouldAdvance) return;

    advancingRef.current = true;
    advanceSyncPhase(room, totalQuestions)
      .then((updated) => { if (updated) setRoom(updated); })
      .finally(() => { advancingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, room.phase, room.status]);

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
          {currentQuestion.type !== 'matching' && !currentQuestion.pdfSourceImageOnly && <div className="text-lg mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>{currentQuestion.text}{currentQuestion.mathFormula && <Suspense fallback={null}><MathInput value={currentQuestion.mathFormula} readOnly compact /></Suspense>}</div>}
          {currentQuestion.imageUrl && (currentQuestion.pdfSourceImageOnly
            ? <Suspense fallback={<div className="mb-3 h-28 animate-pulse rounded-xl bg-[#e8e2d2]" />}><PdfQuestionImage src={currentQuestion.imageUrl} alt="PDFdagi savolning asl ko‘rinishi" /></Suspense>
            : <img src={currentQuestion.imageUrl} alt="" loading="lazy" className="mb-3 max-w-full rounded-2xl sm:max-w-md" style={{ border: `1px solid ${C.rule}` }} />)}

          {hasAnswered ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[15px]" style={{ ...fontBody, background: C.liveTint, border: `1px solid ${C.live}`, color: C.ink }}>
              <Check size={16} style={{ color: C.live }} /> Javobingiz qabul qilindi. Kuting...
            </div>
          ) : currentQuestion.type === 'matching' ? (
            <>
              <MatchingTestQuestion
                question={currentQuestion}
                answer={matchingDraft[currentQuestion.id] || {}}
                onChange={changeMatchingDraft}
                accent="live"
              />
              <div className="mt-4"><SolidButton onClick={() => submitAnswer(matchingDraft[currentQuestion.id] || {})} icon={Check} disabled={(currentQuestion.pairs || []).some((pair) => matchingDraft[currentQuestion.id]?.[pair.id] === undefined)}>Javoblarni yuborish</SolidButton></div>
            </>
          ) : currentQuestion.type === 'open' ? (
            <div className="flex items-center gap-2">
              {currentQuestion.answerMode === 'math' ? <div className="min-w-0 flex-1"><Suspense fallback={<div className="py-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Formula maydoni…</div>}><MathInput value={openText} onChange={changeOpenText} disabled={hasAnswered} placeholder="Javobingizni formulada kiriting" /></Suspense></div> : <input
                type="text"
                value={openText}
                onChange={(e) => changeOpenText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && openText.trim()) submitAnswer(openText); }}
                placeholder="Javobingizni yozing"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl text-[15px] outline-none"
                style={{ ...fontBody, color: C.ink, background: C.surface, border: `1px solid ${C.rule}` }}
              />}
              <SolidButton onClick={() => submitAnswer(openText)} icon={Check} disabled={!openText.trim()}>Yuborish</SolidButton>
            </div>
          ) : (
            <div className="space-y-2">
              {currentOptionOrder.map((originalIndex, displayIndex) => {
                const opt = currentQuestion.options[originalIndex];
                return (
                <button
                  key={originalIndex}
                  onClick={() => submitAnswer(originalIndex)}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
                  style={{ ...fontBody, background: C.surface, border: `1px solid ${C.rule}`, color: C.ink, outlineColor: C.live }}
                >
                  <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + displayIndex)}</span>
                  {!currentQuestion.pdfSourceImageOnly && (currentQuestion.optionsAreMath
                    ? <Suspense fallback={<span>{opt}</span>}><MathInput value={opt} readOnly compact /></Suspense>
                    : <span>{opt}</span>)}
                </button>
                );
              })}
              {!Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0 ? <div className="text-sm" style={{ ...fontBody, color: C.red }}>Bu savolning javob variantlari topilmadi.</div> : null}
            </div>
          )}
        </div>
      )}

      {room.phase === 'question' && !currentQuestion && (
        <SectionLoading label="Savol yuklanmoqda…" compact />
      )}

      {room.phase === 'intermission' && showingReveal && currentQuestion && (
        <div className="max-w-2xl">
          {(() => {
            const myAnswer = myAnswers[currentQuestion.id];
            const wasCorrect = !!myAnswer?.correct;
            const hasMatchingCredit = currentQuestion.type === 'matching' && (myAnswer?.correctUnits || 0) > 0;
            const correctText = currentQuestion.type === 'open'
              ? (currentQuestion.answers && currentQuestion.answers[0]) || ''
              : currentQuestion.type === 'matching'
                ? currentQuestion.pairs
                  ? currentQuestion.pairs.map((pair, index) => `${index + 1}${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[pair.correct]}`).join(', ')
                  : currentQuestion.options?.[currentQuestion.correct] ?? ''
                : currentQuestion.options?.[currentQuestion.correct] ?? '';
            const rawAnswer = myAnswer?.answer;
            const myAnswerText = currentQuestion.type === 'open'
              ? (typeof rawAnswer === 'string' && rawAnswer.trim() ? rawAnswer : 'Javob berilmadi')
              : currentQuestion.type === 'matching'
                ? currentQuestion.pairs
                  ? currentQuestion.pairs.map((pair, index) => `${index + 1}${rawAnswer?.[pair.id] === undefined ? '—' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[rawAnswer[pair.id]]}`).join(', ')
                  : currentQuestion.options?.[rawAnswer] ?? 'Javob berilmadi'
                : currentQuestion.options?.[rawAnswer] ?? 'Javob berilmadi';
            return (
              <div
                className="px-4 py-3.5 rounded-2xl text-[15px]"
                style={{ ...fontBody, background: wasCorrect ? C.successTint : C.dangerTint, border: `1px solid ${wasCorrect ? C.accent : C.red}`, color: C.ink }}
              >
                <div className="flex items-center gap-2 mb-2" style={{ fontWeight: 600, color: wasCorrect ? C.accent : C.red }}>
                  {wasCorrect ? <Check size={18} /> : <X size={18} />} {wasCorrect ? 'Toʻgʻri javob!' : hasMatchingCredit ? 'Qisman toʻgʻri' : 'Xato javob'}
                </div>
                <div className="text-sm"><span style={{ color: C.inkSoft }}>Sizning javobingiz: </span>{currentQuestion.type === 'open' && currentQuestion.answerMode === 'math' && myAnswerText !== 'Javob berilmadi' ? <Suspense fallback={<span>{myAnswerText}</span>}><MathInput value={myAnswerText} readOnly compact /></Suspense> : myAnswerText}</div>
                <div className="text-sm mt-1"><span style={{ color: C.inkSoft }}>Toʻgʻri javob: </span>{currentQuestion.type === 'open' && currentQuestion.answerMode === 'math' && correctText ? <Suspense fallback={<strong>{correctText}</strong>}><MathInput value={correctText} readOnly compact /></Suspense> : currentQuestion.optionsAreMath && currentQuestion.type !== 'matching' && correctText ? <Suspense fallback={<strong>{correctText}</strong>}><MathInput value={correctText} readOnly compact /></Suspense> : <strong>{correctText || 'Javob kiritilmagan'}</strong>}</div>
                {myAnswer?.points > 0 && (
                  <div className="text-sm mt-2" style={{ ...fontMono, color: C.inkSoft }}>+{myAnswer.points} ball</div>
                )}
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


function LiveJoinForm({ initialCode, onJoined, onBack, session }) {
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
      const { participantKey, participant: existing } = await findOrClaimLiveParticipant(room.id, session);
      if (existing) {
        let restored = existing;
        if (existing.name !== n) {
          const [updated] = await sbUpdate('live_participants', existing.id, { name: n });
          if (updated) restored = liveParticipantFromRow(updated);
        }
        onJoined(room, restored, participantKey);
        return;
      }
      const row = { room_id: room.id, name: n, device_key: participantKey };
      const [created] = await sbInsert('live_participants', row);
      onJoined(room, liveParticipantFromRow(created), participantKey);
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
  const draftKey = `upcourse_live_answers:${room.id}:${participant.id}`;
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || '{}');
      return { ...(participant.answers || {}), ...(saved && typeof saved === 'object' ? saved : {}) };
    } catch (e) { return participant.answers || {}; }
  });
  const answersRef = useRef(answers);
  const [submitted, setSubmitted] = useState(Boolean(participant.submittedAt));
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [remaining, setRemaining] = useState(9999);
  const submittingRef = useRef(false);
  const persistTimerRef = useRef(null);
  const persistChainRef = useRef(Promise.resolve());

  const roomStartMs = room.startsAt ? new Date(room.startsAt).getTime() : 0;
  const participantJoinMs = participant.joinedAt ? new Date(participant.joinedAt).getTime() : 0;
  const quizStartMs = Math.max(roomStartMs || 0, participantJoinMs || 0);
  const isQuestionAnswered = (question, answer) => {
    if (question.type === 'matching') {
      if (Array.isArray(question.pairs)) return question.pairs.every((pair) => answer?.[pair.id] !== undefined);
      return answer?.[question.id] !== undefined || typeof answer === 'number';
    }
    if (question.type === 'open') return typeof answer === 'string' && answer.trim().length > 0;
    return answer !== undefined && answer !== null;
  };
  const unansweredNumbers = test.questions
    .map((question, index) => isQuestionAnswered(question, answers[question.id]) ? null : index + 1)
    .filter((number) => number !== null);

  function queueAnswerSave(nextAnswers) {
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    try { localStorage.setItem(draftKey, JSON.stringify(nextAnswers)); } catch (e) { /* local zaxira ixtiyoriy */ }
    clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistChainRef.current = persistChainRef.current.catch(() => {}).then(() =>
        sbUpdate('live_participants', participant.id, { answers: nextAnswers })
      ).catch(() => {});
    }, 350);
  }

  useEffect(() => () => clearTimeout(persistTimerRef.current), []);

  async function submit(currentAnswers) {
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;
    setSubmitted(true);
    setSubmitError('');
    answersRef.current = currentAnswers;
    clearTimeout(persistTimerRef.current);
    const score = test.questions.reduce((s, q) => s + getQuestionScore(q, currentAnswers[q.id]), 0);
    try {
      persistChainRef.current = persistChainRef.current.catch(() => {}).then(() =>
        sbUpdate('live_participants', participant.id, {
          answers: currentAnswers, score, total: getQuestionCount(test.questions), submitted_at: new Date().toISOString(),
        })
      );
      await persistChainRef.current;
      try { localStorage.removeItem(draftKey); } catch (e) { /* ixtiyoriy zaxira */ }
      const latestParticipants = await sbSelectParticipants(room.id);
      if (latestParticipants.length > 0 && latestParticipants.every((p) => !!p.submittedAt)) {
        await sbUpdate('live_rooms', room.id, { status: 'finished' });
      }
    } catch (e) {
      setSubmitted(false);
      setSubmitError('Javoblarni saqlab bo‘lmadi. Internetni tekshirib, yana yuboring.');
    } finally {
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    function tick() {
      if (room.status === 'finished') {
        submit(answers);
        return;
      }
      if (!quizStartMs) return;
      const end = quizStartMs + room.durationSeconds * 1000;
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) submit(answers);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, room.status, quizStartMs, room.durationSeconds]);

  function select(qid, idx) {
    if (submitted) return;
    queueAnswerSave({ ...answersRef.current, [qid]: idx });
  }

  function setOpenAnswer(qid, text) {
    if (submitted) return;
    queueAnswerSave({ ...answersRef.current, [qid]: text });
  }

  function setMatchingAnswer(qid, pairId, optionIndex) {
    if (submitted) return;
    const next = { ...answersRef.current, [qid]: { ...(answersRef.current[qid] || {}) } };
    if (optionIndex === undefined) delete next[qid][pairId];
    else next[qid][pairId] = optionIndex;
    queueAnswerSave(next);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  if (submitted) {
    const score = test.questions.reduce((sum, q) => sum + getQuestionScore(q, answers[q.id]), 0);
    const total = getQuestionCount(test.questions);
    return (
      <div>
        <SectionHeading eyebrow="Natijalar" title={`${score} / ${total} ball`} />
        {submitError && <div role="alert" className="mt-3 rounded-xl p-3 text-sm" style={{ ...fontBody, color: C.red, background: C.dangerTint }}>{submitError}</div>}
        <div className="space-y-4 max-w-2xl mt-5">
          {test.questions.map((q, qi) => {
            const userAnswer = answers[q.id];
            const points = getQuestionScore(q, userAnswer);
            const count = getQuestionCount([q]);
            const correct = points === count;
            let chosenText = 'Javob berilmadi';
            let correctText = '';
            if (q.type === 'open') {
              chosenText = typeof userAnswer === 'string' && userAnswer.trim() ? userAnswer : 'Javob berilmadi';
              correctText = (q.answers || []).join(' yoki ');
            } else if (q.type === 'matching') {
              const pairs = q.pairs || [{ id: q.id, correct: q.correct }];
              const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              if (!q.pairs) {
                chosenText = q.options?.[userAnswer] ?? 'Javob berilmadi';
                correctText = q.options?.[q.correct] ?? '';
              } else {
                chosenText = pairs.map((pair, i) => `${i + 1}. ${userAnswer?.[pair.id] === undefined ? '—' : letters[userAnswer[pair.id]]}`).join(' · ');
                correctText = pairs.map((pair, i) => `${i + 1}. ${letters[pair.correct]}`).join(' · ');
              }
            } else {
              chosenText = q.options?.[userAnswer] ?? 'Javob berilmadi';
              correctText = q.options?.[q.correct] ?? '';
            }
            return (
              <article key={q.id} className="p-4 rounded-2xl" style={{ background: correct ? C.successTint : C.dangerTint, border: `1px solid ${correct ? C.accent : C.red}` }}>
                <div className="text-[15px] mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 600 }}>{qi + 1}. {q.text || 'Moslashtirish savoli'}</div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><div style={{ ...fontBody, color: C.inkSoft }}>Sizning javobingiz</div><div className="mt-1 break-words" style={{ ...fontBody, color: C.ink }}>{chosenText}</div></div>
                  <div><div style={{ ...fontBody, color: C.inkSoft }}>Toʻgʻri javob</div><div className="mt-1 break-words" style={{ ...fontBody, color: C.accent, fontWeight: 600 }}>{correctText || 'Javob kiritilmagan'}</div></div>
                </div>
                <div className="mt-3 text-xs" style={{ ...fontMono, color: correct ? C.accent : C.red }}>{correct ? 'Toʻgʻri' : 'Notoʻgʻri'} · {points}/{count} ball</div>
              </article>
            );
          })}
        </div>
        <div className="mt-6"><SolidButton onClick={onDone} icon={Trophy}>Reytingni koʻrish</SolidButton></div>
      </div>
    );
  }

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
        {test.questions.map((q, qi) => {
          const liveOptionOrder = q.type !== 'matching' && q.type !== 'open'
            ? room.shuffleOptions ? liveShuffledOptionIndices(q, room.id, participant.id, `free:${qi}`) : (Array.isArray(q.options) ? q.options.map((_, i) => i) : [])
            : [];
          return (
          <div key={q.id}>
            {q.type !== 'matching' && !q.pdfSourceImageOnly && <div className="text-base mb-3" style={{ ...fontBody, color: C.ink, fontWeight: 500 }}>
              <span style={{ ...fontMono, color: C.live }}>{qi + 1}.</span> {q.text}{q.mathFormula && <Suspense fallback={null}><MathInput value={q.mathFormula} readOnly compact /></Suspense>}
            </div>}
          {q.imageUrl && (q.pdfSourceImageOnly
            ? <Suspense fallback={<div className="mb-3 h-28 animate-pulse rounded-xl bg-[#e8e2d2]" />}><PdfQuestionImage src={q.imageUrl} alt={q.text || 'PDFdagi savol'} /></Suspense>
            : <img src={q.imageUrl} alt="" loading="lazy" className="mb-3 max-w-full rounded-2xl sm:max-w-md" style={{ border: `1px solid ${C.rule}` }} />)}
            {q.type === 'matching' ? (
              <MatchingTestQuestion question={q} answer={answers[q.id] || {}} onChange={(pairId, optionIndex) => setMatchingAnswer(q.id, pairId, optionIndex)} disabled={submitted} accent="live" />
            ) : q.type === 'open' ? (
              q.answerMode === 'math' ? <Suspense fallback={<div className="py-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>Formula maydoni…</div>}><MathInput value={answers[q.id] || ''} onChange={(value) => setOpenAnswer(q.id, value)} disabled={submitted} placeholder="Javobingizni formulada kiriting" /></Suspense> : <input
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
              {liveOptionOrder.map((originalIndex, displayIndex) => {
                const opt = q.options[originalIndex];
                const isSelected = answers[q.id] === originalIndex;
                return (
                  <button
                    key={originalIndex}
                    onClick={() => select(q.id, originalIndex)}
                    disabled={submitted}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] transition-colors focus-visible:outline focus-visible:outline-2"
                    style={{ ...fontBody, background: isSelected ? C.liveTint : C.surface, border: `1px solid ${isSelected ? C.live : C.rule}`, color: C.ink, outlineColor: C.live }}
                  >
                    <span style={{ ...fontMono, color: C.inkSoft }}>{String.fromCharCode(65 + displayIndex)}</span>
                    {q.pdfSourceImageOnly ? null : q.optionsAreMath ? <Suspense fallback={<span>{opt}</span>}><MathInput value={opt} readOnly compact /></Suspense> : <span>{opt}</span>}
                  </button>
                );
              })}
              {!Array.isArray(q.options) || q.options.length === 0 ? <div className="text-sm" style={{ ...fontBody, color: C.red }}>Bu savolning javob variantlari topilmadi.</div> : null}
            </div>
            )}
          </div>
          );
        })}
      </div>
      <div className="mt-8">
        {submitError && <div role="alert" className="mb-3 rounded-xl p-3 text-sm" style={{ ...fontBody, color: C.red, background: C.dangerTint }}>{submitError}</div>}
        {unansweredNumbers.length > 0 && (
          <div className="mb-3 px-4 py-3 rounded-2xl text-sm" style={{ ...fontBody, color: C.red, background: C.dangerTint, border: `1px solid ${C.red}` }}>
            {unansweredNumbers.length} ta savol javobsiz: {unansweredNumbers.join(', ')}.
          </div>
        )}
        <SolidButton
          onClick={() => unansweredNumbers.length > 0 ? setConfirmIncomplete(true) : submit(answers)}
          icon={Check}
          disabled={submitted}
        >
          {submitted ? 'Yuborildi' : unansweredNumbers.length ? 'Javoblarni tekshirib yakunlash' : 'Testni yakunlash'}
        </SolidButton>
        {confirmIncomplete && (
          <div role="alertdialog" aria-modal="true" aria-labelledby="incomplete-submit-title" className="mt-4 p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.red}` }}>
            <div id="incomplete-submit-title" className="font-semibold mb-1" style={{ ...fontBody, color: C.ink }}>Javobsiz savollar bor</div>
            <p className="text-sm mb-3" style={{ ...fontBody, color: C.inkSoft }}>
              {unansweredNumbers.length} ta savolga javob belgilanmagan ({unansweredNumbers.join(', ')}). Baribir testni yakunlaysizmi?
            </p>
            <div className="flex flex-wrap gap-2">
              <GhostButton onClick={() => setConfirmIncomplete(false)} icon={ArrowLeft}>Davom etish</GhostButton>
              <SolidButton onClick={() => { setConfirmIncomplete(false); submit(answers); }} icon={Check}>Ha, yakunlash</SolidButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveParticipant({ room, setRoom, participant, tests, onExit, onSessionChange, ensureTestContent }) {
  const [phase, setPhase] = useState(room.status === 'waiting' ? 'waiting' : 'quiz');
  const [participants, setParticipants] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const previousStatusRef = useRef(room.status);
  const test = tests.find((t) => t.id === room.testId);
  const testContent = useLiveTestContent(room.testId, test, ensureTestContent);

  useEffect(() => {
    if (previousStatusRef.current === 'waiting' && room.status === 'active' && notificationPermission === 'granted') {
      try {
        new Notification('Jonli test boshlandi', { body: `${test?.title || 'Jonli test'} — qatnashishingiz mumkin.` });
      } catch (e) { /* brauzer bildirishnomani ko'rsata olmasa, sahifa baribir davom etadi */ }
    }
    previousStatusRef.current = room.status;
  }, [room.status, notificationPermission, test?.title]);

  useEffect(() => {
    if (room.status !== 'waiting' || !room.scheduledAt) return undefined;
    const checkStart = async () => {
      const updated = await startScheduledLiveRoom(room);
      if (updated) setRoom(updated);
    };
    checkStart();
    const timer = setInterval(checkStart, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, room.status, room.scheduledAt]);

  async function enableStartNotification() {
    if (typeof Notification === 'undefined') return;
    try { setNotificationPermission(await Notification.requestPermission()); }
    catch (e) { setNotificationPermission('denied'); }
  }

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
    let participantEventVersion = 0;
    let rosterReadVersion = 0;
    async function refreshSnapshot() {
      const readVersion = ++rosterReadVersion;
      const eventVersion = participantEventVersion;
      try {
        const [fresh, list] = await Promise.all([sbGetRoom(room.id), sbSelectParticipants(room.id)]);
        if (cancelled || readVersion !== rosterReadVersion || eventVersion !== participantEventVersion) return;
        if (fresh) {
          setRoom(fresh);
          if (fresh.status !== 'waiting') setPhase((p) => (p === 'waiting' ? 'quiz' : p));
        }
        setParticipants(list);
      } catch (e) { /* Realtime yoki zaxira so'rov yangilaydi */ }
    }
    refreshSnapshot();

    const unsubscribe = subscribeToLiveRoom(room.id, {
      onRoom: (r) => {
        if (cancelled) return;
        setRoom(r);
        if (r.status !== 'waiting') setPhase((p) => (p === 'waiting' ? 'quiz' : p));
      },
      onParticipants: (updater) => {
        if (cancelled) return;
        participantEventVersion += 1;
        setParticipants(updater);
      },
      onSubscribed: refreshSnapshot,
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
          {room.scheduledAt ? `Test ${new Date(room.scheduledAt).toLocaleString()} da boshlanadi.` : 'Boshqaruvchi testni boshlashini kuting...'}
        </div>
        <section className="mt-5 max-w-sm rounded-2xl p-4" aria-label="Kutish zalidagi qatnashchilar" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="font-semibold" style={{ ...fontBody, color: C.ink }}>Kutayotganlar</div>
            <div className="rounded-full px-2.5 py-1 text-xs" style={{ ...fontMono, color: C.live, background: C.liveTint }}>{participants.length} kishi</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => {
              return (
                <span key={p.id} className="inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-sm" style={{ ...fontBody, color: C.ink, background: C.paperSoft, border: `1px solid ${C.rule}` }}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: C.accent }} />
                  <span className="max-w-[14rem] truncate">{p.name}{String(p.id) === String(participant.id) ? ' (siz)' : ''}</span>
                </span>
              );
            })}
            {participants.length === 0 && <span className="text-sm" style={{ ...fontBody, color: C.inkSoft }}>Hozircha boshqalar qoʻshilmadi.</span>}
          </div>
          <div className="mt-3 text-xs" style={{ ...fontBody, color: C.inkSoft }}>
            {participants.length} kishi xonaga qoʻshildi
          </div>
        </section>
        {room.scheduledAt && notificationPermission !== 'unsupported' && notificationPermission !== 'granted' && (
          <button type="button" onClick={enableStartNotification} className="mt-4 rounded-xl px-4 py-2 text-sm" style={{ ...fontBody, color: C.ink, background: C.liveTint, border: `1px solid ${C.rule}` }}>
            Boshlanganda bildirishnoma yuborilsin
          </button>
        )}
        {room.scheduledAt && notificationPermission === 'granted' && <div className="mt-3 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Boshlanish haqida bildirishnoma yoqilgan.</div>}
      </div>
    );
  }

  if (phase === 'quiz' && !test) {
    return <LiveContentLoadState status={testContent.status === 'ready' ? 'error' : testContent.status} retry={testContent.retry} onExit={onExit} />;
  }

  if (phase === 'quiz' && test) {
    if (testContent.status !== 'ready') return <LiveContentLoadState status={testContent.status} retry={testContent.retry} onExit={onExit} />;
    if (room.mode === 'sync') {
      return <LiveSyncPlayer room={room} setRoom={setRoom} test={test} participant={participant} onExit={onExit} />;
    }
    return <LiveQuizPlayer room={room} test={test} participant={participant} onDone={() => { if (onSessionChange) onSessionChange(null); setPhase('results'); }} />;
  }

  return (
    <div>
      <button onClick={onExit} className="inline-flex items-center gap-1 text-[15px] mb-5 focus-visible:outline focus-visible:outline-2" style={{ ...fontBody, color: C.inkSoft, outlineColor: C.gold }}><ArrowLeft size={15} /> Chiqish</button>
      <SectionHeading eyebrow="Yakun" title="Natijalar" />
      <LiveLeaderboardList participants={participants} />
    </div>
  );
}

function LiveQuizHubContent({ tests, testsLoading, testsLoadError, onRetryTests, session, onExit, initialCode, restoreSession, onSessionChange, ensureTestContent }) {
  const [mode, setMode] = useState(initialCode ? 'join-form' : null);
  const [room, setRoom] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [restoring, setRestoring] = useState(!!(restoreSession && !initialCode));

  /* Sahifa yangilanganda (refresh, internet uzilib qolgan bo'lsa ham)
     avvalgi xonaga avtomatik qaytib ulanish. Aniq havola (?live=KOD)
     bo'lsa, u ustunlik qiladi — bu holat ishga tushmaydi. Xona
     topilmasa yoki tugagan bo'lsa, jim tarzda oddiy boshlang'ich
     ekranga qaytamiz (xatolik ko'rsatilmaydi). */
  useEffect(() => {
    if (initialCode || !restoreSession) return;
    let cancelled = false;
    (async () => {
      try {
        const foundRoom = await sbFindRoomByCode(restoreSession.code);
        if (cancelled) return;
        if (!foundRoom || foundRoom.status === 'finished') { if (onSessionChange) onSessionChange(null); setRestoring(false); return; }
        if (restoreSession.role === 'host') {
          if (foundRoom.hostId !== session?.user?.id) { if (onSessionChange) onSessionChange(null); setRestoring(false); return; }
          setRoom(foundRoom);
          setMode('host-lobby');
        } else {
          const { participant: foundParticipant, participantKey } = await findOrClaimLiveParticipant(
            foundRoom.id,
            session,
            restoreSession.participantKey || null,
          );
          if (cancelled) return;
          if (!foundParticipant) { if (onSessionChange) onSessionChange(null); setRestoring(false); return; }
          setRoom(foundRoom);
          setParticipant(foundParticipant);
          setMode('participant');
          if (onSessionChange) onSessionChange({ role: 'participant', code: foundRoom.code, participantKey });
        }
      } catch (e) {
        if (!cancelled) { if (onSessionChange) onSessionChange(null); }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (restoring) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ ...fontBody, color: C.inkSoft }}>
        <Loader2 size={15} className="animate-spin" /> Xonaga qaytib ulanmoqda...
      </div>
    );
  }

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
    return <LiveHostSetup tests={tests} testsLoading={testsLoading} testsLoadError={testsLoadError} onRetryTests={onRetryTests} session={session} onCreated={(r) => { setRoom(r); setMode('host-lobby'); if (onSessionChange) onSessionChange({ role: 'host', code: r.code }); }} onBack={() => setMode(null)} ensureTestContent={ensureTestContent} />;
  }
  if (mode === 'host-lobby' && room) {
    return <LiveHostLobby room={room} setRoom={setRoom} tests={tests} onExit={() => { setMode(null); setRoom(null); if (room.status === 'finished' && onSessionChange) onSessionChange(null); }} ensureTestContent={ensureTestContent} />;
  }
  if (mode === 'join-form') {
    return <LiveJoinForm initialCode={initialCode} session={session} onJoined={(r, p, participantKey) => { setRoom(r); setParticipant(p); setMode('participant'); if (onSessionChange) onSessionChange({ role: 'participant', code: r.code, participantKey }); }} onBack={() => setMode(null)} />;
  }
  if (mode === 'participant' && room && participant) {
    return <LiveParticipant room={room} setRoom={setRoom} participant={participant} tests={tests} onExit={() => { setMode(null); setRoom(null); setParticipant(null); if (room.status === 'finished' && onSessionChange) onSessionChange(null); }} onSessionChange={onSessionChange} ensureTestContent={ensureTestContent} />;
  }
  return null;
}

class LiveQuizErrorBoundary extends React.Component {
  state = { error: false, mountKey: 0 };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(error, info) {
    console.error('Jonli test ekranida kutilmagan xatolik:', error, info);
  }

  retry = () => this.setState((state) => ({ error: false, mountKey: state.mountKey + 1 }));

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-2xl p-5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <h2 className="text-lg mb-1" style={{ ...fontDisplay, color: C.ink, fontWeight: 600 }}>Jonli test ekranida xatolik yuz berdi</h2>
          <p className="text-sm mb-4" style={{ ...fontBody, color: C.inkSoft }}>Xona yoki savol ma’lumoti yangilanmay qolgan bo‘lishi mumkin. Xonadan chiqmasdan qayta urining.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={this.retry} className="rounded-full px-3 py-2 text-sm" style={{ ...fontBody, color: C.white, background: C.cover }}>Qayta urinish</button>
            <button type="button" onClick={this.props.onExit} className="rounded-full px-3 py-2 text-sm" style={{ ...fontBody, color: C.inkSoft, border: `1px solid ${C.rule}` }}>Testlardan chiqish</button>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.mountKey}>{this.props.children}</React.Fragment>;
  }
}

export default function LiveQuizHub(props) {
  return (
    <LiveQuizErrorBoundary onExit={props.onExit}>
      <LiveQuizHubContent {...props} />
    </LiveQuizErrorBoundary>
  );
}
