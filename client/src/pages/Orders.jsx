import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../lib/api';
import { formatINR } from '../lib/auth.jsx';
import { Modal, RoleBadge } from '../components/ui.jsx';

const DELIVERY = ['paid', 'dispatched', 'delivered', 'cancelled'];

export default function Orders() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [ref, setRef] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', { params: { search, status, ref, page, pageSize: 20 } });
      setData(data);
      setErr('');
    } catch (e) { setErr(apiError(e)); }
    finally { setLoading(false); }
  }, [search, status, ref, page]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const updateDelivery = async (id, delivery_status) => {
    await api.patch(`/orders/${id}`, { delivery_status });
    load();
  };
  const updateTracking = async (id, tracking_id) => {
    await api.patch(`/orders/${id}`, { tracking_id });
  };

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">{data.total} orders · each is a bill node in the tree</p>
        </div>
        <button className="btn btn-forest" onClick={() => setShowModal(true)}>+ Manual Order</button>
      </div>

      <div className="toolbar">
        <input className="input" placeholder="Search by bill no, name, phone…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ flex: 1 }} />
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {DELIVERY.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input className="input" placeholder="Filter by BA/BP/SE code" value={ref}
          onChange={(e) => { setRef(e.target.value); setPage(1); }} />
      </div>

      {err && <div className="card panel error-box">{err}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bill No</th><th>Date</th><th>Buyer</th><th>Product</th><th>Amount</th>
              <th>Payment</th><th>Tracking</th><th>Delivery</th><th>Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="muted-center">Loading…</td></tr>
            ) : data.rows.length === 0 ? (
              <tr><td colSpan={9} className="muted-center">No orders found.</td></tr>
            ) : data.rows.map((o) => (
              <tr key={o.id}>
                <td className="cell-strong">#{o.bill_no}</td>
                <td className="cell-muted">{(o.created_at || '').slice(0, 10)}</td>
                <td>
                  <div className="cell-strong">{o.buyer_name}</div>
                  <div className="cell-muted">{o.buyer_phone || '—'}<br />{[o.buyer_city, o.buyer_state].filter(Boolean).join(', ')}</div>
                </td>
                <td className="cell-muted">{o.product_sku} × {o.qty}</td>
                <td className="cell-strong">{formatINR(o.amount)}</td>
                <td>
                  <span className={`badge ${o.payment_status}`}>{o.payment_status.toUpperCase()}</span>
                  <div className="cell-muted">{o.payment_ref || ''}</div>
                </td>
                <td>
                  <input className="input" style={{ minWidth: 130 }} defaultValue={o.tracking_id || ''}
                    placeholder="Enter tracking…" onBlur={(e) => updateTracking(o.id, e.target.value)} />
                </td>
                <td>
                  <select className="input" style={{ minWidth: 120 }} value={o.delivery_status}
                    onChange={(e) => updateDelivery(o.id, e.target.value)}>
                    {DELIVERY.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                  </select>
                </td>
                <td>
                  <div className="cell-strong">{o.ref_name || '—'}</div>
                  {o.ref_code && <span className="code-chip">{o.ref_code}</span>}{' '}
                  {o.ref_role && <RoleBadge role={o.ref_role} />}
                </td>
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

      {showModal && <ManualOrderModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); setPage(1); load(); }} />}
    </div>
  );
}

function ManualOrderModal({ onClose, onCreated }) {
  const [products, setProducts] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [form, setForm] = useState({
    buyer_name: '', buyer_phone: '', buyer_city: '', buyer_state: '',
    product_id: '', qty: 1, ref_user_id: '', payment_status: 'captured', delivery_status: 'paid',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/products').then((r) => {
      setProducts(r.data.rows);
      setForm((f) => ({ ...f, product_id: r.data.rows[0]?.id || '' }));
    });
    api.get('/users').then((r) => setParticipants(r.data.rows)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const payload = { ...form };
      if (!payload.ref_user_id) delete payload.ref_user_id;
      await api.post('/orders', payload);
      onCreated();
    } catch (e) { setErr(apiError(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Create Manual Order" onClose={onClose}>
      {err && <div className="error-box">{err}</div>}
      <div className="grid-2">
        <div className="field"><label>Buyer name *</label><input className="input" value={form.buyer_name} onChange={set('buyer_name')} /></div>
        <div className="field"><label>Phone</label><input className="input" value={form.buyer_phone} onChange={set('buyer_phone')} /></div>
        <div className="field"><label>City</label><input className="input" value={form.buyer_city} onChange={set('buyer_city')} /></div>
        <div className="field"><label>State</label><input className="input" value={form.buyer_state} onChange={set('buyer_state')} /></div>
        <div className="field"><label>Product *</label>
          <select className="input" value={form.product_id} onChange={set('product_id')}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Qty</label><input className="input" type="number" min="1" value={form.qty} onChange={set('qty')} /></div>
        <div className="field"><label>Referred by (BA/BP/SE)</label>
          <select className="input" value={form.ref_user_id} onChange={set('ref_user_id')}>
            <option value="">— Owner (house order) —</option>
            {participants.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Payment</label>
          <select className="input" value={form.payment_status} onChange={set('payment_status')}>
            <option value="captured">captured</option><option value="pending">pending</option>
          </select>
        </div>
      </div>
      <p className="tag-note">A captured order immediately places a bill in the tree and distributes commission.</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn btn-forest" onClick={submit} disabled={busy || !form.buyer_name || !form.product_id}>
          {busy ? 'Creating…' : 'Create order'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
