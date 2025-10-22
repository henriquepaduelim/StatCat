import api from "./client";

export interface CalendarEventAttendee {
  id: number;
  athlete_id: number | null;
  email: string;
  display_name: string | null;
  status: "pending" | "accepted" | "declined" | "tentative" | string;
  response_at: string | null;
}

export interface CalendarEvent {
  id: number;
  client_id: number;
  created_by_id: number;
  calendar_id: string;
  status: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  event_type?: string | null;
  start_at: string;
  end_at: string;
  time_zone: string;
  google_event_id?: string | null;
  meeting_url?: string | null;
  color_id?: string | null;
  created_at: string;
  updated_at: string;
  attendees: CalendarEventAttendee[];
}

export interface CalendarEventFiltersPayload {
  age_min?: number | null;
  age_max?: number | null;
  genders?: string[];
  statuses?: string[];
  teams?: string[];
}

export interface CalendarEventPayload {
  summary: string;
  description?: string;
  location?: string;
  event_type?: string;
  start_at: string;
  end_at: string;
  time_zone: string;
  calendar_id?: string;
  status?: string;
  client_id?: number;
  attendee_ids?: number[];
  group_ids?: number[];
  filters?: CalendarEventFiltersPayload | null;
}

export interface ListCalendarEventsParams {
  client_id?: number;
  start?: string;
  end?: string;
}

export const listCalendarEvents = async (params: ListCalendarEventsParams) => {
  const { data } = await api.get<CalendarEvent[]>("/calendar/events/", { params });
  return data;
};

export const createCalendarEvent = async (payload: CalendarEventPayload) => {
  const { data } = await api.post<CalendarEvent>("/calendar/events/", payload);
  return data;
};

export const updateCalendarEvent = async (
  eventId: number,
  payload: Partial<CalendarEventPayload>
) => {
  const { data } = await api.patch<CalendarEvent>(`/calendar/events/${eventId}`, payload);
  return data;
};

export const deleteCalendarEvent = async (eventId: number) => {
  await api.delete(`/calendar/events/${eventId}`);
};

