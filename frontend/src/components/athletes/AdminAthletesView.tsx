import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAthletes } from "../../hooks/useAthletes";
import { useTeams } from "../../hooks/useTeams";
import { usePermissions } from "../../hooks/usePermissions";
import { useTranslation } from "../../i18n/useTranslation";
import ConfirmDeleteModal from "../ConfirmDeleteModal";
import { deleteAthlete } from "../../api/athletes";
import type { Athlete } from "../../types/athlete";
import AthleteModals from "./AthleteModals";
import AthletesHeader from "./AthletesHeader";
import Spinner from "../Spinner";

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const calculateAge = (birthDate?: string | null): number | null => {
  if (!birthDate) {
    return null;
  }
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
};

const DEFAULT_ROW_HEIGHT = 56;

const AdminAthletesView = () => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAthletes();
  const teamsQuery = useTeams();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [isNewAthleteOpen, setIsNewAthleteOpen] = useState(false);
  const [isAthleteDetailsOpen, setIsAthleteDetailsOpen] = useState(false);
  const [registeredAthlete, setRegisteredAthlete] = useState<Athlete | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter] = useState<"all" | "active" | "inactive">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [ageFilter, setAgeFilter] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [sortConfig, setSortConfig] = useState<{
    column: "name" | "age" | "category" | "email" | "team" | "coach";
    direction: "asc" | "desc";
  }>({ column: "name", direction: "asc" });
  const [activePopover, setActivePopover] = useState<
    null | "name" | "age" | "category" | "email" | "team" | "coach"
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const tableContainerRef = useRef<HTMLElement | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const tableHeadRef = useRef<HTMLTableSectionElement | null>(null);
  const firstDataRowRef = useRef<HTMLTableRowElement | null>(null);
  const [fillerRowCount, setFillerRowCount] = useState(0);

  const handleRegistrationSuccess = (athlete: Athlete) => {
    setIsNewAthleteOpen(false);
    setRegisteredAthlete(athlete);
    setIsAthleteDetailsOpen(true);
    queryClient.invalidateQueries({ queryKey: ["athletes"] });
    queryClient.invalidateQueries({ queryKey: ["athlete", athlete.id] });
  };

  useEffect(() => {
    if (!activePopover) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (
        tableContainerRef.current &&
        !tableContainerRef.current.contains(event.target as Node)
      ) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [activePopover]);

  const togglePopover = (
    column: "name" | "age" | "category" | "email" | "team" | "coach"
  ) => {
    setActivePopover((current) => (current === column ? null : column));
  };

  const applySort = (
    column: "name" | "age" | "category" | "email" | "team" | "coach",
    direction: "asc" | "desc"
  ) => {
    setSortConfig({ column, direction });
    setActivePopover(null);
  };

  const clearFilter = (
    column: "name" | "age" | "category" | "email" | "team" | "coach"
  ) => {
    switch (column) {
      case "name":
        setNameFilter("");
        break;
      case "age":
        setAgeFilter({ min: "", max: "" });
        break;
      case "category":
        setGenderFilter("all");
        break;
      case "email":
        setEmailFilter("");
        break;
      case "team":
        // No filter for team yet
        break;
      case "coach":
        // No filter for coach yet
        break;
    }
  };

  const isSortActive = (
    column: "name" | "age" | "category" | "email" | "team" | "coach",
    direction: "asc" | "desc"
  ) => sortConfig.column === column && sortConfig.direction === direction;

  const deleteMutation = useMutation({
    mutationFn: deleteAthlete,
    onSuccess: (_, id) => {
      setAlert({ type: "success", message: t.athletes.deleteSuccess });
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.removeQueries({ queryKey: ["athlete", id], exact: true });
      queryClient.removeQueries({ queryKey: ["athlete-report", id], exact: true });
    },
    onError: () => {
      setAlert({ type: "error", message: t.athletes.deleteError });
    },
  });

  const teamsById = useMemo(() => {
    const map = new Map<number, { name: string; coach: string | null }>();
    (teamsQuery.data ?? []).forEach((team) => {
      map.set(team.id, { name: team.name, coach: team.coach_name ?? null });
    });
    return map;
  }, [teamsQuery.data]);

  const allFetchedAthletes = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);

  const tableRows = useMemo(() => {
    if (!allFetchedAthletes.length) {
      return [];
    }

    const normalizedName = nameFilter ? normalizeText(nameFilter.trim()) : "";
    const normalizedEmail = emailFilter ? normalizeText(emailFilter.trim()) : "";
    const normalizedSearch = searchQuery ? normalizeText(searchQuery.trim()) : "";
    const rawMinAge = ageFilter.min.trim();
    const rawMaxAge = ageFilter.max.trim();
    const parsedMinAge = rawMinAge !== "" ? Number.parseInt(rawMinAge, 10) : null;
    const parsedMaxAge = rawMaxAge !== "" ? Number.parseInt(rawMaxAge, 10) : null;
    const minAge = parsedMinAge !== null && !Number.isNaN(parsedMinAge) ? parsedMinAge : null;
    const maxAge = parsedMaxAge !== null && !Number.isNaN(parsedMaxAge) ? parsedMaxAge : null;

    const ageCache = new Map<number, number | null>();
    const getAge = (athlete: Athlete) => {
      if (ageCache.has(athlete.id)) {
        return ageCache.get(athlete.id) ?? null;
      }
      const computed = calculateAge(athlete.birth_date ?? null);
      ageCache.set(athlete.id, computed);
      return computed;
    };

    const filtered = allFetchedAthletes.filter((athlete) => {
      if (athlete.user_athlete_status) {
        const status = athlete.user_athlete_status.toUpperCase();
        if (status === "PENDING" || status === "REJECTED" || status === "INCOMPLETE") {
          return false;
        }
      }
      
      const teamInfo = athlete.team_id ? teamsById.get(athlete.team_id) : undefined;
      if (normalizedName) {
        const haystack = normalizeText(`${athlete.first_name} ${athlete.last_name}`);
        if (!haystack.includes(normalizedName)) {
          return false;
        }
      }
      if (normalizedEmail) {
        const haystack = normalizeText(athlete.email ?? "");
        if (!haystack.includes(normalizedEmail)) {
          return false;
        }
      }
      if (normalizedSearch) {
        const ageValue = getAge(athlete);
        const ageLabel =
          ageValue != null ? `u${Math.max(ageValue + 1, 0)}` : "";
        const genderValue =
          athlete.gender?.toLowerCase() === "female"
            ? t.athletes.filters.genderFemale
            : t.athletes.filters.genderMale;
        const searchableFields = [
          normalizeText(`${athlete.first_name} ${athlete.last_name}`),
          ageValue != null ? `${ageValue}` : "",
          normalizeText(ageLabel),
          normalizeText(athlete.gender ?? ""),
          normalizeText(genderValue ?? ""),
          normalizeText(athlete.email ?? ""),
          normalizeText(teamInfo?.name ?? ""),
          normalizeText(teamInfo?.coach ?? ""),
        ];
        const matchesSearch = searchableFields.some(
          (field) => field && field.includes(normalizedSearch),
        );
        if (!matchesSearch) {
          return false;
        }
      }
      if (statusFilter !== "all" && athlete.status !== statusFilter) {
        return false;
      }
      if (genderFilter !== "all") {
        const normalizedGender = (athlete.gender ?? "male").toLowerCase();
        if (normalizedGender !== genderFilter) {
          return false;
        }
      }
      const age = getAge(athlete);
      if (minAge !== null && (age == null || age < minAge)) {
        return false;
      }
      if (maxAge !== null && (age == null || age > maxAge)) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.column) {
        case "name": {
          const leftName = `${left.first_name} ${left.last_name}`.toLowerCase();
          const rightName = `${right.first_name} ${right.last_name}`.toLowerCase();
          return leftName.localeCompare(rightName) * directionFactor;
        }
        case "email": {
          const leftEmail = (left.email ?? "").toLowerCase();
          const rightEmail = (right.email ?? "").toLowerCase();
          return leftEmail.localeCompare(rightEmail) * directionFactor;
        }
        case "age": {
          const leftAge = getAge(left);
          const rightAge = getAge(right);
          if (leftAge == null && rightAge == null) {
            return 0;
          }
          if (leftAge == null) {
            return directionFactor === 1 ? 1 : -1;
          }
          if (rightAge == null) {
            return directionFactor === 1 ? -1 : 1;
          }
          if (leftAge === rightAge) {
            return 0;
          }
          return leftAge < rightAge ? -1 * directionFactor : 1 * directionFactor;
        }
        case "category": {
          const weight = (value: string | null | undefined) =>
            value?.toLowerCase() === "female" ? 1 : 0;
          const leftWeight = weight(left.gender ?? null);
          const rightWeight = weight(right.gender ?? null);
          if (leftWeight !== rightWeight) {
            return (leftWeight - rightWeight) * directionFactor;
          }
          const leftName = `${left.first_name} ${left.last_name}`.toLowerCase();
          const rightName = `${right.first_name} ${right.last_name}`.toLowerCase();
          return leftName.localeCompare(rightName) * directionFactor;
        }
        case "team": {
          const leftTeam = left.team_id ? (teamsById.get(left.team_id)?.name ?? "") : "";
          const rightTeam = right.team_id ? (teamsById.get(right.team_id)?.name ?? "") : "";
          const comparison = leftTeam.localeCompare(rightTeam);
          if (comparison !== 0) {
            return comparison * directionFactor;
          }
          const leftName = `${left.first_name} ${left.last_name}`.toLowerCase();
          const rightName = `${right.first_name} ${right.last_name}`.toLowerCase();
          return leftName.localeCompare(rightName) * directionFactor;
        }
        case "coach": {
          const leftCoach = left.team_id ? (teamsById.get(left.team_id)?.coach ?? "") : "";
          const rightCoach = right.team_id ? (teamsById.get(right.team_id)?.coach ?? "") : "";
          const comparison = leftCoach.localeCompare(rightCoach);
          if (comparison !== 0) {
            return comparison * directionFactor;
          }
          const leftName = `${left.first_name} ${left.last_name}`.toLowerCase();
          const rightName = `${right.first_name} ${right.last_name}`.toLowerCase();
          return leftName.localeCompare(rightName) * directionFactor;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    allFetchedAthletes,
    teamsById,
    nameFilter,
    emailFilter,
    statusFilter,
    genderFilter,
    ageFilter.min,
    ageFilter.max,
    sortConfig.column,
    sortConfig.direction,
    searchQuery,
    t.athletes.filters.genderFemale,
    t.athletes.filters.genderMale,
  ]);

  const hasNameFilter = nameFilter.trim().length > 0;
  const hasEmailFilter = emailFilter.trim().length > 0;
  const hasAgeFilter =
    ageFilter.min.trim().length > 0 || ageFilter.max.trim().length > 0;
  const hasGenderFilter = genderFilter !== "all";

  const updateFillerRows = useCallback(() => {
    if (isLoading || isError) {
      setFillerRowCount(0);
      return;
    }

    const wrapper = tableWrapperRef.current;
    if (!wrapper) {
      setFillerRowCount(0);
      return;
    }

    const headHeight = tableHeadRef.current?.offsetHeight ?? 0;
    const availableHeight = wrapper.clientHeight - headHeight;
    if (availableHeight <= 0) {
      setFillerRowCount(0);
      return;
    }

    const measuredRowHeight = firstDataRowRef.current?.offsetHeight ?? DEFAULT_ROW_HEIGHT;
    const rowHeight = measuredRowHeight > 0 ? measuredRowHeight : DEFAULT_ROW_HEIGHT;
    const visibleRows = Math.floor(availableHeight / rowHeight);
    const missingRows = visibleRows - tableRows.length;

    setFillerRowCount(missingRows > 0 ? missingRows : 0);
  }, [isError, isLoading, tableRows.length]);

  useEffect(() => {
    updateFillerRows();
  }, [tableRows.length, isError, isLoading, updateFillerRows]);

  useEffect(() => {
    const handleResize = () => {
      updateFillerRows();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateFillerRows]);

  return (
    <>
      <AthleteModals
        isNewAthleteOpen={isNewAthleteOpen}
        setIsNewAthleteOpen={setIsNewAthleteOpen}
        isAthleteDetailsOpen={isAthleteDetailsOpen}
        setIsAthleteDetailsOpen={setIsAthleteDetailsOpen}
        registeredAthlete={registeredAthlete}
        setRegisteredAthlete={setRegisteredAthlete}
        onRegistrationSuccess={handleRegistrationSuccess}
      />

      <div className="flex flex-1 min-h-0 w-full flex-col gap-6">
        <AthletesHeader
          canCreateAthletes={permissions.canCreateAthletes}
          onAddAthlete={() => setIsNewAthleteOpen(true)}
        />
        <div className="md:mx-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t.athletes.filters.search}
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t.athletes.filters.searchPlaceholder}
                    className="w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted transition hover:bg-black/10"
                    >
                      {t.athletes.filters.clear}
                    </button>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

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

      <section
        ref={tableContainerRef}
        className="flex min-h-0 flex-1 w-full flex-col rounded-xl bg-container-gradient shadow-sm md:ml-2 md:mr-2"
      >
        <div ref={tableWrapperRef} className="flex min-h-0 flex-1 flex-col p-4">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-visible">
          <table className="athlete-table min-w-full border-y border-[rgb(var(--color-border))] divide-y divide-[rgb(var(--color-border))] dark:border-[var(--border-table-dark)] dark:divide-[var(--border-table-dark)]">
              <thead ref={tableHeadRef} className="bg-container/80">
                <tr>
                  <th className="relative px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>{t.athletes.table.name}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("name");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "name"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "name" || hasNameFilter
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "name" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 1.5 5 5.5 9 1.5" />
                        </svg>
                        <span className="sr-only">{t.athletes.filters.openMenu}</span>
                      </button>
                    </div>
                    {activePopover === "name" ? (
                      <div
                        className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-black/10 bg-white p-4 text-left shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.nameContains}
                            </p>
                            <input
                              type="search"
                              value={nameFilter}
                              onChange={(event) => setNameFilter(event.target.value)}
                              placeholder={t.athletes.filters.searchPlaceholder}
                              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.sortLabel}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => applySort("name", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("name", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("name", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("name", "desc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaDesc}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => clearFilter("name")}
                              className="rounded-md border border-black/10 px-3 py-1 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent"
                            >
                              {t.athletes.filters.clear}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="rounded-md bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm"
                            >
                              {t.athletes.filters.close}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </th>
                  <th className="relative px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>{t.athletes.table.age}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("age");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "age"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "age" || hasAgeFilter
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "age" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 1.5 5 5.5 9 1.5" />
                        </svg>
                        <span className="sr-only">{t.athletes.filters.openMenu}</span>
                      </button>
                    </div>
                    {activePopover === "age" ? (
                      <div
                        className="absolute left-0 z-20 mt-2 w-72 rounded-lg border border-black/10 bg-white p-4 text-left shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.ageRange}
                            </p>
                            <p className="text-[10px] text-muted">
                              {t.athletes.filters.ageHint}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <label className="text-xs text-muted">
                                {t.athletes.filters.ageMin}
                                <input
                                  type="number"
                                  min={0}
                                  value={ageFilter.min}
                                  onChange={(event) =>
                                    setAgeFilter((prev) => ({
                                      ...prev,
                                      min: event.target.value,
                                    }))
                                  }
                                  placeholder="13"
                                  className="mt-1 w-full rounded-md border border-black/10 px-2 py-1 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                                />
                              </label>
                              <label className="text-xs text-muted">
                                {t.athletes.filters.ageMax}
                                <input
                                  type="number"
                                  min={0}
                                  value={ageFilter.max}
                                  onChange={(event) =>
                                    setAgeFilter((prev) => ({
                                      ...prev,
                                      max: event.target.value,
                                    }))
                                  }
                                  placeholder="17"
                                  className="mt-1 w-full rounded-md border border-black/10 px-2 py-1 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                                />
                              </label>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.sortLabel}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => applySort("age", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("age", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAgeAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("age", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("age", "desc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAgeDesc}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => clearFilter("age")}
                              className="rounded-md border border-black/10 px-3 py-1 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent"
                            >
                              {t.athletes.filters.clear}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="rounded-md bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm"
                            >
                              {t.athletes.filters.close}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </th>
                  <th className="relative px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>Category</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("category");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "category"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "category" || hasGenderFilter
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "category" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 1.5 5 5.5 9 1.5" />
                        </svg>
                        <span className="sr-only">{t.athletes.filters.openMenu}</span>
                      </button>
                    </div>
                    {activePopover === "category" ? (
                      <div
                        className="absolute left-0 z-20 mt-2 w-60 rounded-lg border border-black/10 bg-white p-4 text-left shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.gender}
                            </p>
                            <div className="space-y-1">
                              <label className="flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name="gender-filter"
                                  value="all"
                                  checked={genderFilter === "all"}
                                  onChange={() => setGenderFilter("all")}
                                  className="h-3 w-3 text-accent focus:ring-action-primary"
                                />
                                <span>{t.athletes.filters.genderAll}</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name="gender-filter"
                                  value="male"
                                  checked={genderFilter === "male"}
                                  onChange={() => setGenderFilter("male")}
                                  className="h-3 w-3 text-accent focus:ring-action-primary"
                                />
                                <span>{t.athletes.filters.genderMale}</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name="gender-filter"
                                  value="female"
                                  checked={genderFilter === "female"}
                                  onChange={() => setGenderFilter("female")}
                                  className="h-3 w-3 text-accent focus:ring-action-primary"
                                />
                                <span>{t.athletes.filters.genderFemale}</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.sortLabel}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => applySort("category", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("category", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortGenderAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("category", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("category", "desc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortGenderDesc}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => clearFilter("category")}
                              className="rounded-md border border-black/10 px-3 py-1 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent"
                            >
                              {t.athletes.filters.clear}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="rounded-md bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm"
                            >
                              {t.athletes.filters.close}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </th>
                  <th className="relative px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>{t.athletes.table.email}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("email");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "email"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "email" || hasEmailFilter
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "email" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 1.5 5 5.5 9 1.5" />
                        </svg>
                        <span className="sr-only">{t.athletes.filters.openMenu}</span>
                      </button>
                    </div>
                    {activePopover === "email" ? (
                      <div
                        className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-black/10 bg-white p-4 text-left shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.emailContains}
                            </p>
                            <input
                              type="search"
                              value={emailFilter}
                              onChange={(event) => setEmailFilter(event.target.value)}
                              placeholder="athlete@example.com"
                              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.sortLabel}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => applySort("email", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("email", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("email", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("email", "desc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaDesc}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => clearFilter("email")}
                              className="rounded-md border border-black/10 px-3 py-1 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent"
                            >
                              {t.athletes.filters.clear}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="rounded-md bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm"
                            >
                              {t.athletes.filters.close}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </th>
                  <th className="relative px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>Team</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("team");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "team"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "team"
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "team" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 1.5 5 5.5 9 1.5" />
                        </svg>
                        <span className="sr-only">{t.athletes.filters.openMenu}</span>
                      </button>
                    </div>
                    {activePopover === "team" ? (
                      <div
                        className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-black/10 bg-white p-4 text-left shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.sortLabel}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => applySort("team", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("team", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("team", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("team", "desc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaDesc}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="rounded-md bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm"
                            >
                              {t.athletes.filters.close}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </th>
                  <th className="relative px-4 py-1 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>Coach</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("coach");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "coach"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "coach"
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "coach" ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 1.5 5 5.5 9 1.5" />
                        </svg>
                        <span className="sr-only">{t.athletes.filters.openMenu}</span>
                      </button>
                    </div>
                    {activePopover === "coach" ? (
                      <div
                        className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-black/10 bg-white p-4 text-left shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.sortLabel}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => applySort("coach", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("coach", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("coach", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("coach", "desc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortAlphaDesc}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="rounded-md bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm"
                            >
                              {t.athletes.filters.close}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </th>
                  <th className="px-4 py-1 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--color-border))] dark:divide-[var(--border-table-dark)]">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center">
                  <Spinner />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <div className="mx-auto max-w-xl rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {t.athletes.error}
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAlert(null);
                          queryClient.invalidateQueries({ queryKey: ["athletes"] });
                        }}
                        className="rounded-md border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && !isError && allFetchedAthletes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.empty}
                </td>
              </tr>
            )}
            {!isLoading && !isError && allFetchedAthletes.length > 0 && tableRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.filters.noResults}
                </td>
              </tr>
            )}
            {tableRows.map((athlete, index) => {
              const displayName = `${athlete.first_name} ${athlete.last_name}`;
              const isPending = deleteMutation.isPending && selected?.id === athlete.id;
              const age = calculateAge(athlete.birth_date ?? null);
              const ageLabel = age != null ? `U${Math.max(age + 1, 0)}` : "-";
              const genderValue = (athlete.gender ?? "male").toLowerCase();
              const genderLabel =
                genderValue === "female"
                  ? t.athletes.filters.genderFemale
                  : t.athletes.filters.genderMale;
              const teamInfo = athlete.team_id ? teamsById.get(athlete.team_id) : undefined;
              const teamDisplay = teamInfo?.name ?? "-";
              const coachDisplay = (() => {
                const coachName = teamInfo?.coach;
                if (!coachName) return "-";
                const parts = coachName.trim().split(/\s+/);
                if (parts.length === 1) {
                  return parts[0];
                }
                const [first, ...rest] = parts;
                return `${first[0]?.toUpperCase() ?? ""}. ${rest.join(" ")}`;
              })();
              return (
                <tr
                  key={athlete.id}
                  ref={index === 0 ? firstDataRowRef : undefined}
                  className="hover:bg-container/60"
                >
                  <td className="px-4 py-1 text-sm">
                    <span className="font-medium text-container-foreground">{displayName}</span>
                  </td>
                  <td className="px-4 py-1 text-sm text-muted">{ageLabel}</td>
                  <td className="px-4 py-1 text-sm text-muted">{genderLabel}</td>
                  <td className="px-4 py-1 text-sm text-muted">{athlete.email ?? "-"}</td>
                  <td className="px-4 py-1 text-sm text-muted">{teamDisplay}</td>
                  <td className="px-4 py-1 text-sm text-muted whitespace-nowrap">{coachDisplay}</td>
                  <td className="px-4 py-1">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAlert(null);
                          setSelected(athlete);
                        }}
                        className="inline-flex items-center rounded-md border border-black/10 bg-container px-2 py-2 text-xs font-semibold text-muted transition hover:border-red-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="inline-flex items-center rounded-md border border-black/10 bg-container px-2 py-2 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
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
                        className="inline-flex items-center rounded-md border border-black/10 bg-container px-2 py-2 text-xs font-semibold text-muted transition hover:border-action-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
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
                          <path d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.7 272 559.4 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: fillerRowCount }).map((_, index) => (
              <tr key={`filler-${index}`} aria-hidden="true" className="bg-container/20">
                <td colSpan={7} className="h-14 px-4 text-transparent">
                  .
                </td>
              </tr>
            ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7}>
                    <div className="p-4 text-center">
                      <button
                        onClick={() => fetchNextPage()}
                        disabled={!hasNextPage || isFetchingNextPage}
                        className="w-full max-w-xs rounded-md bg-action-primary/10 px-3 py-2 text-sm font-semibold text-action-primary transition hover:bg-action-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isFetchingNextPage
                          ? 'Loading more...'
                          : hasNextPage
                          ? 'Load More Athletes'
                          : 'Nothing more to load'}
                      </button>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
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

      {/* Modal para segunda etapa do cadastro de atleta */}

    </div>
    </>
  );
};

export default AdminAthletesView;
