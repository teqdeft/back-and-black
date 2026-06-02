import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../lib/api';
import { formatINR } from '../lib/auth.jsx';

const ROLES = ['', 'BA', 'BP', 'SE'];

export default function Certificates() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/certificates', { params: { role, search } });
      setRows(data.rows);
      setSummary(data.summary);
      setErr('');
    } catch (e) { setErr(apiError(e)); }
    finally { setLoading(false); }
  }, [role, search]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Certificates</h1>
          <p className="page-sub">{rows.length} certificates · earning containers per bill.</p>
        </div>
        <div className="stats" style={{ maxWidth: 640 }}>
          <div className="stat green"><div className="label">Grand Total</div><div className="value">{formatINR(summary.grand_total)}</div></div>
          <div className="stat blue"><div className="label">BA Payout</div><div className="value">{formatINR(summary.ba_payout)}</div></div>
          <div className="stat orange"><div className="label">BP Payout</div><div className="value">{formatINR(summary.bp_payout)}</div></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {ROLES.map((r) => (
            <button key={r || 'all'} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>
              {r || 'All'}
            </button>
          ))}
        </div>
        <input className="input" placeholder="Search holder…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
      </div>

      {err && <div className="card panel error-box">{err}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>S.No</th><th>Certificate</th><th>Holder &amp; Capacity</th><th>Total Earned</th>
              <th>Status</th><th>Balance to Pay</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="muted-center">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="muted-center">No certificates found.</td></tr>
            ) : rows.map((c, i) => {
              const pct = c.capacity > 0 ? Math.min(100, (c.earned / c.capacity) * 100) : 100;
              const full = c.status === 'full';
              return (
                <tr key={c.id}>
                  <td className="cell-muted">{i + 1}</td>
                  <td>
                    <div className="cell-strong" style={{ color: 'var(--gold)' }}>{c.cert_no}</div>
                    <div className="cell-muted">bill #{c.bill_no} · {(c.issued_at || '').slice(0, 10)}</div>
                  </td>
                  <td>
                    <div className="cell-strong">{c.holder_name}</div>
                    <span className="code-chip">{c.holder_code}</span>{' '}
                    <span className={`badge ${c.holder_role.toLowerCase()}`}>{c.holder_role}</span>
                    <div className="cell-muted">cap {formatINR(c.capacity)}</div>
                  </td>
                  <td>
                    <div className="cell-strong">{formatINR(c.earned)}</div>
                    <div className={`bar ${full ? 'full' : ''}`}><span style={{ width: `${pct}%` }} /></div>
                  </td>
                  <td>{full ? <span className="badge full">FULL</span> : <span className="badge active">ACTIVE</span>}</td>
                  <td><div className="cell-strong">{formatINR(c.earned)}</div><div className="cell-muted">this cycle</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
