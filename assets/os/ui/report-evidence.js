import { REPORT_QUESTIONS, EVIDENCE_LABELS, reportCandidates, reportInput } from "../report-evidence.js";
import { button, checkbox, create, detailsForm, field, formatDate, statusBox, submitForm } from "./common.js";
export function manualReportComposer(workspace, onSave) {
 const candidates=reportCandidates(workspace);
 if(candidates.length<3) return statusBox("Do raportu potrzebne są co najmniej 3 datowane źródła z opisem. Nie twórz zastępczych obserwacji tylko po to, by uzupełnić raport.");
 return detailsForm("Przygotuj raport 12 tygodni",submitForm([
  statusBox("Wybierz 3–7 istotnych źródeł. Napisz własną interpretację, decyzję i materiał dla klienta. Zapis tworzy wyłącznie szkic; zatwierdzenie i publikacja są oddzielne."),
  field("Tytuł raportu","title","text",{required:true,maxlength:240}),
  ...Object.entries(REPORT_QUESTIONS).map(([key,label])=>field(label,key,"textarea",{required:true,maxlength:12000})),
  create("fieldset",{className:"report-evidence-picker"},[
   create("legend",{text:"Datowane źródła — wybierz 3–7"}),
   ...candidates.map((item,index)=>create("div",{className:"record"},[
    checkbox(`${formatDate(item.date)} · ${EVIDENCE_LABELS[item.table]} · ${item.excerpt.slice(0,180)}`,`evidence_${index}`),
    create("details",{},[create("summary",{text:"Pełny opis źródła"}),create("p",{className:"preserve-lines",text:item.excerpt})])
   ]))
  ]),
  field("Materiał dla klienta — dokładnie ten tekst będzie widoczny po publikacji","client_material","textarea",{required:true,rows:10,maxlength:12000})
 ],"Zapisz szkic raportu",values=>onSave(reportInput(values,candidates))));
}
export function evidenceReportRecord(report, onTransition) {
 const date=value=>value?new Date(value).toLocaleString("pl-PL"):"—";
 return create("article",{className:"record report-record"},[
  create("h3",{text:report.title}),
  create("p",{text:report.status==="published"?"Opublikowany klientowi":report.status==="archived"?"Wycofany z widoku klienta":report.approved_at?"Zatwierdzony — jeszcze nieopublikowany":"Szkic — nieopublikowany"}),
  create("details",{},[create("summary",{text:"Interpretacja, decyzja i zachowane źródła — tylko trener"}),
   ...Object.entries(REPORT_QUESTIONS).map(([key,label])=>create("div",{},[create("h4",{text:label}),create("p",{className:"preserve-lines",text:report.trainer_working_notes?.[key]})])),
   ...(report.evidence_snapshot||[]).map(item=>create("article",{className:"record"},[
    create("strong",{text:`${formatDate(item.date)} · ${EVIDENCE_LABELS[item.table]||item.table}`}),
    create("p",{className:"preserve-lines",text:item.excerpt}),
    create("p",{className:"muted",text:`Źródło ${item.id} · zapis źródłowy ${date(item.source_updated_at)} · zachowano ${date(item.captured_at)}`})
   ]))
  ]),
  create("h4",{text:"Dokładny materiał dla klienta"}),
  create("p",{className:"preserve-lines",text:report.content}),
  report.approved_at?create("p",{className:"muted",text:`Zatwierdzono ${date(report.approved_at)} · autor ${report.approved_by}`}):null,
  report.published_at?create("p",{className:"muted",text:`Opublikowano ${date(report.published_at)} · autor ${report.published_by}`}):null,
  report.status==="draft"?button(report.approved_at?"Opublikuj zatwierdzony raport":"Zatwierdź dokładnie ten raport",{onclick:()=>onTransition(report,report.approved_at?"publish":"approve")}):null,
  report.status==="published"?detailsForm("Wycofaj raport z widoku klienta",submitForm([field("Powód wycofania","reason","textarea",{required:true,maxlength:1000})],"Wycofaj raport",values=>onTransition(report,"withdraw",values.reason))):null,
  report.withdrawn_at?create("p",{text:`Wycofano ${date(report.withdrawn_at)} · ${report.withdrawal_reason}`}):null,
  create("p",{className:"muted",text:"Jeśli treść wymaga zmiany, przygotuj nowy szkic. Ten zapis zachowuje wybrane źródła i treść do przeglądu."})
 ]);
}
