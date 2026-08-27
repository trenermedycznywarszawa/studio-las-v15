export const PWD_MOVEMENTS = Object.freeze([
  Object.freeze({ id: "sock", label: "Skarpetka bez podparcia" }),
  Object.freeze({ id: "sit_to_stand", label: "Siad–wstań bez rąk" }),
  Object.freeze({ id: "hands_behind_back", label: "Dłonie za plecami" }),
  Object.freeze({ id: "squat", label: "Pełny przysiad bez odrywania pięt" }),
  Object.freeze({ id: "floor_bend", label: "Skłon do podłogi bez uginania kolan" }),
  Object.freeze({ id: "arms_overhead", label: "Ręce nad głowę bez wyginania pleców" }),
  Object.freeze({ id: "look_over_shoulders", label: "Spojrzenie za oba barki" })
]);

export const PWD_MAX_OBSERVATIONS = 3;

function text(value) {
  return String(value || "").trim();
}

export function collectPwdObservations(values) {
  const observations = PWD_MOVEMENTS.flatMap(movement => {
    const selected = Boolean(values[`pwdMovement_${movement.id}`]);
    const observation = text(values[`pwdObservation_${movement.id}`]);
    const meaning = text(values[`pwdMeaning_${movement.id}`]);

    if (!selected && (observation || meaning)) {
      throw new Error("Zaznacz propozycję obserwacji albo usuń jej opis.");
    }
    if (!selected) return [];
    if (!observation || !meaning) {
      throw new Error(`Dla propozycji „${movement.label}” wpisz obserwację i jej znaczenie.`);
    }
    return [Object.freeze({
      testId: `pwd:${movement.id}`,
      testName: movement.label,
      resultText: observation,
      interpretation: meaning
    })];
  });

  const customSelected = Boolean(values.pwdMovement_custom);
  const customObservation = text(values.pwdObservation_custom);
  const customMeaning = text(values.pwdMeaning_custom);

  if (!customSelected && (customObservation || customMeaning)) {
    throw new Error("Zaznacz własną obserwację albo usuń jej opis.");
  }
  if (customSelected) {
    if (!customObservation || !customMeaning) {
      throw new Error("Dla własnej obserwacji wpisz jej krótki opis i znaczenie.");
    }
    observations.push(Object.freeze({
      testId: "pwd:custom",
      testName: "Własna obserwacja istotna dla celu",
      resultText: customObservation,
      interpretation: customMeaning
    }));
  }

  if (observations.length > PWD_MAX_OBSERVATIONS) {
    throw new Error(`Możesz zapisać maksymalnie ${PWD_MAX_OBSERVATIONS} obserwacje istotne dla celu.`);
  }
  return observations;
}

export async function savePwdWorkflow(repository, clientId, values) {
  const observations = collectPwdObservations(values);
  const decisionLabel = pwdDecisionLabel(values.trainerDecision);
  const trainerObservation = pwdTrainerObservation(values);

  await repository.updateClient(clientId, {
    goal: values.realLifeGoal,
    motivation: values.whyImportant
  });
  await repository.saveSession(clientId, {
    date: values.date,
    sessionType: "pwd",
    trainerObservation,
    trainerDecision: decisionLabel,
    clientSummary: `Co klient chce robić swobodniej: ${values.realLifeGoal}\nDlaczego to ważne: ${values.whyImportant}`,
    clientNextStep: values.nextStep,
    clientVisible: false
  });
  for (const observation of observations) {
    await repository.saveAssessment(clientId, {
      date: values.date,
      testId: observation.testId,
      testName: observation.testName,
      resultText: observation.resultText,
      interpretation: observation.interpretation,
      trainerDecision: decisionLabel,
      nextStep: values.nextStep,
      clientVisible: false
    });
  }
  return Object.freeze({ observationCount: observations.length, decisionLabel });
}
export function pwdDecisionLabel(value) {
  const label = {
    continue_guidance: "Dalsze prowadzenie",
    clarify_or_observe: "Dodatkowe wyjaśnienie lub obserwacja",
    prepare_guidance_later: "Przygotowanie wskazówki później",
    defer_or_refer: "Odroczenie decyzji lub skierowanie dalej"
  }[value];
  if (!label) throw new Error("Wybierz decyzję i następny krok.");
  return label;
}

export function pwdTrainerObservation(values) {
  return [
    `Kontekst i granice: ${text(values.contextBoundaries)}`,
    `Co zmieniło się po próbie lub wskazówce: ${text(values.changeAfterTrial) || "Nie zapisano"}`,
    `Interpretacja trenera: ${text(values.trainerInterpretation)}`
  ].join("\n\n");
}
