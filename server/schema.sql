-- WIRABUMI local schema (self-hosted Postgres, replaces the Supabase schema).
-- No RLS here — the Node/Express API is the only thing that talks to this
-- database, and it scopes every query to the authenticated user itself.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  -- Security-question answers for password reset (no email provider wired
  -- up yet). Hashed with bcrypt exactly like password_hash, never stored
  -- plain. Nullable so existing rows from before this feature don't break;
  -- the register route enforces both as required for new signups.
  security_food_hash text,
  security_band_hash text,
  -- Access-control role. 4 contrasting roles, each with its own dashboard:
  -- umkm_owner (default, the business owner), government (Dinas Koperasi
  -- staff), bank_officer (KUR partner bank), super_admin (developer/system
  -- owner). No self-serve path to 'bank_officer'/'super_admin' via the app —
  -- only a super_admin can assign umkm_owner/government/bank_officer via
  -- server/routes/admin.js, and 'super_admin' itself is only ever granted via
  -- a direct DB update.
  role text not null default 'umkm_owner' check (role in ('umkm_owner','government','bank_officer','super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  business_name text not null default 'Usaha Saya',
  business_category text not null default 'Umum',
  business_address text,
  kecamatan text,
  phone text,
  -- Menentukan apakah ambang bebas pajak Rp500 juta/tahun (PPh Final UMKM)
  -- berlaku atau tidak — lihat compute_tax_estimate() di bawah. Hanya
  -- 'orang_pribadi' yang dapat fasilitas ini; 'badan_usaha' kena 0,5% dari
  -- rupiah pertama.
  kategori_wajib_pajak text not null default 'orang_pribadi' check (kategori_wajib_pajak in ('orang_pribadi', 'badan_usaha')),
  legal_nib boolean not null default false,
  legal_pirt boolean not null default false,
  legal_halal boolean not null default false,
  avatar_url text,
  -- Opt-in: UMKM sendiri yang menyalakan ini di halaman Profil supaya
  -- profil kelayakannya (nama usaha, kategori, kecamatan, skor, simulasi
  -- KUR) bisa dilihat oleh mitra Bank di /bank. Default MATI — data
  -- transaksi/chat mentah tetap tidak pernah dibagikan sekalipun consent
  -- ini menyala (lihat server/routes/bank.js).
  bank_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tanggal date not null default current_date,
  produk text not null,
  qty numeric not null default 1,
  satuan text not null default 'pcs',
  harga numeric not null check (harga >= 0),
  pelanggan text,
  status text not null default 'Lunas' check (status in ('Lunas','DP 50%','Belum Lunas')),
  source text not null default 'manual' check (source in ('manual','chat_parse','photo_ocr')),
  confidence text check (confidence in ('low','medium','high')),
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_tanggal_idx on transactions (user_id, tanggal desc);

-- Expense/beban tracking — kept separate from `transactions` (sales) since
-- the two feed a real Laporan Laba Rugi (Pendapatan - Beban) rather than
-- being the same kind of record with a type flag.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tanggal date not null default current_date,
  kategori text not null check (kategori in (
    'Pembelian Bahan Baku/Stok', 'Gaji & Upah Karyawan', 'Sewa Tempat',
    'Listrik, Air & Utilitas', 'Transportasi & BBM', 'Perlengkapan & Peralatan',
    'Pemasaran & Promosi', 'Lain-lain'
  )),
  keterangan text not null,
  jumlah numeric not null check (jumlah >= 0),
  source text not null default 'manual' check (source in ('manual')),
  created_at timestamptz not null default now()
);
create index if not exists expenses_user_tanggal_idx on expenses (user_id, tanggal desc);

create table if not exists kur_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plafon numeric not null,
  tenor_bulan int not null,
  cicilan_bulanan numeric not null,
  skor_saat_itu int not null,
  generated_at timestamptz not null default now()
);

-- Bank review status — one row per UMKM (not per KUR document/"surat"), since
-- a bank_officer reviews the UMKM's live credit profile/score via /api/bank,
-- not a specific generated PDF. Only ever shown/editable for UMKM with
-- profiles.bank_consent = true (server/routes/bank.js enforces this).
create table if not exists bank_reviews (
  user_id uuid primary key references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_id uuid references users(id) on delete set null,
  notes text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user','bot')),
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_idx on chat_messages (user_id, created_at);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- In-app notifications only (no push/email). dedupe_key makes each generated
-- notification idempotent per its natural period (a day, a week, a month) so
-- the generator can run on every request without creating duplicates.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('capture_daily','low_confidence','monthly_recap','weekly_drop','score_increase')),
  dedupe_key text not null,
  title text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, dedupe_key)
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- Quest system: badges are permanent once earned (never revoked even if the
-- underlying metric later regresses, same as a real achievement). Quest
-- completion itself is NOT stored here — it's always derived live from real
-- transactions/profile data (see server/routes/quests.js), so there's no
-- separate ledger that can drift out of sync with reality.
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  badge_key text not null check (badge_key in ('umkm_pemula','konsisten','legal_lengkap','siap_kur','umkm_unggulan')),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

-- Tracks the last total_score we've shown the user, purely so the
-- notification generator can detect "your score went up" and fire once.
create table if not exists score_snapshots (
  user_id uuid primary key references users(id) on delete cascade,
  last_score int not null,
  updated_at timestamptz not null default now()
);

-- Real activity log for the admin Monitoring page (server/routes/admin.js).
-- role_at_time is captured at insert time (not looked up live later) so a
-- later promotion/demotion doesn't rewrite history.
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role_at_time text not null,
  action_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on activity_log (created_at desc);
create index if not exists activity_log_user_idx on activity_log (user_id);

-- Real Groq LLM call outcomes (server/lib/groqClient.js), feeding the
-- Super Admin System page's "LLM Usage" metric. Not a fabricated number —
-- one row per actual callGroq() invocation, success true/false.
create table if not exists llm_usage_log (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists llm_usage_log_created_idx on llm_usage_log (created_at desc);

-- Real server errors (caught by the global Express error handler in
-- server/index.js), feeding the Super Admin System page's "Error Log". Never
-- fabricated — only ever written when something genuinely threw.
create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  route text,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists error_log_created_idx on error_log (created_at desc);

-- ============ Scoring (same formula as before) ============
create or replace function compute_score(p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  active_days int;
  consistency_score numeric;
  last30 numeric;
  prev30 numeric;
  growth numeric;
  volume_score numeric;
  filled_count int;
  repeat_count numeric;
  pelanggan_score numeric;
  legal_score numeric;
  total_score int;
  prof record;
begin
  select * into prof from profiles where user_id = p_user_id;

  select count(distinct tanggal) into active_days
    from transactions
    where user_id = p_user_id and tanggal >= current_date - interval '90 days';
  consistency_score := least(100, coalesce(active_days, 0) / 30.0 * 100);

  select coalesce(sum(harga),0) into last30 from transactions
    where user_id = p_user_id and tanggal >= current_date - interval '30 days';
  select coalesce(sum(harga),0) into prev30 from transactions
    where user_id = p_user_id and tanggal >= current_date - interval '60 days' and tanggal < current_date - interval '30 days';
  if prev30 = 0 then
    growth := case when last30 > 0 then 1 else 0 end;
  else
    growth := (last30 - prev30) / prev30;
  end if;
  volume_score := greatest(0, least(100, 50 + growth * 100));

  select count(*) into filled_count from transactions
    where user_id = p_user_id and pelanggan is not null and trim(pelanggan) <> '';
  if filled_count < 3 then
    pelanggan_score := 50;
  else
    select coalesce(sum(cnt),0) into repeat_count from (
      select count(*) as cnt from transactions
      where user_id = p_user_id and pelanggan is not null and trim(pelanggan) <> ''
      group by lower(trim(pelanggan)) having count(*) > 1
    ) rep;
    pelanggan_score := round(repeat_count / filled_count * 100);
  end if;

  legal_score := (coalesce(prof.legal_nib::int,0) + coalesce(prof.legal_pirt::int,0) + coalesce(prof.legal_halal::int,0)) / 3.0 * 100;

  total_score := round(0.25 * consistency_score + 0.25 * volume_score + 0.25 * pelanggan_score + 0.25 * legal_score);

  return jsonb_build_object(
    'total_score', total_score,
    'status', case when total_score >= 60 then 'Layak Diajukan' else 'Perlu Peningkatan' end,
    'factors', jsonb_build_array(
      jsonb_build_object('key','consistency','name','Konsistensi transaksi harian','val', round(consistency_score),
        'tip', case when consistency_score >= 70 then 'Sudah bagus. Pertahankan konsistensi transaksi harianmu.'
                     else 'Coba catat penjualan lebih rutin agar transaksi tercatat di lebih banyak hari.' end),
      jsonb_build_object('key','volume','name','Volume penjualan bulanan','val', round(volume_score),
        'tip', case when growth >= 0 then 'Omzet 30 hari terakhir naik dibanding periode sebelumnya.'
                     else 'Omzet 30 hari terakhir turun dibanding periode sebelumnya. Coba tingkatkan promosi.' end),
      jsonb_build_object('key','pelanggan','name','Rasio pelanggan tetap','val', round(pelanggan_score),
        'tip', case when filled_count < 3 then 'Isi kolom nama pelanggan saat mencatat transaksi agar skor ini lebih akurat.'
                     else 'Dihitung dari data nama pelanggan pada transaksimu.' end),
      jsonb_build_object('key','legal','name','Kelengkapan dokumen legalitas','val', round(legal_score),
        'tip', case when legal_score < 100 then 'Lengkapi NIB, P-IRT, dan Sertifikasi Halal untuk menaikkan skor ini.'
                     else 'Dokumen legalitas usahamu sudah lengkap.' end)
    )
  );
end;
$$;

-- ============ KUR offer (same amortized-loan formula as before) ============
create or replace function get_kur_offer(p_user_id uuid, p_tenor_bulan int default 24)
returns jsonb
language plpgsql
as $$
declare
  omzet6 numeric;
  rata numeric;
  score jsonb;
  total_score int;
  multiplier numeric;
  plafon numeric;
  r numeric := 0.06 / 12;
  cicilan numeric;
begin
  if p_tenor_bulan not in (12, 24, 36) then raise exception 'tenor must be 12, 24, or 36 months'; end if;

  select coalesce(sum(harga),0) into omzet6 from transactions
    where user_id = p_user_id and tanggal >= current_date - interval '180 days';
  rata := omzet6 / 6.0;

  score := compute_score(p_user_id);
  total_score := (score->>'total_score')::int;

  multiplier := case when total_score >= 80 then 4.5
                      when total_score >= 60 then 3.5
                      else 2.5 end;

  plafon := floor((rata * multiplier) / 500000) * 500000;
  plafon := least(greatest(plafon, 0), 100000000);

  if plafon > 0 then
    cicilan := plafon * r / (1 - power(1 + r, -p_tenor_bulan));
  else
    cicilan := 0;
  end if;

  return jsonb_build_object(
    'omzet_6_bulan', omzet6,
    'rata_rata_bulan', rata,
    'plafon', plafon,
    'tenor_bulan', p_tenor_bulan,
    'suku_bunga_tahunan', 0.06,
    'cicilan_bulanan', round(cicilan),
    'rasio_cicilan_omzet', case when rata > 0 then round(cicilan / rata * 100, 1) else 0 end,
    'skor_saat_ini', total_score
  );
end;
$$;

-- ============ Estimasi PPh Final UMKM (PP 55/2022 jo. PP 20/2026) ============
-- Murni SQL/matematika seperti compute_score/get_kur_offer di atas — TIDAK
-- pernah memanggil LLM, dan TIDAK memengaruhi compute_score()/get_kur_offer()
-- sama sekali (fitur pajak ini berdiri sendiri). Tarif final 0,5% dari omzet
-- bruto (bukan laba). Ambang bebas pajak Rp500 juta/tahun pajak HANYA
-- berlaku untuk kategori 'orang_pribadi'; 'badan_usaha' kena 0,5% sejak
-- rupiah pertama, tanpa ambang.
--
-- Perhitungan MARGINAL: karena omzet kumulatif tahun berjalan monoton naik
-- (transaksi baru hanya menambah, tidak pernah mengurangi), total omzet
-- yang PERNAH kena pajak sampai bulan manapun selalu sama dengan
-- GREATEST(0, omzet_kumulatif - ambang) — jadi dasar pengenaan pajak bulan
-- tertentu cukup dihitung sebagai selisih nilai itu sebelum vs sesudah
-- bulan tersebut, tanpa perlu iterasi/looping per bulan.
create or replace function compute_tax_estimate(
  p_user_id uuid,
  p_year int default null,
  p_month int default null
)
returns jsonb
language plpgsql
as $$
declare
  ambang constant numeric := 500000000;
  batas_atas constant numeric := 4800000000;
  batas_warning constant numeric := batas_atas * 0.8;
  tarif constant numeric := 0.005;
  y int := coalesce(p_year, extract(year from current_date)::int);
  m int := coalesce(p_month, extract(month from current_date)::int);
  kategori text;
  period_start date;
  month_start date;
  month_end date;
  omzet_sebelum_bulan_ini numeric;
  omzet_bulan_ini numeric;
  omzet_kumulatif numeric;
  taxed_sebelum numeric;
  taxed_kumulatif numeric;
  dasar_bulan_ini numeric;
  status text;
begin
  if m < 1 or m > 12 then raise exception 'month must be between 1 and 12'; end if;

  select coalesce(kategori_wajib_pajak, 'orang_pribadi') into kategori
    from profiles where user_id = p_user_id;
  if kategori is null then kategori := 'orang_pribadi'; end if;

  period_start := make_date(y, 1, 1);
  month_start := make_date(y, m, 1);
  month_end := (month_start + interval '1 month' - interval '1 day')::date;

  select coalesce(sum(harga), 0) into omzet_sebelum_bulan_ini
    from transactions where user_id = p_user_id and tanggal >= period_start and tanggal < month_start;
  select coalesce(sum(harga), 0) into omzet_bulan_ini
    from transactions where user_id = p_user_id and tanggal >= month_start and tanggal <= month_end;
  omzet_kumulatif := omzet_sebelum_bulan_ini + omzet_bulan_ini;

  if kategori = 'badan_usaha' then
    taxed_sebelum := omzet_sebelum_bulan_ini;
    taxed_kumulatif := omzet_kumulatif;
  else
    taxed_sebelum := greatest(0, omzet_sebelum_bulan_ini - ambang);
    taxed_kumulatif := greatest(0, omzet_kumulatif - ambang);
  end if;

  dasar_bulan_ini := taxed_kumulatif - taxed_sebelum;

  if omzet_kumulatif >= batas_atas then
    status := 'melebihi_batas_4_8m';
  elsif omzet_kumulatif >= batas_warning then
    status := 'mendekati_batas_4_8m';
  elsif kategori = 'orang_pribadi' and omzet_kumulatif <= ambang then
    status := 'di_bawah_ambang';
  else
    status := 'kena_pajak';
  end if;

  return jsonb_build_object(
    'kategori_wajib_pajak', kategori,
    'tahun_pajak', y,
    'bulan', m,
    'omzet_kumulatif_tahun_ini', omzet_kumulatif,
    'omzet_bulan_ini', omzet_bulan_ini,
    'status_ambang', status,
    'dasar_pengenaan_pajak_bulan_ini', dasar_bulan_ini,
    'estimasi_pajak_bulan_ini', round(dasar_bulan_ini * tarif),
    'estimasi_pajak_kumulatif_tahun_ini', round(taxed_kumulatif * tarif)
  );
end;
$$;

-- ============ Aggregate dashboards (no PII, safe for a public endpoint) ============
create or replace function dinkop_dashboard()
returns jsonb
language plpgsql
as $$
declare
  total_umkm int;
  avg_score numeric;
  layak_count int;
  kur_docs_count int;
  per_kecamatan jsonb;
  monthly_trend jsonb;
  scores numeric[];
begin
  select count(*) into total_umkm from profiles;

  scores := array(select (compute_score(user_id)->>'total_score')::numeric from profiles);
  avg_score := coalesce((select avg(s) from unnest(scores) s), 0);
  layak_count := coalesce((select count(*) from unnest(scores) s where s >= 60), 0);

  select count(*) into kur_docs_count from kur_documents;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into per_kecamatan from (
    select p.kecamatan as nama,
           count(*) as umkm,
           round(avg((compute_score(p.user_id)->>'total_score')::numeric)) as skor
    from profiles p
    where p.kecamatan is not null and trim(p.kecamatan) <> ''
    group by p.kecamatan
    order by umkm desc
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into monthly_trend from (
    select to_char(month_start, 'Mon') as bulan,
           count(distinct t.user_id) as umkm_aktif
    from generate_series(date_trunc('month', current_date) - interval '6 months',
                          date_trunc('month', current_date), interval '1 month') as month_start
    left join transactions t
      on date_trunc('month', t.tanggal) = month_start
    group by month_start
    order by month_start
  ) x;

  return jsonb_build_object(
    'total_umkm', total_umkm,
    'avg_score', round(avg_score),
    'layak_count', layak_count,
    'layak_pct', case when total_umkm > 0 then round(layak_count::numeric / total_umkm * 100) else 0 end,
    'kur_docs_count', kur_docs_count,
    'per_kecamatan', per_kecamatan,
    'monthly_trend', monthly_trend
  );
end;
$$;

create or replace function platform_stats()
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'total_umkm', (select count(*) from profiles),
    'kur_docs_count', (select count(*) from kur_documents),
    'avg_score', (select coalesce(round(avg((compute_score(user_id)->>'total_score')::numeric)), 0) from profiles)
  );
$$;
