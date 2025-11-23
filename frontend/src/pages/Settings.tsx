import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

import { useAuthStore } from "../stores/useAuthStore";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeId } from "../theme/themes";
import { useTeams } from "../hooks/useTeams";
import type { PlayerRegistrationStatus, RegistrationCategory } from "../types/athlete";
import { completeAthleteRegistration, updateAthlete } from "../api/athletes";
import { exportTeamPostsArchive } from "../api/teamPosts";

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

const todayIso = () => new Date().toISOString().slice(0, 10);

type ProfileFormState = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "male" | "female";
  email: string;
  phone: string;
};

type AthleteFormState = {
  height: string;
  weight: string;
  preferredPosition: string;
  desiredNumber: string;
  dominantFoot: "" | "left" | "right" | "both";
  registrationYear: string;
  registrationCategory: RegistrationCategory;
  playerStatus: PlayerRegistrationStatus;
  teamId: string;
};

type ContactFormState = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  guardianName: string;
  guardianRelationship: string;
  guardianEmail: string;
  guardianPhone: string;
  secondaryGuardianName: string;
  secondaryGuardianRelationship: string;
  secondaryGuardianEmail: string;
  secondaryGuardianPhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  medicalAllergies: string;
  medicalConditions: string;
  physicianName: string;
  physicianPhone: string;
};

const initialAthleteState: AthleteFormState = {
  height: "",
  weight: "",
  preferredPosition: "",
  desiredNumber: "",
  dominantFoot: "",
  registrationYear: String(new Date().getFullYear()),
  registrationCategory: registrationCategories[0].value,
  playerStatus: playerStatuses[0].value,
  teamId: "",
};

const initialContactState: ContactFormState = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "",
  guardianName: "",
  guardianRelationship: "",
  guardianEmail: "",
  guardianPhone: "",
  secondaryGuardianName: "",
  secondaryGuardianRelationship: "",
  secondaryGuardianEmail: "",
  secondaryGuardianPhone: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  medicalAllergies: "",
  medicalConditions: "",
  physicianName: "",
  physicianPhone: "",
};

const Settings = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    birthDate: todayIso(),
    gender: "male",
    email: "",
    phone: "",
  });
  const [athleteForm, setAthleteForm] = useState<AthleteFormState>(initialAthleteState);
  const [contactForm, setContactForm] = useState<ContactFormState>(initialContactState);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAthlete, setIsSavingAthlete] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showSecondaryGuardian, setShowSecondaryGuardian] = useState(false);
  const [maintenanceTeamId, setMaintenanceTeamId] = useState<number | null>(null);
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false);
  const [isExportingArchive, setIsExportingArchive] = useState(false);
  const [maintenanceFeedback, setMaintenanceFeedback] = useState<string | null>(null);
  const [isMaintenanceOpen, setMaintenanceOpen] = useState(false);
  const [isSummaryOpen, setSummaryOpen] = useState(false);
  const [isPhotoOpen, setPhotoOpen] = useState(false);
  const [isThemeOpen, setThemeOpen] = useState(false);
  const { themeId, setThemeId } = useTheme();
  const teamsQuery = useTeams();
  const isAthlete = user?.role === "athlete";
  const isAdminOrStaff = user?.role === "admin" || user?.role === "staff";
  const athleteId = isAthlete && user?.athlete_id ? user.athlete_id : null;

  useEffect(() => {
    if (user) {
      const nameParts = (user.full_name ?? "").trim().split(/\s+/);
      const [firstName = "", ...rest] = nameParts;
      const lastName = rest.join(" ");
      setProfileForm((prev) => ({
        ...prev,
        firstName,
        lastName,
        email: user.email ?? "",
        phone: user.phone ?? "",
      }));
      if (user.team_id) {
        setAthleteForm((prev) => ({
          ...prev,
          teamId: String(user.team_id),
        }));
      }
    }
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return undefined;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  useEffect(() => {
    if (!isAdminOrStaff) return;
    const teams = teamsQuery.data ?? [];
    if (!teams.length) {
      setMaintenanceTeamId(null);
      return;
    }
    if (!maintenanceTeamId || teams.every((team) => team.id !== maintenanceTeamId)) {
      setMaintenanceTeamId(teams[0].id);
    }
  }, [teamsQuery.data, isAdminOrStaff, maintenanceTeamId]);

  const userInitials = useMemo(() => {
    if (!user?.full_name) return "PP";
    return user.full_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase())
      .join("");
  }, [user?.full_name]);

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAthleteChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setAthleteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async () => {
    setFeedback(null);
    if (!avatarFile) {
      setFeedback("Select an image before saving.");
      return;
    }

    setIsUploadingPhoto(true);
    // Hook up to backend upload endpoint in the future.
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsUploadingPhoto(false);
    setFeedback("Photo updated! Once it syncs, it will appear on your profile.");
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setFeedback(null);
    if (!athleteId) {
      setFeedback("Unable to update profile because no athlete record is linked.");
      setIsSavingProfile(false);
      return;
    }

    const payload = {
      first_name: profileForm.firstName.trim(),
      last_name: profileForm.lastName.trim(),
      birth_date: profileForm.birthDate,
      gender: profileForm.gender,
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
    };

    try {
      await updateAthlete(athleteId, payload);
      if (user && token) {
        const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
        setCredentials({
          user: {
            ...user,
            full_name: fullName || user.full_name,
            email: profileForm.email,
            phone: profileForm.phone,
          },
          token,
        });
      }
      setFeedback("Personal details updated. Remember to publish the change through the backend.");
    } catch (error) {
      console.error("Failed to update personal details", error);
      setFeedback("Failed to update personal details. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAthleteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingAthlete(true);
    setFeedback(null);
    if (!athleteId) {
      setFeedback("Unable to update athlete data because no athlete record is linked.");
      setIsSavingAthlete(false);
      return;
    }

    const parseFloatInput = (value: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const payload = {
      height_cm: parseFloatInput(athleteForm.height),
      weight_kg: parseFloatInput(athleteForm.weight),
      dominant_foot: athleteForm.dominantFoot || undefined,
      preferred_position: athleteForm.preferredPosition.trim() || undefined,
      primary_position: athleteForm.preferredPosition.trim() || undefined,
      desired_shirt_number: athleteForm.desiredNumber.trim() || undefined,
      registration_year: athleteForm.registrationYear.trim() || undefined,
      registration_category: athleteForm.registrationCategory,
      player_registration_status: athleteForm.playerStatus,
      team_id: athleteForm.teamId ? Number(athleteForm.teamId) : undefined,
    };

    try {
      await updateAthlete(athleteId, payload);
      setFeedback("Athlete information saved. Sync with the staff to finalize.");
    } catch (error) {
      console.error("Failed to update athlete info", error);
      setFeedback("Failed to update athlete information. Please try again.");
    } finally {
      setIsSavingAthlete(false);
    }
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingContact(true);
    setFeedback(null);
    if (!athleteId) {
      setFeedback("Unable to update contact information because no athlete record is linked.");
      setIsSavingContact(false);
      return;
    }

    const payload = {
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
      address_line1: contactForm.addressLine1.trim(),
      address_line2: contactForm.addressLine2.trim() || undefined,
      city: contactForm.city.trim(),
      province: contactForm.province.trim(),
      postal_code: contactForm.postalCode.trim(),
      country: contactForm.country.trim(),
      guardian_name: contactForm.guardianName.trim() || undefined,
      guardian_relationship: contactForm.guardianRelationship.trim() || undefined,
      guardian_email: contactForm.guardianEmail.trim() || undefined,
      guardian_phone: contactForm.guardianPhone.trim() || undefined,
      secondary_guardian_name: showSecondaryGuardian
        ? contactForm.secondaryGuardianName.trim() || undefined
        : undefined,
      secondary_guardian_relationship: showSecondaryGuardian
        ? contactForm.secondaryGuardianRelationship.trim() || undefined
        : undefined,
      secondary_guardian_email: showSecondaryGuardian
        ? contactForm.secondaryGuardianEmail.trim() || undefined
        : undefined,
      secondary_guardian_phone: showSecondaryGuardian
        ? contactForm.secondaryGuardianPhone.trim() || undefined
        : undefined,
      emergency_contact_name: contactForm.emergencyContactName.trim(),
      emergency_contact_relationship: contactForm.emergencyContactRelationship.trim(),
      emergency_contact_phone: contactForm.emergencyContactPhone.trim(),
      medical_allergies: contactForm.medicalAllergies.trim() || undefined,
      medical_conditions: contactForm.medicalConditions.trim() || undefined,
      physician_name: contactForm.physicianName.trim() || undefined,
      physician_phone: contactForm.physicianPhone.trim() || undefined,
    };

    try {
      await completeAthleteRegistration(athleteId, payload);
      setFeedback("Contact and emergency information saved. Operations will sync it shortly.");
    } catch (error) {
      console.error("Failed to update contact info", error);
      setFeedback("Failed to update contact and medical details. Please try again.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleThemeSelection = (mode: ThemeId) => {
    setThemeId(mode);
    setFeedback(`Theme ${mode === "dark" ? "dark" : "light"} applied.`);
  };

  const handleTeamArchiveDownload = async (includePosts: boolean) => {
    if (!isAdminOrStaff) {
      setMaintenanceFeedback("Only admins and staff can export team content.");
      return;
    }
    if (!maintenanceTeamId) {
      setMaintenanceFeedback("Select a team to export.");
      return;
    }
    setIsExportingArchive(true);
    setMaintenanceFeedback(null);
    try {
      const blob = await exportTeamPostsArchive({
        teamId: maintenanceTeamId,
        deleteAfter: deleteAfterDownload,
        includePosts,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = includePosts ? "team-feed-media-text.zip" : "team-feed-media-only.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setMaintenanceFeedback(
        `${includePosts ? "Media + text" : "Media only"} download complete${
          deleteAfterDownload ? " and content removed." : "."
        }`,
      );
    } catch (error) {
      console.error("Failed to export team posts", error);
      setMaintenanceFeedback("Unable to export team content. Please try again.");
    } finally {
      setIsExportingArchive(false);
    }
  };

  const CollapsibleCard = ({
    title,
    description,
    isOpen,
    onToggle,
    children,
    className = "",
  }: {
    title: string;
    description?: string;
    isOpen: boolean;
    onToggle: () => void;
    children: ReactNode;
    className?: string;
  }) => (
    <section className={`rounded-2xl border border-black/5 bg-container-gradient p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-container-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-container-foreground transition hover:border-action-primary"
          aria-expanded={isOpen}
        >
          <span className="sr-only">{isOpen ? "Collapse" : "Expand"}</span>
          <FontAwesomeIcon
            icon={faChevronDown}
            aria-hidden="true"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {isOpen ? <div className="mt-4 space-y-4">{children}</div> : null}
    </section>
  );

  return (
    <div className="space-y-8 settings-page">
      <CollapsibleCard
        title="Settings"
        description="Update your personal details, athlete info, and appearance preferences in one place."
        isOpen={isSummaryOpen}
        onToggle={() => setSummaryOpen((open) => !open)}
        className="shadow-lg"
      >
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <span>
            Signed in as: <strong>{user?.email}</strong>
          </span>
          <span>
            Role: <strong className="uppercase">{user?.role}</strong>
          </span>
          <Link to="/player-profile" className="text-action-primary hover:underline">
            View public profile
          </Link>
        </div>
        {feedback ? (
          <div className="rounded-xl border border-action-primary/30 bg-action-primary/10 px-4 py-3 text-sm text-action-primary-foreground">
            {feedback}
          </div>
        ) : null}
      </CollapsibleCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <CollapsibleCard
          title="Athlete photo"
          description="Select a new square image (PNG or JPG) to use across the app."
          isOpen={isPhotoOpen}
          onToggle={() => setPhotoOpen((open) => !open)}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-sidebar text-3xl font-bold text-sidebar-foreground shadow">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="flex items-center justify-center rounded-full border border-dashed border-action-primary/40 px-4 py-2 text-sm font-medium text-action-primary transition hover:border-action-primary hover:bg-action-primary/10">
                Choose image
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-xs text-muted">Recommended size: 600x600px. Max file size 4MB.</p>
              <button
                type="button"
                onClick={handlePhotoUpload}
                className="inline-flex w-full items-center justify-center rounded-full bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-md transition hover:bg-action-primary/90"
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? "Uploading..." : "Save new photo"}
              </button>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Theme"
          description="Choose between light and dark mode. Changes apply immediately."
          isOpen={isThemeOpen}
          onToggle={() => setThemeOpen((open) => !open)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {(["light", "dark"] as ThemeId[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleThemeSelection(mode)}
                className={`flex flex-col items-start rounded-2xl border px-4 py-5 text-left shadow-sm transition ${
                  themeId === mode
                    ? "border-action-primary bg-action-primary/10 ring-2 ring-action-primary/40"
                    : "border-black/10 hover:border-action-primary/60"
                }`}
              >
                <span className="text-sm font-semibold capitalize text-container-foreground">
                  {mode === "dark" ? "Dark mode" : "Light mode"}
                </span>
                <span className="text-xs text-muted">
                  {mode === "dark"
                    ? "Optimized colors for low-light environments."
                    : "Balanced contrast for everyday readability."}
                </span>
              </button>
            ))}
          </div>
        </CollapsibleCard>
      </div>

      <section className="rounded-2xl border border-black/5 bg-container-gradient p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-container-foreground">Personal details</h2>
          <p className="text-sm text-muted">Keep the same data you provided when your account was created.</p>
        </header>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleProfileSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            First name
            <input
              type="text"
              name="firstName"
              value={profileForm.firstName}
              onChange={handleProfileChange}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Last name
            <input
              type="text"
              name="lastName"
              value={profileForm.lastName}
              onChange={handleProfileChange}
              required
            />
          </label>
          {isAthlete && (
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Birth date
              <input
                type="date"
                name="birthDate"
                value={profileForm.birthDate}
                onChange={handleProfileChange}
                required
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Gender
            <select
              name="gender"
              value={profileForm.gender}
              onChange={handleProfileChange}
              className="min-h-[42px]"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Email
            <input
              type="email"
              name="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Phone
            <input type="tel" name="phone" value={profileForm.phone} onChange={handleProfileChange} />
          </label>
          <div className="flex items-end md:col-span-3">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-md transition hover:bg-action-primary/90 disabled:opacity-70"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? "Saving..." : "Save personal details"}
            </button>
          </div>
        </form>
      </section>

      {isAthlete && (
      <section className="rounded-2xl border border-black/5 bg-container-gradient p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-container-foreground">Athlete information</h2>
          <p className="text-sm text-muted">
            These fields power reports, dashboards, and public pages. Update them whenever something changes.
          </p>
        </header>
        <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleAthleteSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Height (cm)
            <input
              type="number"
              name="height"
              min={100}
              max={250}
              value={athleteForm.height}
              onChange={handleAthleteChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Weight (kg)
            <input
              type="number"
              name="weight"
              min={40}
              max={160}
              value={athleteForm.weight}
              onChange={handleAthleteChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Dominant foot
            <select name="dominantFoot" value={athleteForm.dominantFoot} onChange={handleAthleteChange}>
              <option value="">Select</option>
              <option value="right">Right</option>
              <option value="left">Left</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Preferred position
            <input
              type="text"
              name="preferredPosition"
              value={athleteForm.preferredPosition}
              onChange={handleAthleteChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Desired shirt number
            <input
              type="text"
              name="desiredNumber"
              value={athleteForm.desiredNumber}
              onChange={handleAthleteChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Registration year
            <input
              type="text"
              name="registrationYear"
              value={athleteForm.registrationYear}
              onChange={handleAthleteChange}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Registration category
            <select
              name="registrationCategory"
              value={athleteForm.registrationCategory}
              onChange={handleAthleteChange}
            >
              {registrationCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Player status
            <select
              name="playerStatus"
              value={athleteForm.playerStatus}
              onChange={handleAthleteChange}
            >
              {playerStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
            Team
            <select
              name="teamId"
              value={athleteForm.teamId}
              onChange={handleAthleteChange}
              disabled={teamsQuery.isLoading}
            >
              <option value="">Select team</option>
              {teamsQuery.data?.map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <div className="lg:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              All changes stay local until your operations team syncs them.
            </p>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-md transition hover:bg-action-primary/90 disabled:opacity-70 sm:w-auto"
              disabled={isSavingAthlete}
            >
              {isSavingAthlete ? "Saving..." : "Save athlete information"}
            </button>
          </div>
        </form>
      </section>
      )}

      {isAthlete && (
      <section className="rounded-2xl border border-black/5 bg-container-gradient p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-container-foreground">Contact, guardian, and medical details</h2>
          <p className="text-sm text-muted">
            Complete the same information requested during onboarding so staff members have everything they need.
          </p>
        </header>
        <form className="space-y-6" onSubmit={handleContactSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Address line 1
              <input
                type="text"
                name="addressLine1"
                value={contactForm.addressLine1}
                onChange={handleContactChange}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Address line 2
              <input
                type="text"
                name="addressLine2"
                value={contactForm.addressLine2}
                onChange={handleContactChange}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              City
              <input type="text" name="city" value={contactForm.city} onChange={handleContactChange} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Province / State
              <input type="text" name="province" value={contactForm.province} onChange={handleContactChange} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Postal code
              <input type="text" name="postalCode" value={contactForm.postalCode} onChange={handleContactChange} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Country
              <input type="text" name="country" value={contactForm.country} onChange={handleContactChange} />
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-container-foreground">Primary guardian</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                Name
                <input
                  type="text"
                  name="guardianName"
                  value={contactForm.guardianName}
                  onChange={handleContactChange}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                Relationship
                <input
                  type="text"
                  name="guardianRelationship"
                  value={contactForm.guardianRelationship}
                  onChange={handleContactChange}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                Email
                <input
                  type="email"
                  name="guardianEmail"
                  value={contactForm.guardianEmail}
                  onChange={handleContactChange}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                Phone
                <input
                  type="text"
                  name="guardianPhone"
                  value={contactForm.guardianPhone}
                  onChange={handleContactChange}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-container-foreground">Secondary guardian</h3>
              <button
                type="button"
                onClick={() => setShowSecondaryGuardian((prev) => !prev)}
                className="text-sm font-semibold text-action-primary hover:underline"
              >
                {showSecondaryGuardian ? "Hide secondary guardian" : "Add secondary guardian"}
              </button>
            </div>
            {showSecondaryGuardian && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                  Name
                  <input
                    type="text"
                    name="secondaryGuardianName"
                    value={contactForm.secondaryGuardianName}
                    onChange={handleContactChange}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                  Relationship
                  <input
                    type="text"
                    name="secondaryGuardianRelationship"
                    value={contactForm.secondaryGuardianRelationship}
                    onChange={handleContactChange}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                  Email
                  <input
                    type="email"
                    name="secondaryGuardianEmail"
                    value={contactForm.secondaryGuardianEmail}
                    onChange={handleContactChange}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                  Phone
                  <input
                    type="text"
                    name="secondaryGuardianPhone"
                    value={contactForm.secondaryGuardianPhone}
                    onChange={handleContactChange}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-container-foreground">Emergency contact</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                Name
                <input
                  type="text"
                  name="emergencyContactName"
                  value={contactForm.emergencyContactName}
                  onChange={handleContactChange}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                Relationship
                <input
                  type="text"
                  name="emergencyContactRelationship"
                  value={contactForm.emergencyContactRelationship}
                  onChange={handleContactChange}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
                Phone
                <input
                  type="text"
                  name="emergencyContactPhone"
                  value={contactForm.emergencyContactPhone}
                  onChange={handleContactChange}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Medical allergies
              <textarea
                name="medicalAllergies"
                rows={3}
                value={contactForm.medicalAllergies}
                onChange={handleContactChange}
              ></textarea>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Medical conditions
              <textarea
                name="medicalConditions"
                rows={3}
                value={contactForm.medicalConditions}
                onChange={handleContactChange}
              ></textarea>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Physician name
              <input
                type="text"
                name="physicianName"
                value={contactForm.physicianName}
                onChange={handleContactChange}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-container-foreground">
              Physician phone
              <input
                type="text"
                name="physicianPhone"
                value={contactForm.physicianPhone}
                onChange={handleContactChange}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              This information mirrors the onboarding form and helps coordinators keep athletes safe.
            </p>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-md transition hover:bg-action-primary/90 disabled:opacity-70 sm:w-auto"
              disabled={isSavingContact}
            >
              {isSavingContact ? "Saving..." : "Save contact & medical details"}
            </button>
          </div>
        </form>
      </section>
      )}

      {isAdminOrStaff ? (
        <section className="rounded-2xl border border-black/5 bg-container-gradient p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-container-foreground">Season Maintenance</h2>
              <p className="text-sm text-muted">
                Export or clean team feeds. Pick the team, choose media-only or raw content, and optionally delete after download.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-container-foreground transition hover:border-action-primary"
              aria-expanded={isMaintenanceOpen}
            >
              <span className="sr-only">{isMaintenanceOpen ? "Collapse" : "Expand"}</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                aria-hidden="true"
                className={`transition-transform ${isMaintenanceOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {isMaintenanceOpen ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr] sm:items-end">
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">Team</span>
                  <select
                    value={maintenanceTeamId ?? ""}
                    onChange={(event) => setMaintenanceTeamId(Number(event.target.value))}
                    disabled={teamsQuery.isLoading || (teamsQuery.data?.length ?? 0) === 0}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {(teamsQuery.data ?? []).map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.age_category})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-container-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-black/30 text-action-primary focus:ring-action-primary"
                    checked={deleteAfterDownload}
                    onChange={(event) => setDeleteAfterDownload(event.target.checked)}
                  />
                  Remove posts after download
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleTeamArchiveDownload(false)}
                  disabled={
                    isExportingArchive ||
                    teamsQuery.isLoading ||
                    (teamsQuery.data?.length ?? 0) === 0 ||
                    !maintenanceTeamId
                  }
                  className="rounded-md border border-black/15 bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExportingArchive ? "Preparing..." : "Export Media"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTeamArchiveDownload(true)}
                  disabled={
                    isExportingArchive ||
                    teamsQuery.isLoading ||
                    (teamsQuery.data?.length ?? 0) === 0 ||
                    !maintenanceTeamId
                  }
                  className="rounded-md border border-black/15 bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExportingArchive ? "Preparing..." : "Export Media + Text"}
                </button>
              </div>
              {maintenanceFeedback ? (
                <p className="text-sm text-muted">{maintenanceFeedback}</p>
              ) : null}
              {teamsQuery.isLoading ? (
                <p className="text-xs text-muted">Loading teams...</p>
              ) : null}
              {!teamsQuery.isLoading && (teamsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted">No teams available to export.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export default Settings;
