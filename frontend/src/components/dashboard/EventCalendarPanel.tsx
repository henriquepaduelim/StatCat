import { Dispatch, SetStateAction } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnglesLeft, faAnglesRight, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

import type { Event } from "../../types/event";
import type { TranslationDictionary } from "../../i18n/translations";

export type CalendarGrid = {
  cells: Array<number | null>;
  year: number;
  month: number;
};

type SummaryLabels = TranslationDictionary["dashboard"]["summary"];

type EventCalendarPanelProps = {
  summaryLabels: SummaryLabels;
  calendarCursor: Date;
  calendarGrid: CalendarGrid;
  weekdayInitials: readonly string[];
  eventsByDate: Map<string, Event[]>;
  selectedEventDate: string | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: number | null) => void;
  onOpenEventForm: () => void;
  upcomingEvents: Event[];
  readableDate: (dateStr: string) => string;
  formatDateKey: (date: Date) => string;
  canManageEvents: boolean;
  onDeleteEvent: (eventId: number) => void;
  deleteEventPending: boolean;
  setSelectedEventDate: Dispatch<SetStateAction<string | null>>;
  setSelectedTeamId: Dispatch<SetStateAction<number | null>>;
  setCalendarCursor: Dispatch<SetStateAction<Date>>;
  getEventTeamIds: (event: Event) => number[];
};

const EventCalendarPanel = ({
  summaryLabels,
  calendarCursor,
  calendarGrid,
  weekdayInitials,
  eventsByDate,
  selectedEventDate,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  onOpenEventForm,
  upcomingEvents,
  readableDate,
  formatDateKey,
  canManageEvents,
  onDeleteEvent,
  deleteEventPending,
  setSelectedEventDate,
  setSelectedTeamId,
  setCalendarCursor,
  getEventTeamIds,
}: EventCalendarPanelProps) => {
  return (
    <div className="w-full space-y-4 xl:w-1/2">
      <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-full border border-action-primary/40 bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
            aria-label={summaryLabels.calendar.prevMonth}
          >
            <span className="sr-only">{summaryLabels.calendar.prevMonth}</span>
            <FontAwesomeIcon icon={faAnglesLeft} className="text-base" />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold text-container-foreground">
              {calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-muted">{summaryLabels.calendar.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-full border border-action-primary/40 bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
            aria-label={summaryLabels.calendar.nextMonth}
          >
            <span className="sr-only">{summaryLabels.calendar.nextMonth}</span>
            <FontAwesomeIcon icon={faAnglesRight} className="text-base" />
          </button>
        </div>
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {weekdayInitials.map((day, index) => (
              <span key={`weekday-${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2 text-sm">
            {calendarGrid.cells.map((cell, index) => {
              const dateKey = cell
                ? formatDateKey(new Date(calendarGrid.year, calendarGrid.month, cell))
                : null;
              const hasEvents = Boolean(dateKey && eventsByDate.get(dateKey)?.length);
              const isToday = dateKey === formatDateKey(new Date());
              const isSelected = Boolean(dateKey && selectedEventDate === dateKey);
              return (
                <button
                  key={`calendar-cell-${calendarGrid.year}-${calendarGrid.month}-${index}`}
                  type="button"
                  disabled={!cell}
                  onClick={() => onDayClick(cell)}
                  className={`flex h-14 flex-col items-center justify-center rounded-lg border px-1 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-action-primary/60 ${
                    cell
                      ? isSelected
                        ? "border-action-primary bg-action-primary/10 text-action-primary"
                        : isToday
                          ? "border-action-primary/40 bg-[rgb(var(--color-container-background))] text-action-primary"
                          : "border-black/20 bg-[rgb(var(--color-container-background))] text-container-foreground hover:border-action-primary/40"
                      : "border-transparent bg-transparent text-transparent"
                  }`}
                >
                  {cell ?? ""}
                  {hasEvents ? (
                    <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-action-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-container-foreground">{summaryLabels.calendar.title}</p>
              <p className="text-xs text-muted">{summaryLabels.calendar.subtitle}</p>
            </div>
            {canManageEvents ? (
              <button
                type="button"
                onClick={() => onOpenEventForm()}
                className="rounded-md border border-action-primary/40 bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs mr-1" />
                {summaryLabels.calendar.createButton}
              </button>
            ) : null}
          </div>
          {upcomingEvents.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <div className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-container-background))] px-3 py-2 shadow-sm">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventDate(event.date);
                          const eventTeams = getEventTeamIds(event);
                          if (eventTeams.length) {
                            setSelectedTeamId(eventTeams[0]);
                          }
                          setCalendarCursor((prev) => {
                            const eventDate = new Date(event.date);
                            if (
                              prev.getFullYear() === eventDate.getFullYear() &&
                              prev.getMonth() === eventDate.getMonth()
                            ) {
                              return prev;
                            }
                            return new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
                          });
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="font-semibold text-container-foreground">{event.name}</p>
                        <p className="text-xs text-muted">
                          {readableDate(event.date)} • {event.time || summaryLabels.calendar.timeTbd}
                        </p>
                        {event.location ? (
                          <p className="text-xs text-muted">{event.location}</p>
                        ) : null}
                      </button>
                      {canManageEvents ? (
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(event.id)}
                          disabled={deleteEventPending}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                          aria-label={`Delete ${event.name}`}
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted">{summaryLabels.calendar.upcomingEmpty}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCalendarPanel;
