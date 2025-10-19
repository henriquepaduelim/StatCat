import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import AthleteForm from "../components/AthleteForm";
import MapInput from "../components/MapInput";
import { updateAthlete, uploadAthletePhoto } from "../api/athletes";
import {
  addSessionResults,
  createSession,
  type CreateSessionPayload,
  type SessionResultPayload,
} from "../api/sessions";
import { useAthlete } from "../hooks/useAthlete";
import { useClients } from "../hooks/useClients";
import { useTests } from "../hooks/useTests";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";
import type { AthletePayload } from "../types/athlete";
import type { TestDefinition } from "../types/test";
import type { SessionRecord } from "../hooks/useSessions";

const AthleteEdit = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();

  const rawId = Number(params.id);
  const athleteId = Number.isFinite(rawId) ? rawId : undefined;

  const { theme } = useThemeStore((state) => ({ theme: state.theme }));
  const { data: athlete, isLoading, isError } = useAthlete(athleteId ?? -1);
  const { data: clients } = useClients();
  const t = useTranslation();

  const activeClientId = athlete?.client_id ?? theme.clientId ?? undefined;
  const { data: tests = [], isLoading: testsLoading } = useTests(activeClientId);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [profilePending, setProfilePending] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [assessmentMessage, setAssessmentMessage] = useState<
    | { type: "success" | "error"; text: string }
    | null
  >(null);
  const [assessmentPending, setAssessmentPending] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    name: "",
    scheduled_at: "",
    location: "",
    notes: "",
  });
  const [testInputs, setTestInputs] = useState<Record<number, string>>({});

  const buildDefaultSessionName = useCallback(() => {
    if (!athlete) {
      return "Assessment session";
    }
    const now = new Date();
    const formatted = now.toLocaleDateString();
    return `${athlete.first_name} ${athlete.last_name} — ${formatted}`;
  }, [athlete]);

  // Effect to pre-fill form from navigation state
  useEffect(() => {
    const navigatedSession = location.state?.session as SessionRecord | undefined;
    if (navigatedSession) {
      setSessionForm({
        name: navigatedSession.name,
        scheduled_at: navigatedSession.scheduled_at?.substring(0, 16) ?? "", // Format for datetime-local
        location: navigatedSession.location ?? "",
        notes: navigatedSession.notes ?? "",
      });
    }
  }, [location.state]);

  useEffect(() => {
    setCurrentPhotoUrl(athlete?.photo_url ?? null);
  }, [athlete?.photo_url]);

  const clientOptions = useMemo(
    () =>
      (clients ?? []).map((client) => ({
        value: String(client.id),
        label: client.name,
      })),
    [clients]
  );

  const allowClientSelection = clientOptions.length > 1;

  useEffect(() => {
    if (!profileMessage) return;
    const timeout = window.setTimeout(() => setProfileMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [profileMessage]);

  useEffect(() => {
    if (!assessmentMessage) return;
    const timeout = window.setTimeout(() => setAssessmentMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [assessmentMessage]);

  useEffect(() => {
    if (!athlete) return;
    setSessionForm((prev) => ({
      ...prev,
      name: prev.name || buildDefaultSessionName(),
    }));
  }, [athlete, buildDefaultSessionName]);

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

  const mutation = useMutation({
    mutationFn: (payload: AthletePayload) => updateAthlete(athleteId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["athlete", athleteId!] });
      queryClient.invalidateQueries({ queryKey: ["athlete-report", athleteId!] });
      setProfileMessage(t.athleteAssessment.profileSaved);
    },
  });

  const errorMessage =
    mutation.isError && mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
      ? t.newAthlete.error
      : null;

  const handleProfileSubmit = async (payload: AthletePayload) => {
    setProfilePending(true);
    try {
      await mutation.mutateAsync(payload);
      if (photoFile) {
        const updated = await uploadAthletePhoto(athleteId!, photoFile);
        setCurrentPhotoUrl(updated.photo_url ?? null);
        queryClient.invalidateQueries({ queryKey: ["athlete", athleteId!] });
        queryClient.invalidateQueries({ queryKey: ["athletes"] });
        setPhotoFile(null);
      }
    } finally {
      setProfilePending(false);
    }
  };

  const sessionClientId = athlete?.client_id ?? theme.clientId;

  const handleSaveSession = async () => {
    if (!sessionClientId || !athleteId) {
      setSessionMessage({ type: "error", text: "Client or Athlete not found" });
      return;
    }
    const sessionPayload: CreateSessionPayload = {
      client_id: sessionClientId,
      athlete_id: athleteId,
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
    if (!sessionClientId || !athleteId) {
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
          athlete_id: athleteId,
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
      client_id: sessionClientId,
      athlete_id: athleteId,
      name: sessionForm.name.trim() || buildDefaultSessionName(),
      location: sessionForm.location.trim() || undefined,
      scheduled_at: sessionForm.scheduled_at || undefined,
      notes: sessionForm.notes.trim() || undefined,
    };

    try {
      setAssessmentPending(true);
      const createdSession = await createSession(sessionPayload);
      await addSessionResults(createdSession.id, results);

      queryClient.invalidateQueries({ queryKey: ["athlete-report", athleteId!] });
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

  if (athleteId == null) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{t.athletes.error}</p>
        <Link to="/athletes" className="text-sm font-semibold text-accent hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted">{t.common.loading}...</p>;
  }

  if (isError || !athlete) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{t.athletes.error}</p>
        <Link to="/athletes" className="text-sm font-semibold text-accent hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </div>
    );
  }

  const initialValues: Partial<AthletePayload> = {
    client_id: athlete.client_id ?? undefined,
    first_name: athlete.first_name,
    last_name: athlete.last_name,
    email: athlete.email,
    birth_date: athlete.birth_date,
    dominant_foot: athlete.dominant_foot ?? undefined,
    club_affiliation: athlete.club_affiliation ?? undefined,
    height_cm: athlete.height_cm ?? undefined,
    weight_kg: athlete.weight_kg ?? undefined,
    status: athlete.status,
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-sm text-muted">
          <Link to="/athletes" className="font-semibold text-accent hover:underline">
            {t.athleteDetail.backToList}
          </Link>
          <span>/</span>
          <span>{athlete.first_name} {athlete.last_name}</span>
        </div>
        <h1 className="text-3xl font-semibold text-container-foreground">
          {t.athleteAssessment.title}
        </h1>
      </header>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-container-foreground">
            {t.athleteAssessment.profileSectionTitle}
          </h2>
          <p className="text-sm text-muted">{t.athleteDetail.profileSubtitle}</p>
        </div>
        {profileMessage && (
          <div
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            {profileMessage}
          </div>
        )}
        <AthleteForm
          initialValues={initialValues}
          clientOptions={clientOptions}
          allowClientSelection={allowClientSelection}
          defaultClientId={String(athlete.client_id ?? theme.clientId ?? "")}
          submitLabel={t.common.save}
          onSubmit={handleProfileSubmit}
          isSubmitting={mutation.isPending || profilePending}
          errorMessage={errorMessage}
          onPhotoChange={setPhotoFile}
          initialPhotoUrl={currentPhotoUrl}
        />
      </section>

      <form onSubmit={handleAssessmentSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-black/5 bg-container-gradient p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-container-foreground">
              {t.athleteAssessment.sessionHeading}
            </h2>
            <p className="text-sm text-muted">{t.athleteAssessment.sessionDescription}</p>
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
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.forms.session.name}
              <input
                type="text"
                value={sessionForm.name}
                onChange={(e) => setSessionForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={buildDefaultSessionName()}
              />
            </label>
            <label className="text-sm font-medium text-muted">
              {t.forms.session.date}
              <input
                type="datetime-local"
                value={sessionForm.scheduled_at}
                onChange={(e) => setSessionForm((p) => ({ ...p, scheduled_at: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              {t.forms.session.location}
              <div className="mt-1">
                <MapInput
                  onChange={(_, address) =>
                    setSessionForm((prev) => ({ ...prev, location: address }))
                  }
                />
              </div>
            </label>
            <label className="text-sm font-medium text-muted">
              {t.forms.session.notes}
              <textarea
                rows={3}
                value={sessionForm.notes}
                onChange={(e) => setSessionForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveSession}
              className="rounded-md bg-action-primary/80 px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm hover:bg-action-primary disabled:opacity-60"
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
                {assessmentMessage.type === "success" && (
                  <Link
                    to={`/athletes/${athleteId}`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {t.athleteAssessment.viewReport}
                  </Link>
                )}
              </div>
            </div>
          )}

          {testsLoading ? (
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
                        <label key={test.id} htmlFor={inputId} className="flex flex-col gap-2 rounded-md border border-black/5 bg-white p-4 shadow-sm">
                          <div>
                            <p className="text-sm font-semibold text-container-foreground">
                              {test.name}
                            </p>
                            {test.description && (
                              <p className="text-xs text-muted whitespace-pre-line">{test.description}</p>
                            )}
                          </div>
                          <input
                            id={inputId}
                            type="number"
                            step="any"
                            value={testInputs[test.id] ?? ""}
                            onChange={(e) =>
                              setTestInputs((p) => ({ ...p, [test.id]: e.target.value }))
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
              disabled={assessmentPending}
            >
              {assessmentPending
                ? `${t.common.loading}...`
                : t.athleteAssessment.submit}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};

export default AthleteEdit;