type PageTitleProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  className?: string;
};

const PageTitle = ({ title, description, eyebrow, className = "" }: PageTitleProps) => (
  <header className={`space-y-1 pt-1 pb-3 ${className}`}>
    {eyebrow ? (
      <p className="text-xs uppercase tracking-wide text-muted">{eyebrow}</p>
    ) : null}
    <h1 className="text-2xl md:text-3xl font-semibold leading-tight text-container-foreground">
      {title}
    </h1>
    {description ? <p className="text-sm text-muted">{description}</p> : null}
  </header>
);

export default PageTitle;
