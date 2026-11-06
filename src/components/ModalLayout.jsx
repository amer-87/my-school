function ModalLayout({ title, isOpen, onClose, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {children}

        {footer ? <div className="modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}

export default ModalLayout;
