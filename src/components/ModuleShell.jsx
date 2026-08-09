function ModuleShell({ title, description, children }) {
  return (
    <section className="students-module">
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

export default ModuleShell;
