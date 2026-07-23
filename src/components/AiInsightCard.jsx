import { useEffect, useState } from 'react';
import { api } from '../lib/apiClient';

// Reusable AI Insight card, one per role (UMKM/Government/Bank/Super Admin).
// Mirrors the "Penjelasan Skor" card convention on the Skor page: a badge
// showing which path actually produced the text (real Groq call vs the
// rule-based fallback), never blocking the page if it fails to load.
export default function AiInsightCard({ endpoint, title = 'AI Insight' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setError(false);
    api.get(endpoint).then(setData).catch(() => setError(true));
  }, [endpoint]);

  if (error) return null;

  return (
    <div className="card-lg" style={{ background: 'var(--blue-lighter)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>✨</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', color: 'var(--blue-dark)', textTransform: 'uppercase' }}>
          {title} {data && (data.source === 'llm' ? '· Groq AI' : '· ringkasan otomatis')}
        </div>
        {data ? (
          <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: '6px 0 0', color: 'var(--text)' }}>{data.insight}</p>
        ) : (
          <p className="muted" style={{ fontSize: 13.5, margin: '6px 0 0' }}>Menyusun insight…</p>
        )}
      </div>
    </div>
  );
}
