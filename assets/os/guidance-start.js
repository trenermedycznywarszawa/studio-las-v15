// Projection of the server predicate, never infer legacy status from UI fields.
export function guidanceStartState(workspace) {
  const gate = workspace.guidanceStartGate;
  if (!gate || typeof gate.required !== "boolean" || typeof gate.allowed !== "boolean"
    || !["publication_history", "pwd_required", "pwd_allows_start", "pwd_defers_start"].includes(gate.reason)
    || (gate.reason === "publication_history" ? gate.required || !gate.allowed
      : !gate.required || gate.allowed !== (gate.reason === "pwd_allows_start"))
    || (gate.reason === "pwd_allows_start" && (typeof gate.pwdSessionId !== "string" || !gate.pwdSessionId))) {
    return { allowed: false, required: true, message: "Nie udało się potwierdzić decyzji o rozpoczęciu prowadzenia. Odśwież odczyt przed zapisem." };
  }
  return { ...gate, message: gate.allowed ? "" : gate.reason === "pwd_required"
    ? "Przed pierwszą wskazówką zapisz PWD i jawną decyzję o dalszym prowadzeniu. Obserwacje dobierz do potrzeb klienta; nie ma obowiązkowej baterii testów."
    : "Aktualna decyzja PWD nie rozpoczyna prowadzenia. Zrealizuj zapisany kolejny krok; do pierwszej wskazówki wróć po nowej, jawnej decyzji o dalszym prowadzeniu." };
}
