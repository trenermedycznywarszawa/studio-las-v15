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

export const PWD_OBSERVATION_TYPES = Object.freeze({
  reference: "Punkt odniesienia do późniejszego porównania",
  goal_task: "Zadanie związane z celem klienta",
  trainer_observation: "Własna obserwacja trenera"
});

function text(value) {
  return String(value || "").trim();
}

export function collectPwdObservations(values) {
  const slotIndexes = [...new Set(Object.keys(values).flatMap(key => {
    const match = /^pwdObservation(?:Type|Name|Noticed|Reaction|Reference)_(\d+)$/.exec(key);
    return match ? [Number(match[1])] : [];
  }))].sort((left, right) => left - right);

  if (slotIndexes.some(index => index >= PWD_MAX_OBSERVATIONS)) {
    throw new Error(`Możesz zapisać maksymalnie ${PWD_MAX_OBSERVATIONS} obserwacje istotne dla celu.`);
  }

  return slotIndexes.flatMap(index => {
    const observationType = text(values[`pwdObservationType_${index}`]);
    const enteredName = text(values[`pwdObservationName_${index}`]);
    const resultText = text(values[`pwdObservationNoticed_${index}`]);
    const reaction = text(values[`pwdObservationReaction_${index}`]);
    const referenceId = text(values[`pwdObservationReference_${index}`]);

    if (!observationType && !enteredName && !resultText && !reaction && !referenceId) return [];
    if (!PWD_OBSERVATION_TYPES[observationType]) {
      throw new Error("Wybierz typ każdej dodanej obserwacji.");
    }
    if (referenceId && observationType !== "reference") {
      throw new Error("Biblioteka punktów odniesienia jest dostępna wyłącznie dla obserwacji porównawczej.");
    }

    const reference = referenceId
      ? PWD_MOVEMENTS.find(movement => movement.id === referenceId)
      : null;
    if (referenceId && !reference) {
      throw new Error("Wybrany punkt odniesienia nie należy do prywatnej biblioteki PWD.");
    }

    const testName = enteredName || reference?.label || "";
    if (!testName || !resultText) {
      throw new Error("Dla każdej dodanej obserwacji wpisz nazwę oraz to, co zauważyliśmy.");
    }

    const referenceSuffix = observationType === "reference"
      ? `:${reference?.id || "custom"}`
      : "";
    return [Object.freeze({
      observationType,
      testId: `pwd:${observationType}${referenceSuffix}`,
      testName,
      resultText,
      reaction: reaction || null,
      referenceId: reference?.id || null
    })];
  });
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
      interpretation: null,
      trainerNote: [
        `Typ obserwacji: ${PWD_OBSERVATION_TYPES[observation.observationType]}`,
        observation.reaction ? `Reakcja po próbie lub wskazówce: ${observation.reaction}` : ""
      ].filter(Boolean).join("\n"),
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
    `Interpretacja trenera: ${text(values.trainerInterpretation)}`
  ].join("\n\n");
}
