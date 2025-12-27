/**
 * Events API client
 * Handles all HTTP requests related to events management
 */

import api from './client';
import type {
  Event,
  EventParticipant,
  EventCreatePayload,
  EventUpdatePayload,
  EventConfirmationPayload,
  EventFilters,
} from '../types/event';

type EventStatus = Event['status'];
type ParticipantStatus = EventParticipant['status'];

const normalizeEventStatus = (status: string | null | undefined): EventStatus => {
  if (!status) return 'scheduled';
  return status.toLowerCase() as EventStatus;
};

const normalizeParticipantStatus = (
  status: string | null | undefined
): ParticipantStatus => {
  if (!status) return 'invited';
  return status.toLowerCase() as ParticipantStatus;
};

const normalizeEvent = (event: Event): Event => ({
  ...event,
  status: normalizeEventStatus(event.status),
  participants: event.participants?.map((participant) => ({
    ...participant,
    status: normalizeParticipantStatus(participant.status),
  })) ?? [],
});

const normalizeEvents = (events: Event[]): Event[] => events.map(normalizeEvent);

/**
 * Create a new event
 */
export const createEvent = async (payload: EventCreatePayload): Promise<Event> => {
  const response = await api.post<Event>('/events/', payload);
  return normalizeEvent(response.data);
};

/**
 * List all events with optional filters
 */
export const listEvents = async (filters?: EventFilters): Promise<Event[]> => {
  const params = new URLSearchParams();
  if (filters?.team_id !== undefined) {
    params.append('team_id', filters.team_id.toString());
  }
  if (filters?.athlete_id !== undefined) {
    params.append('athlete_id', filters.athlete_id.toString());
  }
  if (filters?.date_from) {
    params.append('date_from', filters.date_from);
  }
  if (filters?.date_to) {
    params.append('date_to', filters.date_to);
  }

  const queryString = params.toString();
  const url = queryString ? `/events/?${queryString}` : '/events/';
  
  const response = await api.get<Event[]>(url);
  return normalizeEvents(response.data);
};

/**
 * List events where current user is involved (invited or organizer)
 */
export const listMyEvents = async (): Promise<Event[]> => {
  const response = await api.get<Event[]>('/events/my-events');
  return normalizeEvents(response.data);
};

/**
 * Get a specific event by ID
 */
export const getEvent = async (eventId: number): Promise<Event> => {
  const response = await api.get<Event>(`/events/${eventId}`);
  return normalizeEvent(response.data);
};

/**
 * Update an event
 */
export const updateEvent = async (
  eventId: number,
  payload: EventUpdatePayload
): Promise<Event> => {
  const response = await api.put<Event>(`/events/${eventId}`, payload);
  return normalizeEvent(response.data);
};

/**
 * Delete an event
 */
export const deleteEvent = async (eventId: number): Promise<void> => {
  await api.delete(`/events/${eventId}`);
};

/**
 * Confirm/decline attendance to an event
 */
export const confirmEventAttendance = async (
  eventId: number,
  payload: EventConfirmationPayload
): Promise<EventParticipant> => {
  const response = await api.post<EventParticipant>(`/events/${eventId}/confirm`, payload);
  return {
    ...response.data,
    status: normalizeParticipantStatus(response.data.status),
  };
};

/**
 * Add participants to an event
 */
export const addEventParticipants = async (
  eventId: number,
  userIds: number[],
  sendNotification: boolean = true
): Promise<Event> => {
  const response = await api.post<Event>(`/events/${eventId}/participants`, {
    user_ids: userIds,
    send_notification: sendNotification,
  });
  return normalizeEvent(response.data);
};

/**
 * Remove a participant from an event
 */
export const removeEventParticipant = async (
  eventId: number,
  userId: number
): Promise<void> => {
  await api.delete(`/events/${eventId}/participants/${userId}`);
};
