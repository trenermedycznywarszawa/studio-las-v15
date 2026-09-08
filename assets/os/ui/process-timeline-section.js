import { buildProcessTimeline, PROCESS_TIMELINE_SEMANTICS } from "../process-timeline.js";
import { create, formatDate, panel } from "./common.js";

const SOURCE_LABELS = Object.freeze({
  clients: "Profil klienta",
  client_intakes: "Wywiad",
  sessions: "Sesja",
  pre_session_checks: "Check przed sesją",
  post_session_observations: "Obserwacja po sesji",
  body_measurements: "Pomiar",
  training_load_observations: "Obciążenie",
  assessment_results: "Obserwacja ruchowa",
  home_plans: "Guidance",
  guidance_events: "Sygnał klienta",
  reports: "Raport",
  client_cycle_decisions: "Decyzja cyklu",
  trainer_signal_reviews: "Przegląd sygnału"
});

function compactSourceId(value) {
  const id = String(value || "");
  if (!id) return "bez id";
  return id.length > 10 ? `…${id.slice(-8)}` : id;
}

function timelineEntry(item) {
  const sourceLabel = SOURCE_LABELS[item.sourceType] || item.sourceType;
  const semanticLabel = PROCESS_TIMELINE_SEMANTICS[item.semantic] || item.semantic;
  const sourceText = `${sourceLabel} · ${compactSourceId(item.sourceId)} · ${formatDate(item.sourceDate)}`;
  const sourceRef = `${item.sourceType}:${item.sourceId || "no-id"}`;

  return create("article", {
    className: "record timeline-entry",
    "data-source-type": item.sourceType,
    "data-source-id": item.sourceId,
    "data-semantic": item.semantic
  }, [
    create("strong", { text: item.label }),
    create("div", { className: "guidance-state" }, [
      create("span", { text: semanticLabel })
    ]),
    create("p", { text: item.value }),
    item.meta ? create("p", { className: "muted", text: item.meta }) : null,
    create("p", {
      className: "brief-source",
      text: `Źródło: ${sourceText}`,
      title: sourceRef
    })
  ]);
}

export function processTimelineSection(workspace, { previewLimit = 12 } = {}) {
  const timeline = buildProcessTimeline(workspace);
  const recent = timeline.slice(0, previewLimit);
  const older = timeline.slice(previewLimit);

  const body = create("div", {}, [
    create("p", {
      className: "brief-intro",
      text: "Chronologia jest projekcją istniejących zapisów. Nie tworzy nowych zdarzeń i nie dopowiada brakujących faktów."
    }),
    recent.length
      ? create("div", { className: "record-list timeline-list" }, recent.map(timelineEntry))
      : create("p", { className: "muted", text: "Brak rekordów z datą, które można bezpiecznie pokazać w historii procesu." }),
    older.length
      ? create("details", { className: "details-card" }, [
          create("summary", { text: `Pokaż starsze wpisy (${older.length})` }),
          create("div", { className: "details-content record-list timeline-list" }, older.map(timelineEntry))
        ])
      : null
  ]);

  return panel(
    "Historia procesu",
    body,
    "Tylko odczyt · najnowsze → najstarsze · FAKT / INTERPRETACJA / DECYZJA"
  );
}
