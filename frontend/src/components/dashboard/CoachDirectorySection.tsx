import type { ComponentProps } from "react";

import CoachDirectoryCard from "./CoachDirectoryCard";

type CoachDirectorySectionProps = ComponentProps<typeof CoachDirectoryCard>;

const CoachDirectorySection = (props: CoachDirectorySectionProps) => (
  <section className="print-hidden">
    <CoachDirectoryCard {...props} />
  </section>
);

export default CoachDirectorySection;

