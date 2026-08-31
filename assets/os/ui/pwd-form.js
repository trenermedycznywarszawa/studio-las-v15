import { button, create, field, submitForm } from "./common.js";
import { PWD_MAX_OBSERVATIONS, PWD_MOVEMENTS, PWD_OBSERVATION_TYPES } from "../pwd.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function pwdObservationCard(slot, onRemove) {
  const typeField = field("Typ obserwacji", `pwdObservationType_${slot}`, "select", {
    required: true,
    value: "",
    options: [
      { value: "", label: "Wybierz typ obserwacji…", disabled: true, selected: true },
      ...Object.entries(PWD_OBSERVATION_TYPES).map(([value, label]) => ({ value, label }))
    ]
  });
  const referenceField = field(
    "Opcjonalna podpowiedź nazwy z prywatnej biblioteki",
    `pwdObservationReference_${slot}`,
    "select",
    {
      value: "",
      options: [
        { value: "", label: "Wpiszę własną nazwę", selected: true },
        ...PWD_MOVEMENTS.map(movement => ({ value: movement.id, label: movement.label }))
      ]
    }
  );
  const referenceLibrary = create("div", {
    className: "field",
    hidden: true,
    "data-pwd-reference-library": String(slot)
  }, [
    create("p", {
      className: "muted",
      text: "Opcjonalna podpowiedź do późniejszego porównania tego klienta z nim samym."
    }),
    referenceField
  ]);
  const nameField = field(
    "Nazwa zadania / obserwacji",
    `pwdObservationName_${slot}`,
    "text",
    { required: true, maxlength: 240 }
  );
  const card = create("section", {
    className: "details-card",
    "data-pwd-observation-card": String(slot)
  }, [
    create("h3", { text: `Obserwacja ${slot + 1}` }),
    typeField,
    referenceLibrary,
    nameField,
    field("Co zauważyliśmy?", `pwdObservationNoticed_${slot}`, "textarea", {
      required: true,
      maxlength: 8000
    }),
    field(
      "Reakcja po próbie lub wskazówce — opcjonalnie",
      `pwdObservationReaction_${slot}`,
      "textarea",
      { maxlength: 4000 }
    ),
    button("Usuń obserwację", {
      className: "button danger",
      onclick: () => onRemove(slot, card)
    })
  ]);

  const typeSelect = typeField.querySelector("select");
  const referenceSelect = referenceField.querySelector("select");
  const nameInput = nameField.querySelector("input");
  const syncReferenceLibrary = () => {
    const isReference = typeSelect.value === "reference";
    referenceLibrary.hidden = !isReference;
    if (!isReference) referenceSelect.value = "";
  };
  typeSelect.addEventListener("change", syncReferenceLibrary);
  referenceSelect.addEventListener("change", () => {
    if (!referenceSelect.value || nameInput.value.trim()) return;
    const movement = PWD_MOVEMENTS.find(item => item.id === referenceSelect.value);
    if (movement) nameInput.value = movement.label;
  });
  syncReferenceLibrary();
  return card;
}

export function pwdForm(onSubmit) {
  const observationCards = create("div", { className: "record-list", "aria-live": "polite" });
  const activeSlots = new Set();
  let addObservationButton;

  const syncObservationControls = () => {
    addObservationButton.disabled = activeSlots.size >= PWD_MAX_OBSERVATIONS;
  };
  const removeObservation = (slot, card) => {
    activeSlots.delete(slot);
    card.remove();
    syncObservationControls();
    addObservationButton.focus();
  };
  const addObservation = () => {
    const slot = [0, 1, 2].find(candidate => !activeSlots.has(candidate));
    if (slot === undefined) return;
    activeSlots.add(slot);
    const card = pwdObservationCard(slot, removeObservation);
    observationCards.append(card);
    syncObservationControls();
    card.querySelector("select")?.focus();
  };

  addObservationButton = button("Dodaj obserwację", {
    className: "button",
    onclick: addObservation
  });

  const form = submitForm([
    field("Data PWD", "date", "date", { value: today(), required: true }),
    field("Co chcesz móc robić swobodniej? — słowami klienta", "realLifeGoal", "textarea", { required: true, maxlength: 4000 }),
    field("Dlaczego to jest dla Ciebie ważne?", "whyImportant", "textarea", { required: true, maxlength: 4000 }),
    field("Kontekst i granice — istotne okoliczności, tolerancja, obawy", "contextBoundaries", "textarea", { required: true, maxlength: 8000 }),
    create("div", { className: "field" }, [
      create("span", { text: `Obserwacje istotne dla celu — opcjonalnie, maksymalnie ${PWD_MAX_OBSERVATIONS}` }),
      create("p", { className: "muted", text: "Dodaj tylko obserwacje adekwatne do celu i sytuacji tego klienta." }),
      observationCards,
      create("div", { className: "form-actions" }, [addObservationButton])
    ]),
    field("Interpretacja trenera", "trainerInterpretation", "textarea", { required: true, maxlength: 8000 }),
    field("Decyzja i następny krok — wybiera trener", "trainerDecision", "select", {
      required: true,
      value: "",
      options: [
        { value: "", label: "Wybierz decyzję i następny krok…", disabled: true, selected: true },
        { value: "continue_guidance", label: "Dalsze prowadzenie" },
        { value: "clarify_or_observe", label: "Dodatkowe wyjaśnienie lub obserwacja" },
        { value: "prepare_guidance_later", label: "Przygotowanie wskazówki później" },
        { value: "defer_or_refer", label: "Odroczenie decyzji lub skierowanie dalej" }
      ]
    }),
    create("p", { className: "muted", text: "Wybór decyzji jest wymagany. System nie wybierze jej automatycznie." }),
    field("Jasny następny krok zapisany przez trenera", "nextStep", "textarea", { required: true, maxlength: 4000 }),
    create("p", { className: "muted", text: "Zapis decyzji nie wykonuje jej automatycznie i nie tworzy wskazówki ani planu domowego." })
  ], "Zapisz PWD", onSubmit);

  const decisionSelect = form.elements.namedItem("trainerDecision");
  decisionSelect.value = "";
  decisionSelect.addEventListener("invalid", () => {
    decisionSelect.setCustomValidity("Wybierz decyzję i następny krok.");
  });
  decisionSelect.addEventListener("change", () => decisionSelect.setCustomValidity(""));
  form.addEventListener("reset", () => queueMicrotask(() => {
    activeSlots.clear();
    observationCards.replaceChildren();
    decisionSelect.setCustomValidity("");
    syncObservationControls();
  }));
  syncObservationControls();
  return form;
}
