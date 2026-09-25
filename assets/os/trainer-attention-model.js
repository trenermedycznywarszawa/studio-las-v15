import { withoutReviewedSignals } from "./decision-support.js";
import { collectWorkspaceSignals } from "./trainer-signals.js";
import { assertTrainerAttentionSnapshot } from "./trainer-attention-snapshot.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE_LABELS = Object.freeze({
  session: "Sesja",
  "training-load": "Tolerancja obciążenia",
  "trainer-check": "Sprawdzenie trenera",
  "client-record": "Karta klienta",
  "client-response": "Odpowiedź klienta",
  process: "Proces"
});

function dateOnly(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(`${raw.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function daysFrom(today, value) {
  const start = dateOnly(today);
  const target = dateOnly(value);
  if (!start || !target) return null;
  return Math.round((new Date(`${target}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / DAY_MS);
}

function groupByClient(rows = []) {
  const grouped = new Map();
  for (const row of rows) {
    const clientId = String(row.client_id);
    if (!grouped.has(clientId)) grouped.set(clientId, []);
    grouped.get(clientId).push(row);
  }
  return grouped;
}

function sourceLabel(signal) {
  return SOURCE_LABELS[signal.source] || "Źródło procesu";
}

function stageLabel(client) {
  const explicit = String(client.stage_label || client.stageLabel || "").trim();
  if (explicit) return explicit;
  return client.stage ? `Etap ${client.stage}` : "Proces Studio Las";
}

function nextQuietFact(client) {
  if (client.next_session_date) return `następna sesja ${dateOnly(client.next_session_date)}`;
  if (client.next_review_date) return `Review ${dateOnly(client.next_review_date)}`;
  return "brak otwartego wyjątku";
}

function signalToItem(client, signal) {
  const contactOpen = Boolean(signal.contactReviewId);
  return Object.freeze({
    clientId: client.id,
    client: client.name,
    stage: stageLabel(client),
    kind: contactOpen ? "contact" : signal.level === "urgent-review" ? "urgent" : "signal",
    level: signal.level,
    reason: contactOpen ? "Kontakt nadal wymaga domknięcia" : signal.label,
    context: signal.context || "Zapisany fakt wymaga przeglądu przez trenera.",
    question: contactOpen ? "Co ustalono po kontakcie i czy zmienia to najbliższe prowadzenie?" : signal.trainerQuestion,
    source: `${sourceLabel(signal)} · ${signal.sourceDate}`,
    sourceDate: signal.sourceDate,
    signalKey: signal.signalKey,
    signalId: signal.id || null,
    sourceType: signal.source || null,
    sourceId: signal.sourceId || null,
    sourceRevision: signal.sourceRevision || null,
    contactReviewId: signal.contactReviewId || null,
    sourceChangedSinceContact: false,
    relatedSignalKeys: Object.freeze([])
  });
}

function reviewDueItem(client, days) {
  const sourceDate = dateOnly(client.next_review_date);
  const overdue = days < 0;
  return Object.freeze({
    clientId: client.id,
    client: client.name,
    stage: stageLabel(client),
    kind: "review",
    level: "review",
    reason: overdue ? "Punkt Review jest po terminie" : "Punkt Review przypada dziś",
    context: overdue
      ? `W karcie klienta zapisano Review na ${sourceDate}. System nie ocenia wyniku procesu.`
      : "W karcie klienta zapisano dzisiejszą datę Review. System nie ocenia wyniku procesu.",
    question: "Jaka jest decyzja co dalej na podstawie całego kontekstu?",
    source: `Karta klienta · next_review_date · ${sourceDate}`,
    sourceDate
  });
}

function semanticSourceKey(item) {
  if (!item.signalId || !item.sourceType || !item.sourceId) return "";
  return [item.clientId, item.signalId, item.sourceType, item.sourceId].map(String).join("::");
}

function collapseOpenContactRevisions(items) {
  const groups = new Map();
  const passthrough = [];

  for (const item of items) {
    const key = semanticSourceKey(item);
    if (!key) {
      passthrough.push(item);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const collapsed = [...passthrough];
  for (const group of groups.values()) {
    const contacts = group.filter(item => item.kind === "contact");
    if (!contacts.length || group.length === 1) {
      collapsed.push(...group);
      continue;
    }

    const contact = [...contacts].sort((left, right) =>
      String(right.sourceRevision || "").localeCompare(String(left.sourceRevision || ""))
    )[0];
    const related = group.filter(item => item.signalKey !== contact.signalKey);
    collapsed.push(Object.freeze({
      ...contact,
      context: `${contact.context} Ten sam rekord źródłowy ma nowszą lub równoległą rewizję; inbox zachowuje jeden otwarty kontakt dla tej sytuacji.`,
      sourceChangedSinceContact: related.length > 0,
      relatedSignalKeys: Object.freeze(related.map(item => item.signalKey))
    }));
  }

  return collapsed;
}

function attentionRank(item) {
  if (item.level === "urgent-review") return 0;
  if (item.kind === "contact") return 1;
  if (item.kind === "signal") return 2;
  if (item.kind === "review") return 3;
  return 4;
}

export function buildTrainerAttentionModel(snapshot, {
  today = new Date().toISOString().slice(0, 10),
  reviewSoonDays = 7
} = {}) {
  assertTrainerAttentionSnapshot(snapshot);

  const clients = snapshot.clients.filter(client => client.status !== "archived");
  const sessions = groupByClient(snapshot.sessions);
  const trainingLoad = groupByClient(snapshot.trainingLoad);
  const preSessionChecks = groupByClient(snapshot.preSessionChecks);
  const guidanceEvents = groupByClient(snapshot.guidanceEvents);
  const signalReviews = groupByClient(snapshot.signalReviews);
  const rawAttention = [];
  const reviewSoon = [];

  for (const client of clients) {
    const clientId = String(client.id);
    const reviews = signalReviews.get(clientId) || [];
    const workspace = {
      sessions: sessions.get(clientId) || [],
      trainingLoad: trainingLoad.get(clientId) || [],
      preSessionChecks: preSessionChecks.get(clientId) || [],
      guidanceEvents: guidanceEvents.get(clientId) || [],
      signalReviews: reviews
    };
    const generated = collectWorkspaceSignals(workspace);
    const open = withoutReviewedSignals(generated, reviews);
    for (const signal of open.signals) {
      if (signal.level === "information") continue;
      rawAttention.push(signalToItem(client, signal));
    }

    const reviewDistance = daysFrom(today, client.next_review_date);
    if (reviewDistance !== null && reviewDistance <= 0) {
      rawAttention.push(reviewDueItem(client, reviewDistance));
    } else if (reviewDistance !== null && reviewDistance <= reviewSoonDays) {
      reviewSoon.push(Object.freeze({
        clientId: client.id,
        client: client.name,
        stage: stageLabel(client),
        date: dateOnly(client.next_review_date),
        days: reviewDistance
      }));
    }
  }

  const attention = collapseOpenContactRevisions(rawAttention);
  attention.sort((left, right) =>
    attentionRank(left) - attentionRank(right)
      || String(right.sourceDate || "").localeCompare(String(left.sourceDate || ""))
      || String(left.client).localeCompare(String(right.client), "pl")
  );

  const attentionClients = new Set(attention.map(item => String(item.clientId)));
  const upcomingReviewClients = new Set(reviewSoon.map(item => String(item.clientId)));
  const quiet = clients
    .filter(client => !attentionClients.has(String(client.id)) && !upcomingReviewClients.has(String(client.id)))
    .map(client => Object.freeze({
      clientId: client.id,
      client: client.name,
      stage: stageLabel(client),
      meta: nextQuietFact(client)
    }));

  const counts = Object.freeze({
    situations: attention.length,
    clients: attentionClients.size,
    contacts: attention.filter(item => item.kind === "contact").length,
    signals: attention.filter(item => item.kind === "signal" || item.kind === "urgent").length,
    reviews: attention.filter(item => item.kind === "review").length
  });

  return Object.freeze({
    today: dateOnly(today),
    attention: Object.freeze(attention),
    reviewSoon: Object.freeze(reviewSoon),
    quiet: Object.freeze(quiet),
    counts,
    disclaimer: "To są fakty do przeglądu przez trenera, nie diagnoza ani automatyczna decyzja o zmianie planu."
  });
}
