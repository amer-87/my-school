function ModuleToolbar({ title, countLabel, primaryActionLabel, onPrimaryAction, secondaryActionLabel, onSecondaryAction, children }) {
  return (
    <div className="module-toolbar">
      <div className="module-actions">
        {onPrimaryAction ? (
          <button type="button" className="btn btn-primary" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        ) : null}
        {onSecondaryAction ? (
          <button type="button" className="btn btn-secondary" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>
      <div className="module-summary">
        {countLabel ? <span>{countLabel}</span> : null}
        {children}
      </div>
    </div>
  );
}

export default ModuleToolbar;
