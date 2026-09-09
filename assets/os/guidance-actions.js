export function guidanceActions(repository, clientId, withWrite, reloadWorkspace) {
  return {
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
