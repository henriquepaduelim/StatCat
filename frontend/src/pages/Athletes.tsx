import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAthletes } from "../hooks/useAthletes";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { deleteAthlete } from "../api/athletes";
import type { Athlete } from "../types/athlete";

const Athletes = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data, isLoading, isError } = useAthletes(clientId);
  const t = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const deleteMutation = useMutation({
    mutationFn: deleteAthlete,
    onSuccess: (_, id) => {
      setAlert({ type: "success", message: t.athletes.deleteSuccess });
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["athletes", clientId ?? "all"] });
      queryClient.invalidateQueries({ queryKey: ["athletes", "all"] });
      queryClient.removeQueries({ queryKey: ["athlete", id], exact: true });
      queryClient.removeQueries({ queryKey: ["athlete-report", id], exact: true });
    },
    onError: () => {
      setAlert({ type: "error", message: t.athletes.deleteError });
    },
  });

  const tableRows = useMemo(() => data ?? [], [data]);

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

      {alert ? (
        <div
          role={alert.type === "error" ? "alert" : "status"}
          className={`rounded-md border px-3 py-2 text-sm ${
            alert.type === "error"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {alert.message}
        </div>
      ) : null}

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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                {t.athletes.table.status}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                {t.athletes.table.action}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.loading}
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-500">
                  {t.athletes.error}
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.empty}
                </td>
              </tr>
            )}
            {tableRows.map((athlete) => {
              const displayName = `${athlete.first_name} ${athlete.last_name}`;
              const isPending = deleteMutation.isPending && selected?.id === athlete.id;
              return (
                <tr key={athlete.id} className="hover:bg-background/60">
                  <td className="px-4 py-4 text-sm font-medium text-on-surface">{displayName}</td>
                  <td className="px-4 py-4 text-sm text-muted">
                    {athlete.club_affiliation ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted">{athlete.email ?? "-"}</td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        athlete.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-300 text-red-900"
                      }`}
                    >
                      {athlete.status === "active"
                        ? t.newAthlete.statusOptions.active
                        : t.newAthlete.statusOptions.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAlert(null);
                          setSelected(athlete);
                        }}
                        className="inline-flex items-center rounded-md border border-black/10 bg-background px-2 py-2 text-xs font-semibold text-muted transition hover:border-red-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={t.athletes.actions.deleteLabel(displayName)}
                        disabled={isPending}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 640"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d="M232.7 69.9C237.1 56.8 249.3 48 263.1 48L377 48C390.8 48 403 56.8 407.4 69.9L416 96L512 96C529.7 96 544 110.3 544 128C544 145.7 529.7 160 512 160L128 160C110.3 160 96 145.7 96 128C96 110.3 110.3 96 128 96L224 96L232.7 69.9zM128 208L512 208L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 208zM216 272C202.7 272 192 282.7 192 296L192 488C192 501.3 202.7 512 216 512C229.3 512 240 501.3 240 488L240 296C240 282.7 229.3 272 216 272zM320 272C306.7 272 296 282.7 296 296L296 488C296 501.3 306.7 512 320 512C333.3 512 344 501.3 344 488L344 296C344 282.7 333.3 272 320 272zM424 272C410.7 272 400 282.7 400 296L400 488C400 501.3 410.7 512 424 512C437.3 512 448 501.3 448 488L448 296C448 282.7 437.3 272 424 272z" />
                        </svg>
                      </button>
                      <Link
                        to={`/athletes/${athlete.id}/edit`}
                        className="inline-flex items-center rounded-md border border-black/10 bg-background px-2 py-2 text-xs font-semibold text-muted transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={t.athletes.actions.editLabel(displayName)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 640"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d="M535.6 85.7C513.7 63.8 478.3 63.8 456.4 85.7L432 110.1L529.9 208L554.3 183.6C576.2 161.7 576.2 126.3 554.3 104.4L535.6 85.7zM236.4 305.7C230.3 311.8 225.6 319.3 222.9 327.6L193.3 416.4C190.4 425 192.7 434.5 199.1 441C205.5 447.5 215 449.7 223.7 446.8L312.5 417.2C320.7 414.5 328.2 409.8 334.4 403.7L496 241.9L398.1 144L236.4 305.7zM160 128C107 128 64 171 64 224L64 480C64 533 107 576 160 576L416 576C469 576 512 533 512 480L512 384C512 366.3 497.7 352 480 352C462.3 352 448 366.3 448 384L448 480C448 497.7 433.7 512 416 512L160 512C142.3 512 128 497.7 128 480L128 224C128 206.3 142.3 192 160 192L256 192C273.7 192 288 177.7 288 160C288 142.3 273.7 128 256 128L160 128z"/>
                        </svg>
                      </Link>
                      <Link
                        to={`/athletes/${athlete.id}`}
                        className="inline-flex items-center rounded-md border border-black/10 bg-background px-2 py-2 text-xs font-semibold text-muted transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={t.athletes.actions.viewLabel(displayName)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 640"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d="M96 128C60.7 128 32 156.7 32 192L32 448C32 483.3 60.7 512 96 512L544 512C579.3 512 608 483.3 608 448L608 192C608 156.7 579.3 128 544 128L96 128zM112 192L144 192C152.8 192 160 199.2 160 208L160 240C160 248.8 152.8 256 144 256L112 256C103.2 256 96 248.8 96 240L96 208C96 199.2 103.2 192 112 192zM96 304C96 295.2 103.2 288 112 288L144 288C152.8 288 160 295.2 160 304L160 336C160 344.8 152.8 352 144 352L112 352C103.2 352 96 344.8 96 336L96 304zM208 192L240 192C248.8 192 256 199.2 256 208L256 240C256 248.8 248.8 256 240 256L208 256C199.2 256 192 248.8 192 240L192 208C192 199.2 199.2 192 208 192zM192 304C192 295.2 199.2 288 208 288L240 288C248.8 288 256 295.2 256 304L256 336C256 344.8 248.8 352 240 352L208 352C199.2 352 192 344.8 192 336L192 304zM208 384L432 384C440.8 384 448 391.2 448 400L448 432C448 440.8 440.8 448 432 448L208 448C199.2 448 192 440.8 192 432L192 400C192 391.2 199.2 384 208 384zM288 208C288 199.2 295.2 192 304 192L336 192C344.8 192 352 199.2 352 208L352 240C352 248.8 344.8 256 336 256L304 256C295.2 256 288 248.8 288 240L288 208zM304 288L336 288C344.8 288 352 295.2 352 304L352 336C352 344.8 344.8 352 336 352L304 352C295.2 352 288 344.8 288 336L288 304C288 295.2 295.2 288 304 288zM384 208C384 199.2 391.2 192 400 192L432 192C440.8 192 448 199.2 448 208L448 240C448 248.8 440.8 256 432 256L400 256C391.2 256 384 248.8 384 240L384 208zM400 288L432 288C440.8 288 448 295.2 448 304L448 336C448 344.8 440.8 352 432 352L400 352C391.2 352 384 344.8 384 336L384 304C384 295.2 391.2 288 400 288zM480 208C480 199.2 487.2 192 496 192L528 192C536.8 192 544 199.2 544 208L544 240C544 248.8 536.8 256 528 256L496 256C487.2 256 480 248.8 480 240L480 208zM496 288L528 288C536.8 288 544 295.2 544 304L544 336C544 344.8 536.8 352 528 352L496 352C487.2 352 480 344.8 480 336L480 304C480 295.2 487.2 288 496 288z" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <ConfirmDeleteModal
        isOpen={Boolean(selected)}
        title={selected ? t.athletes.deleteConfirmTitle(selected.first_name, selected.last_name) : ""}
        description={selected ? t.athletes.deleteConfirmDescription : ""}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        confirmAriaLabel={selected ? t.athletes.actions.deleteLabel(`${selected.first_name} ${selected.last_name}`) : undefined}
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          setSelected(null);
          deleteMutation.reset();
        }}
        onConfirm={() => {
          if (selected) {
            deleteMutation.mutate(selected.id);
          }
        }}
      />
    </div>
  );
};

export default Athletes;
