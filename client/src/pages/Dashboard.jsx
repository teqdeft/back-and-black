import { useEffect, useState } from 'react';
import api, { apiError } from '../lib/api';
import { formatINR } from '../lib/auth.jsx';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/data/summary').then((r) => setS(r.data)).catch((e) => setErr(apiError(e)));
  }, []);

  if (err) return <div className="card panel error-box">{err}</div>;
  if (!s) return <div className="loading">Loading dashboard…</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Bill-tree network &amp; settlement snapshot</p>
        </div>
      </div>

      <div className="stats" style={{ marginBottom: 16 }}>
        <div className="stat green"><div className="label">Total Earned (commissions)</div><div className="value">{formatINR(s.total_earned)}</div></div>
        <div className="stat blue"><div className="label">Captured Revenue</div><div className="value">{formatINR(s.revenue)}</div></div>
        <div className="stat orange"><div className="label">Admin Sink (S-99)</div><div className="value">{formatINR(s.admin_sink)}</div></div>
      </div>

      <div className="stats">
        <div className="stat plain"><div className="label">Orders / Bills</div><div className="value">{s.orders}</div></div>
        <div className="stat plain"><div className="label">Participants</div><div className="value">{s.participants}</div></div>
        <div className="stat plain"><div className="label">Certificates</div><div className="value">{s.certificates}</div></div>
        <div className="stat plain"><div className="label">Full Certificates</div><div className="value">{s.full_certificates}</div></div>
      </div>

      <div className="card panel" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>How earnings flow</h3>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
          Every captured order becomes a numbered <b>bill</b> in a deterministic ternary tree
          (<code>Parent(N)=floor((N-2)/3)+1</code>, <code>Children(N)={'{3N-1, 3N, 3N+1}'}</code>).
          Commission then flows upward through ancestor bills (SELF → L1 → L2 …), accumulating into each
          ancestor's <b>certificate</b> up to its capacity (BA ₹5,000, BP ₹2,000). Anything a full
          certificate can't absorb overflows to the next ancestor, and finally into the <b>S-99 admin sink</b>.
        </p>
      </div>
    </div>
  );
}
