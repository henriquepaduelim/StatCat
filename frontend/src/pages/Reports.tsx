import { Fragment, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { useQueryClient } from "@tanstack/react-query";

import { useAthletes } from "../hooks/useAthletes";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { useAthlete } from "../hooks/useAthlete";
import { useTests } from "../hooks/useTests";
import { useTranslation } from "../i18n/useTranslation";
import AthleteReportCard from "../components/AthleteReportCard";
import MapInput from "../components/MapInput";
import {
  addSessionResults,
  createSession,
  type CreateSessionPayload,
  type SessionResultPayload,
} from "../api/sessions";
import type { TestDefinition } from "../types/test";

const Reports = () => {
  const { data: athletes } = useAthletes();
  const [currentAthleteId, setCurrentAthleteId] = useState<number | undefined>(undefined);
  const t = useTranslation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (athletes && athletes.length && !currentAthleteId) {
      setCurrentAthleteId(athletes[0].id);
    }
  }, [athletes, currentAthleteId]);

  const reportQuery = useAthleteReport(currentAthleteId);
  const testsQuery = useTests();
  const detailedAthleteQuery = useAthlete(
    currentAthleteId !== undefined ? currentAthleteId : Number.NaN
  );
  const [openModal, setOpenModal] = useState<"game" | "assessment" | null>(null);
  const [showEventSummary, setShowEventSummary] = useState(false);
  const closeModal = () => setOpenModal(null);
  const isGameModalOpen = openModal === "game";
  const isAssessmentModalOpen = openModal === "assessment";
  const [gameReportForm, setGameReportForm] = useState({
    eventType: "game",
    matchDate: new Date().toISOString().slice(0, 10),
    opponent: "",
    venue: "Home",
    teamGoals: "",
    opponentGoals: "",
    goalkeeperId: "",
    goalsConceded: "",
    notes: "",
    scorers: {} as Record<number, string>,
  });
  const [sessionForm, setSessionForm] = useState({
    name: "",
    scheduled_at: "",
    location: "",
    notes: "",
  });
  const [testInputs, setTestInputs] = useState<Record<number, string>>({});
  const [sessionMessage, setSessionMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [assessmentMessage, setAssessmentMessage] = useState<
    | { type: "success" | "error"; text: string }
    | null
  >(null);
  const [assessmentPending, setAssessmentPending] = useState(false);

  const currentAthlete = useMemo(
    () => athletes?.find((athlete) => athlete.id === currentAthleteId),
    [athletes, currentAthleteId]
  );

  const tests = testsQuery.data ?? [];

  const buildDefaultSessionName = useCallback(() => {
    if (!currentAthlete) {
      return "Assessment session";
    }
    const now = new Date();
    const formatted = now.toLocaleDateString();
    return `${currentAthlete.first_name} ${currentAthlete.last_name} — ${formatted}`;
  }, [currentAthlete]);

  useEffect(() => {
    if (!sessionMessage) return;
    const timeout = window.setTimeout(() => setSessionMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [sessionMessage]);

  useEffect(() => {
    if (!assessmentMessage) return;
    const timeout = window.setTimeout(() => setAssessmentMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [assessmentMessage]);

  useEffect(() => {
    if (!currentAthlete) {
      setSessionForm({ name: "", scheduled_at: "", location: "", notes: "" });
      setTestInputs({});
      return;
    }
    setSessionForm((prev) => ({
      ...prev,
      name: prev.name || buildDefaultSessionName(),
    }));
  }, [currentAthlete, buildDefaultSessionName]);

  const totalGoals = useMemo(() => {
    return Object.values(gameReportForm.scorers).reduce((total, value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? total + parsed : total;
    }, 0);
  }, [gameReportForm.scorers]);

  const testsByCategory = useMemo(() => {
    if (!tests.length) return [];
    const groups = new Map<string, TestDefinition[]>();
    tests.forEach((test) => {
      const category = (test.category ?? "Other").trim() || "Other";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(test);
    });
    const order: Record<string, number> = {
      "General Info": 0,
      Technical: 1,
      Physical: 2,
      "Support Services": 3,
    };
    return Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        items: items.slice().sort((a, b) => a.id - b.id),
      }))
      .sort((a, b) => (order[a.category] ?? 99) - (order[b.category] ?? 99));
  }, [tests]);

  const testLookup = useMemo(() => {
    const map = new Map<number, TestDefinition>();
    tests.forEach((test) => map.set(test.id, test));
    return map;
  }, [tests]);

  const handleGameFieldChange = (name: string, value: string) => {
    setGameReportForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleScorerChange = (athleteId: number, value: string) => {
    setGameReportForm((prev) => ({
      ...prev,
      scorers: {
        ...prev.scorers,
        [athleteId]: value,
      },
    }));
  };

  const handleSaveSession = async () => {
    if (!currentAthleteId) {
      setSessionMessage({ type: "error", text: "Athlete not found" });
      return;
    }

    const sessionPayload: CreateSessionPayload = {
      athlete_id: currentAthleteId,
      name: sessionForm.name.trim() || buildDefaultSessionName(),
      location: sessionForm.location.trim() || undefined,
      scheduled_at: sessionForm.scheduled_at || undefined,
      notes: sessionForm.notes.trim() || undefined,
    };

    try {
      await createSession(sessionPayload);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setSessionMessage({ type: "success", text: "Session saved to calendar!" });
    } catch (error) {
      setSessionMessage({ type: "error", text: "Failed to save session." });
    }
  };

  const handleAssessmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentAthleteId) {
      setAssessmentMessage({ type: "error", text: t.athleteAssessment.errorNoValues });
      return;
    }

    const results: SessionResultPayload[] = Object.entries(testInputs)
      .map(([id, raw]) => {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed);
        if (Number.isNaN(parsed)) return null;
        const testId = Number(id);
        const unit = testLookup.get(testId)?.unit?.trim();
        return {
          athlete_id: currentAthleteId,
          test_id: testId,
          value: parsed,
          ...(unit ? { unit } : {}),
        };
      })
      .filter((r): r is SessionResultPayload => r !== null);

    if (!results.length) {
      setAssessmentMessage({ type: "error", text: t.athleteAssessment.errorNoValues });
      return;
    }

    const sessionPayload: CreateSessionPayload = {
      athlete_id: currentAthleteId,
      name: sessionForm.name.trim() || buildDefaultSessionName(),
      location: sessionForm.location.trim() || undefined,
      scheduled_at: sessionForm.scheduled_at || undefined,
      notes: sessionForm.notes.trim() || undefined,
    };

    try {
      setAssessmentPending(true);
      const createdSession = await createSession(sessionPayload);
      await addSessionResults(createdSession.id, results);

      queryClient.invalidateQueries({ queryKey: ["athlete-report", currentAthleteId] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });

      setAssessmentMessage({ type: "success", text: t.athleteAssessment.success });
      setTestInputs({});
      setSessionForm({
        name: buildDefaultSessionName(),
        scheduled_at: "",
        location: "",
        notes: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.athleteAssessment.errorNoValues;
      setAssessmentMessage({ type: "error", text: message });
    } finally {
      setAssessmentPending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Transition appear show={isGameModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-8xl transform overflow-hidden rounded-3xl bg-container-gradient p-6 text-left align-middle shadow-xl transition-all">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <Dialog.Title className="text-xl font-semibold text-container-foreground">
                        Match report builder
                      </Dialog.Title>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-md px-3 py-1 text-sm font-semibold text-muted hover:text-container-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60"
                      >
                        Close
                      </button>
                    </div>
                    <p className="text-sm text-muted">
                      Draft a quick summary of a match, combine or friendly. Data stays local until you export it.
                    </p>
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-muted">
                          Event type
                          <select
                            value={gameReportForm.eventType}
                            onChange={(event) => handleGameFieldChange("eventType", event.target.value)}
                            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                          >
                            <option value="game">Game</option>
                            <option value="combine">Combine</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label className="text-sm font-medium text-muted">
                          Match date
                          <input
                            type="date"
                            value={gameReportForm.matchDate}
                            onChange={(event) => handleGameFieldChange("matchDate", event.target.value)}
                            className="mt-1"
                          />
                        </label>
                        <label className="text-sm font-medium text-muted">
                          Opponent / event label
                          <input
                            type="text"
                            value={gameReportForm.opponent}
                            onChange={(event) => handleGameFieldChange("opponent", event.target.value)}
                            placeholder="e.g. River United"
                            className="mt-1"
                          />
                        </label>
                        <label className="text-sm font-medium text-muted">
                          Venue
                          <select
                            value={gameReportForm.venue}
                            onChange={(event) => handleGameFieldChange("venue", event.target.value)}
                            className="mt-1"
                          >
                            <option value="Home">Home</option>
                            <option value="Away">Away</option>
                            <option value="Neutral">Neutral</option>
                          </select>
                        </label>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="text-sm font-medium text-muted">
                          Team goals
                          <input
                            type="number"
                            min={0}
                            value={gameReportForm.teamGoals}
                            onChange={(event) => handleGameFieldChange("teamGoals", event.target.value)}
                            className="mt-1"
                          />
                        </label>
                        <label className="text-sm font-medium text-muted">
                          Opponent goals
                          <input
                            type="number"
                            min={0}
                            value={gameReportForm.opponentGoals}
                            onChange={(event) => handleGameFieldChange("opponentGoals", event.target.value)}
                            className="mt-1"
                          />
                        </label>
                        <label className="text-sm font-medium text-muted">
                          Goals conceded by goalkeeper
                          <input
                            type="number"
                            min={0}
                            value={gameReportForm.goalsConceded}
                            onChange={(event) => handleGameFieldChange("goalsConceded", event.target.value)}
                            className="mt-1"
                          />
                        </label>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-muted">
                          Goalkeeper on record
                          <select
                            value={gameReportForm.goalkeeperId}
                            onChange={(event) => handleGameFieldChange("goalkeeperId", event.target.value)}
                            className="mt-1"
                          >
                            <option value="">Select goalkeeper</option>
                            {athletes?.map((athlete) => (
                              <option key={athlete.id} value={String(athlete.id)}>
                                {athlete.first_name} {athlete.last_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium text-muted">
                          Notes
                          <textarea
                            value={gameReportForm.notes}
                            onChange={(event) => handleGameFieldChange("notes", event.target.value)}
                            rows={3}
                            className="mt-1"
                            placeholder="Observations, tactical notes, key moments"
                          />
                        </label>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-container-foreground">Goal breakdown</h3>
                        <p className="text-xs text-muted">Enter the number of goals each athlete scored.</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {athletes?.map((athlete) => (
                            <label key={athlete.id} className="flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-container px-3 py-2 text-sm">
                              <span className="truncate text-container-foreground">
                                {athlete.first_name} {athlete.last_name}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={gameReportForm.scorers[athlete.id] ?? ""}
                                onChange={(event) => handleScorerChange(athlete.id, event.target.value)}
                                className="w-16 text-right"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-action-primary/20 bg-action-primary/5 p-4 text-sm text-container-foreground">
                        <p className="font-semibold">Summary</p>
                        <ul className="mt-2 space-y-1 text-xs text-muted">
                          <li>
                            Event type: <span className="font-medium text-container-foreground">{gameReportForm.eventType}</span>
                          </li>
                          <li>
                            Score: <span className="font-medium text-container-foreground">{gameReportForm.teamGoals || 0}</span> -{" "}
                            <span className="font-medium text-container-foreground">{gameReportForm.opponentGoals || 0}</span> vs {gameReportForm.opponent || "Opponent"}
                          </li>
                          <li>
                            Goals recorded: <span className="font-medium text-container-foreground">{totalGoals}</span>
                          </li>
                          {gameReportForm.goalkeeperId ? (
                            <li>
                              Goalkeeper: {(() => {
                                const keeper = athletes?.find((athlete) => String(athlete.id) === gameReportForm.goalkeeperId);
                                return keeper ? `${keeper.first_name} ${keeper.last_name}` : "Unknown";
                              })()} ({gameReportForm.goalsConceded || 0} conceded)
                            </li>
                          ) : null}
                          {gameReportForm.notes ? <li>Notes: {gameReportForm.notes}</li> : null}
                        </ul>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isAssessmentModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-8xl transform overflow-hidden rounded-3xl bg-container-gradient p-6 text-left align-middle shadow-xl transition-all">
                  <form onSubmit={handleAssessmentSubmit} className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Dialog.Title className="text-xl font-semibold text-container-foreground">
                          {t.athleteAssessment.sessionHeading}
                        </Dialog.Title>
                        <p className="text-sm text-muted">
                          {t.athleteAssessment.sessionDescription}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-md px-3 py-1 text-sm font-semibold text-muted hover:text-container-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/60"
                      >
                        Close
                      </button>
                    </div>

                    <section className="space-y-4 rounded-xl border border-black/5 bg-container-gradient p-6 shadow-sm">
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-container-foreground">
                          {t.forms.session.title}
                        </h2>
                        <p className="text-sm text-muted">{t.forms.session.subtitle}</p>
                      </div>
                      {sessionMessage && (
                        <div
                          role="status"
                          className={`rounded-md border px-3 py-2 text-sm ${
                            sessionMessage.type === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-600"
                          }`}
                        >
                          {sessionMessage.text}
                        </div>
                      )}
                      {!currentAthlete && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                          {t.reports.assessmentSelectAthlete}
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-muted">
                          {t.forms.session.name}
                          <input
                            type="text"
                            value={sessionForm.name}
                            onChange={(event) =>
                              setSessionForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                            placeholder={buildDefaultSessionName()}
                            disabled={!currentAthlete}
                          />
                        </label>
                        <label className="text-sm font-medium text-muted">
                          {t.forms.session.date}
                          <input
                            type="datetime-local"
                            value={sessionForm.scheduled_at}
                            onChange={(event) =>
                              setSessionForm((prev) => ({
                                ...prev,
                                scheduled_at: event.target.value,
                              }))
                            }
                            disabled={!currentAthlete}
                          />
                        </label>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-muted">
                          {t.forms.session.location}
                          <div className="mt-1">
                            {currentAthlete ? (
                              <MapInput
                                onChange={(_, address) =>
                                  setSessionForm((prev) => ({ ...prev, location: address }))
                                }
                              />
                            ) : (
                              <div className="rounded-md border border-dashed border-black/10 px-3 py-2 text-sm text-muted">
                                {t.reports.assessmentSelectAthlete}
                              </div>
                            )}
                          </div>
                        </label>
                        <label className="text-sm font-medium text-muted">
                          {t.forms.session.notes}
                          <textarea
                            rows={3}
                            value={sessionForm.notes}
                            onChange={(event) =>
                              setSessionForm((prev) => ({ ...prev, notes: event.target.value }))
                            }
                            disabled={!currentAthlete}
                          />
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveSession}
                          className="rounded-md bg-action-primary/80 px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm hover:bg-action-primary disabled:opacity-60"
                          disabled={!currentAthlete}
                        >
                          Save Session
                        </button>
                      </div>
                    </section>

                    <section className="space-y-4 rounded-xl border border-black/5 bg-container-gradient p-6 shadow-sm">
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-container-foreground">
                          {t.athleteAssessment.testsHeading}
                        </h2>
                        <p className="text-sm text-muted">{t.athleteAssessment.testsDescription}</p>
                      </div>

                      {assessmentMessage && (
                        <div
                          role="status"
                          className={`rounded-md border px-3 py-2 text-sm ${
                            assessmentMessage.type === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-600"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span>{assessmentMessage.text}</span>
                            {assessmentMessage.type === "success" && currentAthleteId && (
                              <Link
                                to={`/athletes/${currentAthleteId}`}
                                className="text-xs font-semibold text-accent hover:underline"
                              >
                                {t.athleteAssessment.viewReport}
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {!currentAthlete ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                          {t.reports.assessmentSelectAthlete}
                        </p>
                      ) : testsQuery.isLoading ? (
                        <p className="text-sm text-muted">{t.common.loading}...</p>
                      ) : !tests.length ? (
                        <p className="text-sm text-muted">{t.athleteAssessment.noTests}</p>
                      ) : (
                        <div className="space-y-4">
                          {testsByCategory.map(({ category, items }) => (
                            <details key={category} open className="rounded-lg border border-black/10 bg-container p-4">
                              <summary className="cursor-pointer text-sm font-semibold text-container-foreground">
                                {category} ({items.length})
                              </summary>
                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {items.map((test) => {
                                  const inputId = `test-${test.id}`;
                                  const unitLabel = test.unit ? ` (${test.unit})` : "";
                                  return (
                                    <label
                                      key={test.id}
                                      htmlFor={inputId}
                                      className="flex flex-col gap-2 rounded-md border border-black/5 bg-white p-4 shadow-sm"
                                    >
                                      <div>
                                        <p className="text-sm font-semibold text-container-foreground">
                                          {test.name}
                                        </p>
                                        {test.description && (
                                          <p className="text-xs text-muted whitespace-pre-line">
                                            {test.description}
                                          </p>
                                        )}
                                      </div>
                                      <input
                                        id={inputId}
                                        type="number"
                                        step="any"
                                        value={testInputs[test.id] ?? ""}
                                        onChange={(event) =>
                                          setTestInputs((prev) => ({
                                            ...prev,
                                            [test.id]: event.target.value,
                                          }))
                                        }
                                        placeholder={unitLabel ? `0 ${test.unit}` : "0"}
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm disabled:opacity-60"
                          disabled={assessmentPending || !currentAthlete}
                        >
                          {assessmentPending
                            ? `${t.common.loading}...`
                            : t.athleteAssessment.submit}
                        </button>
                      </div>
                    </section>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-container-foreground">{t.reports.title}</h1>
        <p className="text-sm text-muted">{t.reports.description}</p>
      </header>

      <div className="print-hidden flex flex-col gap-4 rounded-xl bg-container p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <label className="flex-1 text-sm font-medium text-muted">
          {t.reports.selectAthlete}
          <select
            value={currentAthleteId ?? ""}
            onChange={(event) => setCurrentAthleteId(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          >
            <option value="">{t.reports.selectPlaceholder}</option>
            {athletes?.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.first_name} {athlete.last_name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setOpenModal("game")}
            className={`rounded-md border px-4 py-2 text-sm font-semibold shadow-sm transition ${
              openModal === "game"
                ? "border-action-primary bg-action-primary text-action-primary-foreground"
                : "border-action-primary text-accent hover:bg-action-primary/10"
            }`}
          >
            Game report
          </button>
          <button
            type="button"
            onClick={() => setOpenModal("assessment")}
            className={`rounded-md border px-4 py-2 text-sm font-semibold shadow-sm transition ${
              openModal === "assessment"
                ? "border-action-primary bg-action-primary text-action-primary-foreground"
                : "border-action-primary text-accent hover:bg-action-primary/10"
            }`}
          >
            {t.athleteAssessment.sessionHeading}
          </button>
          <button
            type="button"
            onClick={() => setShowEventSummary((value) => !value)}
            className={`rounded-md border px-4 py-2 text-sm font-semibold shadow-sm transition ${
              showEventSummary
                ? "border-action-primary bg-action-primary text-action-primary-foreground"
                : "border-action-primary text-accent hover:bg-action-primary/10"
            }`}
          >
            Event summary
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md border border-action-primary px-4 py-2 text-sm font-semibold text-accent shadow-sm"
            disabled={!currentAthlete || reportQuery.isError || reportQuery.isLoading}
          >
            {t.reports.export} ({t.reports.soon})
          </button>
        </div>
      </div>
      {showEventSummary ? (
        <section className="print-hidden space-y-4 rounded-xl border border-black/10 bg-container p-6 shadow-sm">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-container-foreground">Event summary (beta)</h2>
            <p className="text-sm text-muted">
              Use this scratchpad to note combine evaluations, training drills or meeting outcomes.
            </p>
          </header>
          <textarea
            rows={6}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            placeholder="Add quick notes about attendance, standout performances or follow-up actions."
          />
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span className="inline-flex items-center rounded-full bg-action-primary/10 px-3 py-1">
              Tip: attach the final summary to your exported report for club directors.
            </span>
            <span className="inline-flex items-center rounded-full bg-action-primary/10 px-3 py-1">
              Upcoming: link combine metrics automatically.
            </span>
          </div>
        </section>
      ) : null}
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-md border border-action-primary px-4 py-2 text-sm font-semibold text-accent shadow-sm"
        disabled={!currentAthlete || reportQuery.isError || reportQuery.isLoading}
      >
        {t.reports.export} ({t.reports.soon})
      </button>

      <section className="rounded-xl bg-container/40 p-6 shadow-sm print:bg-white">
        {!currentAthlete && <p className="text-sm text-muted">{t.reports.noAthlete}</p>}

        {currentAthlete && reportQuery.isLoading && (
          <p className="text-sm text-muted">{t.reports.loading}</p>
        )}

        {reportQuery.isError && (
          <p className="text-sm text-red-500">{t.reports.error}</p>
        )}

        {currentAthlete && (
          <div className="space-y-6" id="report-print-area">
            <AthleteReportCard
              athlete={currentAthlete}
              detailedAthlete={detailedAthleteQuery.data}
              report={reportQuery.data}
              tests={testsQuery.data ?? []}
              hideRecentSessions
            />
            {reportQuery.data ? (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted">
                  {t.reports.summarySessions(reportQuery.data.sessions.length)}
                </p>
                <div className="rounded-lg bg-action-primary/10 px-4 py-2 text-sm text-accent">
                  {t.reports.summary}
                </div>
              </div>
            ) : null}

            {reportQuery.data ? (
              <div className="space-y-4">
                {reportQuery.data.sessions.map((session) => (
                  <div key={session.session_id} className="rounded-lg border border-black/10 bg-container/60 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-container-foreground">{session.session_name}</h3>
                        <p className="text-xs text-muted">
                          {t.reports.sessionDate(session.scheduled_at ?? null)}
                          {session.location ? ` • ${session.location}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-action-primary/10 px-3 py-1 text-xs font-semibold uppercase text-accent">
                        {t.reports.metricsBadge(session.results.length)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {session.results.map((metric) => (
                        <div
                          key={`${session.session_id}-${metric.test_id}-${metric.recorded_at}`}
                          className="rounded-lg bg-container px-4 py-3 text-sm"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            {metric.category ?? t.reports.metricFallback}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-container-foreground">
                            {metric.value}
                            {metric.unit ? <span className="text-sm text-muted"> {metric.unit}</span> : null}
                          </p>
                          <p className="text-xs text-muted">{metric.test_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
      </div>
    </>
  );
};

export default Reports;
