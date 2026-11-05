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
    onSaveCheckin: (id, text, contactRequested) => state.clientPortal.submit(id, text, contactRequested),
    onRetryResponse: id => state.clientPortal.retry(id),
    onStartContact: id => state.clientPortal.contacts.start(id),
    onContactDraft: (id,text) => state.clientPortal.contacts.draft(id,text),
    onSendContact: (id,text) => state.clientPortal.contacts.submit(id,text),
    onRetryContact: id => state.clientPortal.contacts.retry(id)
  });

  state.clientPortal ||= new ClientPortalController(state.repository, renderState);
  state.clientQuestionnaire ||= new ClientQuestionnaireController(state.questionnaireApi, {
    onChange: () => state.clientPortal?.emit(),
    onPortalReload: () => state.clientPortal?.load()
  });
  await state.clientPortal.load();
}
