export const createTeamLabels = {
  button: "Add team",
  modalTitle: "Create new team",
  helper: "Set up the roster by inviting coaches and assigning athletes.",
  nameLabel: "Team Name",
  ageLabel: "Age Category",
  genderLabel: "Boys/Girls",
  descriptionLabel: "Description (optional)",
  coachesSection: "Coaches",
  coachesHelper: "Select coaches that are already registered to manage this team.",
  coachesLimitHelper: "Add up to two coaches per team using the buttons below.",
  coachesAssignedLabel: "Assigned Coaches",
  coachesAvailableLabel: "Available Coaches",
  coachesAssignedEmpty: "No coaches assigned yet.",
  coachesAvailableEmpty: "All coaches are already assigned.",
  coachesLoading: "Loading coaches...",
  coachesError: "Unable to load coaches.",
  noCoaches: "No coaches available. Create coaches first.",
  athletesSection: "Assign Athletes",
  athletesHelper: "Select players to include in this team.",
  athletesHeaderSelect: "Select",
  athletesHeaderAthlete: "Athlete",
  submitLabel: "Create Team",
  cancelLabel: "Cancel",
  noAthletes: "No athletes available.",
  errorName: "Team name is required.",
  errorCoach: "Select at least one coach.",
} as const;

export const teamAgeOptions = ["U7", "U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19"] as const;

export const genderOptions = [
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
  { value: "coed", label: "Coed" },
] as const;

export type GenderOption = (typeof genderOptions)[number];
export type GenderOptionValue = GenderOption["value"];
