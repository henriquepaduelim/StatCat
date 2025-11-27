type DashboardHeroProps = {
  title: string;
  description: string;
};

import PageTitle from "../PageTitle";

const DashboardHero = ({ title, description }: DashboardHeroProps) => (
  <section className="print-hidden">
    <PageTitle title={title} description={description} className="pb-2" />
  </section>
);

export default DashboardHero;
