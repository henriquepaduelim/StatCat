import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, Transition } from "@headlessui/react";

import { useAthletes } from "../hooks/useAthletes";
import { useTeams } from "../hooks/useTeams";
import { usePendingAthletesCount } from "../hooks/usePendingAthletesCount";
import { usePermissions } from "../hooks/usePermissions";
import { useTranslation } from "../i18n/useTranslation";
import NotificationBadge from "../components/NotificationBadge";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { deleteAthlete, getPendingAthletes, approveAthlete, rejectAthlete } from "../api/athletes";
import type { Athlete } from "../types/athlete";
import NewAthleteStepOneForm from "../components/NewAthleteStepOneForm";
import NewAthleteStepTwoForm from "../components/NewAthleteStepTwoForm";

// Inline AthleteApprovalList component to avoid module loading issues
interface PendingAthlete {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
}

function AthleteApprovalList() {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});

  const { data: pendingAthletes, isLoading } = useQuery({
    queryKey: ["pending-athletes"],
    queryFn: getPendingAthletes,
  });

  const approveMutation = useMutation({
    mutationFn: approveAthlete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-athletes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-athletes-count"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ athleteId, reason }: { athleteId: number; reason: string }) =>
      rejectAthlete(athleteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-athletes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-athletes-count"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      setRejectionReason({});
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!pendingAthletes || pendingAthletes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">No pending athletes for approval</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-primary">
        Pending Athletes ({pendingAthletes.length})
      </h2>
      
      <div className="space-y-4">
        {pendingAthletes.map((athlete: PendingAthlete) => (
          <div
            key={athlete.id}
            className="rounded-xl border border-black/10 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  {athlete.first_name} {athlete.last_name}
                </h3>
                <p className="text-sm text-muted">{athlete.email}</p>
                {athlete.phone && (
                  <p className="text-sm text-muted">{athlete.phone}</p>
                )}
              </div>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                Pending
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted">Date of Birth:</span>
                <span className="ml-2 text-primary">
                  {athlete.date_of_birth
                    ? new Date(athlete.date_of_birth).toLocaleDateString()
                    : "-"}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted">Gender:</span>
                <span className="ml-2 text-primary capitalize">
                  {athlete.gender || "-"}
                </span>
              </div>
            </div>

            <div className="border-t border-black/10 pt-4">
              <div className="mb-3">
                <label
                  htmlFor={`rejection-reason-${athlete.id}`}
                  className="mb-2 block text-sm font-medium text-muted"
                >
                  Rejection Reason (optional)
                </label>
                <textarea
                  id={`rejection-reason-${athlete.id}`}
                  value={rejectionReason[athlete.id] || ""}
                  onChange={(e) =>
                    setRejectionReason((prev) => ({
                      ...prev,
                      [athlete.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter reason for rejection (optional)"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => approveMutation.mutate(athlete.id)}
                  disabled={approveMutation.isPending}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() =>
                    rejectMutation.mutate({
                      athleteId: athlete.id,
                      reason: rejectionReason[athlete.id] || "No reason provided",
                    })
                  }
                  disabled={rejectMutation.isPending}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

const Athletes = () => {
  const { data, isLoading, isError } = useAthletes();
  const teamsQuery = useTeams();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { data: pendingCount } = usePendingAthletesCount();
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [isNewAthleteOpen, setIsNewAthleteOpen] = useState(false);
  const [isPendingAthletesOpen, setIsPendingAthletesOpen] = useState(false);
  const [isAthleteDetailsOpen, setIsAthleteDetailsOpen] = useState(false);
  const [registeredAthlete, setRegisteredAthlete] = useState<Athlete | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [ageFilter, setAgeFilter] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [sortConfig, setSortConfig] = useState<{
    column: "name" | "age" | "gender" | "email" | "status";
    direction: "asc" | "desc";
  }>({ column: "name", direction: "asc" });
  const [activePopover, setActivePopover] = useState<
    null | "name" | "age" | "gender" | "email" | "status"
  >(null);
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
    column: "name" | "age" | "gender" | "email" | "status"
  ) => {
    setActivePopover((current) => (current === column ? null : column));
  };

  const applySort = (
    column: "name" | "age" | "gender" | "email" | "status",
    direction: "asc" | "desc"
  ) => {
    setSortConfig({ column, direction });
    setActivePopover(null);
  };

  const clearFilter = (
    column: "name" | "age" | "gender" | "email" | "status"
  ) => {
    switch (column) {
      case "name":
        setNameFilter("");
        break;
      case "age":
        setAgeFilter({ min: "", max: "" });
        break;
      case "gender":
        setGenderFilter("all");
        break;
      case "email":
        setEmailFilter("");
        break;
      case "status":
        setStatusFilter("all");
        break;
    }
  };

  const isSortActive = (
    column: "name" | "age" | "gender" | "email" | "status",
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

  const tableRows = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedName = nameFilter ? normalizeText(nameFilter.trim()) : "";
    const normalizedEmail = emailFilter ? normalizeText(emailFilter.trim()) : "";
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

    const filtered = data.filter((athlete) => {
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
        case "gender": {
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
        case "status": {
          const weight = (status: string) => (status === "active" ? 0 : 1);
          const diff = weight(left.status) - weight(right.status);
          if (diff !== 0) {
            return diff * directionFactor;
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
    data,
    nameFilter,
    emailFilter,
    statusFilter,
    genderFilter,
    ageFilter.min,
    ageFilter.max,
    sortConfig.column,
    sortConfig.direction,
  ]);

  const teamsById = useMemo(() => {
    const map = new Map<number, { name: string; coach: string | null }>();
    (teamsQuery.data ?? []).forEach((team) => {
      map.set(team.id, { name: team.name, coach: team.coach_name ?? null });
    });
    return map;
  }, [teamsQuery.data]);

  const hasNameFilter = nameFilter.trim().length > 0;
  const hasEmailFilter = emailFilter.trim().length > 0;
  const hasAgeFilter =
    ageFilter.min.trim().length > 0 || ageFilter.max.trim().length > 0;
  const hasStatusSelection = statusFilter !== "all";
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
      {/* Pending Athletes Modal */}
      <Transition appear show={isPendingAthletesOpen} as={Fragment}>
        <Dialog as="div" className="relative z-20" onClose={() => setIsPendingAthletesOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
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
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-container-gradient shadow-2xl transition-all">
                  <div className="relative px-8 py-8">
                    <button
                      type="button"
                      onClick={() => setIsPendingAthletesOpen(false)}
                      className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <AthleteApprovalList />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* New Athlete Modal */}
      <Transition appear show={isNewAthleteOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={setIsNewAthleteOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-out duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
              <Transition.Child
                as={Fragment}
                enter="ease-in duration-200"
                enterFrom="opacity-0 translate-y-4 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-out duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-4 scale-95"
              >
                <Dialog.Panel className="w-full max-w-8xl sm:max-w-[92vw] transform overflow-hidden rounded-3xl bg-container-gradient shadow-2xl transition-all">
                  <Dialog.Title className="sr-only">{t.newAthlete.title}</Dialog.Title>
                  <div className="relative h-[95vh] overflow-y-invisible p-1 sm:p-6">
                    <button
                      type="button"
                      onClick={() => setIsNewAthleteOpen(false)}
                      className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                      aria-label={t.common.cancel}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                      >
                        <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                      </svg>
                    </button>
                    <NewAthleteStepOneForm
                      onSuccess={handleRegistrationSuccess}
                      onClose={() => setIsNewAthleteOpen(false)}
                    />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div className="flex flex-1 min-h-0 w-full flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-container-foreground">{t.athletes.title}</h1>
            <p className="text-sm text-muted">{t.athletes.description}</p>
          </div>
          <div className="flex gap-3">
            {permissions.canCreateAthletes && (
              <button
                type="button"
                onClick={() => setIsPendingAthletesOpen(true)}
                className="relative rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Pending Athletes
                {pendingCount && pendingCount.count > 0 && (
                  <div className="absolute -top-2 -right-2">
                    <NotificationBadge count={pendingCount.count} />
                  </div>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsNewAthleteOpen(true)}
              className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
            >
              {t.athletes.add}
            </button>
          </div>
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

      <section
        ref={tableContainerRef}
        className="flex min-h-0 flex-1 w-full flex-col rounded-xl bg-container-gradient shadow-sm md:ml-2 md:mr-2"
      >
        <div ref={tableWrapperRef} className="flex min-h-0 flex-1 flex-col p-4">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-black/5">
              <thead ref={tableHeadRef} className="bg-container/80">
                <tr>
                  <th className="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
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
                  <th className="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
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
                  <th className="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>{t.athletes.table.gender}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("gender");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "gender"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "gender" || hasGenderFilter
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "gender" ? "rotate-180" : ""
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
                    {activePopover === "gender" ? (
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
                                onClick={() => applySort("gender", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("gender", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortGenderAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("gender", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("gender", "desc")
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
                              onClick={() => clearFilter("gender")}
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
                  <th className="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
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
                  <th className="relative px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-1">
                      <span>{t.athletes.table.status}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePopover("status");
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={activePopover === "status"}
                        className={`inline-flex items-center justify-center rounded p-1 text-muted transition hover:text-accent ${
                          sortConfig.column === "status" || hasStatusSelection
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 10 6"
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 transition-transform ${
                            activePopover === "status" ? "rotate-180" : ""
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
                    {activePopover === "status" ? (
                      <div
                        className="absolute left-0 z-20 mt-2 w-60 rounded-lg border border-black/10 bg-white p-4 text-left shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted">
                              {t.athletes.filters.status}
                            </p>
                            <div className="space-y-1">
                              <label className="flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name="status-filter"
                                  value="all"
                                  checked={statusFilter === "all"}
                                  onChange={() => setStatusFilter("all")}
                                  className="h-3 w-3 text-accent focus:ring-action-primary"
                                />
                                <span>{t.athletes.filters.statusAll}</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name="status-filter"
                                  value="active"
                                  checked={statusFilter === "active"}
                                  onChange={() => setStatusFilter("active")}
                                  className="h-3 w-3 text-accent focus:ring-action-primary"
                                />
                                <span>{t.athletes.filters.statusActive}</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name="status-filter"
                                  value="inactive"
                                  checked={statusFilter === "inactive"}
                                  onChange={() => setStatusFilter("inactive")}
                                  className="h-3 w-3 text-accent focus:ring-action-primary"
                                />
                                <span>{t.athletes.filters.statusInactive}</span>
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
                                onClick={() => applySort("status", "asc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("status", "asc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortStatusAsc}
                              </button>
                              <button
                                type="button"
                                onClick={() => applySort("status", "desc")}
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                  isSortActive("status", "desc")
                                    ? "border-action-primary text-accent"
                                    : "border-black/10 text-muted hover:border-action-primary hover:text-accent"
                                }`}
                              >
                                {t.athletes.filters.sortStatusDesc}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => clearFilter("status")}
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
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    {t.athletes.table.action}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.loading}
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-red-500">
                  {t.athletes.error}
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  {t.athletes.empty}
                </td>
              </tr>
            )}
            {!isLoading && !isError && (data?.length ?? 0) > 0 && tableRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
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
              const teamDisplay = teamInfo?.name ?? t.athletes.table.teamUnknown;
              const coachDisplay = teamInfo?.coach
                ? `${t.athletes.table.coachLabel} ${teamInfo.coach}`
                : t.athletes.table.coachUnknown;
              return (
                <tr
                  key={athlete.id}
                  ref={index === 0 ? firstDataRowRef : undefined}
                  className="hover:bg-container/60"
                >
                  <td className="px-4 py-4 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-container-foreground">{displayName}</span>
                      <span className="text-xs text-muted">{teamDisplay}</span>
                      <span className="text-xs text-muted/70">{coachDisplay}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted">{ageLabel}</td>
                  <td className="px-4 py-4 text-sm text-muted">{genderLabel}</td>
                  <td className="px-4 py-4 text-sm text-muted">{athlete.email ?? "-"}</td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex items-center gap-2">
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
                      {athlete.user_athlete_status === "PENDING" && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                          Pending Approval
                        </span>
                      )}
                      {athlete.user_athlete_status === "REJECTED" && (
                        <span 
                          className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 cursor-help"
                          title={athlete.user_rejection_reason || "Rejected"}
                        >
                          Rejected
                        </span>
                      )}
                      {athlete.user_athlete_status === "INCOMPLETE" && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                          Incomplete
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
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
                <td colSpan={6} className="h-14 px-4 text-transparent">
                  .
                </td>
              </tr>
            ))}
              </tbody>
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
      <Transition appear show={isAthleteDetailsOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => {
            setIsAthleteDetailsOpen(false);
            setRegisteredAthlete(null);
          }}
        >
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
              <Transition.Child
                as={Fragment}
                enter="ease-in duration-200"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-out duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/50" />
              </Transition.Child>

              <Transition.Child
                as={Fragment}
                enter="ease-in duration-200"
                enterFrom="opacity-0 translate-y-4 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-out duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-4 scale-95"
              >
              <Dialog.Panel className="w-full max-w-8xl sm:max-w-[92vw] transform overflow-hidden rounded-3xl bg-container-gradient shadow-2xl transition-all">
                <Dialog.Title className="sr-only">Segunda Etapa do Cadastro</Dialog.Title>
                
                <div className="relative h-[95vh] overflow-y-auto p-1 sm:p-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAthleteDetailsOpen(false);
                      setRegisteredAthlete(null);
                    }}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                    aria-label="Fechar"
                  >                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-4 w-4"
                    >
                      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                    </svg>
                  </button>

                  {registeredAthlete ? (
                    <NewAthleteStepTwoForm
                      athlete={registeredAthlete}
                      onSuccess={() => {
                        setIsAthleteDetailsOpen(false);
                        setRegisteredAthlete(null);
                      }}
                      onClose={() => {
                        setIsAthleteDetailsOpen(false);
                        setRegisteredAthlete(null);
                      }}
                    />
                  ) : (
                    <div className="p-4">
                      <p>Nenhum atleta registrado encontrado</p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
        </Dialog>
      </Transition>
    </div>
    </>
  );
};

export default Athletes;
