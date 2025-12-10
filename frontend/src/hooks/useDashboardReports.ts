import { useMemo, useState, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { submitGameReport } from "../api/matchReports";
import { submitReportCardRequest } from "../api/reportSubmissions";
import { useReportSubmissionWorkflow } from "./useReportSubmissionWorkflow";
import { formatDateKey } from "../lib/dashboardDateUtils";
import { createEmptyReportCardCategories, countFilledScores } from "../lib/reportCard";
import type { Athlete } from "../types/athlete";
import type { GameReportFormState, NoticeState } from "../types/dashboard";
import type { ReportCardCategory } from "../types/reportCard";
import type { Team } from "../types/team";

type ApiErrorResponse = {
  response?: {
    data?: {
      detail?: string | Array<{ msg?: string }>;
    };
  };
};

type UseDashboardReportsParams = {
  athletes: Athlete[];
  teams: Team[];
  athletesByTeamId: Record<number, Athlete[]>;
  canApproveReports: boolean;
  canRecordCombineMetrics: boolean;
  selectedTeamId: number | null;
  setTeamNotice: (notice: NoticeState) => void;
};

const createEmptyGameReportForm = (): GameReportFormState => ({
  teamId: null,
  opponent: "",
  date: "",
  location: "",
  goalsFor: "",
  goalsAgainst: "",
  goalScorers: [],
  goalkeepersPlayed: [],
  goalkeeperConceded: [],
  notes: "",
});

export const useDashboardReports = ({
  athletes,
  teams,
  athletesByTeamId,
  canApproveReports,
  canRecordCombineMetrics,
  selectedTeamId,
  setTeamNotice,
}: UseDashboardReportsParams) => {
  const queryClient = useQueryClient();
  const {
    pendingReports,
    approvedReports,
    myReports,
    selectedSubmission,
    isSubmissionModalOpen,
    openSubmissionModal,
    closeSubmissionModal,
    handleApproveSubmission,
    handleRejectSubmission,
    approvingSubmissionId,
    rejectingSubmissionId,
    refetchSubmissions: refetchReportSubmissions,
  } = useReportSubmissionWorkflow({
    canApproveReports,
    onError: (message) => setTeamNotice({ variant: "error", message }),
  });

  const [isSubmissionListModalOpen, setSubmissionListModalOpen] = useState(false);
  const [isGameReportModalOpen, setGameReportModalOpen] = useState(false);
  const [gameReportForm, setGameReportForm] = useState<GameReportFormState>(() => createEmptyGameReportForm());
  const [gameReportAthleteFilterTeam, setGameReportAthleteFilterTeam] = useState<number | null>(null);
  const [gameReportError, setGameReportError] = useState<string | null>(null);
  const [isReportCardModalOpen, setReportCardModalOpen] = useState(false);
  const [reportCardAthleteId, setReportCardAthleteId] = useState<number | null>(null);
  const [reportCardTeamId, setReportCardTeamId] = useState<number | null>(null);
  const [reportCardCoachReport, setReportCardCoachReport] = useState("");
  const [reportCardCategories, setReportCardCategories] = useState<ReportCardCategory[]>(
    () => createEmptyReportCardCategories()
  );
  const [reportCardError, setReportCardError] = useState<string | null>(null);
  const [isCombineMetricModalOpen, setCombineMetricModalOpen] = useState(false);
  const [combineMetricTeamId, setCombineMetricTeamId] = useState<number | null>(null);

  const combineMetricTeam = useMemo(() => {
    if (!combineMetricTeamId) {
      return null;
    }
    return teams.find((team) => team.id === combineMetricTeamId) ?? null;
  }, [combineMetricTeamId, teams]);

  const combineMetricAthletes = useMemo(() => {
    if (!combineMetricTeamId) {
      return [];
    }
    return athletesByTeamId[combineMetricTeamId] ?? [];
  }, [combineMetricTeamId, athletesByTeamId]);

  const createGameReportMutation = useMutation({
    mutationFn: submitGameReport,
    onSuccess: () => {
      setGameReportError(null);
      setGameReportModalOpen(false);
      setGameReportForm(createEmptyGameReportForm());
      setGameReportAthleteFilterTeam(null);
      queryClient.invalidateQueries({ queryKey: ["scoring-leaderboard"] });
      refetchReportSubmissions();
    },
    onError: (error: unknown) => {
      const errorDetail = (error as ApiErrorResponse)?.response?.data?.detail;
      const message =
        typeof errorDetail === "string" ? errorDetail : "Unable to save the game report.";
      setGameReportError(message);
    },
  });

  const submitReportCardMutation = useMutation({
    mutationFn: submitReportCardRequest,
    onSuccess: () => {
      setReportCardError(null);
      setReportCardModalOpen(false);
      setReportCardAthleteId(null);
      setReportCardTeamId(null);
      setReportCardCoachReport("");
      setReportCardCategories(createEmptyReportCardCategories());
      refetchReportSubmissions();
    },
    onError: (error: unknown) => {
      const errorDetail = (error as ApiErrorResponse)?.response?.data?.detail;
      const message =
        typeof errorDetail === "string"
          ? errorDetail
          : "Unable to submit report card request.";
      setReportCardError(message);
    },
  });

  const openGameReportModal = () => {
    setGameReportForm(() => {
      const template = createEmptyGameReportForm();
      return {
        ...template,
        teamId: selectedTeamId ?? null,
        date: formatDateKey(new Date()),
      };
    });
    setGameReportAthleteFilterTeam(selectedTeamId ?? null);
    setGameReportError(null);
    setGameReportModalOpen(true);
  };

  const openReportCardModal = () => {
    setReportCardAthleteId((prev) => prev ?? athletes[0]?.id ?? null);
    setReportCardTeamId((prev) => prev ?? selectedTeamId ?? null);
    if (!reportCardCategories.length) {
      setReportCardCategories(createEmptyReportCardCategories());
    }
    setReportCardError(null);
    setReportCardModalOpen(true);
  };

  const handleGameReportInputChange = <T extends keyof GameReportFormState>(
    field: T,
    value: GameReportFormState[T],
  ) => {
    setGameReportForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddGoalScorer = (athleteId: number) => {
    setGameReportForm((prev) => {
      if (prev.goalScorers.some((entry) => entry.athleteId === athleteId)) {
        return prev;
      }
      return {
        ...prev,
        goalScorers: [...prev.goalScorers, { athleteId, goals: 1, shootoutGoals: 0 }],
      };
    });
  };

  const handleRemoveGoalScorer = (athleteId: number) => {
    setGameReportForm((prev) => ({
      ...prev,
      goalScorers: prev.goalScorers.filter((entry) => entry.athleteId !== athleteId),
    }));
  };

  const handleUpdateGoalScorerGoals = (athleteId: number, goals: number) => {
    const normalized = Number.isFinite(goals) && goals > 0 ? goals : 1;
    setGameReportForm((prev) => ({
      ...prev,
      goalScorers: prev.goalScorers.map((entry) =>
        entry.athleteId === athleteId ? { ...entry, goals: normalized } : entry,
      ),
    }));
  };

  const handleUpdateGoalScorerShootoutGoals = (athleteId: number, goals: number) => {
    const normalized = Number.isFinite(goals) && goals >= 0 ? goals : 0;
    setGameReportForm((prev) => ({
      ...prev,
      goalScorers: prev.goalScorers.map((entry) =>
        entry.athleteId === athleteId ? { ...entry, shootoutGoals: normalized } : entry,
      ),
    }));
  };

  const handleToggleGoalkeeper = (athleteId: number) => {
    setGameReportForm((prev) => {
      const exists = prev.goalkeepersPlayed.includes(athleteId);
      const nextKeepers = exists
        ? prev.goalkeepersPlayed.filter((id) => id !== athleteId)
        : [...prev.goalkeepersPlayed, athleteId];
      const nextConceded = prev.goalkeeperConceded.filter((entry) =>
        nextKeepers.includes(entry.athleteId),
      );
      return {
        ...prev,
        goalkeepersPlayed: nextKeepers,
        goalkeeperConceded: nextConceded,
      };
    });
  };

  const handleToggleGoalkeeperConceded = (athleteId: number) => {
    setGameReportForm((prev) => {
      if (!prev.goalkeepersPlayed.includes(athleteId)) {
        return prev;
      }
      const exists = prev.goalkeeperConceded.find((entry) => entry.athleteId === athleteId);
      const nextConceded = exists
        ? prev.goalkeeperConceded.filter((entry) => entry.athleteId !== athleteId)
        : [...prev.goalkeeperConceded, { athleteId, conceded: 1 }];
      return { ...prev, goalkeeperConceded: nextConceded };
    });
  };

  const handleUpdateGoalkeeperConcededGoals = (athleteId: number, goals: number) => {
    const normalized = Number.isFinite(goals) && goals >= 0 ? goals : 0;
    setGameReportForm((prev) => ({
      ...prev,
      goalkeeperConceded: prev.goalkeeperConceded.some((entry) => entry.athleteId === athleteId)
        ? prev.goalkeeperConceded.map((entry) =>
            entry.athleteId === athleteId ? { ...entry, conceded: normalized } : entry,
          )
        : [...prev.goalkeeperConceded, { athleteId, conceded: normalized }],
    }));
  };

  const handleGameReportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createGameReportMutation.isPending) {
      return;
    }
    const normalizedScorers = gameReportForm.goalScorers
      .filter((entry) => entry.goals > 0 || entry.shootoutGoals > 0)
      .map((entry) => ({
        athlete_id: entry.athleteId,
        goals: entry.goals,
        shootout_goals: entry.shootoutGoals,
      }));
    const concededMap = new Map(
      gameReportForm.goalkeeperConceded.map((entry) => [entry.athleteId, entry.conceded]),
    );
    const goalkeeperPayload = gameReportForm.goalkeepersPlayed.map((athleteId) => ({
      athlete_id: athleteId,
      conceded: concededMap.get(athleteId) ?? 0,
    }));
    if (!normalizedScorers.length && !goalkeeperPayload.length) {
      setGameReportError("Add at least one goal scorer or goalkeeper.");
      return;
    }

    const toPositiveNumber = (value: string) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };
    const trimOrNull = (value: string) => {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const payload = {
      team_id: gameReportForm.teamId,
      opponent: gameReportForm.opponent.trim(),
      date: gameReportForm.date || formatDateKey(new Date()),
      location: trimOrNull(gameReportForm.location),
      goals_for: toPositiveNumber(gameReportForm.goalsFor),
      goals_against: toPositiveNumber(gameReportForm.goalsAgainst),
      goal_scorers: normalizedScorers,
      goalkeepers: goalkeeperPayload,
      notes: trimOrNull(gameReportForm.notes),
    };

    setGameReportError(null);
    createGameReportMutation.mutate(payload);
  };

  const handleGameReportCancel = () => {
    setGameReportModalOpen(false);
    setGameReportForm(createEmptyGameReportForm());
    setGameReportAthleteFilterTeam(null);
    setGameReportError(null);
  };

  const handleReportCardMetricChange = (
    categoryName: string,
    metricName: string,
    value: number | null,
  ) => {
    setReportCardCategories((prev) =>
      prev.map((category) => {
        if (category.name !== categoryName) return category;
        return {
          ...category,
          metrics: category.metrics.map((metric) => {
            if (metric.name !== metricName) return metric;
            if (value === null || Number.isNaN(value) || value <= 0) {
              return { ...metric, score: null };
            }
            const clamped = Math.min(100, Math.max(1, Math.round(value)));
            return { ...metric, score: clamped };
          }),
        };
      }),
    );
  };

  const handleReportCardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportCardAthleteId) {
      setReportCardError("Select an athlete before submitting.");
      return;
    }
    const trimmedReport = reportCardCoachReport.trim();
    if (!trimmedReport) {
      setReportCardError("Coach report is required.");
      return;
    }

    const filled = countFilledScores(reportCardCategories);
    if (filled === 0) {
      setReportCardError("Add at least one score before submitting.");
      return;
    }

    const payload = {
      athlete_id: reportCardAthleteId,
      team_id: reportCardTeamId,
      coach_report: trimmedReport,
      categories: reportCardCategories.map((category) => ({
        name: category.name,
        metrics: category.metrics.map((metric) => ({
          name: metric.name,
          score: metric.score,
        })),
      })),
    };

    setReportCardError(null);
    submitReportCardMutation.mutate(payload);
  };

  const handleReportCardCancel = () => {
    setReportCardModalOpen(false);
    setReportCardError(null);
  };

  const handleReportCardClear = () => {
    setReportCardCoachReport("");
    setReportCardCategories(createEmptyReportCardCategories());
  };

  const handleNewReportCard = () => {
    openReportCardModal();
  };

  const handleGameReport = () => {
    openGameReportModal();
  };

  const closeCombineMetricModal = () => {
    setCombineMetricModalOpen(false);
    setCombineMetricTeamId(null);
  };

  const handleOpenCombineMetricModal = () => {
    const fallbackTeamId = selectedTeamId ?? teams[0]?.id ?? null;
    if (!fallbackTeamId) {
      setTeamNotice({ variant: "error", message: "Create or select a team before recording metrics." });
      return;
    }
    setCombineMetricTeamId(fallbackTeamId);
    setCombineMetricModalOpen(true);
  };

  const handleCombineMetricSaved = () => {
    setTeamNotice({ variant: "success", message: "Combine metrics saved successfully." });
  };

  const teamInsightsCardProps = {
    teams,
    athletes,
    athletesByTeamId,
    onNewReportCard: handleNewReportCard,
    onGameReport: handleGameReport,
    isGameReportPending: createGameReportMutation.isPending,
    pendingReports: canApproveReports ? pendingReports : [],
    mySubmissions: myReports,
    onApproveReport: handleApproveSubmission,
    onReviewSubmission: openSubmissionModal,
    onViewMySubmission: openSubmissionModal,
    onOpenSubmissionsModal: () => setSubmissionListModalOpen(true),
    approvingSubmissionId,
    canApproveReports,
    onRecordCombineMetrics: handleOpenCombineMetricModal,
    canRecordCombineMetrics,
  };

  const reportModalsProps = {
    gameReportProps: {
      isOpen: isGameReportModalOpen,
      teams,
      athletes,
      form: gameReportForm,
      athleteFilterTeam: gameReportAthleteFilterTeam,
      setAthleteFilterTeam: setGameReportAthleteFilterTeam,
      onInputChange: handleGameReportInputChange,
      onAddScorer: handleAddGoalScorer,
      onRemoveScorer: handleRemoveGoalScorer,
      onUpdateScorerGoals: handleUpdateGoalScorerGoals,
      onUpdateScorerShootoutGoals: handleUpdateGoalScorerShootoutGoals,
      onToggleGoalkeeper: handleToggleGoalkeeper,
      onToggleGoalkeeperConceded: handleToggleGoalkeeperConceded,
      onUpdateGoalkeeperConceded: handleUpdateGoalkeeperConcededGoals,
      isSubmitting: createGameReportMutation.isPending,
      errorMessage: gameReportError,
      onSubmit: handleGameReportSubmit,
      onCancel: handleGameReportCancel,
    },
    reportCardProps: {
      isOpen: isReportCardModalOpen,
      athletes,
      teams,
      selectedAthleteId: reportCardAthleteId,
      selectedTeamId: reportCardTeamId,
      coachReport: reportCardCoachReport,
      categories: reportCardCategories,
      isSubmitting: submitReportCardMutation.isPending,
      errorMessage: reportCardError,
      onAthleteSelect: setReportCardAthleteId,
      onTeamSelect: setReportCardTeamId,
      onCoachReportChange: setReportCardCoachReport,
      onMetricChange: handleReportCardMetricChange,
      onClear: handleReportCardClear,
      onSubmit: handleReportCardSubmit,
      onCancel: handleReportCardCancel,
    },
    combineMetricProps: {
      isOpen: isCombineMetricModalOpen,
      onClose: closeCombineMetricModal,
      teamId: combineMetricTeamId,
      teamName: combineMetricTeam?.name,
      athletes: combineMetricAthletes,
      onCreated: handleCombineMetricSaved,
    },
    submissionListProps: {
      isOpen: isSubmissionListModalOpen,
      pendingReports: canApproveReports ? pendingReports : [],
      approvedReports: canApproveReports ? approvedReports : [],
      mySubmissions: myReports,
      canApproveReports,
      onClose: () => setSubmissionListModalOpen(false),
      onReviewSubmission: openSubmissionModal,
      onViewMySubmission: openSubmissionModal,
      onApproveReport: handleApproveSubmission,
    },
    submissionReviewProps: {
      submission: selectedSubmission,
      isOpen: isSubmissionModalOpen && Boolean(selectedSubmission),
      canResolve: Boolean(canApproveReports && selectedSubmission?.status === "pending"),
      onClose: closeSubmissionModal,
      onApprove: handleApproveSubmission,
      onReject: handleRejectSubmission,
      isApprovePending:
        Boolean(approvingSubmissionId) &&
        approvingSubmissionId === (selectedSubmission?.id ?? null),
      isRejectPending:
        Boolean(rejectingSubmissionId) &&
        rejectingSubmissionId === (selectedSubmission?.id ?? null),
    },
  };

  return {
    teamInsightsCardProps,
    reportModalsProps,
  };
};
