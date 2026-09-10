import { reportsSection } from "../../assets/os/ui/trainer-state.js";
import { reportCandidates } from "../../assets/os/report-evidence.js";
import { create } from "../../assets/os/ui/common.js";
const count=new URLSearchParams(location.search).has("insufficient")?2:3;
const workspace={client:{id:"a",stage:4},reports:[],sessions:Array.from({length:count},(_,index)=>({id:`source-${index}`,date:`2026-07-0${index+1}`,updated_at:`2026-07-0${index+1}T12:00:00Z`,trainer_observation:`Fikcyjne źródło ${index+1}`}))};
const model={
 async onSaveReport(input){
  const now=new Date().toISOString();
  workspace.reports.push({id:"report",title:input.title,type:"twelveWeeks",workflow_version:1,status:"draft",created_at:now,updated_at:now,content:input.report.client_material,trainer_working_notes:input.report,evidence_snapshot:reportCandidates(workspace).map(item=>({...item,source_updated_at:item.updated_at,captured_at:now}))});
  render();
 },
 async onTransitionReport(report,action,reason){
  const now=new Date().toISOString();
  if(action==="approve")Object.assign(report,{approved_at:now,approved_by:"fictional-trainer"});
  if(action==="publish")Object.assign(report,{status:"published",published_at:now,published_by:"fictional-trainer"});
  if(action==="withdraw")Object.assign(report,{status:"archived",withdrawn_at:now,withdrawal_reason:reason});
  render();
 }
};
function render(){document.getElementById("app").replaceChildren(create("h1",{text:"Fikcyjny raport 12 tygodni"}),reportsSection(workspace,model));}
render();
