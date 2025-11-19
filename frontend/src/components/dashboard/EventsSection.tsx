import type { ComponentProps } from "react";

import EventCalendarPanel from "./EventCalendarPanel";
import EventAvailabilityPanel from "./EventAvailabilityPanel";

type EventsSectionProps = {
  calendarProps: ComponentProps<typeof EventCalendarPanel>;
  availabilityProps: ComponentProps<typeof EventAvailabilityPanel>;
};

const EventsSection = ({ calendarProps, availabilityProps }: EventsSectionProps) => (
  <section className="print-hidden flex w-full flex-col gap-6 xl:flex-row">
    <EventCalendarPanel {...calendarProps} />
    <EventAvailabilityPanel {...availabilityProps} />
  </section>
);

export default EventsSection;
