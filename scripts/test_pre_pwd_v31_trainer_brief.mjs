import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPrePwdV31TrainerBrief, buildPrePwdV31FullAnswers } from "../assets/os/questionnaires/pre-pwd-v31-trainer-brief.js";
import { latestPrePwdV31Submission, questionnaireBriefPanel, submittedPrePwdV31Submissions } from "../assets/os/ui/questionnaire-brief.js";

const migration = readFileSync(
  new URL("../supabase/migrations/20260912072120_questionnaire_trainer_submission_snapshot.sql", import.meta.url),
  "utf8"
);
const mapperSource = readFileSync(
  new URL("../assets/os/questionnaires/pre-pwd-v31-trainer-brief.js", import.meta.url),
  "utf8"
);

assert.match(migration, /trainer_questionnaire_submission_snapshot/i);
assert.match(migration, /security invoker/i);
assert.match(migration, /qa\.status = 'submitted'/i);
assert.match(migration, /qr\.submitted_at is not null/i);
assert.match(migration, /private\.is_trainer\(\)/i);
assert.match(migration, /private\.trainer_mfa_satisfied\(\)/i);
assert.match(migration, /private\.trainer_can_access_client\(qa\.client_id\)/i);
assert.match(migration, /revoke all on function public\.trainer_questionnaire_submission_snapshot\(uuid\) from public, anon, authenticated/i);
assert.match(migration, /grant execute on function public\.trainer_questionnaire_submission_snapshot\(uuid\) to authenticated/i);

const brief = buildPrePwdV31TrainerBrief({
  assignmentId: "assignment-1",
  clientId: "client-1",
  versionCode: "3.1",
  goalSnapshot: "Wrócić do biegania 5 km bez obawy.",
  submittedAt: "2026-09-12T07:00:00Z",
  answers: {
    q2_goal_current: "yes",
    q3_goal_ability: "4",
    q4_main_barriers: ["pain", "fear"],
    q13_pain: "yes_some_limitation",
    q13a_location: ["knee"],
    q13i_neurological_sensation: "no",
    q_pregnancy_applicability: "prefer_discuss"
  }
});

assert.equal(brief.title, "PRZED WIZYTĄ — 60 SEKUND");
assert(brief.items.some(item => item.id === "goal"));
assert(brief.items.some(item => item.id === "barriers"));
assert(brief.items.some(item => item.id === "pain"));
assert(brief.items.some(item => item.id === "clarify"));

const barrierValue = brief.items.find(item => item.id === "barriers").lines[0].value;
assert.match(barrierValue, /Ból lub inne dolegliwości/);
assert.match(barrierValue, /Obawa przed urazem lub pogorszeniem/);

const clarify = brief.items.find(item => item.id === "clarify");
assert.match(clarify.lines[0].value, /Wolę omówić to z trenerem/);
for (const item of brief.items) {
  for (const line of item.lines) {
    assert(line.sourceRef);
    assert(line.sourceType);
    assert.equal(line.sourceDate, "2026-09-12T07:00:00Z");
  }
}

const overlayBrief = buildPrePwdV31TrainerBrief({
  assignmentId: "assignment-v33",
  clientId: "client-1",
  versionCode: "3.3",
  rendererKey: "pre_pwd_v31",
  submittedAt: "2026-09-14T10:00:00Z",
  answers: { q2_goal_current: "yes" }
});
assert.equal(overlayBrief.assignmentId, "assignment-v33",
  "Versioned release overlays must be accepted through the explicit renderer contract.");
assert.throws(
  () => buildPrePwdV31TrainerBrief({ versionCode: "3.3", rendererKey: "other_renderer", answers: {} }),
  /Nieobsługiwany sposób wyświetlania podsumowania ankiety/,
  "An unrelated renderer must remain fail-closed."
);
assert.throws(
  () => buildPrePwdV31TrainerBrief({ versionCode: "3.3", answers: {} }),
  /Nieobsługiwana wersja podsumowania ankiety/,
  "Legacy callers without rendererKey must not silently widen their historical version contract."
);

const newest = latestPrePwdV31Submission([
  { assignmentId: "b", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T07:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "z", rendererKey: "other", submittedAt: "2026-09-12T10:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "c", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T09:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "a", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T08:00:00Z", answers: { q2_goal_current: "yes" } }
]);
assert.equal(newest?.assignmentId, "c", "Trainer brief must choose the latest submitted pre-PWD independently of input order");

const tied = latestPrePwdV31Submission([
  { assignmentId: "a", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T09:00:00Z", answers: { q2_goal_current: "yes" } },
  { assignmentId: "b", rendererKey: "pre_pwd_v31", submittedAt: "2026-09-12T09:00:00Z", answers: { q2_goal_current: "yes" } }
]);
assert.equal(tied?.assignmentId, "b", "Equal timestamps must have a deterministic assignment-id tie breaker");

assert.match(brief.guardrail, /Znaczenie nadaje trener/);
assert.doesNotMatch(mapperSource, /GREEN|YELLOW|RED|score|risk_score|diagnos/i,
  "Trainer brief must not become a scoring or diagnostic engine.");
assert.doesNotMatch(mapperSource, /home_plan|publish|guidance/i,
  "Trainer brief must not modify Guidance/Home Plan.");



// The short brief is deliberately selective; the complete trainer view is not.
// Every source answer, including free text, consent confirmations and fields
// outside the known definition, must remain accessible for an authorized read.
const allSubmittedAnswers = {
  q2_goal_current: "yes",
  q7_exertion_symptoms: ["none"],
  q11_supplements: "regular",
  q11_supplement_names: "Testowy preparat, bez danych klienta",
  q21_weekly_time: "2",
  q23_adherence_barriers: ["time"],
  q30_training_preferences: ["explain_why"],
  q31_dislikes: ["none"],
  q32_other: "Przed wizytą chcę omówić dodatkowy ważny sygnał.",
  confirm_best_knowledge: true,
  confirm_trainer_not_doctor: true,
  unexpected_legacy_key: "Wartość historyczna",
  unexpected_legacy_null_key: null
};
const full = buildPrePwdV31FullAnswers({
  assignmentId: "synthetic-full",
  rendererKey: "pre_pwd_v31",
  versionCode: "3.3",
  submittedAt: "2026-11-03T12:00:00Z",
  answers: allSubmittedAnswers
});
const everyLine = full.sections.flatMap(section => section.lines);
assert.equal(full.answerCount, Object.keys(allSubmittedAnswers).length);
assert.equal(full.displayedCount, full.answerCount);
for (const [questionId, value] of Object.entries(allSubmittedAnswers)) {
  const line = everyLine.find(item => item.questionId === questionId);
  assert(line, "Missing submitted source answer: " + questionId);
  assert(line.label && line.value, "Missing readable label/value for: " + questionId);
  if (typeof value === "string" && questionId === "q32_other") assert.equal(line.value, value);
}
assert(everyLine.some(line => line.questionId === "unexpected_legacy_key"));
const unexpectedTextLine = everyLine.find(line => line.questionId === "unexpected_legacy_key");
assert.equal(unexpectedTextLine?.value, "Wartość historyczna", "Non-empty unknown field formatting must be preserved");

const unexpectedNullLine = everyLine.find(line => line.questionId === "unexpected_legacy_null_key");
assert(unexpectedNullLine, "Missing unexpected legacy null line");
assert.equal(unexpectedNullLine.value, "(nie podano)", "Unknown legacy field with null value must render as '(nie podano)'");
assert.throws(
  () => buildPrePwdV31FullAnswers({ rendererKey: "unsupported", answers: allSubmittedAnswers }),
  /Nieobsługiwany sposób wyświetlania/,
  "Full view must reject unsupported renderer versions."
);

const submittedHistory = submittedPrePwdV31Submissions([
  { assignmentId: "draft", status: "in_progress", rendererKey: "pre_pwd_v31", submittedAt: "2026-11-04T12:00:00Z", answers: allSubmittedAnswers },
  { assignmentId: "missing-submit-date", rendererKey: "pre_pwd_v31", answers: allSubmittedAnswers },
  { assignmentId: "new", status: "submitted", rendererKey: "pre_pwd_v31", submittedAt: "2026-11-03T12:00:00Z", answers: allSubmittedAnswers },
  { assignmentId: "old", status: "submitted", rendererKey: "pre_pwd_v31", submittedAt: "2026-10-03T12:00:00Z", answers: { q2_goal_current: "changed" } },
  { assignmentId: "unrelated", status: "submitted", rendererKey: "other_renderer", submittedAt: "2026-11-03T13:00:00Z", answers: allSubmittedAnswers }
]);
assert.deepEqual(submittedHistory.map(item => item.assignmentId), ["new", "old"]);

// Synthetic DOM adapter for UI presentation contract verification
class SyntheticNode {
  constructor(tag) {
    this.tagName = String(tag || "").toUpperCase();
    this.children = [];
    this.attributes = {};
    this.className = "";
    this._text = "";
  }
  get textContent() {
    return this._text || this.children.map(c => c.textContent).join("");
  }
  set textContent(v) {
    this._text = String(v ?? "");
    this.children = [];
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener() {}
  append(...nodes) {
    for (const node of nodes) {
      if (node) this.children.push(node);
    }
  }
  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (selector.startsWith(".")) {
        const cls = selector.slice(1);
        if (node.className && node.className.split(/\s+/).includes(cls)) results.push(node);
      } else if (node.tagName === selector.toUpperCase()) {
        results.push(node);
      }
      for (const child of node.children || []) walk(child);
    };
    for (const child of this.children) walk(child);
    return results;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}
class SyntheticTextNode extends SyntheticNode {
  constructor(text) {
    super("#text");
    this._text = String(text ?? "");
  }
}

globalThis.Node = SyntheticNode;
globalThis.document = {
  createElement: tag => new SyntheticNode(tag),
  createTextNode: text => new SyntheticTextNode(text)
};

const submissionNew = {
  assignmentId: "asg-new",
  status: "submitted",
  rendererKey: "pre_pwd_v31",
  versionCode: "3.3",
  submittedAt: "2026-11-03T12:00:00Z",
  answers: { ...allSubmittedAnswers, q32_other: "Najnowsza uwaga listopada" }
};
const submissionOld = {
  assignmentId: "asg-old",
  status: "submitted",
  rendererKey: "pre_pwd_v31",
  versionCode: "3.3",
  submittedAt: "2026-10-03T12:00:00Z",
  answers: { q2_goal_current: "yes", q32_other: "Wcześniejsza uwaga października" }
};
const submissionDraft = {
  assignmentId: "asg-draft",
  status: "in_progress",
  rendererKey: "pre_pwd_v31",
  submittedAt: "2026-11-04T12:00:00Z",
  answers: { q32_other: "Sekretny szkic nieujawniony" }
};

const panel = questionnaireBriefPanel({
  questionnaireSubmissions: [submissionOld, submissionDraft, submissionNew]
});

assert(panel, "Questionnaire brief panel must be rendered");
assert.equal(panel.querySelector("h2")?.textContent, "PRZED WIZYTĄ — 60 SEKUND");

const summaries = panel.querySelectorAll("summary").map(s => s.textContent);
assert(summaries.includes("Wszystkie odpowiedzi z najnowszej ankiety"), "Must include newest full answers section");
assert(summaries.some(s => s.includes("Wcześniejsze przekazane ankiety (1)")), "Must include previous submissions section");

const detailsCards = panel.querySelectorAll(".details-card");
const newestSection = detailsCards.find(d => d.querySelector("summary")?.textContent === "Wszystkie odpowiedzi z najnowszej ankiety");
const previousSection = detailsCards.find(d => d.querySelector("summary")?.textContent.includes("Wcześniejsze przekazane ankiety"));

assert(newestSection.textContent.includes("Najnowsza uwaga listopada"), "Newest section must contain newest answer");
assert(!newestSection.textContent.includes("Wcześniejsza uwaga października"), "Newest section must not leak older answers");

assert(previousSection.textContent.includes("Wcześniejsza uwaga października"), "Previous section must contain previous answer");
assert(!previousSection.textContent.includes("Najnowsza uwaga listopada"), "Previous section must not leak newest answers");

assert(!panel.textContent.includes("Sekretny szkic nieujawniony"), "In-progress draft answers must never enter the panel DOM");

console.log("pre-PWD v3.1 deterministic trainer brief contract PASS");
