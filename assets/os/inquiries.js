export const INQUIRY_DECISIONS = Object.freeze([
  ["PWD", "PWD"],
  ["FOLLOW_UP", "Follow-up"],
  ["NOT_NOW", "Nie teraz"],
  ["REFERRED", "Najpierw konsultacja / inny krok"],
  ["NOT_A_FIT", "Studio Las nie pasuje"],
  ["CLOSED_BY_PERSON", "Osoba nie chce kontynuować"]
]);

export const CONTACT_STATUS_LABELS = Object.freeze({
  pending: "Kontakt oczekuje",
  contacting: "Kontakt w toku",
  completed: "Rozmowa odbyta",
  unreachable: "Nie udało się skontaktować"
});

export const INQUIRY_STATUS_LABELS = Object.freeze({
  open: "Otwarte",
  closed: "Zamknięte",
  converted: "Przekazane do PWD"
});

const CALL_BRIEF_TEMPLATES = Object.freeze({
  "Swobodniejsze poruszanie się na co dzień": {
    purpose: "Zrozumieć, co w codziennym życiu stało się trudniejsze i co osoba chce odzyskać.",
    questions: [
      "Co konkretnie jest dziś trudniejsze niż kiedyś?",
      "W jakich sytuacjach najbardziej to zauważasz?",
      "Co chciałbyś móc robić bez zastanawiania się nad ciałem?",
      "Dlaczego chcesz zająć się tym właśnie teraz?"
    ]
  },
  "Powrót do aktywności lub sportu": {
    purpose: "Zrozumieć, do jakiej aktywności osoba chce wrócić i co obecnie zatrzymuje ten powrót.",
    questions: [
      "Do czego konkretnie chcesz wrócić?",
      "Na jakim poziomie robiłeś to wcześniej?",
      "Co obecnie najbardziej zatrzymuje Cię przed powrotem?",
      "Po czym poznasz, że powrót się udał?"
    ]
  },
  "Siła i kondycja po przerwie": {
    purpose: "Zrozumieć, co osoba chce odzyskać po przerwie i jaki realny efekt byłby dla niej ważny.",
    questions: [
      "Jak wyglądała Twoja aktywność przed przerwą?",
      "Co chciałbyś odzyskać jako pierwsze?",
      "Co sprawiło, że do tej pory trudno było wrócić?",
      "Co chciałbyś móc zrobić za 3 miesiące, czego dziś nie robisz?"
    ]
  },
  "Większa pewność w ruchu": {
    purpose: "Zrozumieć, gdzie osoba nie ufa dziś swojemu ciału i czego przez to unika.",
    questions: [
      "W jakich sytuacjach najbardziej brakuje Ci pewności?",
      "Czy są ruchy lub aktywności, których dziś unikasz?",
      "Co musiałoby się zmienić, żebyś znowu ufał swojemu ciału?",
      "Czy wydarzyło się coś, po czym ta pewność się zmniejszyła?"
    ]
  },
  "Chcę najpierw porozmawiać": {
    purpose: "Pomóc osobie nazwać, czego właściwie potrzebuje, bez wciskania jej w gotową kategorię.",
    questions: [
      "Co sprawiło, że zostawiłeś dziś kontakt?",
      "Co chciałbyś, żeby za kilka miesięcy było inne?",
      "Czy jest coś, co obecnie ogranicza Cię w życiu lub aktywności?",
      "Dlaczego pomyślałeś właśnie o Studio Las?"
    ]
  }
});

function normalizeLocalDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function buildInquiryCallBrief(inquiry) {
  const template = CALL_BRIEF_TEMPLATES[inquiry?.broad_goal] || CALL_BRIEF_TEMPLATES["Chcę najpierw porozmawiać"];
  return {
    purpose: template.purpose,
    questions: [...template.questions],
    summaryPrompt: "Czyli dobrze rozumiem, że najbardziej zależy Ci na ___, a obecnie zatrzymuje Cię przede wszystkim ___?",
    pwdBoundary: "Jeśli jest dopasowanie: przedstaw PWD jako sposób ustalenia spokojnego i rozsądnego punktu startowego — nie jako sprzedaż treningu.",
    guardrail: "Nie zakładaj diagnozy, źródła bólu, przyczyny przerwy ani gotowości osoby do zakupu programu."
  };
}

export function decisionNextAction(decision, values = {}) {
  if (decision === "PWD") return { type: "arrange_pwd", at: null };
  if (decision === "REFERRED") return { type: "referral", at: null };
  if (decision === "FOLLOW_UP") {
    return {
      type: values.followUpChannel === "message" ? "contact_message" : "contact_call",
      at: normalizeLocalDateTime(values.followUpAt)
    };
  }
  return { type: null, at: null };
}