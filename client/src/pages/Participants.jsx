import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../lib/api';
import { Modal } from '../components/ui.jsx';

export default function Participants() {
  const [rows, setRows] = useState([]);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [link, setLink] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { role, search } });
      setRows(data.rows); setErr('');
    } catch (e) { setErr(apiError(e)); }
    finally { setLoading(false); }
  }, [role, search]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const toggle = async (u) => {
    await api.patch(`/users/${u.id}`, { status: u.status === 'active' ? 'inactive' : 'active' });
    load();
  };
  const getLink = async (u) => {
    const { data } = await api.get(`/users/${u.id}/affiliate-link`);
    setLink({ ...data, name: u.name });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">BA / BP / SE</h1>
          <p className="page-sub">{rows.length} network participants</p>
        </div>
        <button className="btn btn-forest" onClick={() => setShowAdd(true)}>+ Add Participant</button>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {['', 'BA', 'BP', 'SE'].map((r) => (
            <button key={r || 'all'} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>{r || 'All'}</button>
          ))}
        </div>
        <input className="input" placeholder="Search name / code / phone…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
      </div>

      {err && <div className="card panel error-box">{err}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Phone</th><th>First Sale</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="muted-center">Loading…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} className="muted-center">No participants.</td></tr>
              : rows.map((u) => (
                <tr key={u.id}>
                  <td><span className="code-chip">{u.code}</span></td>
                  <td className="cell-strong">{u.name}</td>
                  <td><span className={`badge ${u.role.toLowerCase()}`}>{u.role}</span></td>
                  <td className="cell-muted">{u.phone || '—'}</td>
                  <td className="cell-muted">{u.first_sale_at ? u.first_sale_at.slice(0, 10) : '—'}</td>
                  <td><span className={`badge ${u.status === 'active' ? 'active' : 'pending'}`}>{u.status.toUpperCase()}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => getLink(u)}>Link</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(u)}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
      {link && (
        <Modal title={`Affiliate link · ${link.name}`} onClose={() => setLink(null)}>
          <p className="cell-muted">Share this link; orders placed through it are attributed to {link.code}.</p>
          <input className="input" style={{ width: '100%' }} readOnly value={link.link} onFocus={(e) => e.target.select()} />
        </Modal>
      )}
    </div>
  );
}

function AddModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', role: 'BA', phone: '', email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (!payload[k]) delete payload[k]; });
      payload.role = form.role;
      await api.post('/users', payload);
      onAdded();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title="Add Participant" onClose={onClose}>
      {err && <div className="error-box">{err}</div>}
      <div className="grid-2">
        <div className="field"><label>Name *</label><input className="input" value={form.name} onChange={set('name')} /></div>
        <div className="field"><label>Role *</label>
          <select className="input" value={form.role} onChange={set('role')}>
            <option value="BA">BA — Brand Ambassador</option>
            <option value="BP">BP — Brand Promoter</option>
            <option value="SE">SE — Sales Executive</option>
          </select>
        </div>
        <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
        <div className="field"><label>Email</label><input className="input" value={form.email} onChange={set('email')} /></div>
        <div className="field"><label>Login password (optional)</label><input className="input" type="password" value={form.password} onChange={set('password')} /></div>
      </div>
      <p className="tag-note">The system assigns the next code automatically (e.g. BA-0000107).</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn btn-forest" onClick={submit} disabled={busy || !form.name}>{busy ? 'Saving…' : 'Add participant'}</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
