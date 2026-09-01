import {
  button,
  create,
  field,
  panel,
  recordList
} from "./common.js";
import {
  buildInquiryCallBrief,
  CONTACT_STATUS_LABELS,
  decisionNextAction,
  INQUIRY_DECISIONS,
  INQUIRY_STATUS_LABELS
} from "../inquiries.js";

function inquiryOption(inquiry) {
  const state = INQUIRY_STATUS_LABELS[inquiry.inquiry_status] || inquiry.inquiry_status;
  return create("option", {
    value: inquiry.id,
    text: `${inquiry.submitted_name} · ${state}`
  });
}

function sourceSummary(inquiry) {
  const rows = [
    ["Telefon", inquiry.submitted_phone],
    ["E-mail", inquiry.submitted_email || "Nie podano"],
    ["Kontakt", inquiry.preferred_contact_window],
    ["Kierunek", inquiry.broad_goal],
    ["Własne zdanie", inquiry.person_words || "Nie podano"],
    ["Status kontaktu", CONTACT_STATUS_LABELS[inquiry.contact_status] || inquiry.contact_status],
    ["Status zgłoszenia", INQUIRY_STATUS_LABELS[inquiry.inquiry_status] || inquiry.inquiry_status]
  ];
  return create("div", { className: "summary-grid" }, rows.map(([label, value], index) =>
    create("div", { className: `summary-item ${index >= 3 ? "wide" : ""}` }, [
      create("span", { text: label }),
      create("strong", { text: value })
    ])
  ));
}

function callBrief(inquiry) {
  const brief = buildInquiryCallBrief(inquiry);
  return create("div", { className: "session-brief" }, [
    create("p", { className: "brief-intro", text: brief.purpose }),
    create("ol", {}, brief.questions.map(question => create("li", { text: question }))),
    create("p", { text: brief.summaryPrompt }),
    create("p", { className: "muted", text: brief.pwdBoundary }),
    create("p", { className: "disclaimer", text: brief.guardrail })
  ]);
}

function contactActions(inquiry, model) {
  if (inquiry.inquiry_status === "converted") {
    return create("p", { className: "muted", text: "Zgłoszenie zostało już jawnie przekazane do procesu PWD." });
  }

  return create("div", { className: "form-actions" }, [
    button("Kontakt w toku", {
      disabled: inquiry.inquiry_status === "closed",
      onclick: () => model.onSetContactState(inquiry.id, {
        contactStatus: "contacting",
        nextActionType: null,
        nextActionAt: null,
        closeInquiry: false
      })
    }),
    button("Nie udało się skontaktować", {
      disabled: inquiry.inquiry_status === "closed",
      onclick: () => model.onSetContactState(inquiry.id, {
        contactStatus: "unreachable",
        nextActionType: null,
        nextActionAt: null,
        closeInquiry: false
      })
    })
  ]);
}

function decisionForm(inquiry, model) {
  if (inquiry.inquiry_status === "converted") return null;

  const form = create("form", { className: "form-grid" });
  const goal = field("Co ta osoba chce realnie odzyskać?", "goal", "textarea", {
    required: true,
    maxlength: 500,
    rows: 2
  });
  const whyNow = field("Dlaczego jest to ważne teraz?", "whyNow", "textarea", {
    maxlength: 500,
    rows: 2
  });
  const barrier = field("Co dziś najbardziej utrudnia kolejny krok?", "barrier", "textarea", {
    required: true,
    maxlength: 500,
    rows: 2
  });
  const decision = field("Jaki jest właściwy kolejny krok?", "decision", "select", {
    required: true,
    options: [
      { value: "", label: "Wybierz dopiero po rozmowie" },
      ...INQUIRY_DECISIONS.map(([value, label]) => ({ value, label }))
    ]
  });
  const dynamic = create("div", { className: "form-grid" });
  const rationale = field("Decyzja i powód", "rationale", "textarea", {
    required: true,
    maxlength: 1000,
    rows: 2
  });
  const submit = button("Zapisz decyzję", { className: "button primary", type: "submit" });

  function renderDynamic() {
    while (dynamic.firstChild) dynamic.removeChild(dynamic.firstChild);
    const value = decision.querySelector("select").value;
    if (value === "FOLLOW_UP") {
      dynamic.append(
        field("Jak wracamy do rozmowy?", "followUpChannel", "select", {
          required: true,
          options: [
            { value: "call", label: "Telefon" },
            { value: "message", label: "Wiadomość" }
          ]
        }),
        field("Kiedy?", "followUpAt", "datetime-local", { required: true })
      );
    }
    if (value === "REFERRED") {
      dynamic.append(field("Co powinno wydarzyć się przed kolejnym krokiem?", "boundaryNote", "textarea", {
        required: true,
        maxlength: 500,
        rows: 2
      }));
    }
    if (value === "PWD") {
      dynamic.append(create("p", {
        className: "muted",
        text: "PWD jest rekomendowanym następnym krokiem. Sam zapis tej decyzji nie tworzy klienta."
      }));
    }
  }

  decision.querySelector("select").addEventListener("change", renderDynamic);
  renderDynamic();

  form.append(goal, whyNow, barrier, decision, dynamic, rationale, create("div", { className: "form-actions" }, [submit]));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const nextAction = decisionNextAction(values.decision, values);
      await model.onSaveDecision(inquiry.id, {
        decision: values.decision,
        goalInPersonWords: String(values.goal || "").trim(),
        whyNow: String(values.whyNow || "").trim() || null,
        currentBarrier: String(values.barrier || "").trim(),
        rationale: String(values.rationale || "").trim(),
        boundaryNote: String(values.boundaryNote || "").trim() || null,
        nextActionType: nextAction.type,
        nextActionAt: nextAction.at
      });
      form.reset();
      renderDynamic();
    } finally {
      submit.disabled = false;
    }
  });

  return form;
}

function decisionHistory(decisions) {
  return recordList(decisions || [], item => create("article", { className: "record" }, [
    create("strong", { text: `v${item.decision_version} · ${item.decision}${item.decision_status === "active" ? " · aktualna" : ""}` }),
    create("p", { text: item.goal_in_person_words }),
    create("p", { className: "muted", text: item.rationale }),
    item.boundary_note ? create("p", { className: "muted", text: `Granica: ${item.boundary_note}` }) : null
  ]), "Nie zapisano jeszcze decyzji trenera.");
}

function conversionAction(inquiry, decisions, model) {
  const active = (decisions || []).find(item => item.decision_status === "active");
  if (!active || active.decision !== "PWD" || inquiry.inquiry_status !== "open" || inquiry.contact_status !== "completed") {
    return null;
  }
  return create("div", { className: "form-actions" }, [
    button("Utwórz klienta do PWD", {
      className: "button primary",
      onclick: async () => {
        if (!window.confirm("Potwierdzasz, że PWD zostało uzgodnione i chcesz utworzyć klienta do PWD?")) return;
        await model.onConvertInquiry(inquiry.id);
      }
    })
  ]);
}

export function renderInquirySection(workspace, model) {
  if (!workspace) return;

  const select = create("select", { "aria-label": "Wybierz pierwszy kontakt" }, [
    create("option", { value: "", text: "Wybierz zgłoszenie" }),
    ...(model.inquiries || []).map(inquiryOption)
  ]);
  select.value = model.activeInquiryId || "";
  select.addEventListener("change", () => model.onSelectInquiry(select.value));

  const body = create("div", {}, [
    create("p", {
      className: "brief-intro",
      text: "Krótka pamięć relacji przed PWD. To nie jest CRM i system nie kwalifikuje człowieka za trenera."
    }),
    select
  ]);

  const inquiry = (model.inquiries || []).find(item => item.id === model.activeInquiryId);
  if (!inquiry) {
    body.append(create("p", { className: "muted", text: model.inquiries?.length ? "Wybierz zgłoszenie." : "Brak zapisanych zgłoszeń." }));
  } else {
    body.append(
      sourceSummary(inquiry),
      create("h3", { text: "Przed rozmową" }),
      callBrief(inquiry),
      contactActions(inquiry, model),
      create("h3", { text: "Po rozmowie" }),
      decisionForm(inquiry, model),
      conversionAction(inquiry, model.inquiryDecisions, model),
      create("h3", { text: "Historia decyzji" }),
      decisionHistory(model.inquiryDecisions)
    );
  }

  workspace.prepend(panel(
    "Pierwszy kontakt",
    body,
    "Źródło → rozmowa → jawna decyzja → ewentualne PWD"
  ));
}
