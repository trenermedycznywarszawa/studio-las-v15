import { CANONICAL_STAGES } from "./runtime.js";
import { assertCurrentReviewOwner } from "./trainer-review-access.js";

function validDate(value) {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function clientProcessValues(input) {
  if (!Object.hasOwn(CANONICAL_STAGES, input.stage) || !/^[1-4]$/.test(String(input.stage))) {
    throw new Error("Wybierz etap od 1 do 4.");
  }
  if (!validDate(input.nextSessionDate) || !validDate(input.nextReviewDate)) {
    throw new Error("Podaj poprawne daty albo pozostaw termin pusty.");
  }
  return { stage: Number(input.stage), nextSessionDate: input.nextSessionDate, nextReviewDate: input.nextReviewDate };
}

// Capture the loaded view, never resolve the mutation target from a later selection.
export function clientUpdateAction(state, loader, attention, withWrite, reloadWorkspace) {
  const { workspace, repository, profile, activeClientId: clientId } = state;
  const version = loader.version, generation = attention.generation;
  let pending = false;
  const assertSelection = () => {
    if (!clientId || state.activeClientId !== clientId || state.repository !== repository
      || state.profile !== profile || profile?.role !== "trainer" || state.mfaView
      || state.trainerAttentionView || attention.generation !== generation) {
      throw new Error("Widok klienta zmienił się. Otwórz jego kartę ponownie.");
    }
  };
  const assertContext = () => {
    assertSelection();
    if (state.workspace !== workspace || workspace?.client?.id !== clientId
      || loader.version !== version || state.loading || state.loadError) {
      throw new Error("Brak aktualnego odczytu klienta. Odśwież przed zapisem.");
    }
  };
  const refresh = async () => {
    assertSelection();
    const request = reloadWorkspace(clientId);
    const refreshVersion = loader.version;
    await request;
    assertSelection();
    if (loader.version !== refreshVersion || state.loading || state.loadError
      || state.workspace?.client?.id !== clientId) {
      throw new Error("Nie udało się potwierdzić aktualnego odczytu klienta.");
    }
  };
  return async input => {
    if (pending) throw new Error("Zapis trwa.");
    pending = true;
    try {
      assertContext();
      const values = clientProcessValues(input);
      // Read-only preflight is outside withWrite: its failure cannot imply a write.
      await assertCurrentReviewOwner(repository, clientId, profile.id);
      assertContext();
      return await withWrite("Zapisywanie etapu i terminów", async () => {
        assertContext();
        const row = await repository.updateClient(clientId, values);
        if (!row || row.id !== clientId) {
          throw Object.assign(new Error("Nie otrzymano potwierdzenia aktualizacji klienta."), { status: 403 });
        }
        return row;
      }, refresh);
    } catch (error) {
      if (!error.displayMessage && !error.writeConfirmed && !error.writeUncertain && !error.status) error.displayMessage = error.message;
      throw error;
    } finally { pending = false; }
  };
}
