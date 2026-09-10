import { renderTrainer } from "../../assets/os/ui/trainer.js";
import { TrainerWorkspaceLoader } from "../../assets/os/trainer-workspace-loader.js";
import { createRuntimeFeedback } from "../../assets/os/ui/runtime-feedback.js";
const mode = new URLSearchParams(location.search).get("mode") || "success";
const workspace = () => ({client:{id:"a",name:"Fikcyjna osoba",goal:"Spokojny spacer",stage:3},sessions:[],intakes:[],preSessionChecks:[],trainingLoad:[],assessments:[],homePlans:[],homePlanItems:[],guidanceEvents:[],cycleDecisions:[],signalReviews:[],reports:[],measurements:[],sectionStatus:{reports:mode==="secondary"?"failed":"ready",measurements:"ready"}});
let reads=0,writes=0;
const state={clients:[{id:"a",name:"Fikcyjna osoba"}],activeClientId:"a",workspace:null,repository:{
 async getClientWorkspace(){reads++;if(mode==="initial"&&reads===1 || mode==="refresh"&&writes>0&&reads===2)throw {status:503};return workspace();},
 async getWorkspaceSection(){return {reports:[]};}
}};
const {announce,withWrite}=createRuntimeFeedback(()=>"staging");
const loader=new TrainerWorkspaceLoader(state,render);
const reload=()=>loader.load("a");
function render(){renderTrainer(document.getElementById("app"),{...state,environment:"staging",profile:{display_name:"Fikcyjny trener"},attentionSignals:{signals:[]},
 onReload:()=>reload().catch(()=>{}),onSelectClient:()=>{},onLogout:()=>{},onManageMfa:()=>{},
 onRetrySection:section=>loader.section(section),
 onSaveSession:values=>withWrite("Zapisywanie sesji",async()=>{writes++;if(mode==="failed")throw {status:400};if(mode==="uncertain")throw TypeError("fetch failed");return values;},reload)
});}
window.fixtureWrites=()=>writes;
window.addEventListener("unhandledrejection",event=>{event.preventDefault();const error=event.reason;announce(error.displayMessage||"Błąd", "error",error.retryRefresh);});
reload().catch(()=>{});
