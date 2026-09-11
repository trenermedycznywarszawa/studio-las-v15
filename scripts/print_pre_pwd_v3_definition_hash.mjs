import { PRE_PWD_V3_DEFINITION } from "../assets/os/questionnaires/pre-pwd-v3-definition.js";
import { questionnaireDefinitionSha256 } from "./questionnaire_definition_hash.mjs";

console.log(`PRE_PWD_V3_SHA256=${questionnaireDefinitionSha256(PRE_PWD_V3_DEFINITION)}`);
