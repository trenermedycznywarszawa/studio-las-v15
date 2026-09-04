import { fixtures, fixtureById } from "./fixtures.js";
import { createEntryLedger, GuidanceLoop, exactRef, makeEntryDecision } from "./workflow-state.js";

const $ = selector => document.querySelector(selector);
const scenario = $("#scenario");
const risk = $("#risk");
const status = $("#status");
const clientEmpty = $("#client-empty");
const guidance = $("#guidance");
const clientResponse = $("#client-response");
const trainerEmpty = $("#trainer-empty");
const trainerWork = $("#trainer-work");
const responseFieldset = clientResponse.querySelector("fieldset");

let loop = null;
let fixture = null;
let activeRelease = null;

const riskLabels = {
  current_authority: "Ryzyko: klient nie rozpoznaje jednej aktualnej instrukcji.",
  stale_paper: "Ryzyko: fizyczna stara instrukcja pozostaje wykonalna.",
  duplicate_truth: "Ryzyko: papier i aplikacja zaczynają utrzymywać dwie prawdy.",
  non_judgmental_response: "Ryzyko: zatrzymanie lub pytanie stają się oceną klienta.",
  stale_guidance: "Ryzyko: v1 pozostaje aktywna po publikacji v2.",
  atomic_revision: "Ryzyko: częściowa rewizja tworzy mieszane wydanie.",
  review_vs_expiry: "Ryzyko: miękki przegląd jest mylony z twardą ważnością.",
  tracking_pressure: "Ryzyko: brak pomiaru jest przedstawiony jako brak wykonania.",
  automatic_progression: "Ryzyko: kalendarz podejmuje decyzję za Damiana.",
  screen_dependence: "Ryzyko: większa samodzielność oznacza więcej aplikacji.",
  report_overreach: "Ryzyko: wybór dowodu automatycznie tworzy raport.",
  entry_gate: "Ryzyko: coś innego niż dokładny START otwiera Stage 5.",
  entry_invalidation: "Ryzyko: zalecenie działa po utracie ważności wejścia.",
  manual_fallback: "Ryzyko: bez portalu nie da się zakończyć procesu.",
  trainer_only_leak: "Ryzyko: rationale, audit lub draft trafia do klienta.",
  context_redirection: "Ryzyko: spóźniona odpowiedź zostaje przypięta do v2.",
  privacy_isolation: "Ryzyko: obca referencja zmienia lub ujawnia stan."
};

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function updateScenarioLabel() {
  const selected = fixtureById(scenario.value);
  risk.textContent = riskLabels[selected.risk] || `Ryzyko: ${selected.risk}`;
}

function authorityText(release) {
  if (release.channel === "paper") return "Kanał wiążący: papier. Aplikacja nie zastępuje przekazanej karty.";
  if (release.channel === "app") return "Kanał wiążący: aplikacja. Papier nie jest utrzymywany jako osobna instrukcja.";
  return `Kanał wiążący: ${release.authoritativeChannel === "paper" ? "papier" : "aplikacja"}. Rola pomocnicza: ${release.secondaryRole}`;
}

function renderClient() {
  if (!loop || !activeRelease || activeRelease.status !== "active") {
    clientEmpty.hidden = false;
    guidance.hidden = true;
    clientResponse.hidden = true;
    $("#channel-badge").textContent = "Brak aktywnej instrukcji";
    return;
  }
  const projection = loop.clientProjection();
  const item = projection.items[0];
  clientEmpty.hidden = true;
  guidance.hidden = false;
  clientResponse.hidden = false;
  responseFieldset.hidden = !activeRelease.responseRequest;
  $("#channel-badge").textContent = projection.authoritativeChannel === "paper" ? "Wiążący papier" : "Wiążąca aplikacja";
  $("#release-ref").textContent = projection.currentReleaseRef;
  $("#instruction").textContent = item.instruction;
  $("#purpose").textContent = item.purpose;
  $("#dose").textContent = item.dose;
  $("#stop-criteria").textContent = item.stopCriteria;
  $("#authority-note").textContent = authorityText(activeRelease);
}

function renderTrainer() {
  if (!loop || !activeRelease) {
    trainerEmpty.hidden = false;
    trainerWork.hidden = true;
    return;
  }
  trainerEmpty.hidden = true;
  trainerWork.hidden = false;
  const focus = loop.resolve(loop.currentFocusRef);
  $("#focus-title").textContent = focus.text;
  $("#focus-ref").textContent = exactRef(focus);
  const events = loop.reviewEvents();
  $("#queue-count").textContent = `${events.length} ${events.length === 1 ? "zdarzenie" : "zdarzeń"}`;
  $("#events").innerHTML = events.length
    ? events.map(event => `<li><strong>${event.kind}</strong><br><span class="exact-ref">${event.ref}</span></li>`).join("")
    : '<li class="muted">Brak zdarzeń wymagających decyzji.</li>';
}

function renderTimeline() {
  const timeline = $("#timeline");
  if (!loop || loop.snapshot().audit.length === 0) {
    timeline.innerHTML = "<li>Brak operacji w pamięci sesji.</li>";
    return;
  }
  timeline.innerHTML = loop.snapshot().audit.map(event =>
    `<li><strong>${event.action}</strong><br><span class="exact-ref">${event.primaryRef} · ${event.correlationId}</span></li>`
  ).join("");
}

function render() {
  try { renderClient(); } catch (error) {
    activeRelease = null;
    renderClient();
    setStatus(error.message, true);
  }
  renderTrainer();
  renderTimeline();
}

function clearForms() {
  clientResponse.reset();
  $("#decision-form").reset();
}

function startScenario({ announce = true } = {}) {
  clearForms();
  fixture = fixtureById(scenario.value);
  loop = new GuidanceLoop({ caseId: fixture.id });
  activeRelease = null;
  try {
    const entry = makeEntryDecision({ caseId: fixture.id, value: fixture.entryValue || "START" });
    loop.start(createEntryLedger({ caseId: fixture.id, decisions: [entry] }));
    loop.setFocus(fixture.focus);
    const draft = loop.draftRelease({
      items: fixture.items,
      channel: fixture.channel,
      authoritativeChannel: fixture.authoritativeChannel,
      secondaryRole: fixture.secondaryRole,
      reviewAt: fixture.reviewAt,
      validUntil: fixture.validUntil,
      responseRequest: fixture.responseRequest
    });
    activeRelease = loop.activate(loop.approveAndPublish(draft));
    if (announce) setStatus("Ścieżka została uruchomiona ręcznie. Żaden wynik ani następna decyzja nie zostały wybrane automatycznie.");
  } catch (error) {
    setStatus(`Kontrolowane odrzucenie: ${error.message}`, true);
  }
  render();
}

scenario.innerHTML = fixtures.map(item => `<option value="${item.id}">${item.label}</option>`).join("");
scenario.addEventListener("change", updateScenarioLabel);
updateScenarioLabel();

$("#start").addEventListener("click", startScenario);
$("#reset").addEventListener("click", () => {
  loop = null;
  fixture = null;
  activeRelease = null;
  clearForms();
  setStatus("Pamięć sesji została wyczyszczona. Nic nie zostało zapisane poza tą stroną.");
  render();
});

clientResponse.addEventListener("submit", event => {
  event.preventDefault();
  if (!loop || !activeRelease) return setStatus("Najpierw uruchom scenariusz.", true);
  const executionResponse = new FormData(clientResponse).get("execution");
  const question = $("#question").value;
  try {
    const interaction = loop.recordClientInteraction({
      releaseRef: exactRef(activeRelease),
      itemKey: activeRelease.items[0].key,
      executionResponse,
      question
    });
    setStatus(`Fikcyjne źródło zapisane na dokładnym kontekście ${interaction.releaseRef}. Bez oceny i automatycznej interpretacji.`);
    render();
  } catch (error) { setStatus(error.message, true); }
});

$("#review-events").addEventListener("click", () => {
  if (!loop) return setStatus("Najpierw uruchom scenariusz.", true);
  const pending = loop.all("client_interaction").filter(item => item.reviewState === "needs_review");
  for (const interaction of pending) {
    loop.reviewInteraction(exactRef(interaction), { resolution: interaction.question ? "unresolved" : null });
  }
  setStatus(pending.length ? `Damian jawnie przejrzał ${pending.length} zdarzenie/zdarzenia. Pytania mogą pozostać nierozstrzygnięte.` : "Nie ma nowych zdarzeń wymagających przeglądu.");
  render();
});

$("#decision-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!loop || !activeRelease) return setStatus("Najpierw uruchom scenariusz.", true);
  const value = new FormData(event.currentTarget).get("trainer-decision");
  const rationale = $("#rationale").value;
  const interactions = loop.all("client_interaction");
  try {
    const decision = loop.decide({
      value,
      rationale,
      evidenceRefs: [exactRef(activeRelease), ...interactions.map(exactRef)]
    });
    setStatus(`Jawna decyzja Damiana: ${decision.value}. System niczego nie rekomendował ani nie wybrał.`);
    render();
  } catch (error) { setStatus(error.message, true); }
});

$("#replace-guidance").addEventListener("click", () => {
  if (!loop || !activeRelease) return setStatus("Najpierw uruchom scenariusz.", true);
  try {
    if (fixture.id === "entry-invalidated-mid-cycle") {
      loop.invalidateEntry("Fikcyjna materialna korekta decyzji Stage 4.");
      activeRelease = null;
      setStatus("Bound START utracił ważność. Zalecenie fail-closed; zero aktualnych instrukcji jest dozwolone.", true);
      return render();
    }
    const predecessorMap = Object.fromEntries(activeRelease.items.map(item => [item.key, "replace"]));
    if (fixture.id === "partial-release-revision") delete predecessorMap[activeRelease.items.at(-1).key];
    const draft = loop.draftRelease({
      items: activeRelease.items.map(item => ({
        key: item.key,
        instruction: `Wersja uproszczona: ${item.instruction}`,
        purpose: item.purpose,
        dose: "5 minut, raz przed kolejnym spotkaniem.",
        stopCriteria: item.stopCriteria,
        signalDecision: item.signalDecision
      })),
      channel: activeRelease.channel,
      authoritativeChannel: activeRelease.authoritativeChannel,
      secondaryRole: activeRelease.secondaryRole,
      reviewAt: "2026-09-07T09:00:00.000Z",
      validUntil: "2026-09-14T09:00:00.000Z",
      responseRequest: activeRelease.responseRequest,
      predecessorRef: exactRef(activeRelease),
      predecessorMap
    });
    const ready = loop.approveAndPublish(draft);
    const retirement = fixture.id === "paper-retirement-failure" ? "unresolved_risk" : "confirmed";
    activeRelease = loop.activate(ready, { paperRetirement: retirement });
    setStatus(`Aktywowano ${exactRef(activeRelease)}. Poprzednik pozostaje w historii jako withdrawn, ale nie jest wykonalny.`);
  } catch (error) {
    setStatus(`Kontrolowane zatrzymanie zmiany: ${error.message}`, true);
  }
  render();
});

startScenario({ announce: false });
