import { buildPrePwdV31TrainerBrief } from "../questionnaires/pre-pwd-v31-trainer-brief.js";
import { create, detailsForm, formatDate, panel } from "./common.js";

const PRIMARY_IDS = new Set(["goal", "barriers", "safety", "pain", "injury", "pregnancy", "clarify"]);

function briefItem(item) {
  return create("article", { className: "brief-card" }, [
    create("h3", { text: item.label }),
    ...item.lines.map(line => create("div", { className: "brief-list-item" }, [
      create("strong", { text: line.label }),
      create("p", { text: line.value }),
      create("p", { className: "brief-source", text: `Źródło: ${line.sourceType} · ${formatDate(line.sourceDate)}` })
    ]))
  ]);
}

export function questionnaireBriefPanel(workspace) {
  const submission = (workspace.questionnaireSubmissions || [])
    .find(item => item?.rendererKey === "pre_pwd_v31" && item?.answers);
  if (!submission) return null;

  const brief = buildPrePwdV31TrainerBrief(submission);
  const primary = brief.items.filter(item => PRIMARY_IDS.has(item.id));
  const secondary = brief.items.filter(item => !PRIMARY_IDS.has(item.id));

  return panel(brief.title, create("div", { className: "session-brief" }, [
    create("p", {
      className: "brief-intro",
      text: "Odpowiedzi przekazane świadomie przez klienta. Najpierw przeczytaj sygnał; interpretacja i decyzja należą do trenera."
    }),
    create("div", { className: "brief-grid" }, primary.map(briefItem)),
    secondary.length
      ? detailsForm("Kontekst dodatkowy: praca, aktywność, regeneracja i jedzenie",
          create("div", { className: "brief-grid" }, secondary.map(briefItem)))
      : null,
    create("p", { className: "muted", text: brief.guardrail })
  ]), `Przekazano: ${formatDate(brief.submittedAt)} · tylko odczyt`);
}
