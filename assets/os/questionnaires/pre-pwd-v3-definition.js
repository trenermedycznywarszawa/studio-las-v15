const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

const option = (value, label) => ({ value, label });
const showWhen = (questionId, values) => ({ mode: "answer_in", questionId, values });
const showWhenAny = rules => ({ mode: "any", rules });

export const PRE_PWD_V3_DEFINITION = deepFreeze({
  id: "pre_pwd_first_visit",
  version: "3.0",
  sourceLabel: "Studio Las — Ankieta przed pierwszą wizytą | wersja końcowa do wdrożenia",
  audience: "client",
  estimatedMinutes: "5-8",
  purpose: "Przygotowanie Pierwszej Wizyty Diagnostycznej bez zastępowania konsultacji lekarskiej.",
  architecture: {
    canonicalFlow: ["template", "version", "assignment", "response"],
    clientEntryPoint: "client_portal.questionnaires",
    trainerWorkflowStatusVisibleToClient: false,
    browserPersistence: "forbidden",
    healthDraftServerPersistence: "blocked_pending_privacy_basis_review",
    productionRelease: "blocked_pending_health_data_consent_review"
  },
  unresolvedRules: [
    {
      id: "pain_13i_visibility",
      reason: "Dokument mówi, że po odpowiedzi TAK w pytaniu 13 pojawiają się 13A-13H, ale zawiera także 13I w tej samej sekcji. Nie wolno zgadywać widoczności 13I.",
      behavior: "fail_closed"
    },
    {
      id: "pregnancy_module_applicability",
      reason: "Dokument mówi, że sekcja 5 pojawia się tylko wtedy, gdy dotyczy danej osoby, ale nie definiuje neutralnego mechanizmu ustalenia tej właściwości.",
      behavior: "fail_closed"
    },
    {
      id: "health_data_consent_and_autosave",
      reason: "Ostateczne brzmienie zgody dotyczącej danych zdrowotnych wymaga sprawdzenia przed wdrożeniem produkcyjnym; nie uruchamiamy autosave danych zdrowotnych przed rozstrzygnięciem podstawy przetwarzania.",
      behavior: "block_persistence"
    }
  ],
  profileFields: [
    {
      id: "age",
      sourceRef: "1",
      label: "Ile masz lat?",
      type: "short_text",
      required: true,
      target: "client_profile.age_observation",
      captureContext: "questionnaire_completion_date"
    },
    {
      id: "emergency_contact_name",
      sourceRef: "profile.emergency_contact.name",
      label: "Imię i nazwisko",
      type: "short_text",
      required: true,
      target: "client_profile.emergency_contact"
    },
    {
      id: "emergency_contact_phone",
      sourceRef: "profile.emergency_contact.phone",
      label: "Numer telefonu",
      type: "tel",
      required: true,
      target: "client_profile.emergency_contact"
    },
    {
      id: "emergency_contact_relation",
      sourceRef: "profile.emergency_contact.relation",
      label: "Kim ta osoba jest dla Ciebie",
      type: "short_text",
      required: true,
      target: "client_profile.emergency_contact"
    }
  ],
  sections: [
    {
      id: "starting_point",
      title: "1. Punkt wyjścia",
      clientIntro: "Te pytania wypełnia każdy.",
      questions: [
        {
          id: "q2_goal_current",
          sourceRef: "2",
          label: "Podczas rozmowy ustaliliśmy, na czym najbardziej Ci zależy. Czy ten cel jest nadal aktualny?",
          type: "single_choice",
          required: true,
          contextSource: "client_profile.goal_snapshot",
          options: [
            option("yes", "Tak"),
            option("yes_clarify", "Tak, ale chcę coś krótko doprecyzować"),
            option("changed", "Nie, mój cel się zmienił")
          ]
        },
        {
          id: "q2_goal_detail",
          sourceRef: "2.detail",
          label: "Co jest teraz dla Ciebie najważniejsze?",
          type: "long_text",
          required: true,
          visibleWhen: showWhen("q2_goal_current", ["yes_clarify", "changed"])
        },
        {
          id: "q3_goal_ability",
          sourceRef: "3",
          label: "Na ile możesz dziś zrobić to, na czym najbardziej Ci zależy?",
          help: "0 oznacza „wcale nie mogę”, a 10 „mogę bez większego problemu”.",
          type: "scale_0_10",
          required: true,
          endpoints: { min: "wcale", max: "swobodnie" }
        },
        {
          id: "q4_main_barriers",
          sourceRef: "4",
          label: "Co najbardziej Ci teraz w tym przeszkadza?",
          help: "Możesz zaznaczyć maksymalnie 2 odpowiedzi.",
          type: "multi_choice",
          required: true,
          maxSelections: 2,
          options: [
            option("pain", "Ból lub inne dolegliwości"),
            option("stiffness", "Sztywność lub mała swoboda ruchu"),
            option("strength", "Brak siły"),
            option("fatigue", "Szybko się męczę"),
            option("fear", "Obawa przed urazem lub pogorszeniem"),
            option("low_energy", "Mało energii"),
            option("dont_know_how", "Nie wiem, jak bezpiecznie zacząć"),
            option("time", "Brak czasu"),
            option("general_fitness", "Nic konkretnego, chcę poprawić sprawność"),
            option("other", "Inne")
          ]
        },
        {
          id: "q5_work_day",
          sourceRef: "5",
          label: "Jak najczęściej wygląda Twój dzień pracy?",
          type: "single_choice",
          required: true,
          options: [
            option("mostly_sitting", "Głównie siedzę"),
            option("mostly_standing_walking", "Głównie stoję lub chodzę"),
            option("mixed", "Praca mieszana: trochę siedzę, trochę chodzę"),
            option("driving", "Dużo jeżdżę samochodem"),
            option("light_physical", "Lekka praca fizyczna"),
            option("heavy_physical", "Ciężka praca fizyczna"),
            option("shift_night", "Praca zmianowa lub nocna"),
            option("not_working", "Nie pracuję obecnie"),
            option("varies", "Różnie, trudno określić")
          ]
        },
        {
          id: "q6_sitting_time",
          sourceRef: "6",
          label: "Ile czasu w typowym dniu spędzasz siedząc?",
          type: "single_choice",
          required: true,
          visibleWhen: showWhen("q5_work_day", ["mostly_sitting", "mixed", "driving"]),
          options: [
            option("up_to_2h", "Do około 2 godzin"),
            option("3_4h", "Około 3-4 godziny"),
            option("5_6h", "Około 5-6 godzin"),
            option("7_8h", "Około 7-8 godzin"),
            option("over_8h", "Więcej niż 8 godzin"),
            option("unknown", "Trudno powiedzieć")
          ]
        }
      ]
    },
    {
      id: "health_safety",
      title: "2. Bezpieczeństwo i zdrowie",
      clientIntro: "Kilka prostych pytań pomoże mi bezpiecznie przygotować pierwsze spotkanie.",
      questions: [
        {
          id: "q7_exertion_symptoms",
          sourceRef: "7",
          label: "Czy w ciągu ostatnich 3 miesięcy podczas wysiłku albo zaraz po nim zdarzyło Ci się coś z poniższych?",
          help: "Zaznacz wszystkie pasujące odpowiedzi. Jeśli zaznaczasz „Żadne z powyższych”, nie zaznaczaj innych odpowiedzi.",
          type: "multi_choice",
          required: true,
          exclusiveValues: ["none"],
          options: [
            option("chest_pain_pressure", "Ból lub ucisk w klatce piersiowej"),
            option("syncope_near_syncope", "Omdlenie lub prawie omdlenie"),
            option("dyspnea_low_effort_rest", "Brak powietrza przy małym wysiłku albo w spoczynku"),
            option("strong_irregular_palpitations", "Silne kołatanie lub bardzo nierówne bicie serca"),
            option("severe_unusual_weakness", "Bardzo silne, nietypowe osłabienie"),
            option("none", "Żadne z powyższych")
          ]
        },
        {
          id: "q8_chronic_condition",
          sourceRef: "8",
          label: "Czy masz przewlekłą chorobę albo stały problem zdrowotny, który może mieć znaczenie podczas ćwiczeń?",
          type: "single_choice",
          required: true,
          options: [
            option("no", "Nie"),
            option("yes", "Tak"),
            option("yes_unknown_name", "Tak, ale nie pamiętam dokładnej nazwy")
          ]
        },
        {
          id: "q8a_condition_type",
          sourceRef: "8A",
          label: "Czego dotyczy choroba lub problem zdrowotny?",
          type: "multi_choice",
          required: true,
          visibleWhen: showWhen("q8_chronic_condition", ["yes", "yes_unknown_name"]),
          options: [
            option("cardiovascular", "Choroba serca lub naczyń"),
            option("heart_attack_procedure", "Przebyty zawał lub zabieg na sercu"),
            option("hypertension", "Nadciśnienie"),
            option("diabetes", "Cukrzyca"),
            option("kidney", "Choroba nerek"),
            option("lung", "Choroba płuc"),
            option("neurological", "Choroba neurologiczna"),
            option("osteoporosis_bone", "Osteoporoza lub poważny problem z kośćmi"),
            option("inflammatory_joint_spine", "Choroba zapalna stawów lub kręgosłupa"),
            option("oncology", "Choroba nowotworowa lub leczenie onkologiczne"),
            option("other", "Inna choroba lub problem zdrowotny")
          ]
        },
        {
          id: "q9_movement_restriction",
          sourceRef: "9",
          label: "Czy lekarz lub fizjoterapeuta powiedział Ci, że obecnie powinieneś lub powinnaś unikać jakiegoś ruchu, ciężaru albo wysiłku?",
          type: "single_choice",
          required: true,
          options: [
            option("no", "Nie"),
            option("yes", "Tak"),
            option("uncertain_previous", "Miałem lub miałam takie zalecenie wcześniej, ale nie wiem, czy nadal obowiązuje")
          ]
        },
        {
          id: "q9_restriction_detail",
          sourceRef: "9.detail",
          label: "Czego dotyczy zalecenie?",
          type: "long_text",
          required: true,
          visibleWhen: showWhen("q9_movement_restriction", ["yes", "uncertain_previous"])
        },
        {
          id: "q10_medication",
          sourceRef: "10",
          label: "Czy przyjmujesz leki?",
          type: "single_choice",
          required: true,
          options: [
            option("no", "Nie"),
            option("daily", "Tak, codziennie"),
            option("regular_not_daily", "Tak, regularnie, ale nie codziennie"),
            option("sometimes", "Tak, tylko czasami, np. lek przeciwbólowy")
          ]
        },
        {
          id: "q10_medication_names",
          sourceRef: "10.detail",
          label: "Nazwy leków",
          help: "Jeśli nie pamiętasz nazw, możesz przygotować listę leków na wizytę.",
          type: "long_text",
          required: false,
          visibleWhen: showWhen("q10_medication", ["daily", "regular_not_daily", "sometimes"])
        },
        {
          id: "q11_supplements",
          sourceRef: "11",
          label: "Czy przyjmujesz witaminy, minerały lub inne suplementy?",
          type: "single_choice",
          required: true,
          options: [
            option("no", "Nie"),
            option("regular", "Tak, regularnie"),
            option("sometimes", "Tak, od czasu do czasu")
          ]
        },
        {
          id: "q11_supplement_names",
          sourceRef: "11.detail",
          label: "Jeśli tak, jakie?",
          type: "long_text",
          required: false,
          visibleWhen: showWhen("q11_supplements", ["regular", "sometimes"])
        },
        {
          id: "q12_balance",
          sourceRef: "12",
          label: "Czy obecnie albo w ostatnim czasie zdarzały Ci się zawroty głowy, problemy z równowagą lub upadki?",
          help: "Możesz zaznaczyć kilka odpowiedzi. Jeśli zaznaczasz „Żadne z powyższych”, nie zaznaczaj innych odpowiedzi.",
          type: "multi_choice",
          required: true,
          exclusiveValues: ["none"],
          options: [
            option("dizziness", "Zawroty głowy"),
            option("balance_problem", "Chwianie się lub problem z utrzymaniem równowagi"),
            option("frequent_trips", "Częste potknięcia"),
            option("falls", "Upadki"),
            option("other", "Inny problem z równowagą"),
            option("none", "Żadne z powyższych")
          ]
        },
        {
          id: "q12a_walking_aid",
          sourceRef: "12A",
          label: "Czy podczas chodzenia używasz laski, kul, balkonika, stabilizatora albo innej pomocy?",
          type: "single_choice",
          required: true,
          options: [option("no", "Nie"), option("yes", "Tak")]
        },
        {
          id: "q12a_walking_aid_detail",
          sourceRef: "12A.detail",
          label: "Jeśli tak, czego używasz?",
          type: "long_text",
          required: true,
          visibleWhen: showWhen("q12a_walking_aid", ["yes"])
        }
      ]
    },
    {
      id: "pain_discomfort",
      title: "3. Ból lub dyskomfort",
      clientIntro: "Dalsze pytania pojawią się tylko wtedy, gdy zgłaszasz ból lub inną dolegliwość.",
      questions: [
        {
          id: "q13_pain",
          sourceRef: "13",
          label: "Czy obecnie odczuwasz ból lub dyskomfort?",
          type: "single_choice",
          required: true,
          options: [
            option("no", "Nie"),
            option("yes_not_limiting", "Tak, ale nie ogranicza mnie"),
            option("yes_some_limitation", "Tak, trochę mnie ogranicza"),
            option("yes_clear_limitation", "Tak, wyraźnie mnie ogranicza")
          ]
        },
        {
          id: "q13a_location",
          sourceRef: "13A",
          label: "Gdzie odczuwasz ból lub dyskomfort?",
          help: "Możesz zaznaczyć kilka miejsc.",
          type: "multi_choice",
          required: true,
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"]),
          options: [
            option("neck", "Szyja"), option("upper_back", "Górna część pleców"), option("lower_back", "Dolna część pleców"),
            option("shoulder_arm", "Bark lub ramię"), option("elbow", "Łokieć"), option("wrist_hand", "Nadgarstek lub dłoń"),
            option("hip_groin", "Biodro lub pachwina"), option("knee", "Kolano"), option("calf_achilles", "Łydka lub ścięgno Achillesa"),
            option("ankle_foot", "Kostka lub stopa"), option("multiple", "Kilka różnych miejsc"), option("other", "Inne")
          ]
        },
        {
          id: "q13b_duration",
          sourceRef: "13B",
          label: "Od jak dawna masz ten problem?",
          type: "single_choice",
          required: true,
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"]),
          options: [
            option("under_2w", "Krócej niż 2 tygodnie"), option("2_6w", "Około 2-6 tygodni"), option("6_12w", "Około 6-12 tygodni"),
            option("3m_plus", "3 miesiące lub dłużej"), option("recurrent", "Problem wraca od dłuższego czasu")
          ]
        },
        {
          id: "q13c_trend",
          sourceRef: "13C",
          label: "Jak zmieniał się ból lub dyskomfort w ostatnim tygodniu?",
          type: "single_choice",
          required: true,
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"]),
          options: [
            option("much_better", "Wyraźnie jest lepiej"), option("better", "Trochę jest lepiej"), option("same", "Jest mniej więcej tak samo"),
            option("worse", "Trochę jest gorzej"), option("much_worse", "Wyraźnie jest gorzej")
          ]
        },
        {
          id: "q13d_peak_pain",
          sourceRef: "13D",
          label: "Jak silny był największy ból lub dyskomfort w ostatnich 7 dniach?",
          help: "0 oznacza brak bólu, a 10 bardzo silny ból.",
          type: "scale_0_10",
          required: true,
          endpoints: { min: "brak", max: "bardzo silny" },
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"])
        },
        {
          id: "q13e_aggravators",
          sourceRef: "13E",
          label: "Co najczęściej zwiększa ból lub dyskomfort?",
          type: "multi_choice",
          required: true,
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"]),
          options: [
            option("specific_movement", "Konkretny ruch"), option("load_effort", "Większy ciężar lub wysiłek"), option("walking", "Chodzenie"),
            option("running_jumping", "Bieganie lub skakanie"), option("stairs", "Schody"), option("long_sitting", "Długie siedzenie"),
            option("long_standing", "Długie stanie"), option("sport", "Sport"), option("work", "Praca"),
            option("no_clear_cause", "Nie zauważam wyraźnej przyczyny"), option("other", "Inne")
          ]
        },
        {
          id: "q13f_limitations",
          sourceRef: "13F",
          label: "Co przez ten problem robisz z większą trudnością albo czego unikasz?",
          type: "multi_choice",
          required: true,
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"]),
          options: [
            option("sit_stand", "Wstawanie lub siadanie"), option("squat_floor", "Przysiad lub zejście do podłogi"), option("stairs", "Schody"),
            option("lift_carry", "Podnoszenie lub noszenie"), option("overhead", "Sięganie nad głowę"), option("long_sitting", "Długie siedzenie"),
            option("long_standing", "Długie stanie"), option("walking", "Chodzenie"), option("running", "Bieganie"), option("bed_turning", "Przewracanie się w łóżku"),
            option("sleep", "Sen"), option("work", "Praca"), option("sport", "Sport"), option("other", "Inne")
          ]
        },
        {
          id: "q13g_post_activity",
          sourceRef: "13G",
          label: "Co zwykle dzieje się z bólem lub dyskomfortem po większej aktywności?",
          type: "single_choice",
          required: true,
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"]),
          options: [
            option("no_change", "Bez wyraźnej zmiany"), option("better", "Jest lepiej"), option("worse_same_day", "Jest gorzej, ale wraca do normy tego samego dnia"),
            option("worse_next_day", "Jest gorzej do następnego dnia"), option("worse_over_day", "Jest gorzej dłużej niż jeden dzień"),
            option("not_observed", "Nie zwracałem lub nie zwracałam na to uwagi")
          ]
        },
        {
          id: "q13h_back_leg_red_flags",
          sourceRef: "13H",
          label: "Jeśli problem dotyczy pleców albo nogi, czy pojawiło się ostatnio coś z poniższych?",
          help: "Jeśli zaznaczysz którąś z pierwszych odpowiedzi, trener skontaktuje się z Tobą przed rozpoczęciem ćwiczeń.",
          type: "multi_choice",
          required: true,
          exclusiveValues: ["none"],
          visibleWhen: showWhen("q13_pain", ["yes_not_limiting", "yes_some_limitation", "yes_clear_limitation"]),
          options: [
            option("new_bladder_bowel", "Nowy problem z utrzymaniem moczu lub stolca"),
            option("new_saddle_numbness", "Nowa utrata czucia między nogami lub w okolicy intymnej"),
            option("new_intimate_function", "Nowy, wyraźny problem w sferze intymnej, który pojawił się razem z bólem pleców lub nogi"),
            option("rapid_leg_weakness", "Noga lub obie nogi szybko tracą siłę"),
            option("rapid_numbness_balance", "Drętwienie albo problem z równowagą szybko się nasila"),
            option("none", "Nic z powyższych")
          ]
        },
        {
          id: "q13i_neurological_sensation",
          sourceRef: "13I",
          label: "Czy masz drętwienie, mrowienie albo uczucie „prądu” w ręce lub nodze?",
          type: "single_choice",
          required: true,
          visibleWhen: { mode: "blocked_pending_rule", ruleId: "pain_13i_visibility" },
          options: [option("no", "Nie"), option("sometimes", "Tak, czasami"), option("often", "Tak, często")]
        }
      ]
    },
    {
      id: "injury_surgery",
      title: "4. Urazy, operacje i pobyty w szpitalu",
      clientIntro: "Te pytania pomagają zrozumieć ważną historię zdrowotną bez zbierania pełnej dokumentacji medycznej.",
      questions: [
        { id: "q14_major_injury_surgery", sourceRef: "14", label: "Czy miałeś lub miałaś kiedyś poważniejszy uraz, operację albo zabieg, który może mieć znaczenie dla ruchu lub ćwiczeń?", type: "single_choice", required: true, options: [option("no", "Nie"), option("yes", "Tak")] },
        { id: "q15_hospital_12m", sourceRef: "15", label: "Czy w ciągu ostatnich 12 miesięcy byłeś lub byłaś w szpitalu albo miałeś lub miałaś inny ważny zabieg?", type: "single_choice", required: true, options: [option("no", "Nie"), option("yes", "Tak")] },
        {
          id: "q15a_body_part", sourceRef: "15A", label: "Jakiej części ciała dotyczył uraz, operacja lub zabieg?", type: "multi_choice", required: true,
          visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]),
          options: [option("spine", "Plecy lub kręgosłup"), option("shoulder_arm", "Bark lub ramię"), option("elbow_wrist", "Łokieć lub nadgarstek"), option("hip_groin", "Biodro lub pachwina"), option("knee", "Kolano"), option("ankle_foot", "Kostka lub stopa"), option("other", "Inna część ciała")]
        },
        {
          id: "q15b_event", sourceRef: "15B", label: "Co dokładnie się wydarzyło?", type: "multi_choice", required: true,
          visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]),
          options: [option("sprain_tear", "Skręcenie lub naderwanie"), option("fracture", "Złamanie"), option("ligament", "Uszkodzenie więzadła"), option("meniscus", "Problem z łąkotką"), option("operation", "Operacja"), option("joint_replacement", "Endoproteza"), option("other", "Inny uraz lub zabieg"), option("unknown", "Nie znam dokładnej nazwy")]
        },
        { id: "q15b_event_detail", sourceRef: "15B.detail", label: "Jeśli chcesz, możesz dopisać krótko co to było", type: "long_text", required: false, visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]) },
        {
          id: "q15c_last_event", sourceRef: "15C", label: "Kiedy był ostatni taki uraz, zabieg lub operacja?", type: "single_choice", required: true,
          visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]),
          options: [option("under_3m", "Mniej niż 3 miesiące temu"), option("3_6m", "Około 3-6 miesięcy temu"), option("6_12m", "Około 6-12 miesięcy temu"), option("1_2y", "1-2 lata temu"), option("over_2y", "Dawniej niż 2 lata temu")]
        },
        {
          id: "q15d_rehab", sourceRef: "15D", label: "Czy miałeś lub miałaś rehabilitację po tym problemie?", type: "single_choice", required: true,
          visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]),
          options: [option("no", "Nie"), option("ongoing", "Tak, rehabilitacja nadal trwa"), option("completed", "Tak, rehabilitacja się zakończyła")]
        },
        {
          id: "q15e_limits", sourceRef: "15E", label: "Czy nadal masz przez ten problem jakieś ograniczenia?", type: "single_choice", required: true,
          visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]),
          options: [option("no", "Nie"), option("yes", "Tak"), option("uncertain", "Trudno mi to ocenić")]
        },
        { id: "q15e_limits_detail", sourceRef: "15E.detail", label: "Jeśli tak, co jest obecnie ograniczone?", type: "long_text", required: true, visibleWhen: showWhen("q15e_limits", ["yes"]) },
        {
          id: "q15f_return_activity", sourceRef: "15F", label: "Do jakiej aktywności najbardziej chcesz wrócić?", type: "single_choice", required: true,
          visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]),
          options: [option("running", "Bieganie"), option("strength", "Trening siłowy"), option("team_sport", "Sport zespołowy"), option("combat", "Sporty walki"), option("ski_snowboard", "Narty lub snowboard"), option("swimming", "Pływanie"), option("physical_work", "Praca fizyczna"), option("daily_life", "Zwykłe codzienne czynności"), option("other", "Inne")]
        },
        { id: "q15g_reinjury_fear", sourceRef: "15G", label: "Jak bardzo obawiasz się ponownego urazu albo pogorszenia swojego stanu?", help: "0 oznacza, że wcale się tego nie obawiasz, a 10, że obawiasz się bardzo.", type: "scale_0_10", required: true, endpoints: { min: "wcale", max: "bardzo" }, visibleWhen: showWhenAny([showWhen("q14_major_injury_surgery", ["yes"]), showWhen("q15_hospital_12m", ["yes"])]) }
      ]
    },
    {
      id: "pregnancy_postpartum",
      title: "5. Ciąża i okres po porodzie",
      clientIntro: "Ta część pojawi się tylko wtedy, gdy dotyczy danej osoby.",
      applicability: { mode: "blocked_pending_rule", ruleId: "pregnancy_module_applicability" },
      questions: [
        { id: "q16_pregnancy", sourceRef: "16", label: "Czy jesteś obecnie w ciąży albo podejrzewasz, że możesz być w ciąży?", type: "single_choice", required: true, options: [option("no", "Nie"), option("yes", "Tak, jestem w ciąży"), option("suspect", "Podejrzewam, że mogę być w ciąży")] },
        { id: "q16a_week", sourceRef: "16A", label: "Jeśli jesteś w ciąży, który to mniej więcej tydzień?", type: "short_text", required: true, visibleWhen: showWhen("q16_pregnancy", ["yes"]) },
        { id: "q16b_guidance", sourceRef: "16B", label: "Czy lekarz, położna lub fizjoterapeuta przekazał Ci obecnie jakieś zalecenia dotyczące ćwiczeń, wysiłku lub ruchu?", type: "single_choice", required: true, visibleWhen: showWhen("q16_pregnancy", ["yes", "suspect"]), options: [option("no", "Nie"), option("yes", "Tak"), option("uncertain_previous", "Miałam takie zalecenia wcześniej, ale nie wiem, czy nadal obowiązują")] },
        { id: "q16b_guidance_detail", sourceRef: "16B.detail", label: "Jeśli tak, czego dotyczą?", type: "long_text", required: true, visibleWhen: showWhen("q16b_guidance", ["yes", "uncertain_previous"]) },
        { id: "q17_postpartum", sourceRef: "17", label: "Czy w ciągu ostatnich 24 miesięcy rodziłaś albo po wcześniejszym porodzie nadal masz dolegliwości lub ograniczenia?", type: "single_choice", required: true, options: [option("no", "Nie"), option("last_24m", "Tak, rodziłam w ostatnich 24 miesiącach"), option("earlier_with_symptoms", "Tak, poród był wcześniej, ale nadal mam dolegliwości lub ograniczenia")] },
        { id: "q17a_delivery", sourceRef: "17A", label: "Jak przebiegał poród?", type: "single_choice", required: true, visibleWhen: showWhen("q17_postpartum", ["last_24m", "earlier_with_symptoms"]), options: [option("vaginal", "Drogami natury"), option("cesarean", "Przez cesarskie cięcie"), option("both", "Miałam porody drogami natury i przez cesarskie cięcie"), option("other_decline", "Inaczej lub nie chcę odpowiadać")] },
        { id: "q17b_diastasis", sourceRef: "17B", label: "Czy lekarz lub fizjoterapeuta powiedział Ci, że masz rozejście mięśni prostych brzucha?", help: "Chodzi o większą przerwę między mięśniami na środku brzucha.", type: "single_choice", required: true, visibleWhen: showWhen("q17_postpartum", ["last_24m", "earlier_with_symptoms"]), options: [option("no", "Nie"), option("yes", "Tak"), option("not_checked", "Nikt tego u mnie nie sprawdzał"), option("unknown", "Nie pamiętam wyniku")] },
        { id: "q17c_current_symptoms", sourceRef: "17C", label: "Czy obecnie masz którąś z poniższych dolegliwości?", type: "multi_choice", required: true, exclusiveValues: ["none"], visibleWhen: showWhen("q17_postpartum", ["last_24m", "earlier_with_symptoms"]), options: [option("stress_incontinence", "Popuszczanie moczu przy kaszlu, kichaniu lub wysiłku"), option("heaviness_pressure", "Uczucie ciężaru albo nacisku w dole brzucha lub między nogami"), option("cesarean_scar_pain", "Ból blizny po cesarskim cięciu"), option("pelvic_pubis_low_back_pain", "Ból miednicy, spojenia łonowego lub dolnej części pleców"), option("abdominal_bulging", "Wypuklanie się brzucha podczas wstawania albo ćwiczeń"), option("other", "Inne"), option("none", "Żadne z powyższych")] }
      ]
    },
    {
      id: "current_activity",
      title: "6. Aktualna aktywność i realne możliwości",
      clientIntro: "Pytamy głównie o to, jak wygląda Twoja aktywność teraz.",
      questions: [
        { id: "q18_exercise_frequency", sourceRef: "18", label: "Jak często celowo ćwiczyłeś lub ćwiczyłaś w ostatnich 4 tygodniach?", type: "single_choice", required: true, options: [option("almost_never", "Wcale lub prawie wcale"), option("1_week", "Około 1 raz w tygodniu"), option("2_3_week", "2-3 razy w tygodniu"), option("4_plus_week", "4 lub więcej razy w tygodniu")] },
        { id: "q19_break", sourceRef: "19", label: "Jak długo trwała Twoja ostatnia większa przerwa od regularnych ćwiczeń?", type: "single_choice", required: true, options: [option("none", "Nie miałem lub nie miałam większej przerwy"), option("under_month", "Mniej niż miesiąc"), option("1_3m", "1-3 miesiące"), option("3_12m", "3-12 miesięcy"), option("over_year", "Ponad rok"), option("never_regular", "Nigdy nie ćwiczyłem lub nie ćwiczyłam regularnie")] },
        { id: "q20_future_intensity", sourceRef: "20", label: "Czy w przyszłości chcesz wrócić do bardzo intensywnego wysiłku, np. biegania, ciężkiego treningu, zawodów albo wymagającego sportu?", type: "single_choice", required: true, options: [option("yes", "Tak"), option("no", "Nie"), option("unknown", "Jeszcze nie wiem")] },
        { id: "q21_weekly_time", sourceRef: "21", label: "Ile razy w tygodniu naprawdę możesz znaleźć czas na trening?", type: "single_choice", required: true, options: [option("1", "1 raz"), option("2", "2 razy"), option("3", "3 razy"), option("4_plus", "4 lub więcej")] },
        { id: "q22_session_time", sourceRef: "22", label: "Ile czasu możesz zwykle przeznaczyć na jeden trening?", type: "single_choice", required: true, options: [option("up_to_30", "Do 30 minut"), option("30_45", "30-45 minut"), option("45_60", "45-60 minut"), option("over_60", "Ponad 60 minut")] },
        { id: "q23_adherence_barriers", sourceRef: "23", label: "Co najbardziej może utrudnić Ci regularne ćwiczenia?", help: "Możesz zaznaczyć maksymalnie 2 odpowiedzi.", type: "multi_choice", required: true, maxSelections: 2, exclusiveValues: ["nothing_significant"], options: [option("time", "Brak czasu"), option("work_shifts", "Praca, zmiany lub noce"), option("travel", "Podróże"), option("caregiving", "Opieka nad dziećmi lub bliskimi"), option("pain", "Ból lub inne dolegliwości"), option("sleep_fatigue", "Słaby sen lub zmęczenie"), option("fear", "Obawa przed ruchem lub urazem"), option("commute_organization", "Dojazd lub organizacja dnia"), option("cost", "Koszt"), option("support", "Brak wsparcia"), option("nothing_significant", "Nic istotnego"), option("other", "Inne")] }
      ]
    },
    {
      id: "recovery_nutrition",
      title: "7. Regeneracja, woda i jedzenie",
      clientIntro: "Te pytania są tylko informacją do rozmowy. Nie służą do oceniania ani stawiania diagnozy.",
      questions: [
        { id: "q24_water", sourceRef: "24", label: "Ile zwykłej wody wypijasz mniej więcej w ciągu dnia?", help: "Nie licz tutaj kawy, herbaty, soków ani innych napojów.", type: "single_choice", required: true, options: [option("under_0_5", "Mniej niż 0,5 litra"), option("0_5_1", "Około 0,5-1 litra"), option("1_1_5", "Około 1-1,5 litra"), option("1_5_2", "Około 1,5-2 litrów"), option("2_3", "Około 2-3 litrów"), option("over_3", "Więcej niż 3 litry"), option("unknown", "Trudno powiedzieć")] },
        { id: "q25_sleep", sourceRef: "25", label: "Jak oceniasz jakość swojego snu w ostatnim tygodniu?", help: "0 oznacza bardzo zły sen, a 10 bardzo dobry.", type: "scale_0_10", required: true, endpoints: { min: "bardzo źle", max: "bardzo dobrze" } },
        { id: "q26_energy", sourceRef: "26", label: "Ile miałeś lub miałaś energii w ciągu dnia w ostatnim tygodniu?", help: "0 oznacza bardzo mało energii, a 10 bardzo dużo.", type: "scale_0_10", required: true, endpoints: { min: "bardzo mało", max: "bardzo dużo" } },
        { id: "q27_stress", sourceRef: "27", label: "Jak duży był Twój stres w ostatnim tygodniu?", help: "0 oznacza brak stresu, a 10 bardzo silny stres.", type: "scale_0_10", required: true, endpoints: { min: "brak", max: "bardzo silny" } },
        { id: "q28_meals", sourceRef: "28", label: "Jak najczęściej wyglądają Twoje posiłki na co dzień?", type: "single_choice", required: true, options: [option("regular_varied", "Najczęściej jem regularnie i dość różnorodnie"), option("good_irregular_times", "Jem dość dobrze, ale często o różnych porach"), option("rushed_random", "Często jem w pośpiechu albo przypadkowo"), option("want_improve", "Chciałbym lub chciałabym poprawić sposób odżywiania"), option("unknown", "Trudno mi to ocenić")] },
        { id: "q29_fruit_veg", sourceRef: "29", label: "Ile razy w ciągu dnia jesz warzywa lub owoce?", help: "Nie musi to być dokładna liczba. Chodzi o ogólny obraz.", type: "single_choice", required: true, options: [option("under_1", "Rzadziej niż raz dziennie"), option("1", "Około 1 raz dziennie"), option("2", "Około 2 razy dziennie"), option("3_4", "3-4 razy dziennie"), option("5_plus", "5 lub więcej razy dziennie"), option("unknown", "Trudno powiedzieć")] }
      ]
    },
    {
      id: "working_preferences",
      title: "8. Jak najlepiej z Tobą pracować?",
      clientIntro: "Te pytania są opcjonalne. Pomagają mi lepiej dopasować sposób prowadzenia treningu.",
      questions: [
        { id: "q30_training_preferences", sourceRef: "30", label: "Co pomaga Ci dobrze i spokojnie czuć się podczas treningu?", type: "multi_choice", required: false, options: [option("why", "Chcę wiedzieć, po co robimy dane ćwiczenie"), option("learn_calmly", "Wolę spokojnie poznawać nowe ćwiczenia"), option("step_by_step", "Lubię wiedzieć, co będziemy robić krok po kroku"), option("can_stop", "Chcę móc przerwać ćwiczenie, jeśli źle się czuję"), option("clear_cues", "Lubię jasne i konkretne wskazówki"), option("less_talk_more_action", "Wolę mniej tłumaczenia i więcej działania"), option("no_preference", "Nie mam szczególnych preferencji"), option("other", "Inne")] },
        { id: "q31_dislikes", sourceRef: "31", label: "Czy jest coś, czego nie lubisz podczas treningu albo chcesz unikać?", type: "multi_choice", required: false, options: [option("competition", "Rywalizacji"), option("jumping", "Skakania"), option("floor_kneeling", "Ćwiczeń w leżeniu lub klęku"), option("heavy_loads", "Dużych ciężarów"), option("performance_pressure", "Presji na wynik"), option("none", "Nie mam takich rzeczy"), option("other", "Inne")] },
        { id: "q32_other", sourceRef: "32", label: "Czy jest jeszcze coś ważnego, o czym powinienem wiedzieć przed naszym spotkaniem?", type: "long_text", required: false }
      ]
    },
    {
      id: "confirmation_privacy",
      title: "9. Potwierdzenie i prywatność",
      productionBlocker: "health_data_consent_and_autosave",
      questions: [
        { id: "confirm_best_knowledge", sourceRef: "privacy.1", label: "Potwierdzam, że podałem lub podałam informacje zgodnie ze swoją najlepszą wiedzą.", type: "confirmation", required: true },
        { id: "confirm_trainer_not_doctor", sourceRef: "privacy.2", label: "Rozumiem, że trener nie zastępuje lekarza. Jeśli będzie taka potrzeba, może poprosić mnie o konsultację z lekarzem lub innym specjalistą.", type: "confirmation", required: true },
        { id: "consent_health_data", sourceRef: "privacy.3", label: "Wyrażam zgodę na przetwarzanie podanych przeze mnie danych dotyczących zdrowia w celu przygotowania i prowadzenia usługi.", type: "confirmation", required: true, legalReviewRequired: true }
      ]
    }
  ]
});

export const PRE_PWD_V3_TRAINER_BRIEF = deepFreeze([
  { id: "goal", label: "Cel", sources: ["client_profile.goal_snapshot", "2", "2.detail", "3"] },
  { id: "barriers", label: "Największa przeszkoda", sources: ["4"] },
  { id: "work", label: "Praca", sources: ["5", "6"] },
  { id: "safety", label: "Bezpieczeństwo", sources: ["7", "8", "8A", "9", "9.detail", "10", "10.detail", "12", "12A", "12A.detail"] },
  { id: "pain", label: "Ból lub dyskomfort", sources: ["13", "13A", "13B", "13C", "13D", "13E", "13F", "13G", "13H", "13I"] },
  { id: "injury", label: "Uraz / operacja", sources: ["14", "15", "15A", "15B", "15B.detail", "15C", "15D", "15E", "15E.detail", "15F", "15G"] },
  { id: "pregnancy", label: "Ciąża / po porodzie", sources: ["16", "16A", "16B", "16B.detail", "17", "17A", "17B", "17C"] },
  { id: "activity", label: "Aktywność", sources: ["18", "19", "20"] },
  { id: "recovery", label: "Woda i regeneracja", sources: ["24", "25", "26", "27"] },
  { id: "nutrition", label: "Jedzenie", sources: ["28", "29"] },
  { id: "clarify", label: "Do doprecyzowania", sources: [], rule: "trainer_review_only" }
]);

export function listPrePwdV3Questions() {
  return PRE_PWD_V3_DEFINITION.sections.flatMap(section => section.questions || []);
}

export function findPrePwdV3Question(questionId) {
  return listPrePwdV3Questions().find(question => question.id === questionId) || null;
}

function answerContains(answer, value) {
  return Array.isArray(answer) ? answer.includes(value) : answer === value;
}

export function evaluatePrePwdV3Visibility(rule, answers = {}) {
  if (!rule) return true;
  if (rule.mode === "answer_in") return rule.values.some(value => answerContains(answers[rule.questionId], value));
  if (rule.mode === "any") return rule.rules.some(child => evaluatePrePwdV3Visibility(child, answers));
  if (rule.mode === "blocked_pending_rule") return false;
  throw new Error(`Unsupported pre-PWD v3 visibility rule: ${rule.mode}`);
}
