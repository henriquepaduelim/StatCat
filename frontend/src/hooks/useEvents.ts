/**
 * Custom React hooks for events management with React Query
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';

import * as eventsApi from '../api/events.api';
import type {
  Event,
  EventCreatePayload,
  EventUpdatePayload,
  EventConfirmationPayload,
  EventFilters,
} from '../types/event';

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: EventFilters) => [...eventKeys.lists(), { filters }] as const,
  myEvents: () => [...eventKeys.all, 'my-events'] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
};

/**
 * Hook to fetch all events with optional filters
 */
export const useEvents = (filters?: EventFilters): UseQueryResult<Event[], Error> => {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventsApi.listEvents(filters),
  });
};

/**
 * Hook to fetch current user's events (invited or organized)
 */
export const useMyEvents = (): UseQueryResult<Event[], Error> => {
  return useQuery({
    queryKey: eventKeys.myEvents(),
    queryFn: eventsApi.listMyEvents,
  });
};

/**
 * Hook to fetch a single event by ID
 */
export const useEvent = (eventId: number): UseQueryResult<Event, Error> => {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => eventsApi.getEvent(eventId),
    enabled: !!eventId,
  });
};

/**
 * Hook to create a new event
 */
export const useCreateEvent = (): UseMutationResult<
  Event,
  Error,
  EventCreatePayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => {
      // Invalidate all event queries to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() });
    },
  });
};

/**
 * Hook to update an existing event
 */
export const useUpdateEvent = (): UseMutationResult<
  Event,
  Error,
  { eventId: number; payload: EventUpdatePayload }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, payload }) => eventsApi.updateEvent(eventId, payload),
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
    },
  });
};

/**
 * Hook to delete an event
 */
export const useDeleteEvent = (): UseMutationResult<void, Error, number> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: eventsApi.deleteEvent,
    onSuccess: () => {
      // Invalidate all event lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() });
    },
  });
};

/**
 * Hook to confirm/decline event attendance
 */
export const useConfirmEventAttendance = (): UseMutationResult<
  Event,
  Error,
  { eventId: number; payload: EventConfirmationPayload }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, payload }) =>
      eventsApi.confirmEventAttendance(eventId, payload),
    onSuccess: (data, variables) => {
      // Update the specific event and lists
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() });
    },
  });
};

/**
 * Hook to add participants to an event
 */
export const useAddEventParticipants = (): UseMutationResult<
  Event,
  Error,
  { eventId: number; userIds: number[]; sendNotification?: boolean }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, userIds, sendNotification }) =>
      eventsApi.addEventParticipants(eventId, userIds, sendNotification),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() });
    },
  });
};

/**
 * Hook to remove a participant from an event
 */
export const useRemoveEventParticipant = (): UseMutationResult<
  void,
  Error,
  { eventId: number; userId: number }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, userId }) =>
      eventsApi.removeEventParticipant(eventId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.myEvents() });
    },
  });
};
