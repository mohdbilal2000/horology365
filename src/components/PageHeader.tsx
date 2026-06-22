interface PageHeaderProps {
  label: string;
  title: string;
  intro?: string;
}

export function PageHeader({ label, title, intro }: PageHeaderProps) {
  return (
    <header className="band-dark">
      <div className="shell section-y">
        <span className="eyebrow">{label}</span>
        <h1 className="display-title mt-3 max-w-3xl text-balance">{title}</h1>
        {intro ? (
          <p className="mt-4 max-w-2xl text-bone/70 sm:text-lg">{intro}</p>
        ) : null}
      </div>
    </header>
  );
}
