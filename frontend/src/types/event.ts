/**
 * Event-related type definitions
 */

export type EventStatus = 'scheduled' | 'cancelled' | 'completed';

export type ParticipantStatus = 'invited' | 'confirmed' | 'declined' | 'maybe';

export interface EventParticipant {
  id: number;
  user_id: number | null;
  athlete_id: number | null;
  status: ParticipantStatus;
  invited_at: string;
  responded_at: string | null;
}

export interface Event {
  id: number;
  name: string;
  event_date: string; // YYYY-MM-DD
  start_time: string | null;
  location: string | null;
  notes: string | null;
  status: EventStatus;
  team_id: number | null;
  team_ids: number[];
  coach_id: number | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  email_sent: boolean;
  push_sent: boolean;
  participants: EventParticipant[];
}

export interface EventCreatePayload {
  name: string;
  event_date: string; // YYYY-MM-DD - FIX: Changed from 'date' to 'event_date'
  start_time?: string | null;
  location?: string | null;
  notes?: string | null;
  team_id?: number | null;
  team_ids?: number[];
  coach_id?: number | null;
  invitee_ids: number[]; // User IDs (coaches, etc.)
  athlete_ids: number[]; // Athlete IDs
  send_email: boolean;
  send_push: boolean;
}

export interface EventUpdatePayload {
  name?: string;
  date?: string;
  start_time?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: EventStatus;
  team_id?: number | null;
  team_ids?: number[];
  coach_id?: number | null;
  send_notification?: boolean;
}

export interface EventConfirmationPayload {
  status: 'confirmed' | 'declined' | 'maybe';
}

export interface EventFilters {
  team_id?: number;
  date_from?: string;
  date_to?: string;
  athlete_id?: number;
}