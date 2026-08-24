const copy = value => structuredClone(value);

const guidanceV1 = Object.freeze({
  version: 1,
  channel: "app",
  action: "Spokojny spacer w znanym otoczeniu.",
  purpose: "Dać ciału spokojny, przewidywalny ruch bez dokładania presji.",
  dose: "10 minut, jeden raz przed kolejną sesją.",
  boundary: "Zwolnij albo przerwij, jeśli pojawi się niepokój, wyraźne pogorszenie lub niepewność."
});

const guidanceV2 = Object.freeze({
  version: 2,
  channel: "app",
  action: "Krótki, spokojny spacer blisko domu.",
  purpose: "Utrzymać łagodny ruch po świadomej korekcie Damiana.",
  dose: "5–8 minut, jeden raz przed kolejną sesją.",
  boundary: "Zwolnij albo przerwij przy niepokoju, pogorszeniu lub niepewności."
});

export function createGuidanceState() {
  return { guidance: copy(guidanceV1), latestEvent: null, clientMessage: null, trainerConfirmation: null };
}

export function submitClientEvent(state, event) {
  const next = copy(state);
  if (!event || !["execution", "question", "concern"].includes(event.type)) throw new Error("Dozwolony jest wyłącznie sygnał wykonania, pytanie albo niepokój.");
  if (event.type === "execution" && !["done", "partial", "not_done"].includes(event.value)) throw new Error("Sygnał wykonania wymaga jednej z trzech wartości.");
  if ((event.type === "question" || event.type === "concern") && !String(event.text || "").trim()) throw new Error("Wiadomość wymaga treści.");
  next.latestEvent = { ...event, guidanceVersion: next.guidance.version };
  next.clientMessage = "Przekazano Damianowi. To zgłoszenie nie zmienia automatycznie aktualnej wskazówki.";
  return next;
}

export function makeTrainerDecision(state, decision, { channel = state.guidance.channel } = {}) {
  const next = copy(state);
  if (!['confirm', 'publish', 'contact'].includes(decision)) throw new Error("Nieznana decyzja Damiana.");
  if (decision === 'confirm') {
    next.trainerConfirmation = "Damian świadomie potwierdził plan bez zmian.";
    next.clientMessage = next.trainerConfirmation;
  }
  if (decision === 'contact') {
    next.trainerConfirmation = "Damian skontaktuje się z klientem. Aktualna wskazówka nie została automatycznie zmieniona.";
    next.clientMessage = next.trainerConfirmation;
  }
  if (decision === 'publish') {
    if (!['app', 'paper'].includes(channel)) throw new Error("Kanał prowadzenia wymaga aplikacji albo papieru.");
    next.guidance = { ...copy(guidanceV2), channel };
    next.trainerConfirmation = "Damian opublikował nową aktualną wskazówkę.";
    next.clientMessage = "Damian opublikował nową wskazówkę. Poprzednia nie jest już aktywna.";
  }
  return next;
}