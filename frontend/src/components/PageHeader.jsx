export default function PageHeader({ kicker, title, description, actions, accent }) {
  const bar = accent || 'bg-accent';
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        <span className={`mb-3 inline-block h-[3px] w-9 rounded-full ${bar}`} aria-hidden="true" />
        {kicker && (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">{kicker}</p>
        )}
        <h1 className="font-ui text-3xl font-bold uppercase tracking-[0.08em] text-text">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-text-2">{description}</p>}
      </div>
      {actions}
    </header>
  );
}