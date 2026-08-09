function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'نعم، حذف', cancelLabel = 'إلغاء' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card confirm-card">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
