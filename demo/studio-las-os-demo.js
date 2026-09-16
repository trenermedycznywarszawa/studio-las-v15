import {
  button,
  clear,
  create,
  panel,
  recordList,
  statusBox
} from "../assets/os/ui/common.js";

const root = document.getElementById("demo-app");

const initialState = Object.freeze({
  client: Object.freeze({
    firstName: "Anna",
    stageLabel: "Prowadzona praca 1:1",
    goal: "Spokojnie wrócić do codziennego ruchu i odzyskać zaufanie do kolana.",
    nextSessionDate: "2026-07-20"
  }),
  homePlan: Object.freeze({
    title: "Kierunek na ten tydzień",
    focus: "Krótka praktyka offline. Panel służy tylko do zapisania sygnału po wykonaniu zadania.",
    items: Object.freeze([
      Object.freeze({
        id: "demo-item-1",
        name: "Spokojne wstawanie z krzesła",
        dosage: "2 serie po 5 powtórzeń",
        cue: "Ruch ma być płynny i bez pośpiechu.",
        stopCriteria: "Przerwij, gdy ból wyraźnie narasta albo pojawia się nowy objaw."
      }),
      Object.freeze({
        id: "demo-item-2",
        name: "Krótki spacer w swoim tempie",
        dosage: "10–15 minut",
        cue: "Zostaw zapas energii; nie testuj granic.",
        stopCriteria: "Przerwij, jeśli czujesz się niepewnie lub objawy szybko rosną."
      })
    ])
  }),
  latestAgreement: Object.freeze({
    summary: "W tym tygodniu utrzymujemy prosty kierunek i obserwujemy reakcję bez zwiększania presji.",
    nextStep: "Na kolejnej sesji trener omówi sygnały w kontekście całego procesu."
  }),
  reports: Object.freeze([
    Object.freeze({
      title: "Przegląd 4 tygodni — przykład",
      content: "To fikcyjny raport pokazujący, jak po czasie można uporządkować obserwacje bez punktów, rankingów i automatycznej diagnozy."
    })
  ])
});

let checkins = [];

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("pl-PL");
}

function render() {
  clear(root);

  const header = create("header", { className: "topbar" }, [
    create("div", {}, [
      create("p", { className: "eyebrow", text: "Studio Las OS · izolowane demo" }),
      create("h1", { text: "Podgląd panelu klienta" })
    ]),
    button("Wyczyść zmiany demo", { onclick: () => {
      checkins = [];
      render();
    } })
  ]);

  const stage = create("div", { className: "client-stage" }, [
    create("strong", { text: initialState.client.stageLabel }),
    create("p", { text: initialState.client.goal }),
    create("p", { className: "muted", text: `Następna sesja: ${formatDate(initialState.client.nextSessionDate)}` })
  ]);

  const plan = create("div", {}, [
    create("h3", { text: initialState.homePlan.title }),
    create("p", { text: initialState.homePlan.focus }),
    recordList(initialState.homePlan.items, item => create("article", { className: "record client-record" }, [
      create("strong", { text: item.name }),
      create("p", { text: item.dosage }),
      create("p", { text: item.cue }),
      create("p", { className: "stop-note", text: `Przerwij i zgłoś: ${item.stopCriteria}` })
    ]), "Brak zadań demo.")
  ]);

  const form = create("form", { className: "form-grid client-checkin" }, [
    create("label", { className: "field" }, [
      create("span", { text: "Zadanie" }),
      create("select", { name: "itemId" }, initialState.homePlan.items.map(item =>
        create("option", { value: item.id, text: item.name })
      ))
    ]),
    create("label", { className: "check-field" }, [
      create("input", { type: "checkbox", name: "done" }),
      create("span", { text: "Wykonane" })
    ]),
    create("label", { className: "field" }, [
      create("span", { text: "Energia 0–10" }),
      create("input", { type: "number", name: "energy", min: 0, max: 10, required: true })
    ]),
    create("label", { className: "field" }, [
      create("span", { text: "Dolegliwości 0–10" }),
      create("input", { type: "number", name: "symptoms", min: 0, max: 10, required: true })
    ]),
    create("div", { className: "form-actions" }, [
      create("button", { className: "button primary", type: "submit", text: "Zapisz tylko w pamięci demo" })
    ])
  ]);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const item = initialState.homePlan.items.find(entry => entry.id === data.get("itemId"));
    checkins = [
      {
        id: crypto.randomUUID(),
        itemName: item?.name || "Zadanie demo",
        done: form.elements.done.checked,
        energy: Number(data.get("energy")),
        symptoms: Number(data.get("symptoms")),
        recordedAt: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
      },
      ...checkins
    ];
    render();
  });

  const saved = checkins.length
    ? recordList(checkins, item => create("article", { className: "record" }, [
        create("strong", { text: item.itemName }),
        create("p", { text: `Wykonane: ${item.done ? "tak" : "nie"} · energia: ${item.energy}/10 · dolegliwości: ${item.symptoms}/10` }),
        create("p", { className: "muted", text: `Pamięć demo · ${item.recordedAt}` })
      ]), "")
    : create("p", { className: "muted", text: "Nie zapisano jeszcze żadnego sygnału w tej sesji demo." });

  const content = create("main", { className: "demo-shell" }, [
    statusBox("To środowisko nie ładuje konfiguracji Supabase, nie wykonuje zapytań sieciowych i nie używa localStorage ani sessionStorage.", "error"),
    panel("Twój obecny etap", stage),
    panel("Plan domowy", plan),
    panel("Krótki sygnał — demo", create("div", {}, [
      create("p", { text: "Poniższy zapis istnieje wyłącznie w pamięci tej karty przeglądarki i znika po odświeżeniu." }),
      form,
      create("h3", { text: "Sygnały zapisane w tej sesji" }),
      saved
    ])),
    panel("Ostatnie ustalenie", create("div", {}, [
      create("p", { text: initialState.latestAgreement.summary }),
      create("strong", { text: initialState.latestAgreement.nextStep })
    ])),
    panel("Raporty — przykłady", recordList(initialState.reports, report => create("article", { className: "record" }, [
      create("strong", { text: report.title }),
      create("p", { text: report.content })
    ]), "Brak raportów demo.")),
    create("p", { className: "client-disclaimer", text: "Demo nie diagnozuje, nie rekomenduje leczenia i nie reprezentuje prawdziwego klienta." })
  ]);

  root.append(header, content);
}

render();
