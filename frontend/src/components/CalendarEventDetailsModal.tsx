import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

import type { CalendarEvent } from "../hooks/useCalendarEvents";

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "accepted":
      return "bg-emerald-500/15 text-emerald-500";
    case "declined":
      return "bg-red-500/15 text-red-500";
    case "tentative":
      return "bg-amber-500/15 text-amber-500";
    default:
      return "bg-muted/20 text-muted";
  }
};

type CalendarEventDetailsModalProps = {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (eventId: number) => void;
};

const CalendarEventDetailsModal = ({ event, isOpen, onClose, onDelete }: CalendarEventDetailsModalProps) => {
  if (!event) return null;

  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-container p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-semibold text-container-foreground">
                  {event.summary}
                </Dialog.Title>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">{event.event_type ?? "Event"}</p>

                <div className="mt-4 space-y-2 text-sm text-muted">
                  <p>
                    <strong>When:</strong> {start.toLocaleString()} — {end.toLocaleString()} ({event.time_zone})
                  </p>
                  {event.location ? (
                    <p>
                      <strong>Location:</strong> {event.location}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="whitespace-pre-line">
                      <strong>Description:</strong> {event.description}
                    </p>
                  ) : null}
                  {event.meeting_url ? (
                    <p>
                      <a
                        href={event.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-action-primary hover:underline"
                      >
                        Open in Google Calendar
                      </a>
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Attendees</p>
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-black/10 bg-white/80">
                    <table className="min-w-full divide-y divide-black/5 text-sm">
                      <thead className="bg-muted/10 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {event.attendees.map((attendee) => (
                          <tr key={attendee.id}>
                            <td className="px-3 py-2 text-container-foreground">
                              {attendee.display_name ?? "No name"}
                            </td>
                            <td className="px-3 py-2 text-muted">{attendee.email}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(attendee.status)}`}
                              >
                                {attendee.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!event.attendees.length ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-3 text-center text-xs text-muted">
                              No attendees linked
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                    onClick={() => onDelete(event.id)}
                  >
                    Cancel event
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-muted hover:border-action-primary hover:text-accent"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CalendarEventDetailsModal;
