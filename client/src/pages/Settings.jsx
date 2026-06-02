import { useEffect, useState } from 'react';
import api, { apiError } from '../lib/api';

const PAGE_LABELS = {
  dashboard: 'Dashboard', orders: 'Orders', earnings: 'Earnings', my_earnings: 'My Earnings',
  certificates: 'Certificates', affiliate_links: 'Affiliate Links', network_tree: 'Network Tree',
  bill_tree: 'Bill Tree', products: 'Products', settings: 'Settings',
};

export default function Settings() {
  const [commission, setCommission] = useState([]);
  const [access, setAccess] = useState([]);
  const [app, setApp] = useState({});
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/data/settings').then((r) => {
    setCommission(r.data.commission); setAccess(r.data.access); setApp(r.data.app);
  }).catch((e) => setErr(apiError(e)));
  useEffect(() => { load(); }, []);

  const saveCommission = async () => {
    setErr(''); setMsg('');
    try {
      await api.put('/data/settings/commission', {
        levels: commission.map((c) => ({ level_key: c.level_key, amount: Number(c.amount) })),
      });
      setMsg('Commission levels saved.');
    } catch (e) { setErr(apiError(e)); }
  };

  const toggleAccess = async (row) => {
    const locked = !row.locked;
    setAccess((a) => a.map((r) => (r.id === row.id ? { ...r, locked } : r)));
    try { await api.put('/data/settings/access', { role: row.role, page: row.page, locked }); }
    catch (e) { setErr(apiError(e)); load(); }
  };

  const pages = [...new Set(access.map((a) => a.page))];
  const cell = (role, page) => access.find((a) => a.role === role && a.page === page);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Commission engine &amp; role access control</p>
        </div>
      </div>

      {err && <div className="card panel error-box">{err}</div>}
      {msg && <div className="card panel" style={{ color: 'var(--green-pay)' }}>{msg}</div>}

      <div className="card panel" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Commission per tree level</h3>
        <p className="tag-note">Amounts paid to each ancestor level when a new bill enters. SELF = the bill's own certificate.</p>
        <div className="toolbar" style={{ marginTop: 8 }}>
          {commission.map((c, i) => (
            <div className="field" key={c.level_key} style={{ marginBottom: 0 }}>
              <label>{c.level_key}</label>
              <input className="input" style={{ minWidth: 110 }} type="number" step="0.01" value={c.amount}
                onChange={(e) => setCommission((arr) => arr.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            </div>
          ))}
        </div>
        <button className="btn btn-forest" style={{ marginTop: 14 }} onClick={saveCommission}>Save commission</button>
        {app.l1_note && <p className="tag-note" style={{ marginTop: 10 }}>⚠ {app.l1_note}</p>}
      </div>

      <div className="card panel">
        <h3 style={{ marginTop: 0 }}>Role page access</h3>
        <p className="tag-note">Lock or unlock pages per participant role. Owner/Staff always have full access.</p>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>Page</th><th>BA</th><th>BP</th><th>SE</th></tr></thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p}>
                  <td className="cell-strong">{PAGE_LABELS[p] || p}</td>
                  {['BA', 'BP', 'SE'].map((role) => {
                    const row = cell(role, p);
                    if (!row) return <td key={role}>—</td>;
                    return (
                      <td key={role}>
                        <button className={`btn btn-sm ${row.locked ? 'btn-ghost' : 'btn-green'}`} onClick={() => toggleAccess(row)}>
                          {row.locked ? 'Locked' : 'Unlocked'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
