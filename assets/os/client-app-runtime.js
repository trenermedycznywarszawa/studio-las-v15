import { ClientPortalController } from "./client-portal-controller.js";
import { ClientQuestionnaireController } from "./client-questionnaire-controller.js";
import { renderClient } from "./ui/client.js";

function todayV2Enabled() {
  try {
    return new URLSearchParams(window.location.search).get("ui") === "today-v2";
  } catch {
    return false;
  }
}

function ensureTodayV2Styles() {
  if (document.querySelector('link[data-studio-las-ui="today-v2"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./assets/os/today-v2.css";
  link.dataset.studioLasUi = "today-v2";
  document.head.append(link);
}

export async function loadClientAppRuntime(root, state, { onLogout }) {
  let clientRenderer = renderClient;
  if (todayV2Enabled()) {
    ensureTodayV2Styles();
    ({ renderClientV2: clientRenderer } = await import("./ui/client-v2.js"));
  }

  const renderState = view => clientRenderer(root, {
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
