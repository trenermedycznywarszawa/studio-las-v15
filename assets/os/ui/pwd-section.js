import { PWD_OBSERVATION_TYPES } from "../pwd.js";
import { create, detailsForm, formatDate, panel, recordList } from "./common.js";
import { pwdForm } from "./pwd-form.js";

function renderPwdObservation(observation) {
  return create("article", { className: "record" }, [
    create("strong", { text: observation.test_name || "Obserwacja" }),
    create("p", { className: "muted", text: PWD_OBSERVATION_TYPES[observation.observation_type] || "Typ nieznany" }),
    create("p", { text: observation.result_text || "Brak opisu" }),
    observation.reaction_text
      ? create("p", { className: "muted", text: `Reakcja: ${observation.reaction_text}` })
      : null
  ]);
}

export function pwdSection(workspace, model) {
  const pwdSessions = (workspace.sessions || []).filter(session => session.session_type === "pwd");
  const observations = workspace.assessments || [];
  const renderPwdSession = session => {
    const sessionObservations = observations.filter(item => item.session_id === session.id);
    return create("article", { className: "record" }, [
      create("strong", { text: `PWD · ${formatDate(session.date)}` }),
      create("p", { text: session.client_summary || "Cel i znaczenie zapisano w karcie klienta." }),
      create("p", { text: session.trainer_observation || "Brak kontekstu i interpretacji." }),
      create("p", { className: "muted", text: `Decyzja: ${session.trainer_decision || "brak"}` }),
      create("p", { className: "muted", text: `Kolejny krok: ${session.client_next_step || "brak"}` }),
      create("div", { className: "record-list" }, sessionObservations.length
        ? sessionObservations.map(renderPwdObservation)
        : [create("p", { className: "muted", text: "Brak obserwacji w tej PWD." })])
    ]);
  };
  const latest = pwdSessions[0] || null;
  const previousSessions = pwdSessions.slice(1);
  const history = previousSessions.length
    ? create("details", { className: "details-card" }, [
        create("summary", { text: "Pokaż pełną historię PWD" }),
        create("div", { className: "details-content" }, [
          recordList(previousSessions, renderPwdSession, "Brak wcześniejszych zapisów PWD.")
        ])
      ])
    : null;
  const formLabel = latest ? "Dodaj korektę / nową iterację PWD" : "Zapisz PWD";
  return panel("Pierwsza Wizyta Diagnostyczna", create("div", {}, [
    create("p", { className: "muted", text: "Cel klienta → kontekst i granice → maksymalnie 3 adekwatne obserwacje → interpretacja trenera → świadoma decyzja. System nie wybiera obserwacji ani decyzji automatycznie." }),
    latest ? renderPwdSession(latest) : create("p", { className: "muted", text: "Brak zapisanej PWD." }),
    history,
    latest
      ? create("p", { className: "muted", text: "Poprzednia PWD pozostanie w historii." })
      : null,
    detailsForm(formLabel, pwdForm(model.onSavePwd)),
    create("p", { className: "muted", text: "Zapis PWD nie tworzy ani nie publikuje wskazówki. Przygotowanie i publikacja pierwszej wskazówki pozostają osobnym krokiem w sekcji Prowadzenie klienta." })
  ]));
}
