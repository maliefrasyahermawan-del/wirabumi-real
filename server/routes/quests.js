import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

function rupiah(n) {
  return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ---- Hypothetical per-factor projections. Each mirrors the exact formula
// in compute_score() (server/schema.sql) so "what if I finish this quest"
// numbers stay honest, not fabricated. ----

function hypConsistency(activeDays90, targetActiveDays) {
  const hyp = Math.min(90, Math.max(activeDays90, targetActiveDays));
  return Math.min(100, (hyp / 30) * 100);
}

function hypVolumeFromLast30(last30, prev30, targetLast30) {
  const hypLast30 = Math.max(last30, targetLast30);
  const growth = prev30 === 0 ? (hypLast30 > 0 ? 1 : 0) : (hypLast30 - prev30) / prev30;
  return clamp(50 + growth * 100, 0, 100);
}

function hypVolumeFromGrowth(last30, prev30, targetGrowth) {
  const currentGrowth = prev30 === 0 ? (last30 > 0 ? 1 : 0) : (last30 - prev30) / prev30;
  const growth = Math.max(currentGrowth, targetGrowth);
  return clamp(50 + growth * 100, 0, 100);
}

function hypLegal(legalNib, legalPirt, legalHalal, forceKey) {
  const flags = { legal_nib: legalNib, legal_pirt: legalPirt, legal_halal: legalHalal, [forceKey]: true };
  const count = (flags.legal_nib ? 1 : 0) + (flags.legal_pirt ? 1 : 0) + (flags.legal_halal ? 1 : 0);
  return (count / 3) * 100;
}

// pelanggan_score's real formula (repeat-transaction-count / filled-count) doesn't
// project cleanly onto "1 more repeat customer" without assuming a specific mix
// of future transactions, so this uses a conservative floor instead of a fake
// precise decimal, while still moving in the direction the quest actually helps.
function hypPelangganFloor(currentScore, floor) {
  return Math.max(currentScore, floor);
}

function projectPlafon(rata, totalScore) {
  const multiplier = totalScore >= 80 ? 4.5 : totalScore >= 60 ? 3.5 : 2.5;
  const plafon = Math.floor((rata * multiplier) / 500000) * 500000;
  return clamp(plafon, 0, 100000000);
}

function projectTotal(consistency, volume, pelanggan, legal) {
  return Math.round(0.25 * consistency + 0.25 * volume + 0.25 * pelanggan + 0.25 * legal);
}

// ---- Quest catalog. category matches compute_score()'s factor keys exactly
// so the priority algorithm can pick "the weakest factor's cheapest quest". ----

const QUEST_CATALOG = [
  {
    key: 'first-chat-capture',
    category: 'consistency',
    title: 'Catat transaksi pertama lewat Tempel Chat',
    syarat: 'Simpan minimal 1 transaksi dari fitur Tempel Chat WhatsApp',
    poin: 5,
    estimasiMenit: 5,
    gratis: true,
    kesulitan: 'Mudah',
    target: '/pembukuan/tambah',
    checkComplete: (m) => m.hasChatParseTxn,
    project: (m) => hypConsistency(m.activeDays90, m.activeDays90 + 1),
  },
  {
    key: 'streak-7',
    category: 'consistency',
    title: 'Catat transaksi 7 hari berturut-turut',
    syarat: 'Ada transaksi tercatat 7 hari berturut-turut sampai hari ini',
    poin: 3,
    estimasiMenit: 5,
    gratis: true,
    kesulitan: 'Mudah',
    target: '/pembukuan/tambah',
    checkComplete: (m) => m.currentStreak >= 7,
    project: (m) => hypConsistency(m.activeDays90, 7),
  },
  {
    key: 'streak-30',
    category: 'consistency',
    title: 'Catat transaksi 30 hari berturut-turut',
    syarat: 'Ada transaksi tercatat 30 hari berturut-turut sampai hari ini',
    poin: 8,
    estimasiMenit: 5,
    gratis: true,
    kesulitan: 'Sedang',
    target: '/pembukuan/tambah',
    checkComplete: (m) => m.currentStreak >= 30,
    project: (m) => hypConsistency(m.activeDays90, 30),
  },
  {
    key: 'omzet-3jt',
    category: 'volume',
    title: 'Capai omzet Rp3 juta bulan ini',
    syarat: 'Total omzet bulan berjalan tembus Rp3.000.000',
    poin: 4,
    estimasiMenit: 0,
    gratis: true,
    kesulitan: 'Sedang',
    target: '/pembukuan/tambah',
    checkComplete: (m) => m.monthOmzet >= 3_000_000,
    project: (m) => hypVolumeFromLast30(m.last30, m.prev30, 3_000_000),
  },
  {
    key: 'omzet-naik15',
    category: 'volume',
    title: 'Naikkan omzet 15% dari bulan lalu',
    syarat: 'Omzet 30 hari terakhir naik minimal 15% dibanding 30 hari sebelumnya',
    poin: 6,
    estimasiMenit: 0,
    gratis: true,
    kesulitan: 'Sulit',
    target: '/pembukuan/tambah',
    checkComplete: (m) => {
      const growth = m.prev30 === 0 ? (m.last30 > 0 ? 1 : 0) : (m.last30 - m.prev30) / m.prev30;
      return growth >= 0.15;
    },
    project: (m) => hypVolumeFromGrowth(m.last30, m.prev30, 0.15),
  },
  {
    key: 'repeat-1',
    category: 'pelanggan',
    title: 'Dapatkan 1 pelanggan berulang',
    syarat: 'Ada 1 nama pelanggan yang tercatat beli lebih dari sekali',
    poin: 3,
    estimasiMenit: 0,
    gratis: true,
    kesulitan: 'Mudah',
    target: '/pembukuan/tambah',
    checkComplete: (m) => m.repeatCustomerCount >= 1,
    project: (m) => hypPelangganFloor(m.pelangganScore, 50),
  },
  {
    key: 'repeat-5',
    category: 'pelanggan',
    title: 'Dapatkan 5 pelanggan berulang',
    syarat: 'Ada 5 nama pelanggan berbeda yang masing-masing beli lebih dari sekali',
    poin: 7,
    estimasiMenit: 0,
    gratis: true,
    kesulitan: 'Sulit',
    target: '/pembukuan/tambah',
    checkComplete: (m) => m.repeatCustomerCount >= 5,
    project: (m) => hypPelangganFloor(m.pelangganScore, 80),
  },
  {
    key: 'legal-nib',
    category: 'legal',
    title: 'Urus NIB via OSS',
    syarat: 'Centang status NIB di halaman KUR',
    poin: 6,
    estimasiMenit: 10,
    gratis: true,
    kesulitan: 'Mudah',
    target: '/kur',
    checkComplete: (m) => m.legalNib,
    project: (m) => hypLegal(m.legalNib, m.legalPirt, m.legalHalal, 'legal_nib'),
  },
  {
    key: 'legal-pirt',
    category: 'legal',
    title: 'Daftar sertifikasi P-IRT',
    syarat: 'Centang status P-IRT di halaman KUR',
    poin: 5,
    estimasiMenit: 10,
    gratis: false,
    kesulitan: 'Sedang',
    target: '/kur',
    checkComplete: (m) => m.legalPirt,
    project: (m) => hypLegal(m.legalNib, m.legalPirt, m.legalHalal, 'legal_pirt'),
  },
  {
    key: 'legal-halal',
    category: 'legal',
    title: 'Ajukan sertifikasi Halal',
    syarat: 'Centang status Sertifikasi Halal di halaman KUR',
    poin: 5,
    estimasiMenit: 10,
    gratis: false,
    kesulitan: 'Sedang',
    target: '/kur',
    checkComplete: (m) => m.legalHalal,
    project: (m) => hypLegal(m.legalNib, m.legalPirt, m.legalHalal, 'legal_halal'),
  },
];

const BADGE_DEFS = [
  { key: 'umkm_pemula', label: 'UMKM Pemula', desc: 'Selesaikan quest pertamamu', icon: '🌱' },
  { key: 'konsisten', label: 'Konsisten', desc: '30 hari transaksi berturut-turut', icon: '🔥' },
  { key: 'legal_lengkap', label: 'Legal Lengkap', desc: 'NIB, P-IRT, dan Halal selesai semua', icon: '📋' },
  { key: 'siap_kur', label: 'Siap KUR', desc: 'Skor kelayakan di atas 70', icon: '🏆' },
  { key: 'umkm_unggulan', label: 'UMKM Unggulan', desc: 'Skor kelayakan di atas 85', icon: '👑' },
];

function computeStreak(datesDesc) {
  if (datesDesc.length === 0) return 0;
  const dateSet = new Set(datesDesc.map((d) => d.toISOString().slice(0, 10)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dateSet.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function gatherMetrics(userId) {
  const [profRes, scoreRes, activeDaysRes, streakDatesRes, monthOmzetRes, last30Res, prev30Res,
    filledRes, repeatSumRes, repeatCustomersRes, chatRes, omzet6Res] = await Promise.all([
    pool.query('select legal_nib, legal_pirt, legal_halal from profiles where user_id = $1', [userId]),
    pool.query('select compute_score($1) as s', [userId]),
    pool.query(`select count(distinct tanggal) c from transactions where user_id=$1 and tanggal >= current_date - interval '90 days'`, [userId]),
    pool.query(`select distinct tanggal from transactions where user_id=$1 and tanggal >= current_date - interval '120 days' order by tanggal desc`, [userId]),
    pool.query(`select coalesce(sum(harga),0) t from transactions where user_id=$1 and tanggal >= date_trunc('month', current_date) and tanggal <= current_date`, [userId]),
    pool.query(`select coalesce(sum(harga),0) t from transactions where user_id=$1 and tanggal >= current_date - interval '30 days'`, [userId]),
    pool.query(`select coalesce(sum(harga),0) t from transactions where user_id=$1 and tanggal >= current_date - interval '60 days' and tanggal < current_date - interval '30 days'`, [userId]),
    pool.query(`select count(*) c from transactions where user_id=$1 and pelanggan is not null and trim(pelanggan) <> ''`, [userId]),
    pool.query(`select coalesce(sum(cnt),0) t from (select count(*) cnt from transactions where user_id=$1 and pelanggan is not null and trim(pelanggan) <> '' group by lower(trim(pelanggan)) having count(*) > 1) rep`, [userId]),
    pool.query(`select count(*) c from (select 1 from transactions where user_id=$1 and pelanggan is not null and trim(pelanggan) <> '' group by lower(trim(pelanggan)) having count(*) > 1) rep`, [userId]),
    pool.query(`select exists(select 1 from transactions where user_id=$1 and source='chat_parse') as has_chat`, [userId]),
    pool.query(`select coalesce(sum(harga),0) t from transactions where user_id=$1 and tanggal >= current_date - interval '180 days'`, [userId]),
  ]);

  const prof = profRes.rows[0] || {};
  const score = scoreRes.rows[0].s;
  const factorVal = (key) => score.factors.find((f) => f.key === key).val;

  return {
    score,
    legalNib: !!prof.legal_nib,
    legalPirt: !!prof.legal_pirt,
    legalHalal: !!prof.legal_halal,
    activeDays90: Number(activeDaysRes.rows[0].c),
    currentStreak: computeStreak(streakDatesRes.rows.map((r) => new Date(r.tanggal))),
    monthOmzet: Number(monthOmzetRes.rows[0].t),
    last30: Number(last30Res.rows[0].t),
    prev30: Number(prev30Res.rows[0].t),
    filledCount: Number(filledRes.rows[0].c),
    repeatCount: Number(repeatSumRes.rows[0].t),
    repeatCustomerCount: Number(repeatCustomersRes.rows[0].c),
    hasChatParseTxn: !!chatRes.rows[0].has_chat,
    consistencyVal: factorVal('consistency'),
    volumeVal: factorVal('volume'),
    pelangganVal: factorVal('pelanggan'),
    legalVal: factorVal('legal'),
    rata: Number(omzet6Res.rows[0].t) / 6,
  };
}

function buildQuestList(m) {
  return QUEST_CATALOG.map((q) => {
    const done = q.checkComplete(m);
    let dampakFinansial = null;
    let projectedScore = null;
    let projectedPlafon = null;
    if (!done) {
      const consistency = q.category === 'consistency' ? q.project(m) : m.consistencyVal;
      const volume = q.category === 'volume' ? q.project(m) : m.volumeVal;
      const pelanggan = q.category === 'pelanggan' ? q.project({ ...m, pelangganScore: m.pelangganVal }) : m.pelangganVal;
      const legal = q.category === 'legal' ? q.project(m) : m.legalVal;
      projectedScore = projectTotal(consistency, volume, pelanggan, legal);
      projectedPlafon = projectPlafon(m.rata, projectedScore);
      const currentPlafon = projectPlafon(m.rata, m.score.total_score);
      dampakFinansial = projectedPlafon > currentPlafon
        ? `Plafon amanmu naik jadi ${rupiah(projectedPlafon)}`
        : `Skor kelayakanmu naik jadi ${projectedScore}`;
    }
    return {
      key: q.key,
      category: q.category,
      title: q.title,
      syarat: q.syarat,
      poin: q.poin,
      estimasi_waktu: q.estimasiMenit === 0 ? 'Otomatis terdeteksi' : `${q.estimasiMenit} menit`,
      gratis: q.gratis,
      kesulitan: q.kesulitan,
      target: q.target,
      status: done ? 'selesai' : 'belum_mulai',
      dampak_finansial: dampakFinansial,
      projected_score: projectedScore,
    };
  });
}

function effortMinutes(q) {
  return q.estimasi_waktu === 'Otomatis terdeteksi' ? 0 : parseInt(q.estimasi_waktu, 10);
}

// Diversifies across the weakest categories first (one quest per category per
// pass) so a brand-new user with, say, consistency and legal tied at 0 sees
// "Urus NIB" alongside a consistency quest instead of 3 consistency quests
// crowding legal out entirely. Only pads with a 2nd/3rd quest from the same
// category once every category with something incomplete has had its turn.
function pickActiveQuests(quests, factors) {
  const sortedFactors = [...factors].sort((a, b) => a.val - b.val);
  const byCategory = new Map(sortedFactors.map((f) => [
    f.key,
    quests
      .filter((q) => q.category === f.key && q.status !== 'selesai')
      .sort((a, b) => {
        const effortA = effortMinutes(a);
        const effortB = effortMinutes(b);
        if (effortA !== effortB) return effortA - effortB;
        return b.poin - a.poin;
      }),
  ]));

  const active = [];
  for (const factor of sortedFactors) {
    if (active.length >= 3) break;
    const list = byCategory.get(factor.key);
    if (list.length > 0) active.push(list.shift());
  }
  for (const factor of sortedFactors) {
    if (active.length >= 3) break;
    const list = byCategory.get(factor.key);
    while (list.length > 0 && active.length < 3) active.push(list.shift());
  }
  return active;
}

async function evaluateBadges(userId, m) {
  const completedCount = QUEST_CATALOG.filter((q) => q.checkComplete(m)).length;
  const earnedNow = [];
  if (completedCount >= 1) earnedNow.push('umkm_pemula');
  if (m.currentStreak >= 30) earnedNow.push('konsisten');
  if (m.legalNib && m.legalPirt && m.legalHalal) earnedNow.push('legal_lengkap');
  if (m.score.total_score > 70) earnedNow.push('siap_kur');
  if (m.score.total_score > 85) earnedNow.push('umkm_unggulan');

  for (const key of earnedNow) {
    await pool.query(
      'insert into badges (user_id, badge_key) values ($1, $2) on conflict (user_id, badge_key) do nothing',
      [userId, key]
    );
  }

  const earnedRows = await pool.query('select badge_key, earned_at from badges where user_id = $1', [userId]);
  const earnedMap = new Map(earnedRows.rows.map((r) => [r.badge_key, r.earned_at]));

  return BADGE_DEFS.map((b) => ({
    key: b.key,
    label: b.label,
    desc: b.desc,
    icon: b.icon,
    earned: earnedMap.has(b.key),
    earned_at: earnedMap.get(b.key) || null,
  }));
}

router.get('/', async (req, res) => {
  const m = await gatherMetrics(req.userId);
  const quests = buildQuestList(m);
  const active_quests = pickActiveQuests(quests, m.score.factors);
  const completed_quests = quests.filter((q) => q.status === 'selesai');
  const badges = await evaluateBadges(req.userId, m);

  res.json({
    score: { total_score: m.score.total_score, status: m.score.status },
    active_quests,
    completed_quests,
    badges,
  });
});

export default router;
