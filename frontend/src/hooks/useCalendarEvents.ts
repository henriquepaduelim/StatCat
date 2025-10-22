import { useQuery } from "@tanstack/react-query";

import {
  listCalendarEvents,
  type CalendarEvent,
  type ListCalendarEventsParams,
} from "../api/calendarEvents";

export const useCalendarEvents = (params: ListCalendarEventsParams) => {
  return useQuery({
    queryKey: ["calendar-events", params],
    queryFn: () => listCalendarEvents(params),
    staleTime: 1000 * 30,
  });
};

export type { CalendarEvent };

