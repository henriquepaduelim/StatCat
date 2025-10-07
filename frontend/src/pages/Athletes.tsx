import { Link } from "react-router-dom";

import { useAthletes } from "../hooks/useAthletes";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";

const Athletes = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data, isLoading, isError } = useAthletes(clientId);
  const t = useTranslation();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">{t.athletes.title}</h1>
          <p className="text-sm text-muted">{t.athletes.description}</p>
        </div>
        <Link
          to="/athletes/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm"
        >
          {t.athletes.add}
        </Link>
      </header>

      <section className="overflow-hidden rounded-xl bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-black/5">
          <thead className="bg-background/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                {t.athletes.table.name}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                {t.athletes.table.club}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                {t.athletes.table.email}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                {t.athletes.table.action}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.loading}
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-red-500">
                  {t.athletes.error}
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.empty}
                </td>
              </tr>
            )}
            {data?.map((athlete) => (
              <tr key={athlete.id} className="hover:bg-background/60">
                <td className="px-4 py-4 text-sm font-medium text-on-surface">
                  {athlete.first_name} {athlete.last_name}
                </td>
                <td className="px-4 py-4 text-sm text-muted">
                  {athlete.club_affiliation ?? "-"}
                </td>
                <td className="px-4 py-4 text-sm text-muted">{athlete.email ?? "-"}</td>
                <td className="px-4 py-4 text-right text-sm">
                  <Link
                    to={`/athletes/${athlete.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t.athletes.table.viewDetails}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Athletes;
