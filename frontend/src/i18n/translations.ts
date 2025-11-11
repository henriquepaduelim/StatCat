export type Locale = "en";

type DashboardTimeRange = "30d" | "90d" | "180d" | "365d" | "all";

type RangeOption<T extends string> = {
  value: T;
  label: string;
};

export type TranslationDictionary = {
  common: {
    appName: string;
    dashboard: string;
    athletes: string;
    newAthlete: string;
    sessions: string;
    reports: string;
    logout: string;
    loading: string;
    cancel: string;
    save: string;
    create: string;
    edit: string;
    delete: string;
    back: string;
    select: string;
    customerArea: string;
    learnMore: string;
    signIn: string;
    heroBadge: string;
    theme: string;
    clear: string;
  };
  home: {
    heroBullets: string[];
    heroTitle: string;
    heroDescription: string;
    ctaPrimary: string;
    ctaSecondary: string;
    highlightTitle: string;
    highlightDescription: string;
    highlightFooter: string;
    stats: Array<{ label: string; value: string; description: string }>;
    videoTitle: string;
    videoDescription: string;
    videoCTA: string;
    videoCaption: string;
    quickInfoTitle: string;
    quickInfo: Array<{ title: string; description: string }>;
    featuresTitle: string;
    featuresSubtitle: string;
    features: Array<{ title: string; description: string }>;
    footer: string;
  };
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    error: string;
    seeds: string;
  };
  dashboard: {
    title: string;
    description: string;
    demoNotice: string;
    filters: {
      timeRangeLabel: string;
      timeRangeDescription: string;
      rangeOptions: Array<RangeOption<DashboardTimeRange>>;
      athleteLabel: string;
      athletePlaceholder: string;
    };
    mainSkills: {
      currentLabel: string;
      deltaLabel: string;
      noPrevious: string;
      remainingLabel: string;
      labels: {
        physical: string;
        technical: string;
      };
    };
    sessionComparison: {
      title: string;
      subtitle: string;
      previousLabel: string;
      currentLabel: string;
      deltaLabel: string;
      noDelta: string;
      noData: string;
    };
    athleteReport: {
      title: string;
      subtitle: string;
      noAthlete: string;
      chartTitle: string;
      chartEmpty: string;
      selectTestLabel: string;
      bestValueLabel: string;
      lastValueLabel: string;
      averageLabel: string;
      peerAverageLabel: string;
      metricsTitle: string;
      recentSessionsTitle: string;
      printButton: string;
      printHelper: string;
      ageLabel: string;
      bmiLabel: string;
      restingHeartRateLabel: string;
      restingHeartRateUnit: string;
      sittingHeightLabel: string;
      sittingHeightUnit: string;
      legLengthLabel: string;
      legLengthUnit: string;
      notAvailable: string;
      sprintAnalysis: {
        title: string;
        split10_20: string;
        split20_35: string;
        speed0_10: string;
        speed10_20: string;
        speed20_35: string;
      };
    };
    summary: {
      title: string;
      subtitle: string;
      teamLabel: string;
      teamPlaceholder: string;
      coachesTitle: string;
      coachesSubtitle: string;
      coachesEmpty: string;
      addCoachButton: string;
      removeCoachLabel: string;
      columns: {
        name: string;
        contact: string;
        availability: string;
      };
      availability: {
        available: string;
        unavailable: string;
      };
      loading: string;
      error: string;
      emptyTeam: string;
      empty: string;
      noEvents: string;
      contactFallback: string;
      positionFallback: string;
      coachForm: {
        nameLabel: string;
        emailLabel: string;
        passwordLabel: string;
        submitLabel: string;
        cancelLabel: string;
        helper: string;
        errorLabel: string;
      };
      coachDirectory: {
        title: string;
        helper: string;
        selectedTeamLabel: string;
        listTitle: string;
        coachCountSingular: string;
        coachCountPlural: string;
        coachesLoading: string;
        coachesError: string;
        noCoaches: string;
        phoneFallback: string;
        addTitle: string;
        nameLabel: string;
        emailLabel: string;
        phoneLabel: string;
        passwordLabel: string;
        assignToggle: string;
        cancelLabel: string;
        createSubmit: string;
        createSuccess: string;
        assignSuccess: string;
        removeSuccess: string;
        createError: string;
        assignError: string;
        removeError: string;
        assignButton: string;
        removeButton: string;
        assignDisabled: string;
        closeButton: string;
      };
      calendar: {
        title: string;
        subtitle: string;
        prevMonth: string;
        nextMonth: string;
        createButton: string;
        upcomingTitle: string;
        upcomingEmpty: string;
        formTitle: string;
        nameLabel: string;
        dateLabel: string;
        timeLabel: string;
        timeTbd: string;
        locationLabel: string;
        notesLabel: string;
        teamLabel: string;
        coachLabel: string;
        coachLoading: string;
        coachEmpty: string;
        inviteLabel: string;
        inviteHelper: string;
        inviteHeaderSelect: string;
        inviteHeaderAthlete: string;
        noAthletes: string;
        submitLabel: string;
        cancelLabel: string;
        errorIncomplete: string;
        filterLabel: string;
        filterHelper: string;
        filterEmpty: string;
      };
    };
  };
  athletes: {
    title: string;
    description: string;
    empty: string;
    loading: string;
    error: string;
    add: string;
    table: {
      name: string;
      age: string;
      gender: string;
      email: string;
      team: string;
      coachLabel: string;
      coachUnknown: string;
      teamUnknown: string;
      action: string;
      status: string;
    };
    filters: {
      search: string;
      searchPlaceholder: string;
      status: string;
      statusAll: string;
      statusActive: string;
      statusInactive: string;
      sortBy: string;
      sortName: string;
      sortAge: string;
      sortAsc: string;
      sortDesc: string;
      noResults: string;
      nameContains: string;
      emailContains: string;
      ageRange: string;
      ageHint: string;
      ageMin: string;
      ageMax: string;
      sortLabel: string;
      sortAlphaAsc: string;
      sortAlphaDesc: string;
      sortAgeAsc: string;
      sortAgeDesc: string;
      sortStatusAsc: string;
      sortStatusDesc: string;
      gender: string;
      genderAll: string;
      genderMale: string;
      genderFemale: string;
      sortGenderAsc: string;
      sortGenderDesc: string;
      clear: string;
      close: string;
      openMenu: string;
    };
    actions: {
      delete: string;
      edit: string;
      view: string;
      deleteLabel: (name: string) => string;
      editLabel: (name: string) => string;
      viewLabel: (name: string) => string;
    };
    deleteConfirmTitle: (firstName: string, lastName: string) => string;
    deleteConfirmDescription: string;
    deleteSuccess: string;
    deleteError: string;
  };
  newAthlete: {
    title: string;
    subtitle: string;
    client: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    club: string;
    birthDate: string;
    height: string;
    weight: string;
    team: string;
    dominantFoot: string;
    dominantFootOptions: {
      default: string;
      right: string;
      left: string;
      both: string;
    };
    gender: string;
    genderOptions: { male: string; female: string };
    primaryPosition: string;
    secondaryPosition: string;
    secondaryPositionHint: string;
    photo: string;
    photoHint: string;
    status: string;
    statusOptions: { active: string; inactive: string };
    submit: string;
    layoutApplied: string;
    error: string;
    stepOneTitle: string;
    stepOneSubtitle: string;
    identitySection: string;
    registrationSection: string;
    registrationYear: string;
    registrationCategory: string;
    playerStatus: string;
    preferredPosition: string;
    desiredNumber: string;
    submitStepOne: string;
    selectTeamPlaceholder: string;
    stepTwoTitle: string;
    stepTwoSubtitle: (name: string) => string;
    stepTwoDefaultSubtitle: string;
    stepTwoSuccess: string;
    contactSection: string;
    addressSection: string;
    addressStreet: string;
    addressNumber: string;
    addressCity: string;
    addressProvince: string;
    addressPostal: string;
    addressCountry: string;
    guardianSection: string;
    enableSecondGuardian: string;
    guardianName: string;
    guardianRelationship: string;
    guardianEmail: string;
    guardianPhone: string;
    secondGuardianName: string;
    secondGuardianRelationship: string;
    secondGuardianEmail: string;
    secondGuardianPhone: string;
    emergencySection: string;
    emergencyName: string;
    emergencyRelationship: string;
    emergencyPhone: string;
    medicalSection: string;
    medicalAllergies: string;
    medicalConditions: string;
    physicianName: string;
    physicianPhone: string;
    documentsSection: string;
    addDocument: string;
    noDocuments: string;
    documentLabel: string;
    documentFile: string;
    documentLink: string;
    documentUploadError: string;
    paymentSection: string;
    paymentAmount: string;
    paymentCurrency: string;
    paymentMethod: string;
    paymentReference: string;
    paymentDate: string;
    paymentReceipt: string;
    fileSaved: string;
    stepTwoSubmit: string;
  };
  athleteDetail: {
    profileSubtitle: string;
    infoTitle: string;
    lastReportTitle: string;
    upload: string;
    uploadPending: string;
    uploadError: string;
    metrics: {
      email: string;
      club: string;
      height: string;
      weight: string;
      dominantFoot: string;
      gender: string;
    };
    backToList: string;
  };
  athleteAssessment: {
    title: string;
    profileSectionTitle: string;
    profileSaved: string;
    sessionHeading: string;
    sessionDescription: string;
    testsHeading: string;
    testsDescription: string;
    submit: string;
    success: string;
    errorNoValues: string;
    noTests: string;
    viewReport: string;
  };
  sessions: {
    title: string;
    description: string;
    nextSessions: string;
    newSession: string;
    loading: string;
    empty: string;
    notesEmpty: string;
  };
    reports: {
      title: string;
      description: string;
      selectAthlete: string;
      selectPlaceholder: string;
      export: string;
      soon: string;
      loading: string;
      error: string;
      noAthlete: string;
      assessmentSelectAthlete: string;
      summary: string;
      summarySessions: (count: number) => string;
      metricsBadge: (count: number) => string;
    metricFallback: string;
    sessionDate: (value: string | null) => string;
  };
  forms: {
    session: {
      title: string;
      subtitle: string;
      client: string;
      name: string;
      location: string;
      date: string;
      notes: string;
      submit: string;
      success: string;
      error: string;
    };
    test: {
      title: string;
      subtitle: string;
      client: string;
      name: string;
      category: string;
      unit: string;
      description: string;
      targetDirection: string;
      targetOptions: { higher: string; lower: string };
      submit: string;
      success: string;
      error: string;
    };
  };
  admin: {
    title: string;
    subtitle: string;
    filters: {
      periodLabel: string;
      statusLabel: string;
      periods: Array<{ value: string; label: string }>;
      statuses: Array<{ value: string; label: string }>;
    };
    kpis: {
      activeClients: string;
      sessions: string;
      adhesion: string;
      performanceDelta: string;
    };
    tables: {
      clients: string;
      headers: {
        client: string;
        sessions: string;
        adhesion: string;
        delta: string;
        actions: string;
      };
      actions: {
        view: string;
        settings: string;
        reports: string;
      };
    };
    charts: {
      topClients: string;
      sessionsTrend: string;
      calendar: string;
    };
    empty: string;
  };
};

const formatDate = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    common: {
      appName: "StatCat",
      dashboard: "HOME",
      athletes: "ATHLETES",
      newAthlete: "New Athlete",
      sessions: "Sessions",
      reports: "REPORTS",
      logout: "SIGN OUT",
      loading: "Loading",
      cancel: "Cancel",
      save: "Save",
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      back: "Back",
      select: "Select",
      customerArea: "START",
      learnMore: "Discover features",
      signIn: "SIGN IN",
      heroBadge: "SaaS platform for football combines",
      theme: "Theme",
      clear: "Clear",
    },
    home: {
      heroBullets: [
        "Real-time capture from tablets and mobile devices.",
        "Automated scoring benchmarks by position and role.",
        "Secure media locker with branded delivery.",
      ],
      heroTitle: "Capture decisive data and deliver branded reports for your club.",
      heroDescription:
        "Plan physical, technical and cognitive assessments, store imagery, generate branded reports and share them with partner clubs in seconds.",
      ctaPrimary: "Access management area",
      ctaSecondary: "Explore key features",
      highlightTitle: "Custom report",
      highlightDescription:
        "Layout aligned with the club identity, consolidated metrics and direct links to media captured on the field.",
      highlightFooter: "Automatic delivery to partner clubs",
      stats: [
        {
          label: "Athletes evaluated",
          value: "+1,200",
          description: "Historical results from official combines",
        },
        {
          label: "Clubs served",
          value: "18",
          description: "Professional clubs and academies with bespoke branding",
        },
        {
          label: "Custom tests",
          value: "45",
          description: "Physical, technical and cognitive protocols",
        },
      ],
      videoTitle: "Immersive evaluation highlight",
      videoDescription:
        "Scroll through the page and let the highlight reel follow you. Replace this sample clip by saving your own video at public/media/hero-tech.mp4.",
      videoCTA: "Enter management area",
      videoCaption:
        "Place your highlight reel at public/media/hero-tech.mp4 (optional poster at public/media/hero-tech-poster.jpg).",
      quickInfoTitle: "Why clubs adopt Combine Football",
      quickInfo: [
        {
          title: "Live data stream",
          description:
            "Tag metrics from mobile devices and sync dashboards in real time, even with limited connectivity.",
        },
        {
          title: "Brand ready",
          description:
            "Deliver reports with club colours, typography and sponsor placements in one click.",
        },
        {
          title: "Media locker",
          description:
            "Store slow-motion drills, high-speed footage and share secure links with scouts.",
        },
      ],
      featuresTitle: "Built for high-performance teams",
      featuresSubtitle: "A modular platform for evaluation camps, scouting days and academy programs.",
      features: [
        {
          title: "Custom test designer",
          description:
            "Combine physical, technical and cognitive KPIs with units, limits and automatic scoring rules.",
        },
        {
          title: "Session choreography",
          description:
            "Assign evaluators, plan stations and capture notes from tablets or smartphones on the field.",
        },
        {
          title: "Automated reporting",
          description:
            "Generate branded PDFs with leaderboards, trend charts and embedded media in a few seconds.",
        },
      ],
      footer: "Combine intelligence for elite football.",
    },
    login: {
      title: "Sign in to your StatCat",
      subtitle: "Access dashboards, manage sessions and share reports with partner clubs.",
      email: "Email",
      password: "Password",
      error: "Invalid credentials. Please try again.",
      seeds:
        "Demo accounts: admin@combine.local / admin123, staff@combine.local / staff123, coach@combine.local / coach123",
    },
    dashboard: {
      title: "Club Management Dashboard",
      description:
        "Monitor your athletes’ performance data and build insights that help your club grow.",
      demoNotice: "Interactive preview using synthetic metrics until live combine data is synced.",
      filters: {
        timeRangeLabel: "Time range",
        timeRangeDescription: "Adjust the horizon to explore the training load.",
        rangeOptions: [
          { value: "30d", label: "30 days" },
          { value: "90d", label: "90 days" },
          { value: "180d", label: "180 days" },
          { value: "365d", label: "12 months" },
          { value: "all", label: "All time" },
        ],
        athleteLabel: "Athlete focus",
        athletePlaceholder: "Select an athlete",
      },
      mainSkills: {
        currentLabel: "Current",
        deltaLabel: "vs previous",
        noPrevious: "No previous checkpoint",
        remainingLabel: "Remaining",
        labels: {
          physical: "Physical index",
          technical: "Technical index",
        },
      },
      sessionComparison: {
        title: "Latest vs previous checkpoint",
        subtitle: "Compare aggregated indexes across performance categories.",
        previousLabel: "Previous",
        currentLabel: "Current",
        deltaLabel: "change",
        noDelta: "No change recorded",
        noData: "Not enough sessions to compare yet.",
      },
    athleteReport: {
      title: "Athlete focus",
      subtitle: "Select an athlete to explore individual progression.",
      noAthlete: "Select an athlete to see the report card.",
        chartTitle: "Progression",
        chartEmpty: "There are no recorded results for this athlete.",
        selectTestLabel: "Metric",
        bestValueLabel: "Best value",
        lastValueLabel: "Last result",
        averageLabel: "Average",
        peerAverageLabel: "Age-group average",
        metricsTitle: "At a glance",
        recentSessionsTitle: "Recent sessions",
        printButton: "Print PDF",
        printHelper: "Only the report card is included in the print view.",
        ageLabel: "Age",
        bmiLabel: "BMI",
        restingHeartRateLabel: "Resting HR",
        restingHeartRateUnit: "bpm",
        sittingHeightLabel: "Sitting height",
        sittingHeightUnit: "cm",
      legLengthLabel: "Leg length",
      legLengthUnit: "cm",
      notAvailable: "N/A",
      sprintAnalysis: {
        title: "Sprint Analysis",
        split10_20: "10-20m Split",
        split20_35: "20-35m Split",
        speed0_10: "0-10m Avg. Speed",
        speed10_20: "10-20m Avg. Speed",
        speed20_35: "20-35m Avg. Speed",
      },
    },
    summary: {
      title: "Team availability",
      subtitle: "View roster readiness one team at a time for matches, training or events.",
      teamLabel: "Team",
      teamPlaceholder: "Select a team",
      coachesTitle: "Coach",
      coachesSubtitle: "Invite coaches to access their roster and upcoming sessions.",
      coachesEmpty: "No coaches assigned to this team yet.",
      addCoachButton: "Coaches",
      removeCoachLabel: "Remove",
      columns: {
        name: "Athlete",
        contact: "Email ",
        availability: "Availability",
      },
      availability: {
        available: "Available",
        unavailable: "Unavailable",
      },
      loading: "Loading roster...",
      error: "Unable to load roster data.",
      emptyTeam: "Select a team to display the roster.",
      empty: "No athletes assigned to this team yet.",
      noEvents: "No events scheduled. Create an event to view team availability.",
      contactFallback: "No email provided",
      positionFallback: "Position not set",
      coachForm: {
        nameLabel: "Full name",
        emailLabel: "Email",
        passwordLabel: "Temporary password",
        submitLabel: "Create coach",
        cancelLabel: "Cancel",
        helper: "Share the credentials manually. Passwords can be changed after the first login.",
        errorLabel: "Please provide name, email and password.",
      },
      coachDirectory: {
        title: "Coaching directory",
        helper: "Review all coaches and manage team assignments.",
        selectedTeamLabel: "Selected team",
        listTitle: "All coaches",
        coachCountSingular: "coach",
        coachCountPlural: "coaches",
        coachesLoading: "Loading coaches...",
        coachesError: "Unable to load coaches.",
        noCoaches: "No coaches registered yet.",
        phoneFallback: "Phone not provided",
        addTitle: "Add new coach",
        nameLabel: "Full name",
        emailLabel: "Email",
        phoneLabel: "Phone",
        passwordLabel: "Temporary password",
        assignToggle: "Assign to selected team",
        cancelLabel: "Cancel",
        createSubmit: "Create coach",
        createSuccess: "Coach added successfully.",
        assignSuccess: "Coach assigned to the team.",
        removeSuccess: "Coach removed from the team.",
        createError: "Unable to create coach.",
        assignError: "Unable to assign coach.",
        removeError: "Unable to remove coach.",
        assignButton: "Assign",
        removeButton: "Remove",
        assignDisabled: "Select a team to assign coaches.",
        closeButton: "Close",
      },
      calendar: {
        title: "Upcoming events",
        subtitle: "",
        prevMonth: "Prev",
        nextMonth: "Next",
        createButton: "New event",
        upcomingTitle: "Next on deck",
        upcomingEmpty: "No events scheduled yet.",
        formTitle: "Create event",
        nameLabel: "Event name",
        dateLabel: "Date",
        timeLabel: "Time",
        timeTbd: "Time TBD",
        locationLabel: "Location",
        notesLabel: "Notes",
        teamLabel: "Team",
        coachLabel: "Coach",
        coachLoading: "Loading coaches...",
        coachEmpty: "No coaches assigned to this team.",
        inviteLabel: "Invite athletes",
        inviteHelper: "Select players to send RSVP invitations.",
        inviteHeaderSelect: "Select",
        inviteHeaderAthlete: "Athlete",
        noAthletes: "No athletes found for this team.",
        submitLabel: "Save event",
        cancelLabel: "Cancel",
        filterLabel: "Events on this date",
        filterHelper: "Only teams assigned to these events can be selected below.",
        filterEmpty: "No teams are linked to events on this date.",
        errorIncomplete: "Event name and date are required.",
      },
    },
    },
    athletes: {
      title: "Athletes",
      description: "Manage profiles and media captured during assessments.",
      empty: "No athletes registered yet.",
      loading: "Loading athletes...",
      error: "Unable to load athletes right now.",
      add: "New athlete",
      table: {
        name: "Name",
        age: "Age",
        gender: "Category",
        email: "Email",
        team: "Team",
        coachLabel: "Coach:",
        coachUnknown: "Coach not set",
        teamUnknown: "Team not assigned",
        status: "Status",
        action: "Actions",
      },
      filters: {
        search: "Search",
        searchPlaceholder: "Search by name or email",
        status: "Status",
        statusAll: "All statuses",
        statusActive: "Active",
        statusInactive: "Inactive",
        sortBy: "Sort",
        sortName: "Name",
        sortAge: "Age",
        sortAsc: "Ascending",
        sortDesc: "Descending",
        noResults: "No athletes match the current filters.",
        nameContains: "Name contains",
        emailContains: "Email contains",
        ageRange: "Age range (years)",
        ageHint: "Enter ages in years (e.g. 13 for U14).",
        ageMin: "Minimum age",
        ageMax: "Maximum age",
        sortLabel: "Order",
        sortAlphaAsc: "A → Z",
        sortAlphaDesc: "Z → A",
        sortAgeAsc: "Youngest first",
        sortAgeDesc: "Oldest first",
        sortStatusAsc: "Active first",
        sortStatusDesc: "Inactive first",
        gender: "Category",
        genderAll: "All categories",
        genderMale: "Boys",
        genderFemale: "Girls",
        sortGenderAsc: "Boys first",
        sortGenderDesc: "Girls first",
        clear: "Clear",
        close: "Close",
        openMenu: "Toggle column menu",
      },
      actions: {
        delete: "Delete",
        edit: "Session",
        view: "View card",
        deleteLabel: (name: string) => `Delete ${name}`,
        editLabel: (name: string) => `Session ${name}`,
        viewLabel: (name: string) => `View profile of ${name}`,
      },
      deleteConfirmTitle: (firstName: string, lastName: string) =>
        `Delete athlete ${firstName} ${lastName}?`,
      deleteConfirmDescription:
        "This action is permanent and removes all associated data for the athlete.",
      deleteSuccess: "Athlete removed successfully.",
      deleteError: "We couldn't remove this athlete. Try again in a moment.",
    },
    newAthlete: {
      title: "New athlete",
      subtitle: "Let's get it started.",
      client: "Club",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      club: "Club",
      birthDate: "Birthday",
      height: "Height (cm)",
      weight: "Weight (kg)",
      team: "Team",
      dominantFoot: "Dominant foot",
      dominantFootOptions: {
        default: "Select",
        right: "Right",
        left: "Left",
        both: "Both",
      },
      gender: "Category",
      genderOptions: { male: "Boys", female: "Girls" },
      primaryPosition: "Primary position",
      secondaryPosition: "Secondary position",
      secondaryPositionHint: "Optional second role",
      photo: "Profile photo",
      photoHint: "Upload from your device or use the camera. JPEG, PNG or HEIC up to 5 MB.",
      status: "Status",
      statusOptions: {
        active: "Active",
        inactive: "Inactive",
      },
      submit: "Save athlete",
      layoutApplied: "Theme applied",
      error: "Unable to save the athlete. Please review the fields.",
      stepOneTitle: "Register athlete",
      stepOneSubtitle: "Capture the essentials to link this athlete to the current season.",
      identitySection: "Identity",
      registrationSection: "Registration",
      registrationYear: "Season / year",
      registrationCategory: "Registration category",
      playerStatus: "Player status",
      preferredPosition: "Preferred position",
      desiredNumber: "Preferred shirt number",
      submitStepOne: "Continue",
      selectTeamPlaceholder: "Select a team",
      stepTwoTitle: "Complete athlete registration",
      stepTwoSubtitle: (name: string) => `Provide contact and administrative details for ${name}.`,
      stepTwoDefaultSubtitle: "Provide contact and administrative details to finish this registration.",
      stepTwoSuccess: "Registration saved successfully.",
      contactSection: "Primary contact",
      addressSection: "Address",
      addressStreet: "Street",
      addressNumber: "Number / apartment",
      addressCity: "City",
      addressProvince: "State / province",
      addressPostal: "Postal code",
      addressCountry: "Country",
      guardianSection: "Guardians",
      enableSecondGuardian: "Add a second guardian",
      guardianName: "Guardian name",
      guardianRelationship: "Relationship",
      guardianEmail: "Guardian email",
      guardianPhone: "Guardian phone",
      secondGuardianName: "Second guardian name",
      secondGuardianRelationship: "Second guardian relationship",
      secondGuardianEmail: "Second guardian email",
      secondGuardianPhone: "Second guardian phone",
      emergencySection: "Emergency contact",
      emergencyName: "Emergency contact name",
      emergencyRelationship: "Relationship",
      emergencyPhone: "Phone",
      medicalSection: "Medical information",
      medicalAllergies: "Allergies",
      medicalConditions: "Relevant conditions",
      physicianName: "Doctor name",
      physicianPhone: "Doctor phone",
      documentsSection: "Documents",
      addDocument: "Add document",
      noDocuments: "No documents added yet.",
      documentLabel: "Document label",
      documentFile: "Upload file",
      documentLink: "Stored link",
      documentUploadError: "Upload failed. Try again.",
      paymentSection: "Registration fee",
      paymentAmount: "Amount",
      paymentCurrency: "Currency",
      paymentMethod: "Payment method",
      paymentReference: "Reference",
      paymentDate: "Payment date",
      paymentReceipt: "Receipt",
      fileSaved: "File saved",
      stepTwoSubmit: "Save and finish",
    },
    athleteDetail: {
      profileSubtitle: "Athlete details",
      infoTitle: "General information",
      lastReportTitle: "Latest report",
      upload: "Upload photo",
      uploadPending: "Uploading...",
      uploadError: "Upload failed. Try a different file.",
      metrics: {
        email: "Email",
        club: "Club",
        height: "Height",
        weight: "Weight",
        dominantFoot: "Dominant foot",
        gender: "Category",
      },
      backToList: "Back to athletes",
    },
    athleteAssessment: {
      title: "Assessment & data capture",
      profileSectionTitle: "Update athlete information",
      profileSaved: "Profile updated successfully.",
      sessionHeading: "New assessment session",
      sessionDescription:
        "Define when and where this assessment happens. Notes are saved with the session report.",
      testsHeading: "Record test results",
      testsDescription:
        "Enter the values collected in the field. Leave blank if a protocol was skipped.",
      submit: "Save session and results",
      success: "Session created and results stored.",
      errorNoValues: "Add at least one measurement before saving the assessment.",
      noTests: "No tests available for this client yet.",
      viewReport: "Open athlete report",
    },
    sessions: {
      title: "Sessions",
      description: "Plan upcoming assessments and monitor the pipeline of tests.",
      nextSessions: "Upcoming sessions",
      newSession: "New session",
      loading: "Loading sessions...",
      empty: "No sessions yet. Create the first one to begin tracking.",
      notesEmpty: "No notes",
    },
    reports: {
      title: "Reports",
      description: "Analyse individual results and export branded deliverables.",
      selectAthlete: "Select athlete",
      selectPlaceholder: "Choose an athlete",
      export: "Export",
      soon: "coming soon",
      loading: "Loading report...",
      error: "Unable to load the report.",
      noAthlete: "Select an athlete to display the report.",
      assessmentSelectAthlete: "Select an athlete before adding a new assessment session.",
      summary: "Automatic summary registered after each session.",
      summarySessions: (count: number) =>
        count === 0
          ? "No sessions recorded."
          : `${count} ${count === 1 ? "session" : "sessions"} analysed in this report.`,
      metricsBadge: (count: number) => `${count} metric${count === 1 ? "" : "s"}`,
      metricFallback: "Metric",
      sessionDate: (value: string | null) =>
        value ? formatDate(new Date(value), "en") : "Date not available",
    },
    forms: {
      session: {
        title: "Create session",
        subtitle: "Define the group, location and notes for this assessment.",
        client: "Club / client",
        name: "Session name",
        location: "Location",
        date: "Date & time",
        notes: "Notes",
        submit: "Save session",
        success: "Session created successfully!",
        error: "Unable to create the session. Please try again.",
      },
      test: {
        title: "Create test",
        subtitle: "Define the parameters for your custom protocol.",
        client: "Club / client",
        name: "Test name",
        category: "Category",
        unit: "Unit",
        description: "Description",
        targetDirection: "Target direction",
        targetOptions: {
          higher: "Higher is better",
          lower: "Lower is better",
        },
        submit: "Save test",
        success: "Test created successfully!",
        error: "Unable to create the test. Please try again.",
      },
    },
    admin: {
      title: "Client performance",
      subtitle: "Monitor adoption, session volume and engagement across all accounts.",
      filters: {
        periodLabel: "Period",
        statusLabel: "Status",
        periods: [
          { value: "7", label: "Last 7 days" },
          { value: "30", label: "Last 30 days" },
          { value: "90", label: "Last 90 days" },
        ],
        statuses: [
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
      kpis: {
        activeClients: "Active clients",
        sessions: "Sessions in period",
        adhesion: "Average adoption",
        performanceDelta: "Average Δ vs previous period",
      },
      tables: {
        clients: "Clients",
        headers: {
          client: "Client",
          sessions: "Sessions",
          adhesion: "Adoption",
          delta: "Δ vs previous",
          actions: "Actions",
        },
        actions: {
          view: "View",
          settings: "Settings",
          reports: "Reports",
        },
      },
      charts: {
        topClients: "Top clients by assessments",
        sessionsTrend: "Sessions moving average",
        calendar: "Session calendar heatmap",
      },
      empty: "No client data for the selected filters.",
    },
  },
};
