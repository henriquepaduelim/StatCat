export type Locale = "en" | "fr";

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
    cards: Array<{ label: string; description: string }>;
    nextStepsTitle: string;
    nextStepsDescription: string;
    actionNewAthlete: string;
    actionNewSession: string;
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
      club: string;
      email: string;
      action: string;
      viewDetails: string;
    };
  };
  newAthlete: {
    title: string;
    subtitle: string;
    client: string;
    firstName: string;
    lastName: string;
    email: string;
    club: string;
    birthDate: string;
    height: string;
    weight: string;
    dominantFoot: string;
    dominantFootOptions: { default: string; right: string; left: string; both: string };
    submit: string;
    layoutApplied: string;
    error: string;
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
    };
    backToList: string;
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
    summary: string;
    summarySessions: (count: number) => string;
    metricsBadge: (count: number) => string;
    sessionDate: (date: string | null) => string;
    metricFallback: string;
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
      appName: "Combine Football",
      dashboard: "Dashboard",
      athletes: "Athletes",
      newAthlete: "New Athlete",
      sessions: "Sessions",
      reports: "Reports",
      logout: "Sign out",
      loading: "Loading",
      cancel: "Cancel",
      save: "Save",
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      back: "Back",
      select: "Select",
      customerArea: "Club area",
      learnMore: "Discover features",
      signIn: "Sign in",
      heroBadge: "SaaS platform for football combines",
      theme: "Theme",
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
      title: "Sign in to Combine",
      subtitle: "Access dashboards, manage sessions and share reports with partner clubs.",
      email: "Email",
      password: "Password",
      error: "Invalid credentials. Please try again.",
      seeds:
        "Seed accounts: admin@combine.dev / admin123, auriverde@combine.dev / auriverde123, urban@combine.dev / urban123",
    },
    dashboard: {
      title: "Overview",
      description:
        "Keep track of the main performance indicators and tailor the experience to each club.",
      cards: [
        {
          label: "Registered athletes",
          description: "Active athletes in current combines",
        },
        {
          label: "Configured tests",
          description: "Protocols available for this client",
        },
        {
          label: "Recorded sessions",
          description: "Assessment events with stored results",
        },
      ],
      nextStepsTitle: "Next steps",
      nextStepsDescription:
        "Register athletes, configure battery templates and deliver personalised reports.",
      actionNewAthlete: "Register athlete",
      actionNewSession: "Create assessment session",
    },
    athletes: {
      title: "Athletes",
      description: "Register participants and follow the performance of each test.",
      empty: "No athletes yet. Start by registering one.",
      loading: "Loading athletes...",
      error: "Unable to load athletes.",
      add: "Add athlete",
      table: {
        name: "Name",
        club: "Club",
        email: "Email",
        action: "Actions",
        viewDetails: "View details",
      },
    },
    newAthlete: {
      title: "Register athlete",
      subtitle:
        "Add participants to the combine and link them to personalised test batteries.",
      client: "Club / client",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      club: "Club / institution",
      birthDate: "Date of birth",
      height: "Height (cm)",
      weight: "Weight (kg)",
      dominantFoot: "Dominant foot",
      dominantFootOptions: {
        default: "Select",
        right: "Right",
        left: "Left",
        both: "Both",
      },
      submit: "Save athlete",
      layoutApplied: "Applied layout:",
      error: "Unable to save the athlete. Please review the information.",
    },
    athleteDetail: {
      profileSubtitle:
        "Athlete profile with consolidated results and personalised reports.",
      infoTitle: "General information",
      lastReportTitle: "Latest report",
      upload: "Update photo",
      uploadPending: "Uploading...",
      uploadError: "Unable to upload photo.",
      metrics: {
        email: "Email",
        club: "Club",
        height: "Height",
        weight: "Weight",
        dominantFoot: "Dominant foot",
      },
      backToList: "Back to list",
    },
    sessions: {
      title: "Assessment sessions",
      description:
        "Plan personalised test batteries and review the history of athlete performance.",
      nextSessions: "Upcoming sessions",
      newSession: "New session (coming soon)",
      loading: "Loading sessions...",
      empty: "No sessions found for this client.",
      notesEmpty: "No notes",
    },
    reports: {
      title: "Reports",
      description:
        "Choose an athlete to review key insights and prepare branded deliverables.",
      selectAthlete: "Select athlete",
      selectPlaceholder: "Choose an athlete",
      export: "Export PDF",
    soon: "coming soon",
    loading: "Loading report data...",
    error: "Unable to load this report at the moment. Please try again.",
    noAthlete: "Select an athlete to display the report.",
    summary: "Automatic summary recorded after each test.",
    summarySessions: (count) =>
      count === 0
        ? "No sessions recorded yet."
        : `Consolidated report with ${count} ${count === 1 ? "session" : "sessions"}.`,
    metricsBadge: (count) => `${count} metrics`,
    sessionDate: (date) =>
      date ? formatDate(new Date(date), "en") : "Date not provided",
    metricFallback: "Metric",
  },
    forms: {
      session: {
        title: "Create assessment session",
        subtitle:
          "Organise a new battery of tests, set the location and share with your staff.",
        client: "Club / client",
        name: "Session name",
        location: "Location",
        date: "Scheduled date",
        notes: "Notes",
        submit: "Save session",
        success: "Session created successfully!",
        error: "Unable to create the session. Please try again.",
      },
      test: {
        title: "Create test",
        subtitle:
          "Define the metrics and direction used in your customised combine protocols.",
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
  },
  fr: {
    common: {
      appName: "Combine Football",
      dashboard: "Tableau de bord",
      athletes: "Athlètes",
      newAthlete: "Nouvel athlète",
      sessions: "Sessions",
      reports: "Rapports",
      logout: "Déconnexion",
      loading: "Chargement",
      cancel: "Annuler",
      save: "Enregistrer",
      create: "Créer",
      edit: "Modifier",
      delete: "Supprimer",
      back: "Retour",
      select: "Sélectionner",
      customerArea: "Espace club",
      learnMore: "Découvrir les fonctionnalités",
      signIn: "Se connecter",
      heroBadge: "Plateforme SaaS pour combines de football",
      theme: "Thème",
    },
    home: {
      heroBullets: [
        "Capture en temps réel depuis tablettes et appareils mobiles.",
        "Benchmarks automatisés par poste et par rôle.",
        "Médiathèque sécurisée avec livrables aux couleurs du club.",
      ],
      heroTitle:
        "Captez des données décisives et livrez des rapports aux couleurs de votre club.",
      heroDescription:
        "Planifiez des évaluations physiques, techniques et cognitives, stockez les médias, générez des rapports personnalisés et partagez-les en quelques secondes.",
      ctaPrimary: "Accéder à l’espace de gestion",
      ctaSecondary: "Explorer les fonctionnalités",
      highlightTitle: "Rapport personnalisé",
      highlightDescription:
        "Mise en page adaptée à l’identité du club, métriques consolidées et liens directs vers les médias capturés sur le terrain.",
      highlightFooter: "Envoi automatique aux clubs partenaires",
      stats: [
        {
          label: "Athlètes évalués",
          value: "+1 200",
          description: "Résultats historiques des combines officiels",
        },
        {
          label: "Clubs accompagnés",
          value: "18",
          description: "Clubs professionnels et académies avec identité dédiée",
        },
        {
          label: "Tests personnalisés",
          value: "45",
          description: "Protocoles physiques, techniques et cognitifs",
        },
      ],
      videoTitle: "Highlight immersif",
      videoDescription:
        "Faites défiler la page pendant que la vidéo reste visible. Remplacez ce clip de démonstration en déposant votre vidéo dans public/media/hero-tech.mp4.",
      videoCTA: "Accéder à la plateforme",
      videoCaption:
        "Déposez votre vidéo de présentation dans public/media/hero-tech.mp4 (et éventuellement l’image public/media/hero-tech-poster.jpg).",
      quickInfoTitle: "Pourquoi les clubs choisissent Combine Football",
      quickInfo: [
        {
          title: "Flux de données en direct",
          description:
            "Saisissez les métriques depuis le terrain et synchronisez-les immédiatement avec les tableaux de bord.",
        },
        {
          title: "Identité maîtrisée",
          description:
            "Livrez des rapports aux couleurs du club, avec vos typographies et vos sponsors en un clic.",
        },
        {
          title: "Coffre-fort média",
          description:
            "Archivez vidéos et ralentis, partagez des liens sécurisés avec les recruteurs et le staff.",
        },
      ],
      featuresTitle: "Pensé pour la haute performance",
      featuresSubtitle: "Une plateforme modulaire pour camps d’évaluation, journées de détection et centres de formation.",
      features: [
        {
          title: "Designer de tests",
          description:
            "Assemblez des KPIs physiques, techniques et cognitifs, définissez unités, seuils et règles de notation.",
        },
        {
          title: "Orchestration des sessions",
          description:
            "Assignez les évaluateurs, planifiez les stations et capturez les notes depuis tablettes ou smartphones.",
        },
        {
          title: "Rapports automatisés",
          description:
            "Générez des PDF brandés avec classements, tendances et médias intégrés en quelques secondes.",
        },
      ],
      footer: "L’intelligence du combine au service du football d’élite.",
    },
    login: {
      title: "Connexion au Combine",
      subtitle:
        "Accédez aux tableaux de bord, gérez les sessions et partagez les rapports avec vos partenaires.",
      email: "Email",
      password: "Mot de passe",
      error: "Identifiants invalides. Veuillez réessayer.",
      seeds:
        "Comptes de démonstration : admin@combine.dev / admin123, auriverde@combine.dev / auriverde123, urban@combine.dev / urban123",
    },
    dashboard: {
      title: "Vue d’ensemble",
      description:
        "Suivez les principaux indicateurs de performance et adaptez l’expérience pour chaque club.",
      cards: [
        {
          label: "Athlètes enregistrés",
          description: "Athlètes actifs dans les combines en cours",
        },
        {
          label: "Tests configurés",
          description: "Protocoles disponibles pour ce client",
        },
        {
          label: "Sessions enregistrées",
          description: "Évaluations avec résultats stockés",
        },
      ],
      nextStepsTitle: "Prochaines actions",
      nextStepsDescription:
        "Enregistrez des athlètes, configurez vos batteries et livrez des rapports personnalisés.",
      actionNewAthlete: "Ajouter un athlète",
      actionNewSession: "Créer une session",
    },
    athletes: {
      title: "Athlètes",
      description: "Enregistrez les participants et suivez la performance de chaque test.",
      empty: "Aucun athlète pour l’instant. Commencez par en ajouter un.",
      loading: "Chargement des athlètes...",
      error: "Impossible de charger les athlètes.",
      add: "Ajouter un athlète",
      table: {
        name: "Nom",
        club: "Club",
        email: "Email",
        action: "Actions",
        viewDetails: "Voir les détails",
      },
    },
    newAthlete: {
      title: "Ajouter un athlète",
      subtitle:
        "Ajoutez des participants au combine et associez-les à vos batteries personnalisées.",
      client: "Club / client",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      club: "Club / institution",
      birthDate: "Date de naissance",
      height: "Taille (cm)",
      weight: "Poids (kg)",
      dominantFoot: "Pied dominant",
      dominantFootOptions: {
        default: "Sélectionner",
        right: "Droit",
        left: "Gauche",
        both: "Deux pieds",
      },
      submit: "Enregistrer l’athlète",
      layoutApplied: "Identité appliquée :",
      error: "Impossible d’enregistrer l’athlète. Vérifiez les informations.",
    },
    athleteDetail: {
      profileSubtitle:
        "Profil de l’athlète avec résultats consolidés et rapports personnalisés.",
      infoTitle: "Informations générales",
      lastReportTitle: "Dernier rapport",
      upload: "Mettre à jour la photo",
      uploadPending: "Envoi...",
      uploadError: "Échec de l’envoi de la photo.",
      metrics: {
        email: "Email",
        club: "Club",
        height: "Taille",
        weight: "Poids",
        dominantFoot: "Pied dominant",
      },
      backToList: "Retour à la liste",
    },
    sessions: {
      title: "Sessions d’évaluation",
      description:
        "Planifiez des batteries personnalisées et consultez l’historique des performances.",
      nextSessions: "Sessions à venir",
      newSession: "Nouvelle session (bientôt)",
      loading: "Chargement des sessions...",
      empty: "Aucune session trouvée pour ce client.",
      notesEmpty: "Pas de remarques",
    },
    reports: {
      title: "Rapports",
      description:
        "Choisissez un athlète pour analyser les points clés et préparer vos livrables.",
      selectAthlete: "Sélectionner un athlète",
      selectPlaceholder: "Choisissez un athlète",
      export: "Exporter en PDF",
    soon: "bientôt",
    loading: "Chargement des données du rapport...",
    error: "Impossible de charger ce rapport pour le moment. Réessayez plus tard.",
    noAthlete: "Sélectionnez un athlète pour afficher le rapport.",
    summary: "Résumé automatique enregistré après chaque test.",
    summarySessions: (count) =>
      count === 0
        ? "Aucune session enregistrée pour le moment."
        : `${count} session${count > 1 ? "s" : ""} consolidée${count > 1 ? "s" : ""}.`,
    metricsBadge: (count) => `${count} métriques`,
    sessionDate: (date) =>
      date ? formatDate(new Date(date), "fr") : "Date non renseignée",
    metricFallback: "Métrique",
  },
    forms: {
      session: {
        title: "Créer une session",
        subtitle:
          "Organisez une nouvelle batterie de tests, définissez le lieu et partagez-la avec votre staff.",
        client: "Club / client",
        name: "Nom de la session",
        location: "Lieu",
        date: "Date prévue",
        notes: "Remarques",
        submit: "Enregistrer la session",
        success: "Session créée avec succès !",
        error: "Impossible de créer la session. Veuillez réessayer.",
      },
      test: {
        title: "Créer un test",
        subtitle:
          "Définissez les métriques et la cible pour vos protocoles personnalisés.",
        client: "Club / client",
        name: "Nom du test",
        category: "Catégorie",
        unit: "Unité",
        description: "Description",
        targetDirection: "Sens de la performance",
        targetOptions: {
          higher: "Plus élevé est meilleur",
          lower: "Plus bas est meilleur",
        },
        submit: "Enregistrer le test",
        success: "Test créé avec succès !",
        error: "Impossible de créer le test. Veuillez réessayer.",
      },
    },
  },
};
