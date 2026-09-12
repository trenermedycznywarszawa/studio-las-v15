import { PRE_PWD_V31_DEFINITION } from "../assets/os/questionnaires/pre-pwd-v31-definition.js";
import { questionnaireDefinitionSha256 } from "./questionnaire_definition_hash.mjs";

console.log(`PRE_PWD_V31_SHA256=${questionnaireDefinitionSha256(PRE_PWD_V31_DEFINITION)}`);
