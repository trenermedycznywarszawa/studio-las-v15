import { button, create, formatDate, panel } from "./common.js";
import { questionnaireBriefPanel } from "./questionnaire-brief.js";

export const questionnaireStatusLabel = status => ({assigned: "Do wypełnienia", in_progress: "W trakcie", submitted: "Przekazana", cancelled: "Anulowana"}[status] || "Nieznany status");

export function trainerQuestionnairePanel(workspace, model) {
  const overview = workspace.questionnaireOverview;
  const assignments = overview?.assignments || [];
  const open = assignments.find(item => ["assigned", "in_progress"].includes(item.status));
  const brief = questionnaireBriefPanel(workspace);
  if (brief) brief.id = "questionnaire-submitted-brief";
  return create("div", {className: "trainer-questionnaire"}, [
    panel("Ankieta przed PWD", create("div", {}, [
      create("p", {text: !overview ? "Sprawdzanie ankiety i dostępu…" : overview.hasActiveAccess ? "Dostęp klienta do aplikacji: aktywny." : "Klient nie ma aktywnego dostępu do aplikacji."}),
      create("a", {className: "button", href: "tools/client-access-admin.html", text: "Zarządzaj dostępem / zaproszeniem"}),
      create("p", {className: "muted", text: "Przypisanie udostępnia ankietę w aplikacji. Zaproszenie do konta i poinformowanie klienta to osobne czynności. Ten przycisk nie wysyła wiadomości."}),
      assignments.length ? create("ul", {}, assignments.map(item => create("li", {text: `${questionnaireStatusLabel(item.status)} · przypisano ${formatDate(item.assigned_at)}${item.submitted_at ? ` · przekazano ${formatDate(item.submitted_at)}` : ""}`}))) : create("p", {text: overview ? "Nie przypisano jeszcze ankiety." : ""}),
      button(open ? "Ankieta już przypisana" : assignments.some(item => item.status === "submitted") ? "Przypisz kolejną ankietę" : "Przypisz aktywną ankietę", {disabled: !overview || !!open, onclick: model.onAssignQuestionnaire}),
      brief ? create("a", {className: "button", href: "#questionnaire-submitted-brief", text: "Zobacz przekazane odpowiedzi"}) : create("p", {className: "muted", text: "Odpowiedzi zobaczysz dopiero po przekazaniu ankiety przez klienta."})
    ])),
    brief
  ]);
}
