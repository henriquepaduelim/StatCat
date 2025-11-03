import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { registerAthlete } from "../api/athletes";
import { useTeams } from "../hooks/useTeams";
import { useTranslation } from "../i18n/useTranslation";
import type {
  Athlete,
  AthleteRegistrationPayload,
  RegistrationCategory,
  PlayerRegistrationStatus,
} from "../types/athlete";

const registrationCategories: Array<{ value: RegistrationCategory; label: string }> = [
  { value: "youth", label: "Youth" },
  { value: "senior", label: "Senior" },
  { value: "trial", label: "Trial" },
  { value: "return_player", label: "Return" },
];

const playerStatuses: Array<{ value: PlayerRegistrationStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "transfer", label: "Transfer" },
  { value: "return_player", label: "Returning" },
  { value: "guest", label: "Guest" },
];

interface NewAthleteStepOneFormProps {
  onSuccess?: (athlete: Athlete) => void;
  onClose?: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const NewAthleteStepOneForm = ({ onSuccess, onClose }: NewAthleteStepOneFormProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [teamId, setTeamId] = useState<string>("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    birth_date: todayIso(),
    gender: "male" as "male" | "female",
    email: "",
    phone: "",
    height_cm: "",
    weight_kg: "",
    dominant_foot: "",
    registration_year: String(new Date().getFullYear()),
    registration_category: registrationCategories[0].value,
    player_registration_status: playerStatuses[0].value,
    preferred_position: "",
    desired_shirt_number: "",
  });

  const teamsQuery = useTeams();

  const mutation = useMutation({
    mutationFn: (payload: AthleteRegistrationPayload) => registerAthlete(payload),
    onSuccess: (athlete) => {
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      if (onSuccess) {
        onSuccess(athlete);
      }
    },
  });

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (name === "team_id") {
      setTeamId(value);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: AthleteRegistrationPayload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      birth_date: form.birth_date,
      gender: form.gender,
      email: form.email.trim(),
      phone: form.phone.trim(),
      registration_year: form.registration_year.trim(),
      registration_category: form.registration_category,
      player_registration_status: form.player_registration_status,
      preferred_position: form.preferred_position.trim() || undefined,
      desired_shirt_number: form.desired_shirt_number.trim() || undefined,
      team_id: teamId ? Number(teamId) : undefined,
    };

    mutation.mutate(payload);
  };

  const submitDisabled =
    mutation.isPending ||
    !form.first_name.trim() ||
    !form.last_name.trim() ||
    !form.email.trim() ||
    !form.phone.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="space-y-1 border-b border-black/5 pb-4">
        <h2 className="text-xl font-semibold text-container-foreground">
          {t.newAthlete.stepOneTitle}
        </h2>
        <p className="text-sm text-muted">{t.newAthlete.stepOneSubtitle}</p>
      </header>

      <section className="space-y-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-container-foreground">
          {t.newAthlete.identitySection}
        </h3>
        <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-3">
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.firstName}
            <input
              required
              name="first_name"
              value={form.first_name}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.lastName}
            <input
              required
              name="last_name"
              value={form.last_name}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.birthDate}
            <input
              required
              type="date"
              name="birth_date"
              value={form.birth_date}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.gender}
            <select
              name="gender"
              value={form.gender}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            >
              <option value="male">{t.newAthlete.genderOptions.male}</option>
              <option value="female">{t.newAthlete.genderOptions.female}</option>
            </select>
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.email}
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
        </div>
        <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-3">
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.phone}
            <input
              required
              name="phone"
              value={form.phone}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.height}
            <input
              name="height_cm"
              value={form.height_cm}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.weight}
            <input
              name="weight_kg"
              value={form.weight_kg}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.dominantFoot}
            <select
              name="dominant_foot"
              value={form.dominant_foot}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            >
              <option value="">{t.newAthlete.dominantFootOptions.default}</option>
              <option value="right">{t.newAthlete.dominantFootOptions.right}</option>
              <option value="left">{t.newAthlete.dominantFootOptions.left}</option>
              <option value="both">{t.newAthlete.dominantFootOptions.both}</option>
            </select>
          </label>
          <div aria-hidden />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-black/5 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-container-foreground">
          {t.newAthlete.registrationSection}
        </h3>
        <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-3">
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.registrationYear}
            <input
              required
              name="registration_year"
              value={form.registration_year}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.registrationCategory}
            <select
              name="registration_category"
              value={form.registration_category}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            >
              {registrationCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.playerStatus}
            <select
              name="player_registration_status"
              value={form.player_registration_status}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            >
              {playerStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.preferredPosition}
            <input
              name="preferred_position"
              value={form.preferred_position}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.desiredNumber}
            <input
              name="desired_shirt_number"
              value={form.desired_shirt_number}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-3">
          <label className="text-sm font-medium text-muted">
            {t.newAthlete.team}
            <select
              name="team_id"
              value={teamId}
              onChange={handleInputChange}
              disabled={teamsQuery.isLoading}
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 disabled:bg-muted/20"
            >
              <option value="">{t.newAthlete.selectTeamPlaceholder}</option>
              {teamsQuery.data?.map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <div aria-hidden></div>
          <div aria-hidden></div>
          <div aria-hidden></div>
          <div aria-hidden></div>
        </div>
      </section>

      {mutation.isError ? (
        <p className="text-sm text-red-600">{t.newAthlete.error}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted hover:border-action-primary hover:text-accent"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? `${t.common.loading}...` : t.newAthlete.submitStepOne}
        </button>
      </div>
    </form>
  );
};

export default NewAthleteStepOneForm;
