export const createTeamLabels = {
  button: "Add team",
  modalTitle: "Create new team",
  helper: "Set up the roster by inviting coaches and assigning athletes.",
  nameLabel: "Team name",
  ageLabel: "Age category",
  descriptionLabel: "Description (optional)",
  coachesSection: "Coaches",
  coachesHelper: "Select coaches that are already registered to manage this team.",
  coachesLoading: "Loading coaches...",
  coachesError: "Unable to load coaches.",
  noCoaches: "No coaches available. Create coaches first.",
  athletesSection: "Assign athletes",
  athletesHelper: "Select players to include in this team.",
  athletesHeaderSelect: "Select",
  athletesHeaderAthlete: "Athlete",
  submitLabel: "Create team",
  cancelLabel: "Cancel",
  noAthletes: "No athletes available.",
  errorName: "Team name is required.",
  errorCoach: "Select at least one coach.",
} as const;

export const teamAgeOptions = ["U12", "U13", "U14", "U15", "U16", "U19"] as const;
