import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import {
  assignCoachToTeam,
  createCoach,
  createTeam,
  updateTeam,
  updateCoach,
  getCoachTeams,
  listAllCoaches,
  listTeamCoaches,
  deleteTeam as deleteTeamApi,
  deleteCoach as deleteCoachApi,
} from "../api/teams";
import type { Team } from "../types/team";
import type { TeamCoach } from "../types/coach";
import { updateAthlete } from "../api/athletes";
import { useTeamBuilderData } from "./useTeamBuilderData";
import { useAuthStore } from "../stores/useAuthStore";
import type { Athlete } from "../types/athlete";
import type {
  AthleteFilter,
  NewTeamFormState,
  NoticeState,
  CoachFormState,
} from "../types/dashboard";
import type TeamFormModal from "../components/dashboard/TeamFormModal";
import type CoachFormModal from "../components/dashboard/CoachFormModal";
import type { createTeamLabels, teamAgeOptions } from "../constants/dashboard";
import { useAthletes } from "./useAthletes";

const createEmptyTeamForm = (): NewTeamFormState => ({
  name: "",
  ageCategory: "U14",
  gender: "coed",
  description: "",
  coachIds: [],
  athleteIds: [],
});

const createEmptyCoachForm = (): CoachFormState => ({
  fullName: "",
  email: "",
  phone: "",
});

type CoachFormSubmit = CoachFormState & { teamId: number | null };
type TeamCoachRecord = TeamCoach & { coach_id?: number };

type UseDashboardTeamManagementParams = {
  permissions: { canManageUsers: boolean; canCreateCoaches: boolean };
  athletes: Athlete[];
  teams: Team[];
  teamsQuery: ReturnType<typeof useQuery>;
  athletesQuery: ReturnType<typeof useAthletes>;
  athletesByTeamId: Record<number, Athlete[]>;
  teamNameById: Record<number, string>;
  athleteById: Map<number, Athlete>;
  selectedTeamId: number | null;
  setSelectedTeamId: (id: number | null) => void;
  coachDirectoryLabels: {
    assignSuccess: string;
    createSuccess: string;
    createError: string;
    removeSuccess: string;
    removeError: string;
  };
  createTeamLabels: typeof createTeamLabels;
  teamAgeOptions: typeof teamAgeOptions;
  isAthleteView: boolean;
};

export const useDashboardTeamManagement = ({
  permissions,
  athletes,
  teams,
  teamsQuery,
  athletesQuery,
  athletesByTeamId,
  teamNameById,
  athleteById,
  selectedTeamId,
  setSelectedTeamId,
  coachDirectoryLabels,
  createTeamLabels,
  teamAgeOptions,
  isAthleteView,
}: UseDashboardTeamManagementParams) => {
  const canManageCoaches = permissions.canCreateCoaches || permissions.canManageUsers;
  const token = useAuthStore((state) => state.token);
  const [isCoachFormOpen, setCoachFormOpen] = useState(false);
  const [isTeamFormOpen, setTeamFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{
    id: number;
    name: string;
    ageCategory: string;
    gender: string;
    description: string;
  } | null>(null);
  const [editingCoach, setEditingCoach] = useState<{
    id: number;
    fullName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [coachTeams, setCoachTeams] = useState<Team[]>([]);
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>({
    age: "",
    gender: "",
    query: "",
    teamStatus: "all",
  });
  const [draggedAthleteId, setDraggedAthleteId] = useState<number | null>(null);
  const [coachForm, setCoachForm] = useState(createEmptyCoachForm);
  const [coachFormError, setCoachFormError] = useState<string | null>(null);
  const [coachFormSuccess, setCoachFormSuccess] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState<NewTeamFormState>(() =>
    createEmptyTeamForm()
  );
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<NoticeState>(null);
  const [coachNotice, setCoachNotice] = useState<NoticeState>(null);
  const [archiveModalTeam, setArchiveModalTeam] = useState<{ id: number; name: string } | null>(null);

  const { candidates: teamBuilderCandidates, remainingAthleteCount } =
    useTeamBuilderData({
      athletes,
      teamForm,
      athleteFilter,
    });

  const queryClient = useQueryClient();
  const fetchTeamCoaches = (teamId: number) =>
    queryClient.ensureQueryData({
      queryKey: ["team-coaches", teamId],
      queryFn: () => listTeamCoaches(teamId),
    });

  const allCoachesQuery = useQuery<TeamCoach[]>({
    queryKey: ["all-team-coaches"],
    queryFn: listAllCoaches,
    enabled: Boolean(token),
    staleTime: 1000 * 30,
    select: (coaches) =>
      [...coaches].sort((a, b) =>
        (a?.full_name || "").localeCompare(b?.full_name || "")
      ),
  });

  const availableCoaches = allCoachesQuery.data ?? [];

  useEffect(() => {
    setCoachForm(createEmptyCoachForm());
    setCoachFormError(null);
    setCoachFormSuccess(null);
  }, [selectedTeamId]);

  const closeTeamFormModal = () => {
    setTeamFormOpen(false);
    setTeamForm(createEmptyTeamForm());
    setTeamFormError(null);
    setEditingTeam(null);
  };

  const closeCoachFormModal = () => {
    setCoachFormOpen(false);
    setCoachForm(createEmptyCoachForm());
    setCoachFormError(null);
    setCoachFormSuccess(null);
    setEditingCoach(null);
    setCoachTeams([]);
  };

  const handleCloseArchiveModal = () => {
    setArchiveModalTeam(null);
  };

  const handleTeamArchiveAndDeleted = () => {
    handleCloseArchiveModal();
    setTeamNotice({
      variant: "success",
      message: "Team and all its reports have been deleted.",
    });
    if (selectedTeamId === archiveModalTeam?.id) {
      setSelectedTeamId(null);
    }
  };

  const createTeamMutation = useMutation({
    mutationFn: async (form: NewTeamFormState & { teamId?: number }) => {
      const teamPayload = {
        name: form.name.trim(),
        age_category: form.ageCategory,
        description: form.description.trim() ? form.description.trim() : null,
      };

      const team = form.teamId
        ? await updateTeam(form.teamId, teamPayload)
        : await createTeam(teamPayload);

      const currentTeamAthletes = athletes.filter(
        (athlete) => athlete.team_id === team.id
      );
      const currentAthleteIds = new Set(currentTeamAthletes.map((a) => a.id));
      const newAthleteIds = new Set(form.athleteIds);

      const athletesToRemove = currentTeamAthletes.filter(
        (a) => !newAthleteIds.has(a.id)
      );
      if (athletesToRemove.length) {
        await Promise.all(
          athletesToRemove.map((athlete) =>
            updateAthlete(athlete.id, { team_id: null })
          )
        );
      }

      const athletesToAdd = form.athleteIds.filter(
        (id) => !currentAthleteIds.has(id)
      );
      if (athletesToAdd.length) {
        await Promise.all(
          athletesToAdd.map((athleteId) =>
            updateAthlete(athleteId, { team_id: team.id })
          )
        );
      }

      if (form.coachIds.length) {
        await Promise.all(
          form.coachIds.map((coachId) =>
            assignCoachToTeam(team.id, coachId).catch(() => undefined)
          )
        );
      }

      return team;
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches", team.id] });
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      setSelectedTeamId(team.id);
      closeTeamFormModal();
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : editingTeam
          ? "Unable to update team."
          : "Unable to create team.";
      setTeamFormError(message);
    },
  });

  const deleteTeamMutation = useMutation<void, Error, { teamId: number; teamName: string }>({
    mutationFn: ({ teamId }) => deleteTeamApi(teamId),
    onSuccess: (_data, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      setTeamNotice({
        variant: "success",
        message: "Team removed successfully.",
      });
      if (selectedTeamId === teamId) {
        setSelectedTeamId(null);
      }
      if (isTeamFormOpen && editingTeam?.id === teamId) {
        closeTeamFormModal();
      }
    },
    onError: (error, { teamId, teamName }) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setArchiveModalTeam({ id: teamId, name: teamName });
      } else {
        const message = error instanceof Error ? error.message : "Unable to remove team.";
        setTeamNotice({ variant: "error", message });
      }
    },
  });

  const updateCoachForm = <T extends keyof CoachFormState>(
    field: T,
    value: CoachFormState[T]
  ) => {
    setCoachForm((prev) => ({ ...prev, [field]: value }));
    setCoachFormError(null);
    setCoachFormSuccess(null);
  };

  const createCoachMutation = useMutation<
    { coach: TeamCoach; teamId: number | null },
    Error,
    CoachFormSubmit
  >({
    mutationFn: async (form: CoachFormSubmit) => {
      const coach = await createCoach({
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
      });
      if (form.teamId) {
        await assignCoachToTeam(form.teamId, coach.id);
      }
      return { coach, teamId: form.teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      if (result.teamId) {
        queryClient.invalidateQueries({
          queryKey: ["team-coaches", result.teamId],
        });
      }
      setCoachForm(createEmptyCoachForm());
      setCoachFormError(null);
      const successMessage = result.teamId
        ? coachDirectoryLabels.assignSuccess
        : coachDirectoryLabels.createSuccess;
      setCoachFormSuccess(successMessage);
      closeCoachFormModal();
    },
    onError: (error) => {
      let message =
        error instanceof Error ? error.message : coachDirectoryLabels.createError;
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === "string") {
          message = detail;
        }
      }
      setCoachFormSuccess(null);
      setCoachFormError(message);
    },
  });

  const updateCoachMutation = useMutation<
    TeamCoach,
    Error,
    CoachFormSubmit & { coachId: number }
  >({
    mutationFn: async (form) => {
      return await updateCoach(form.coachId, {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      setCoachFormSuccess("Coach updated successfully.");
      closeCoachFormModal();
    },
    onError: (error) => {
      let message =
        error instanceof Error ? error.message : "Unable to update coach.";
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === "string") {
          message = detail;
        }
      }
      setCoachFormError(message);
    },
  });

  const deleteCoachMutation = useMutation<void, Error, number>({
    mutationFn: deleteCoachApi,
    onSuccess: (_data, coachId) => {
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      setCoachNotice({
        variant: "success",
        message: coachDirectoryLabels.removeSuccess,
      });
      if (editingCoach?.id === coachId) {
        closeCoachFormModal();
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : coachDirectoryLabels.removeError;
      setCoachNotice({ variant: "error", message });
    },
  });

  const handleCoachSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = coachForm.fullName.trim();
    const trimmedEmail = coachForm.email.trim();
    const trimmedPhone = coachForm.phone.trim();

    if (!trimmedName || !trimmedEmail) {
      setCoachFormError("Name and email are required.");
      return;
    }

    setCoachFormError(null);
    setCoachFormSuccess(null);

    if (editingCoach) {
      updateCoachMutation.mutate({
        coachId: editingCoach.id,
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        teamId: null,
      });
    } else {
      createCoachMutation.mutate({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        teamId: null,
      });
    }
  };

  const handleEditCoach = async (coach: TeamCoach) => {
    const teamsForCoach = await getCoachTeams(coach.id);
    setCoachTeams(teamsForCoach);
    setEditingCoach({
      id: coach.id,
      fullName: coach.full_name,
      email: coach.email,
      phone: coach.phone || "",
    });
    setCoachForm({
      fullName: coach.full_name,
      email: coach.email,
      phone: coach.phone || "",
    });
    setCoachFormError(null);
    setCoachFormSuccess(null);
    setCoachFormOpen(true);
  };

  const handleCoachDelete = (coachId: number, coachName: string) => {
    if (!canManageCoaches) {
      return;
    }
    const confirmed = window.confirm(
      `Delete coach ${coachName}? This will remove access and unassign from teams.`
    );
    if (!confirmed) {
      return;
    }
    setCoachNotice(null);
    deleteCoachMutation.mutate(coachId);
  };

  const handleAddCoach = () => {
    setCoachForm(createEmptyCoachForm());
    setCoachFormOpen(true);
    setCoachFormError(null);
    setCoachFormSuccess(null);
    setEditingCoach(null);
  };

  const handleTeamFormFieldChange = <T extends keyof NewTeamFormState>(
    field: T,
    value: NewTeamFormState[T]
  ) => {
    setTeamForm((prev) => ({ ...prev, [field]: value }));
    setTeamFormError(null);
  };

  const handleTeamCreateClick = () => {
    setTeamForm(createEmptyTeamForm());
    setTeamFormError(null);
    setEditingTeam(null);
    setTeamFormOpen(true);
  };

  const handleTeamEdit = async (team: Team) => {
    try {
      const coaches = (await fetchTeamCoaches(team.id)) as TeamCoachRecord[];
      const coachIds = coaches
        .map((coach) =>
          typeof coach.coach_id === "number" ? coach.coach_id : coach.id
        )
        .filter((id: number | undefined): id is number => typeof id === "number");
      const teamAthletes = athletesByTeamId[team.id] ?? [];

      setEditingTeam({
        id: team.id,
        name: team.name,
        ageCategory: team.age_category,
        gender: "coed",
        description: team.description || "",
      });
      setTeamForm({
        name: team.name,
        ageCategory: team.age_category,
        gender: "coed",
        description: team.description || "",
        coachIds: coachIds.length ? coachIds : [],
        athleteIds: teamAthletes.map((athlete) => athlete.id),
      });
      setTeamFormError(null);
      setTeamFormOpen(true);
    } catch (error) {
      console.error("Unable to prepare team form:", error);
    }
  };

  const handleTeamDelete = (teamId: number, teamName: string) => {
    if (!permissions.canManageUsers) {
      return;
    }
    const confirmed = window.confirm(
      `Delete team ${teamName}? Athletes will remain unassigned.`
    );
    if (!confirmed) {
      return;
    }
    setTeamNotice(null);
    deleteTeamMutation.mutate({ teamId, teamName });
  };

  const handleTeamFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = teamForm.name.trim();
    if (!trimmedName) {
      setTeamFormError(createTeamLabels.errorName);
      return;
    }
    setTeamFormError(null);
    createTeamMutation.mutate({
      teamId: editingTeam?.id,
      name: trimmedName,
      ageCategory: teamForm.ageCategory,
      gender: teamForm.gender,
      description: teamForm.description.trim(),
      coachIds: teamForm.coachIds,
      athleteIds: teamForm.athleteIds,
    });
  };

  const teamListCardProps = {
    teams,
    athletesByTeamId,
    athletesQuery,
    notice: teamNotice,
    isLoading: teamsQuery.isLoading,
    isError: teamsQuery.isError,
    canManageUsers: permissions.canManageUsers,
    isCreatePending: createTeamMutation.isPending,
    isDeletePending: deleteTeamMutation.isPending,
    onAddTeam: handleTeamCreateClick,
    onEditTeam: handleTeamEdit,
    onDeleteTeam: handleTeamDelete,
    addButtonLabel: createTeamLabels.button,
    statusCopy: {
      loading: "Loading...",
      error: "Unable to load teams.",
      empty: "No teams created yet.",
    },
  };

  const coachDirectorySectionProps = {
    canCreateCoaches: permissions.canCreateCoaches,
    isCreatePending: createCoachMutation.isPending,
    notice: coachNotice,
    coaches: availableCoaches,
    isLoading: allCoachesQuery.isLoading,
    isError: allCoachesQuery.isError,
    onAddCoach: handleAddCoach,
    onEditCoach: handleEditCoach,
    onDeleteCoach: handleCoachDelete,
  };

  const teamFormModalProps: React.ComponentProps<typeof TeamFormModal> = {
    isOpen: isTeamFormOpen,
    isSubmitting: createTeamMutation.isPending,
    editingTeam,
    labels: createTeamLabels,
    teamForm,
    teamFormError,
    teamAgeOptions,
    availableCoaches,
    teamBuilderCandidates,
    remainingAthleteCount,
    teamNameById,
    athleteById,
    draggedAthleteId,
    athleteFilter,
    onSubmit: handleTeamFormSubmit,
    onClose: closeTeamFormModal,
    onFieldChange: handleTeamFormFieldChange,
    setTeamForm,
    setDraggedAthleteId,
    setAthleteFilter,
  };

  const coachFormModalProps: React.ComponentProps<typeof CoachFormModal> = {
    isOpen: isCoachFormOpen,
    editingCoach,
    coachForm,
    coachFormError,
    coachFormSuccess,
    coachTeams,
    isCreatePending: createCoachMutation.isPending,
    isUpdatePending: updateCoachMutation.isPending,
    onClose: closeCoachFormModal,
    onSubmit: handleCoachSubmit,
    onFieldChange: updateCoachForm,
  };

  return {
    availableCoaches,
    teamListCardProps,
    coachDirectorySectionProps,
    teamFormModalProps,
    coachFormModalProps,
    teamNotice,
    setTeamNotice,
    coachNotice,
    setCoachNotice,
    isAthleteView,
    archiveModalTeam,
    handleCloseArchiveModal,
    handleTeamArchiveAndDeleted,
  };
};
