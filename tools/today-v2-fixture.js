import { renderClientV2 } from "../assets/os/ui/client-v2.js";

const root = document.getElementById("app");
const params = new URLSearchParams(window.location.search);
const fixture = params.get("fixture") || "plan";

const snapshot = {
  serverDate: "2026-09-25",
  client: {
    firstName: "Kasia",
    stageLabel: "Prowadzenie · tydzień 8",
    goal: "Powrót do biegania 5 km bez bólu kolana",
    nextSessionDate: "2026-09-29"
  },
  homePlan: fixture === "empty" ? null : {
    id: "plan-1",
    title: "Spokojny bieg i przygotowanie kolana",
    focus: "Jakość ruchu i spokojne tempo. Bez dokładania intensywności ponad ustalenie.",
    instructions: "Jeśli pojawi się ból wykraczający poza ustaloną granicę, przerwij i zapisz krótki sygnał dla trenera.",
    frequency: "2 razy w tym tygodniu",
    duration: "około 35 min",
    guidanceChannel: "digital",
    items: [
      {
        id: "mobility",
        name: "Przygotowanie kolana",
        dosage: "8–10 min",
        frequency: "przed biegiem",
        clientCue: "Ruch spokojny, bez wymuszania zakresu.",
        stopCriteria: "narastający ból lub wyraźna zmiana sposobu ruchu"
      },
      {
        id: "run",
        name: "Bieg spokojny",
        dosage: "20–25 min",
        frequency: "1 próba",
        clientCue: "Tempo, przy którym możesz swobodnie mówić pełnymi zdaniami.",
        stopCriteria: "ból powyżej ustalonej granicy lub pogarszanie techniki"
      }
    ]
  },
  latestAgreement: fixture === "empty" ? null : {
    summary: "W tym tygodniu nie dokładamy tempa. Interesuje nas spokojne wykonanie i reakcja kolana.",
    nextStep: "Po próbie zostaw tylko to, co warto zapamiętać przed kolejną decyzją."
  },
  questionnaires: [],
  reports: [{
    id: "report-1",
    title: "Review · tydzień 6",
    type: "review",
    content: "Wróciła regularność ruchu. Kolejna decyzja dotyczy stopniowego wydłużania biegu.",
    publishedAt: "2026-09-10"
  }],
  measurements: []
};

const responseStates = {};
if (fixture === "uncertain") {
  responseStates.run = {
    status: "uncertain",
    response: "Kolano było spokojne przez większość biegu.",
    message: "Nie udało się potwierdzić zapisu. Zachowaliśmy tę próbę; sprawdź ją przed wysłaniem kolejnej odpowiedzi.",
    homePlanItemId: "run",
    homePlanId: "plan-1",
    submissionId: "fixture-uncertain",
    serverDate: snapshot.serverDate
  };
}

const model = {
  snapshot,
  questionnaire: {},
  responseStates,
  loading: false,
  error: "",
  onReload: () => {
    document.documentElement.dataset.fixtureReloaded = "true";
  },
  onLogout: () => {
    document.documentElement.dataset.fixtureLoggedOut = "true";
  },
  onSaveCheckin: async (id, text) => {
    responseStates[id] = {
      status: "saved",
      receipt: {
        id: `receipt-${id}`,
        savedAt: new Date().toISOString(),
        eventDate: snapshot.serverDate,
        text
      }
    };
    render();
  },
  onRetryResponse: async id => {
    const text = responseStates[id]?.response || "Zapisano odpowiedź testową.";
    responseStates[id] = {
      status: "saved",
      receipt: {
        id: `receipt-${id}`,
        savedAt: new Date().toISOString(),
        eventDate: snapshot.serverDate,
        text
      }
    };
    render();
  }
};

function render() {
  renderClientV2(root, model);
}

window.__STUDIO_LAS_TODAY_V2_FIXTURE__ = { fixture, snapshot, model };
render();
