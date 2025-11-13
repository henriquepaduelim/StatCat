type DashboardHeroProps = {
  title: string;
  description: string;
};

const DashboardHero = ({ title, description }: DashboardHeroProps) => (
  <section className="print-hidden space-y-2">
    <h1 className="text-3xl font-semibold text-container-foreground">{title}</h1>
    <p className="text-sm text-muted">{description}</p>
  </section>
);

export default DashboardHero;

