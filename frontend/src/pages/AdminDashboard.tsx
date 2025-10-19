import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useClients } from "../hooks/useClients";
import { useSessions } from "../hooks/useSessions";
import { useTranslation } from "../i18n/useTranslation";
import type { SessionRecord } from "../hooks/useSessions";

const DAY_MS = 86_400_000;
const PERIOD_OPTIONS: Record<string, number> = {
  "7": 7,
  "30": 30,
  "90": 90,
};

const STATUS_FROM_SLUG = (slug: string): "active" | "inactive" =>
  slug.includes("urban") ? "inactive" : "active";

const AdminDashboard = () => {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: sessions, isLoading: loadingSessions } = useSessions();
  const t = useTranslation();

  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const now = useMemo(() => Date.now(), []);
  const currentRangeStart = useMemo(() => now - PERIOD_OPTIONS[period] * DAY_MS, [now, period]);
  const previousRangeStart = useMemo(
    () => currentRangeStart - PERIOD_OPTIONS[period] * DAY_MS,
    [currentRangeStart, period]
  );

  const filteredClients = useMemo(() => {
    if (!clients) {
      return [];
    }
    return clients.filter((client) => {
      const clientStatus = STATUS_FROM_SLUG(client.slug);
      if (status === "all") {
        return true;
      }
      return clientStatus === status;
    });
  }, [clients, status]);

  const metricsByClient = useMemo(() => {
    if (!filteredClients.length || !sessions) {
      return [];
    }
    return filteredClients.map((client) => {
      const clientSessions = sessions.filter((session) => session.client_id === client.id);
      const currentSessions = filterByRange(clientSessions, currentRangeStart, now);
      const previousSessions = filterByRange(
        clientSessions,
        previousRangeStart,
        currentRangeStart
      );
      const sessionCount = currentSessions.length;
      const previousCount = previousSessions.length;
      const adhesion = sessionCount === 0 ? 0 : Math.min(100, Math.round((sessionCount / 8) * 100));
      const delta = previousCount === 0
        ? sessionCount === 0
          ? 0
          : 100
        : Math.round(((sessionCount - previousCount) / Math.max(previousCount, 1)) * 100);
      return {
        id: client.id,
        name: client.name,
        status: STATUS_FROM_SLUG(client.slug),
        sessions: sessionCount,
        adhesion,
        delta,
      };
    });
  }, [filteredClients, sessions, currentRangeStart, previousRangeStart, now]);

  const kpis = useMemo(() => {
    if (!metricsByClient.length) {
      return {
        active: 0,
        sessions: 0,
        adhesion: 0,
        delta: 0,
      };
    }
    const active = metricsByClient.filter((metric) => metric.status === "active").length;
    const totalSessions = metricsByClient.reduce((acc, metric) => acc + metric.sessions, 0);
    const averageAdhesion = Math.round(
      metricsByClient.reduce((acc, metric) => acc + metric.adhesion, 0) / metricsByClient.length
    );
    const averageDelta = Math.round(
      metricsByClient.reduce((acc, metric) => acc + metric.delta, 0) / metricsByClient.length
    );
    return {
      active,
      sessions: totalSessions,
      adhesion: averageAdhesion,
      delta: averageDelta,
    };
  }, [metricsByClient]);

  const topClientsData = useMemo(() => {
    return [...metricsByClient]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5)
      .map((metric) => ({
        name: metric.name,
        sessions: metric.sessions,
      }));
  }, [metricsByClient]);

  const trendData = useMemo(() => {
    if (!sessions) {
      return [];
    }
    const grouped: Record<string, number> = {};
    sessions.forEach((session) => {
      const scheduled = session.scheduled_at ? new Date(session.scheduled_at).getTime() : null;
      if (!scheduled || scheduled < previousRangeStart || scheduled > now) {
        return;
      }
      const week = startOfWeek(scheduled);
      grouped[week] = (grouped[week] ?? 0) + 1;
    });
    return Object.entries(grouped)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([week, value], index, array) => {
        const windowValues = array
          .filter((entry, idx) => idx <= index && idx >= index - 2)
          .map((entry) => entry[1]);
        const movingAverage = windowValues.reduce((acc, item) => acc + item, 0) / windowValues.length;
        return {
          week: new Date(Number(week)).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          sessions: value,
          movingAverage: Number(movingAverage.toFixed(2)),
        };
      });
  }, [sessions, previousRangeStart, now]);

  const heatmapData = useMemo(() => {
    if (!sessions) {
      return [];
    }
    const startDate = new Date(now - PERIOD_OPTIONS[period] * DAY_MS);
    const days: Array<{ date: Date; value: number }> = [];
    for (let i = 0; i < PERIOD_OPTIONS[period]; i += 1) {
      days.push({ date: new Date(startDate.getTime() + i * DAY_MS), value: 0 });
    }
    sessions.forEach((session) => {
      const scheduled = session.scheduled_at ? new Date(session.scheduled_at) : null;
      if (!scheduled) {
        return;
      }
      if (scheduled < days[0].date || scheduled > new Date(now)) {
        return;
      }
      const index = Math.floor((scheduled.getTime() - days[0].date.getTime()) / DAY_MS);
      if (days[index]) {
        days[index].value += 1;
      }
    });
    return days;
  }, [sessions, now, period]);

  const isEmpty = !metricsByClient.length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-container-foreground">{t.admin.title}</h1>
        <p className="text-sm text-muted">{t.admin.subtitle}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t.admin.kpis.activeClients} value={loadingClients ? "--" : kpis.active} />
        <KpiCard label={t.admin.kpis.sessions} value={loadingSessions ? "--" : kpis.sessions} />
        <KpiCard label={t.admin.kpis.adhesion} value={`${kpis.adhesion}%`} />
        <KpiCard
          label={t.admin.kpis.performanceDelta}
          value={`${kpis.delta > 0 ? "+" : ""}${kpis.delta}%`}
          tone={kpis.delta >= 0 ? "positive" : "negative"}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-container-gradient p-4 shadow-sm md:flex-row md:items-end">
        <label className="text-xs font-medium text-muted">
          {t.admin.filters.periodLabel}
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as "7" | "30" | "90")}
            className="mt-1 rounded-md border border-black/10 bg-container px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          >
            {t.admin.filters.periods.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          {t.admin.filters.statusLabel}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | "active" | "inactive")}
            className="mt-1 rounded-md border border-black/10 bg-container px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          >
            {t.admin.filters.statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {isEmpty ? (
        <p className="text-sm text-muted">{t.admin.empty}</p>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl bg-container-gradient shadow-sm">
            <table className="min-w-full divide-y divide-black/5">
              <thead className="bg-container/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.admin.tables.headers.client}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.admin.tables.headers.sessions}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.admin.tables.headers.adhesion}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.admin.tables.headers.delta}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.admin.tables.headers.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {metricsByClient.map((metric) => (
                  <tr key={metric.id} className="hover:bg-container/60">
                    <td className="px-4 py-3 text-sm font-medium text-container-foreground">{metric.name}</td>
                    <td className="px-4 py-3 text-sm text-muted">{metric.sessions}</td>
                    <td className="px-4 py-3 text-sm text-muted">{metric.adhesion}%</td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold ${
                        metric.delta >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {metric.delta >= 0 ? "+" : ""}
                      {metric.delta}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 text-xs">
                        <ClientActionLink to={`/clients/${metric.id}`}>
                          {t.admin.tables.actions.view}
                        </ClientActionLink>
                        <ClientActionLink to={`/clients/${metric.id}/settings`}>
                          {t.admin.tables.actions.settings}
                        </ClientActionLink>
                        <ClientActionLink to={`/clients/${metric.id}/reports`}>
                          {t.admin.tables.actions.reports}
                        </ClientActionLink>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-container-gradient p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-container-foreground">{t.admin.charts.topClients}</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f172a20" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "0.75rem",
                        color: "#E2F2FF",
                      }}
                    />
                    <Bar dataKey="sessions" fill="#2563eb" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl bg-container-gradient p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-container-foreground">{t.admin.charts.sessionsTrend}</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f172a20" />
                    <XAxis dataKey="week" stroke="#64748b" />
                    <YAxis allowDecimals={false} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "0.75rem",
                        color: "#E2F2FF",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAverage"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-container-gradient p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-container-foreground">{t.admin.charts.calendar}</h2>
            <div className="mt-4 grid grid-cols-7 gap-2 text-xs">
              {heatmapData.map((day) => {
                const intensity = Math.min(day.value, 4);
                const background = HEATMAP_COLORS[intensity];
                return (
                  <div
                    key={day.date.toISOString()}
                    className="aspect-square rounded-md border border-black/10 text-center"
                    style={{ backgroundColor: background }}
                    title={`${day.date.toDateString()} • ${day.value} ${day.value === 1 ? "session" : "sessions"}`}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const HEATMAP_COLORS = [
  "#e2e8f0",
  "#bfdbfe",
  "#60a5fa",
  "#2563eb",
  "#1d4ed8",
];

const filterByRange = (sessions: SessionRecord[], start: number, end: number) =>
  sessions.filter((session) => {
    if (!session.scheduled_at) {
      return false;
    }
    const time = new Date(session.scheduled_at).getTime();
    return time >= start && time < end;
  });

const startOfWeek = (timestamp: number) => {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  date.setUTCDate(diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
};

const KpiCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "positive" | "negative";
}) => (
  <div className="rounded-xl border border-black/10 bg-container-gradient p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    <p
      className={`mt-3 text-3xl font-semibold ${
        tone === "positive" ? "text-emerald-500" : tone === "negative" ? "text-red-500" : "text-container-foreground"
      }`}
    >
      {value}
    </p>
  </div>
);

const ClientActionLink = ({ to, children }: { to: string; children: string }) => (
  <Link
    to={to}
    className="inline-flex items-center rounded-md border border-black/10 bg-container px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
  >
    {children}
  </Link>
);

export default AdminDashboard;
