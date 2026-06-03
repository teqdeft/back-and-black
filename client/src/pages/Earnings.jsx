import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../lib/api';
import { formatINR } from '../lib/auth.jsx';

const LEVELS = ['', 'SELF', 'L1', 'L2', 'L3', 'L4', 'L5'];

export default function Earnings() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 50 });
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/data/earnings', { params: { level, page, pageSize: 50 } });
      setData({ ...data, rows: data.rows || [] }); setErr('');
    } catch (e) { setErr(apiError(e)); }
    finally { setLoading(false); }
  }, [level, page]);

  useEffect(() => { load(); }, [load]);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Earnings</h1>
          <p className="page-sub">{data.total} commission events · immutable ledger</p>
        </div>
        <div className="segmented">
          {LEVELS.map((l) => (
            <button key={l || 'all'} className={level === l ? 'active' : ''} onClick={() => { setLevel(l); setPage(1); }}>{l || 'All'}</button>
          ))}
        </div>
      </div>

      {err && <div className="card panel error-box">{err}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Source Bill</th><th>Level</th><th>Beneficiary</th><th>Certificate</th><th>Gross</th><th>Credited</th><th>Overflow</th><th>Time</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="muted-center">Loading…</td></tr>
              : data.rows.length === 0 ? <tr><td colSpan={9} className="muted-center">No earnings.</td></tr>
              : data.rows.map((e) => (
                <tr key={e.id}>
                  <td className="cell-muted">{e.id}</td>
                  <td className="cell-strong">#{e.source_bill_no}</td>
                  <td><span className="badge owner">{e.level_key}</span></td>
                  <td>{e.beneficiary_name || '—'}<br /><span className="code-chip">{e.beneficiary_code || ''}</span></td>
                  <td className="cell-muted">{e.cert_no}</td>
                  <td className="cell-muted">{formatINR(e.gross_amount)}</td>
                  <td className="cell-strong">{formatINR(e.credited_amount)}</td>
                  <td className={e.overflow_amount > 0 ? '' : 'cell-muted'}>{e.overflow_amount > 0 ? formatINR(e.overflow_amount) : '—'}</td>
                  <td className="cell-muted">{(e.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span className="cell-muted">Page {data.page} / {pages}</span>
        <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
