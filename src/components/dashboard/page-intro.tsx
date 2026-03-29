export function PageIntro({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-info">{eyebrow}</p>
      <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-text lg:text-5xl">
        {title}
      </h1>
      <p className="max-w-3xl text-base leading-7 text-muted">{subtitle}</p>
    </header>
  );
}
