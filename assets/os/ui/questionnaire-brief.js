import { buildPrePwdV31TrainerBrief, buildPrePwdV31FullAnswers } from "../questionnaires/pre-pwd-v31-trainer-brief.js";
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

function submissionTime(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function submittedPrePwdV31Submissions(submissions = []) {
  // The RPC provides only consciously submitted responses to authorized trainer AAL2.
  // Defense-in-depth: never render an object with a non-submitted status here.
  return [...submissions]
    .filter(item => item?.rendererKey === "pre_pwd_v31" &&
      item?.answers && typeof item.answers === "object" && !Array.isArray(item.answers) &&
      (!item.status || item.status === "submitted") && Boolean(item.submittedAt))
    .sort((left, right) => {
      const timeDiff = submissionTime(right?.submittedAt) - submissionTime(left?.submittedAt);
      if (timeDiff) return timeDiff;
      return String(right?.assignmentId || "").localeCompare(String(left?.assignmentId || ""));
    });
}

export function latestPrePwdV31Submission(submissions = []) {
  return submittedPrePwdV31Submissions(submissions)[0] || null;
}

function fullSubmittedAnswers(submission) {
  const full = buildPrePwdV31FullAnswers(submission);
  return create("div", { className: "session-brief" }, [
    create("p", {
      className: "brief-intro",
      text: "Pełny odczyt danych źródłowych, nie interpretacja. Wersja " +
        (full.versionCode || "nieznana") + " · przekazano " + formatDate(full.submittedAt) +
        " · odpowiedzi: " + full.displayedCount + "/" + full.answerCount
    }),
    ...full.sections.map(section => create("article", { className: "brief-card" }, [
      create("h3", { text: section.label }),
      ...section.lines.map(line => create("div", { className: "brief-list-item" }, [
        create("strong", { text: line.label }),
        create("p", { text: line.value }),
        create("p", { className: "brief-source", text: "Pytanie: " + line.questionId })
      ]))
    ]))
  ]);
}

export function questionnaireBriefPanel(workspace) {
  const submissions = submittedPrePwdV31Submissions(workspace.questionnaireSubmissions || []);
  const submission = submissions[0];
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
    detailsForm("Wszystkie odpowiedzi z najnowszej ankiety", fullSubmittedAnswers(submission)),
    submissions.length > 1
      ? detailsForm("Wcześniejsze przekazane ankiety (" + (submissions.length - 1) + ")",
          create("div", {}, submissions.slice(1).map(previous =>
            detailsForm("Wersja " + (previous.versionCode || "nieznana") + " · " +
              formatDate(previous.submittedAt), fullSubmittedAnswers(previous))
          )))
      : null,
    create("p", { className: "muted", text: brief.guardrail })
  ]), `Przekazano: ${formatDate(brief.submittedAt)} · tylko odczyt`);
}
