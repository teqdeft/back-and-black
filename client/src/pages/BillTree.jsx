import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../lib/api';
import { formatINR } from '../lib/auth.jsx';

function Node({ node, onNavigate }) {
  if (!node) return null;
  const full = node.status === 'full';
  return (
    <div className="tree-node">
      <div className="tree-row">
        <span className="tree-bill" style={{ cursor: 'pointer' }} onClick={() => onNavigate(node.bill_no)} title="Center on this bill">
          #{node.bill_no}
        </span>
        {node.ref_role && <span className={`badge ${node.ref_role.toLowerCase()}`}>{node.ref_role}</span>}
        {node.ref_code && <span className="code-chip">{node.ref_code}</span>}
        <span className="cell-muted">{node.buyer_name}</span>
        <span className="cell-strong">{formatINR(node.earned)}</span>
        {full && <span className="badge full">FULL</span>}
      </div>
      {node.children?.length > 0 && (
        <div className="tree-children">
          {node.children.map((c) => <Node key={c.bill_no} node={c} onNavigate={onNavigate} />)}
        </div>
      )}
    </div>
  );
}

export default function BillTree() {
  const [root, setRoot] = useState(1);
  const [depth, setDepth] = useState(4);
  const [tree, setTree] = useState(null);
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/data/bill-tree', { params: { root, depth } });
      setTree(data.tree); setParent(data.parent); setErr('');
    } catch (e) { setErr(apiError(e)); }
    finally { setLoading(false); }
  }, [root, depth]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Bill Tree</h1>
          <p className="page-sub">Deterministic ternary tree · Children(N) = {'{3N-1, 3N, 3N+1}'}</p>
        </div>
      </div>

      <div className="toolbar">
        <label className="cell-muted">Root bill</label>
        <input className="input" style={{ minWidth: 100 }} type="number" min="1" value={root}
          onChange={(e) => setRoot(Math.max(1, parseInt(e.target.value, 10) || 1))} />
        <label className="cell-muted">Depth</label>
        <select className="input" style={{ minWidth: 90 }} value={depth} onChange={(e) => setDepth(parseInt(e.target.value, 10))}>
          {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" disabled={!parent} onClick={() => parent && setRoot(parent)}>↑ Go to parent #{parent || '—'}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setRoot(1)}>⌂ Root</button>
      </div>

      {err && <div className="card panel error-box">{err}</div>}

      <div className="card panel tree">
        {loading ? <div className="loading">Loading tree…</div>
          : tree ? <Node node={tree} onNavigate={setRoot} />
          : <div className="muted-center">Bill #{root} does not exist yet.</div>}
      </div>
    </div>
  );
}
