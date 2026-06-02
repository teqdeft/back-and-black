import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../lib/api';
import { formatINR } from '../lib/auth.jsx';
import { Modal } from '../components/ui.jsx';

export default function Products() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null); // product or {} for new

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/products'); setRows(data.rows); setErr(''); }
    catch (e) { setErr(apiError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">{rows.length} products · capacities drive certificate caps</p>
        </div>
        <button className="btn btn-forest" onClick={() => setEdit({ sku: '', name: '', price: 0, ba_capacity: 5000, bp_capacity: 2000, active: true })}>+ Add Product</button>
      </div>

      {err && <div className="card panel error-box">{err}</div>}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>BA Cap</th><th>BP Cap</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="muted-center">Loading…</td></tr>
              : rows.map((p) => (
                <tr key={p.id}>
                  <td><span className="code-chip">{p.sku}</span></td>
                  <td className="cell-strong">{p.name}</td>
                  <td>{formatINR(p.price)}</td>
                  <td>{formatINR(p.ba_capacity)}</td>
                  <td>{formatINR(p.bp_capacity)}</td>
                  <td><span className={`badge ${p.active ? 'active' : 'pending'}`}>{p.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setEdit(p)}>Edit</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {edit && <ProductModal product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }) {
  const isNew = !product.id;
  const [form, setForm] = useState({ ...product });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const payload = {
        sku: form.sku, name: form.name, price: Number(form.price),
        ba_capacity: Number(form.ba_capacity), bp_capacity: Number(form.bp_capacity), active: !!form.active,
      };
      if (isNew) await api.post('/products', payload);
      else await api.patch(`/products/${product.id}`, payload);
      onSaved();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={isNew ? 'Add Product' : `Edit ${product.sku}`} onClose={onClose}>
      {err && <div className="error-box">{err}</div>}
      <div className="grid-2">
        <div className="field"><label>SKU *</label><input className="input" value={form.sku} onChange={set('sku')} disabled={!isNew} /></div>
        <div className="field"><label>Name *</label><input className="input" value={form.name} onChange={set('name')} /></div>
        <div className="field"><label>Price (₹)</label><input className="input" type="number" value={form.price} onChange={set('price')} /></div>
        <div className="field"><label>Active</label>
          <select className="input" value={String(form.active)} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'true' }))}>
            <option value="true">Active</option><option value="false">Inactive</option>
          </select>
        </div>
        <div className="field"><label>BA capacity (₹)</label><input className="input" type="number" value={form.ba_capacity} onChange={set('ba_capacity')} /></div>
        <div className="field"><label>BP capacity (₹)</label><input className="input" type="number" value={form.bp_capacity} onChange={set('bp_capacity')} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn btn-forest" onClick={submit} disabled={busy || !form.sku || !form.name}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
