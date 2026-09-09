export function guidanceActions(repository, clientId, withWrite, reloadWorkspace) {
  return {
    onResolveSignalContact: async (id, note) => {
      await withWrite("Zapisywanie kontaktu", () => repository.rpc("resolve_trainer_signal_contact", {p_review_id:id,p_note:note}));
      await reloadWorkspace();
    },
    onAddObservationNote: async (id, values) => {
      await withWrite("Zapisywanie uzupełnienia", () => repository.addGuidanceObservationNote(id, values));
      await reloadWorkspace();
    },
    onApproveHomePlan: async (planId, revision) => {
      await withWrite("Zatwierdzanie treści", () => repository.approveHomePlanGuidance(planId, revision));
      await reloadWorkspace();
    },
    onCloneHomePlan: async planId => {
      await withWrite("Tworzenie nowego szkicu", () => repository.cloneHomePlanGuidance(planId));
      await reloadWorkspace();
    },
    onEditGuidanceDraft: async (planId, values) => {
      await withWrite("Zapisywanie szkicu", () => repository.editGuidanceDraft(clientId, planId, values));
      await reloadWorkspace();
    },
    onEditGuidanceDraftItem: async (itemId, values) => {
      await withWrite("Zapisywanie działania", () => repository.editGuidanceDraftItem(clientId, itemId, values));
      await reloadWorkspace();
    },
  };
}
