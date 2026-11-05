import { buildPrePwdV31TrainerBrief, buildPrePwdV31FullAnswers } from "../questionnaires/pre-pwd-v31-trainer-brief.js";
import { create, detailsForm, formatDate, panel } from "./common.js";

const PRIMARY_IDS = new Set(["goal", "barriers", "safety", "pain", "injury", "pregnancy", "clarify"]);

/**
 * Tworzy element DOM karty pojedynczej pozycji podsumowania ankiety.
 *
 * @param {object} item - Pozycja podsumowania zawierająca etykietę i wiersze danych.
 * @returns {HTMLElement} Element węzła karty z etykietami, wartościami i źródłem.
 */
function briefItem(item) {
  return create("article", { className: "brief-card" }, [
    create("h3", { text: item.label }),
    ...item.lines.map(line => create("div", { className: "brief-list-item" }, [
      create("strong", { text: line.label }),
      create("p", { text: line.value }),
      create("p", { className: "brief-source", text: `Źródło: ${line.sourceType} · ${formatDate(line.sourceDate)}` })
    ]))
  ]);
}

/**
 * Parsuje sygnaturę czasową przekazania ankiety do wartości liczbowej milisekund.
 *
 * @param {string|null|undefined} value - Ciąg znaków ISO z datą przekazania.
 * @returns {number} Wartość w milisekundach lub 0 w przypadku braku lub błędu parsowania.
 */
function submissionTime(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Filtruje i sortuje przekazane ankiety klienta w kolejności od najnowszej do najstarszej.
 *
 * Warunki bezpieczeństwa i poufności:
 * - Zasada defense-in-depth: wyklucza wszelkie pozycje ze statusem innym niż 'submitted' (np. 'in_progress', draft).
 * - Odrzuca zgłoszenia bez daty przekazania (submittedAt) lub z nieprawidłowymi odpowiedziami.
 * - Akceptuje wyłącznie zgłoszenia powiązane z rendererem 'pre_pwd_v31'.
 *
 * Przypadki brzegowe:
 * - Przy identycznych datach przekazania stosuje deterministyczne sortowanie po assignmentId.
 * - W przypadku braku poprawnych ankiet zwraca pustą tablicę.
 *
 * @param {Array<object>} [submissions=[]] - Surowa lista ankiet przypisanych do klienta.
 * @returns {Array<object>} Posortowana lista wyłącznie świadomie przekazanych ankiet PWD v3.1.
 */
export function submittedPrePwdV31Submissions(submissions = []) {
  // The RPC provides only consciously submitted responses to authorized trainer AAL2.
  // Defense-in-depth: never render an object with a non-submitted status here.
  return [...submissions]
    .filter(item => item?.rendererKey === "pre_pwd_v31" &&
      item?.answers && typeof item.answers === "object" && !Array.isArray(item.answers) &&
      (!item.status || item.status === "submitted") && Boolean(item.submittedAt))
    .sort((left, right) => {
      const timeDiff = submissionTime(right?.submittedAt) - submissionTime(left?.submittedAt);
      if (timeDiff) return timeDiff;
      return String(right?.assignmentId || "").localeCompare(String(left?.assignmentId || ""));
    });
}

/**
 * Pobiera najnowszą świadomie przekazaną ankietę PWD v3.1 klienta.
 *
 * @param {Array<object>} [submissions=[]] - Lista zgłoszeń ankiet klienta.
 * @returns {object|null} Obiekt najnowszej przekazanej ankiety lub null, jeśli brak zgłoszeń.
 */
export function latestPrePwdV31Submission(submissions = []) {
  return submittedPrePwdV31Submissions(submissions)[0] || null;
}

/**
 * Generuje widok DOM prezentujący pełny zestaw danych źródłowych ankiety.
 *
 * @param {object} submission - Snapshot przekazanej ankiety klienta.
 * @returns {HTMLElement} Kontener z nagłówkiem informacyjnym i wszystkimi sekcjami pytań.
 */
function fullSubmittedAnswers(submission) {
  const full = buildPrePwdV31FullAnswers(submission);
  return create("div", { className: "session-brief" }, [
    create("p", {
      className: "brief-intro",
      text: "Pełny odczyt danych źródłowych, nie interpretacja. Wersja " +
        (full.versionCode || "nieznana") + " · przekazano " + formatDate(full.submittedAt) +
        " · odpowiedzi: " + full.displayedCount + "/" + full.answerCount
    }),
    ...full.sections.map(section => create("article", { className: "brief-card" }, [
      create("h3", { text: section.label }),
      ...section.lines.map(line => create("div", { className: "brief-list-item" }, [
        create("strong", { text: line.label }),
        create("p", { text: line.value }),
        create("p", { className: "brief-source", text: "Pytanie: " + line.questionId })
      ]))
    ]))
  ]);
}

/**
 * Renderuje główny panel podsumowania ankiety przed wizytą w pulpicie trenera.
 *
 * Struktura widoku:
 * - Skrócony brief 60 sekund z kluczowymi obszarami (cel, bariery, dolegliwości, pytania).
 * - Opcjonalny kontekst dodatkowy (aktywność, praca, regeneracja).
 * - Rozwijany pełny odczyt wszystkich odpowiedzi najnowszej ankiety.
 * - Historia wcześniejszych przekazanych ankiet (jeśli występuje więcej niż jedno zgłoszenie).
 *
 * @param {object} workspace - Stan przestrzeni roboczej trenera dla aktywnego klienta.
 * @param {Array<object>} [workspace.questionnaireSubmissions] - Lista zgłoszeń ankiet klienta.
 * @returns {HTMLElement|null} Panel DOM z podsumowaniem lub null, jeśli klient nie przekazał ankiet.
 */
export function questionnaireBriefPanel(workspace) {
  const submissions = submittedPrePwdV31Submissions(workspace.questionnaireSubmissions || []);
  const submission = submissions[0];
  if (!submission) return null;

  const brief = buildPrePwdV31TrainerBrief(submission);
  const primary = brief.items.filter(item => PRIMARY_IDS.has(item.id));
  const secondary = brief.items.filter(item => !PRIMARY_IDS.has(item.id));

  return panel(brief.title, create("div", { className: "session-brief" }, [
    create("p", {
      className: "brief-intro",
      text: "Odpowiedzi przekazane świadomie przez klienta. Najpierw przeczytaj sygnał; interpretacja i decyzja należą do trenera."
    }),
    create("div", { className: "brief-grid" }, primary.map(briefItem)),
    secondary.length
      ? detailsForm("Kontekst dodatkowy: praca, aktywność, regeneracja i jedzenie",
          create("div", { className: "brief-grid" }, secondary.map(briefItem)))
      : null,
    detailsForm("Wszystkie odpowiedzi z najnowszej ankiety", fullSubmittedAnswers(submission)),
    submissions.length > 1
      ? detailsForm("Wcześniejsze przekazane ankiety (" + (submissions.length - 1) + ")",
          create("div", {}, submissions.slice(1).map(previous =>
            detailsForm("Wersja " + (previous.versionCode || "nieznana") + " · " +
              formatDate(previous.submittedAt), fullSubmittedAnswers(previous))
          )))
      : null,
    create("p", { className: "muted", text: brief.guardrail })
  ]), `Przekazano: ${formatDate(brief.submittedAt)} · tylko odczyt`);
}
