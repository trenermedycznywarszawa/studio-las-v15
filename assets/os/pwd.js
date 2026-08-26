export const PWD_MOVEMENTS = Object.freeze([
  Object.freeze({ id: "sock", label: "Skarpetka bez podparcia" }),
  Object.freeze({ id: "sit_to_stand", label: "Siad–wstań bez rąk" }),
  Object.freeze({ id: "hands_behind_back", label: "Dłonie za plecami" }),
  Object.freeze({ id: "squat", label: "Pełny przysiad bez odrywania pięt" }),
  Object.freeze({ id: "floor_bend", label: "Skłon do podłogi bez uginania kolan" }),
  Object.freeze({ id: "arms_overhead", label: "Ręce nad głowę bez wyginania pleców" }),
  Object.freeze({ id: "look_over_shoulders", label: "Spojrzenie za oba barki" })
]);

function text(value) {
  return String(value || "").trim();
}

export function collectPwdObservations(values) {
  return PWD_MOVEMENTS.flatMap(movement => {
    const selected = Boolean(values[`pwdMovement_${movement.id}`]);
    const observation = text(values[`pwdObservation_${movement.id}`]);
    const meaning = text(values[`pwdMeaning_${movement.id}`]);

    if (!selected && (observation || meaning)) {
      throw new Error("Zaznacz ruch albo usuń jego opis obserwacji.");
    }
    if (!selected) return [];
    if (!observation || !meaning) {
      throw new Error(`Dla ruchu „${movement.label}” wpisz opis i znaczenie Damiana.`);
    }
    return [Object.freeze({
      testId: `pwd:${movement.id}`,
      testName: movement.label,
      resultText: observation,
      interpretation: meaning
    })];
  });
}

export function pwdDecisionLabel(value) {
  return {
    start_guidance: "Rozpocząć 2–3 tygodnie prowadzenia",
    further_contact: "Potrzebny dalszy kontakt / ostrożność",
    not_start: "Nie rozpoczynać / właściwie skierować dalej"
  }[value] || "";
}

export function pwdTrainerObservation(values) {
  return `Kontekst i granice: ${text(values.contextBoundaries)}\n\nInterpretacja Damiana: ${text(values.trainerInterpretation)}`;
}