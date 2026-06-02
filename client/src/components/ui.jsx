export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function RoleBadge({ role }) {
  const cls = { BA: 'ba', BP: 'bp', SE: 'se', OWNER: 'owner', STAFF: 'owner' }[role] || 'owner';
  return <span className={`badge ${cls}`}>{role}</span>;
}
