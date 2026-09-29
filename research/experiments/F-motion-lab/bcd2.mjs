import bcd from "@mdn/browser-compat-data" with { type: "json" };
import { features } from "web-features";
const get=(p)=>p.split(".").reduce((o,k)=>o?.[k],bcd);
const show=(p)=>{const c=get(p)?.__compat; if(!c){console.log(p,"MISSING");return;}
 const s=c.support; const pick=b=>{let v=s[b]; if(!v) return "-"; v=Array.isArray(v)?v:[v]; return v.map(x=>(x.version_added===false?"no":x.version_added)+(x.flags?"(flag)":"")+(x.partial_implementation?"(partial)":"")).join("|")};
 console.log(p.padEnd(58),["chrome","firefox","safari"].map(b=>b+":"+pick(b)).join("  "));};
["css.selectors.details-content","css.properties.grid-template-rows.animation","css.properties.scroll-behavior","api.IntersectionObserver","css.properties.content-visibility","api.Navigator.connection","api.NetworkInformation.saveData","api.Navigator.getBattery","api.Navigator.deviceMemory","css.at-rules.media.prefers-reduced-data","api.HTMLElement.popover","css.properties.overlay","css.selectors.backdrop","api.Element.animate.options_parameter.options_rangeStart_parameter","css.properties.animation-range","api.Document.startViewTransition.options_parameter.types_parameter","css.properties.font-variant-numeric","css.properties.field-sizing"].forEach(show);
for (const id of ["details-content","prefers-reduced-data","overlay","font-variant-numeric","intersection-observer"]) { const f=features[id]; console.log("WF",id,f?.status?.baseline,f?.status?.baseline_low_date||"",JSON.stringify(f?.status?.support||{})); }
