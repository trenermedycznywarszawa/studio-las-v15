import { ClientPortalController } from "./client-portal-controller.js";
import { ClientQuestionnaireController } from "./client-questionnaire-controller.js";
import { renderClient } from "./ui/client.js";

export async function loadClientAppRuntime(root, state, { onLogout }) {
  const renderState = view => renderClient(root, {
    ...view,
    profile: state.profile,
    questionnaire: state.clientQuestionnaire?.model || {},
    onReload: () => state.clientPortal.load(),
    onLogout,
    onSaveCheckin: (id, text) => state.clientPortal.submit(id, text),
    onRetryResponse: id => state.clientPortal.retry(id)
  });

  state.clientPortal ||= new ClientPortalController(state.repository, renderState);
  state.clientQuestionnaire ||= new ClientQuestionnaireController(state.questionnaireApi, {
    onChange: () => state.clientPortal?.emit(),
    onPortalReload: () => state.clientPortal?.load()
  });
  await state.clientPortal.load();
}
