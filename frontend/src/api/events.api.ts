/**
 * Events API client
 * Handles all HTTP requests related to events management
 */

import api from './client';
import type {
  Event,
  EventCreatePayload,
  EventUpdatePayload,
  EventConfirmationPayload,
  EventFilters,
} from '../types/event';

/**
 * Create a new event
 */
export const createEvent = async (payload: EventCreatePayload): Promise<Event> => {
  const response = await api.post<Event>('/events/', payload);
  return response.data;
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
  return response.data;
};

/**
 * List events where current user is involved (invited or organizer)
 */
export const listMyEvents = async (): Promise<Event[]> => {
  const response = await api.get<Event[]>('/events/my-events');
  return response.data;
};

/**
 * Get a specific event by ID
 */
export const getEvent = async (eventId: number): Promise<Event> => {
  const response = await api.get<Event>(`/events/${eventId}`);
  return response.data;
};

/**
 * Update an event
 */
export const updateEvent = async (
  eventId: number,
  payload: EventUpdatePayload
): Promise<Event> => {
  const response = await api.put<Event>(`/events/${eventId}`, payload);
  return response.data;
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
): Promise<Event> => {
  const response = await api.post<Event>(`/events/${eventId}/confirm`, payload);
  return response.data;
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
  return response.data;
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
