import api from "./client";

export const deleteEvent = async (eventId: number): Promise<void> => {
  const response = await api.delete(`/api/v1/events/${eventId}`);
  return response.data;
};