export function rupiah(n) {
  const v = Math.round(Number(n) || 0);
  return 'Rp ' + v.toLocaleString('id-ID');
}

export function formatDateID(d) {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function formatThousands(rawInput) {
  const digits = String(rawInput).replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

export function parseThousands(formatted) {
  const digits = String(formatted).replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}
