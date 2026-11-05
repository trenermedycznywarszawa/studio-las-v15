import {
  PRE_PWD_V31_DEFINITION,
  PRE_PWD_V31_TRAINER_BRIEF
} from "./pre-pwd-v31-definition.js";

const allFields = [
  ...PRE_PWD_V31_DEFINITION.profileFields,
  ...PRE_PWD_V31_DEFINITION.sections.flatMap(section => section.questions || [])
];

const fieldBySourceRef = new Map(
  allFields
    .filter(field => field.sourceRef)
    .map(field => [field.sourceRef, field])
);

/**
 * Sprawdza, czy przekazana wartość odpowiedzi nie jest pusta.
 *
 * @param {unknown} value - Wartość odpowiedzi ze snapshotu ankiety.
 * @returns {boolean} Prawda, jeśli wartość jest zdefiniowana, niepusta lub zawiera elementy tablicy.
 */
function hasAnswer(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

/**
 * Pobiera czytelną etykietę opcji wyboru dla danego pytania lub zwraca wartość tekstową.
 *
 * @param {object} field - Definicja pytania zawierająca potencjalne opcje.
 * @param {unknown} value - Wybrana wartość opcji.
 * @returns {string} Etykieta opcji lub reprezentacja tekstowa wartości.
 */
function optionLabel(field, value) {
  return field?.options?.find(option => option.value === value)?.label || String(value);
}

/**
 * Formatuje wartość odpowiedzi źródłowej do czytelnej postaci tekstowej.
 * Obsługuje tablice wielokrotnego wyboru, pojedyncze opcje, wartości logiczne oraz tekst.
 *
 * @param {object} field - Definicja pytania ze schematu ankiety.
 * @param {unknown} value - Odpowiedź klienta.
 * @returns {string} Sformatowany ciąg znaków do wyświetlenia w interfejsie.
 */
function formatAnswer(field, value) {
  if (Array.isArray(value)) return value.map(item => optionLabel(field, item)).join(", ");
  if (field?.options?.length) return optionLabel(field, value);
  if (typeof value === "boolean") return value ? "Tak" : "Nie";
  return String(value);
}

/**
 * Buduje pojedynczą pozycję źródłową dla podsumowania briefu.
 *
 * @param {string} sourceRef - Identyfikator odniesienia do pytania lub profilu klienta.
 * @param {Record<string, unknown>} answers - Mapa odpowiedzi klienta.
 * @param {object} snapshot - Pełny snapshot zgłoszenia ankiety wraz z metadanymi.
 * @returns {object|null} Obiekt z danymi źródłowymi wiersza lub null, jeśli brak odpowiedzi.
 */
function sourceLine(sourceRef, answers, snapshot) {
  if (sourceRef === "client_profile.goal_snapshot") {
    if (!hasAnswer(snapshot.goalSnapshot)) return null;
    return {
      sourceRef,
      sourceType: "assignment_goal_snapshot",
      sourceDate: snapshot.submittedAt || null,
      label: "Cel ustalony przed ankietą",
      value: String(snapshot.goalSnapshot)
    };
  }

  const field = fieldBySourceRef.get(sourceRef);
  if (!field) return null;
  const value = answers[field.id];
  if (!hasAnswer(value)) return null;
  return {
    sourceRef,
    sourceType: "questionnaire_response",
    sourceDate: snapshot.submittedAt || null,
    label: field.label,
    value: formatAnswer(field, value)
  };
}

/**
 * Buduje selektywny, 60-sekundowy brief ankiety przed wizytą dla trenera.
 * Widok jest syntetyczny i prezentuje wyłącznie kluczowe sygnały (cel, bariery, ból, uwagi).
 *
 * Warunki bezpieczeństwa:
 * - Wymaga poprawnego klucza rendererKey ('pre_pwd_v31') lub legacy versionCode '3.1'.
 * - W przypadku nieobsługiwanego renderera zgłasza błąd (fail-closed).
 * - Prezentuje wyłącznie dane z autoryzowanego odczytu, nie nadaje ocen ani klasyfikacji.
 *
 * @param {object} [snapshot={}] - Snapshot ankiety pobrany z autoryzowanego źródła.
 * @param {string} [snapshot.rendererKey] - Klucz renderera odpowiadający za kontrakt prezentacji.
 * @param {string} [snapshot.versionCode] - Wersja definicji ankiety.
 * @param {Record<string, unknown>} [snapshot.answers] - Przekazane odpowiedzi klienta.
 * @param {string} [snapshot.assignmentId] - Identyfikator przypisania ankiety.
 * @param {string} [snapshot.clientId] - Identyfikator klienta.
 * @param {string} [snapshot.submittedAt] - Sygnatura czasowa przekazania ankiety.
 * @param {string} [snapshot.goalSnapshot] - Ustalony cel klienta z profilu.
 * @returns {object} Zestaw pozycji briefu z nagłówkiem i regułą ochronną (guardrail).
 * @throws {Error} Gdy rendererKey lub versionCode nie odpowiada kontraktowi pre_pwd_v31.
 */
export function buildPrePwdV31TrainerBrief(snapshot = {}) {
  if (snapshot.rendererKey && snapshot.rendererKey !== "pre_pwd_v31") {
    throw new Error(`Nieobsługiwany sposób wyświetlania podsumowania ankiety: ${snapshot.rendererKey}`);
  }
  // Legacy/unit callers may not provide rendererKey. Keep their historical
  // 3.1 guard, while runtime overlays (3.2, 3.3, …) are versioned by the
  // explicit renderer contract rather than by an arbitrary release number.
  if (!snapshot.rendererKey && snapshot.versionCode && snapshot.versionCode !== "3.1") {
    throw new Error(`Nieobsługiwana wersja podsumowania ankiety: ${snapshot.versionCode}`);
  }
  const answers = snapshot.answers && typeof snapshot.answers === "object" && !Array.isArray(snapshot.answers)
    ? snapshot.answers
    : {};

  const items = PRE_PWD_V31_TRAINER_BRIEF.map(spec => {
    const lines = spec.sources
      .map(sourceRef => sourceLine(sourceRef, answers, snapshot))
      .filter(Boolean);
    return lines.length ? { id: spec.id, label: spec.label, lines } : null;
  }).filter(Boolean);

  return {
    title: "PRZED WIZYTĄ — 60 SEKUND",
    assignmentId: snapshot.assignmentId || null,
    clientId: snapshot.clientId || null,
    submittedAt: snapshot.submittedAt || null,
    items,
    guardrail: "To są informacje przekazane przez klienta do przygotowania rozmowy. Znaczenie nadaje trener; podsumowanie nie stawia rozpoznań, nie kwalifikuje medycznie i nie zmienia planu automatycznie."
  };
}

/**
 * Buduje pełny, odczytowy widok wszystkich świadomie przekazanych odpowiedzi ankiety.
 * W przeciwieństwie do selektywnego briefu 60-sekundowego, ten widok nie pomija żadnych
 * odpowiedzi źródłowych, w tym pól tekstowych (np. q32_other), potwierdzeń oraz pól historycznych.
 *
 * Warunki bezpieczeństwa:
 * - Ponownie wykorzystuje ścisłą walidację renderera z buildPrePwdV31TrainerBrief.
 * - Wykrywa i grupuje odpowiedzi spoza znanej definicji w osobną sekcję bez ich ukrywania.
 * - Tylko do odczytu: nie wykonuje mutacji ani zapisu danych.
 *
 * Przypadki brzegowe:
 * - Brak odpowiedzi lub puste wartości są oznaczane jako '(nie podano)'.
 * - Obiekty złożone są bezpiecznie serializowane do formatu JSON.
 * - Pola dodatkowe (np. nieoczekiwane klucze historyczne) trafiają do sekcji 'unmapped_source_answers'.
 *
 * @param {object} [snapshot={}] - Autoryzowany snapshot przekazanej ankiety klienta.
 * @param {string} [snapshot.rendererKey] - Klucz renderera ('pre_pwd_v31').
 * @param {string} [snapshot.versionCode] - Wersja kodu ankiety (np. '3.3').
 * @param {string} [snapshot.submittedAt] - Data i czas przekazania ankiety.
 * @param {string} [snapshot.assignmentId] - Identyfikator przypisania ankiety.
 * @param {Record<string, unknown>} [snapshot.answers] - Pełny słownik odpowiedzi klienta.
 * @returns {object} Struktura zawierająca przetłumaczone sekcje, linie odpowiedzi oraz liczniki pytań.
 * @throws {Error} W przypadku nieobsługiwanego renderera lub nieprawidłowej wersji.
 */
export function buildPrePwdV31FullAnswers(snapshot = {}) {
  // Reuse the existing strict renderer/version guard.
  buildPrePwdV31TrainerBrief(snapshot);
  const answers = snapshot.answers && typeof snapshot.answers === "object" && !Array.isArray(snapshot.answers)
    ? snapshot.answers
    : {};
  const visited = new Set();
  const sections = PRE_PWD_V31_DEFINITION.sections.map(section => {
    const lines = (section.questions || []).flatMap(field => {
      if (!Object.prototype.hasOwnProperty.call(answers, field.id)) return [];
      visited.add(field.id);
      const value = answers[field.id];
      const displayedValue = value === null || value === "" || (Array.isArray(value) && !value.length)
        ? "(nie podano)"
        : value !== null && typeof value === "object" && !Array.isArray(value)
          ? JSON.stringify(value)
          : formatAnswer(field, value);
      return [{
        questionId: field.id,
        label: field.label,
        value: displayedValue,
        sourceRef: field.sourceRef || field.id
      }];
    });
    return lines.length ? { id: section.id, label: section.title, lines } : null;
  }).filter(Boolean);

  const unexpected = Object.keys(answers).filter(id => !visited.has(id)).sort();
  if (unexpected.length) {
    sections.push({
      id: "unmapped_source_answers",
      label: "Odpowiedzi spoza znanej definicji — sprawdź źródło",
      lines: unexpected.map(id => ({
        questionId: id,
        label: "Nieznane pole: " + id,
        value: typeof answers[id] === "object" ? JSON.stringify(answers[id]) : String(answers[id]),
        sourceRef: id
      }))
    });
  }
  return {
    assignmentId: snapshot.assignmentId || null,
    versionCode: snapshot.versionCode || null,
    submittedAt: snapshot.submittedAt || null,
    sections,
    answerCount: Object.keys(answers).length,
    displayedCount: sections.flatMap(section => section.lines).length
  };
}
