import { ComponentProps } from "react";

import EventsSection from "./EventsSection";
import EventModal from "./EventModal";

type DashboardEventsContainerProps = {
  eventsSectionProps: ComponentProps<typeof EventsSection>;
  eventModalProps: ComponentProps<typeof EventModal>;
};

/**
 * Wraps the calendar/availability section and the event modal to keep Dashboard.tsx cleaner.
 */
const DashboardEventsContainer = ({
  eventsSectionProps,
  eventModalProps,
}: DashboardEventsContainerProps) => {
  return (
    <>
      <EventsSection {...eventsSectionProps} />
      <EventModal {...eventModalProps} />
    </>
  );
};

export default DashboardEventsContainer;
