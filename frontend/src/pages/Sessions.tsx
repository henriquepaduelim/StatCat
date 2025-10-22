import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSessions } from "../hooks/useSessions";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";
import { createSession } from "../api/sessions";
import { createTest } from "../api/tests";
import type { CreateSessionPayload } from "../api/sessions";
import type { CreateTestPayload } from "../api/tests";

const Sessions = () => {
  const { theme, themes } = useThemeStore((state) => ({
    theme: state.theme,
    themes: state.themes,
  }));
  const clientId = theme.clientId ?? null;
  const { data: sessions, isLoading } = useSessions(clientId ? { clientId } : undefined);
  const queryClient = useQueryClient();
  const t = useTranslation();
  const clientOptions = useMemo(
    () => themes.filter((item) => item.clientId),
    [themes]
  );
  const hasMultipleClients = clientOptions.length > 1;

  const [sessionForm, setSessionForm] = useState<CreateSessionPayload>({
    client_id: clientId ?? undefined,
    name: "",
    location: "",
    scheduled_at: "",
    notes: "",
  });

  const [testForm, setTestForm] = useState<CreateTestPayload>({
    client_id: clientId ?? undefined,
    name: "",
    category: "",
    unit: "",
    description: "",
    target_direction: "higher",
  });

  useEffect(() => {
    setSessionForm((prev) => ({ ...prev, client_id: clientId ?? undefined }));
    setTestForm((prev) => ({ ...prev, client_id: clientId ?? undefined }));
  }, [clientId]);

  const sessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setSessionForm((prev) => ({
        client_id: prev.client_id ?? clientId ?? undefined,
        name: "",
        location: "",
        scheduled_at: "",
        notes: "",
      }));
      alert(t.forms.session.success);
    },
    onError: () => {
      alert(t.forms.session.error);
    },
  });

  const testMutation = useMutation({
    mutationFn: createTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      setTestForm((prev) => ({
        client_id: prev.client_id ?? clientId ?? undefined,
        name: "",
        category: "",
        unit: "",
        description: "",
        target_direction: "higher",
      }));
      alert(t.forms.test.success);
    },
    onError: () => {
      alert(t.forms.test.error);
    },
  });

  const handleSessionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sessionMutation.mutate({
      ...sessionForm,
      client_id: sessionForm.client_id ?? clientId ?? undefined,
      scheduled_at: sessionForm.scheduled_at || undefined,
      notes: sessionForm.notes || undefined,
      location: sessionForm.location || undefined,
    });
  };

  const handleTestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    testMutation.mutate({
      ...testForm,
      client_id: testForm.client_id ?? clientId ?? undefined,
      category: testForm.category || undefined,
      unit: testForm.unit || undefined,
      description: testForm.description || undefined,
    });
  };

  const sessionsList = useMemo(() => sessions ?? [], [sessions]);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-container-foreground">{t.sessions.title}</h1>
        <p className="text-sm text-muted">{t.sessions.description}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 print-hidden">
        <form
          onSubmit={handleSessionSubmit}
          className="space-y-4 rounded-xl bg-container p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-container-foreground">{t.forms.session.title}</h2>
          <p className="text-xs text-muted">{t.forms.session.subtitle}</p>
          {hasMultipleClients ? (
            <label className="text-sm font-medium text-muted">
              {t.forms.session.client}
              <select
                value={sessionForm.client_id ?? ""}
                onChange={(event) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    client_id: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                required
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="">{t.common.select}</option>
                {clientOptions.map((item) => (
                  <option key={item.id} value={item.clientId ?? ""}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm font-medium text-muted">
            {t.forms.session.name}
            <input
              required
              type="text"
              value={sessionForm.name}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.forms.session.location}
            <input
              type="text"
              value={sessionForm.location ?? ""}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, location: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
          {sessionForm.location?.trim() && (
            <div className="overflow-hidden rounded-lg border border-black/10">
              <iframe
                title="Session location map"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(sessionForm.location)}&output=embed`}
                className="h-48 w-full"
                loading="lazy"
                allowFullScreen
              />
            </div>
          )}
          <label className="text-sm font-medium text-muted">
            {t.forms.session.date}
            <input
              type="datetime-local"
              value={sessionForm.scheduled_at ?? ""}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, scheduled_at: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.forms.session.notes}
            <textarea
              value={sessionForm.notes ?? ""}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              rows={3}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm disabled:opacity-60"
            disabled={sessionMutation.isPending}
          >
            {sessionMutation.isPending ? `${t.common.loading}...` : t.forms.session.submit}
          </button>
        </form>

        <form
          onSubmit={handleTestSubmit}
          className="space-y-4 rounded-xl bg-container p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-container-foreground">{t.forms.test.title}</h2>
          <p className="text-xs text-muted">{t.forms.test.subtitle}</p>
          {hasMultipleClients ? (
            <label className="text-sm font-medium text-muted">
              {t.forms.test.client}
              <select
                value={testForm.client_id ?? ""}
                onChange={(event) =>
                  setTestForm((prev) => ({
                    ...prev,
                    client_id: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                required
                className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="">{t.common.select}</option>
                {clientOptions.map((item) => (
                  <option key={item.id} value={item.clientId ?? ""}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm font-medium text-muted">
            {t.forms.test.name}
            <input
              required
              type="text"
              value={testForm.name}
              onChange={(event) => setTestForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.forms.test.category}
            <input
              type="text"
              value={testForm.category ?? ""}
              onChange={(event) => setTestForm((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.forms.test.unit}
            <input
              type="text"
              value={testForm.unit ?? ""}
              onChange={(event) => setTestForm((prev) => ({ ...prev, unit: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.forms.test.description}
            <textarea
              value={testForm.description ?? ""}
              onChange={(event) => setTestForm((prev) => ({ ...prev, description: event.target.value }))}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              rows={3}
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.forms.test.targetDirection}
            <select
              value={testForm.target_direction}
              onChange={(event) =>
                setTestForm((prev) => ({
                  ...prev,
                  target_direction: event.target.value as "higher" | "lower",
                }))
              }
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            >
              <option value="higher">{t.forms.test.targetOptions.higher}</option>
              <option value="lower">{t.forms.test.targetOptions.lower}</option>
            </select>
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm disabled:opacity-60"
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? `${t.common.loading}...` : t.forms.test.submit}
          </button>
        </form>
      </section>

      <section className="bg-container-gradient">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-container-foreground">{t.sessions.nextSessions}</h2>
            <p className="text-xs text-muted">{t.reports.summary}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted">{t.sessions.loading}</p>}
          {!isLoading && sessionsList.length === 0 && (
            <p className="text-sm text-muted">{t.sessions.empty}</p>
          )}
          {sessionsList.map((session) => (
            <div key={session.id} className="rounded-lg border border-black/10 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-container-foreground">{session.name}</h3>
                  <p className="text-xs text-muted">
                    {session.scheduled_at ? t.reports.sessionDate(session.scheduled_at) : t.forms.session.date}
                    {session.location ? ` • ${session.location}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted">{session.notes ?? t.sessions.notesEmpty}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Sessions;
