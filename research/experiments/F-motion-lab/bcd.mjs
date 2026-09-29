import bcd from "@mdn/browser-compat-data" with { type: "json" };
import { features } from "web-features";
const get=(p)=>p.split(".").reduce((o,k)=>o?.[k],bcd);
const show=(p)=>{const c=get(p)?.__compat; if(!c){console.log(p,"MISSING");return;}
 const s=c.support; const pick=b=>{let v=s[b]; if(!v) return "-"; v=Array.isArray(v)?v:[v]; return v.map(x=>(x.version_added===false?"no":x.version_added)+(x.flags?"(flag)":"")+(x.partial_implementation?"(partial)":"")+(x.prefix?"(pfx)":"")+(x.notes?"*":"")).join("|")};
 console.log(p.padEnd(55),["chrome","firefox","safari","safari_ios"].map(b=>b+":"+pick(b)).join("  "));
 if(process.env.NOTES){for(const b of ["firefox","safari"]){let v=s[b];v=Array.isArray(v)?v:[v];v.forEach(x=>x?.notes&&console.log("   ",b,JSON.stringify(x.notes).slice(0,300)))}}
};
["api.GPU","api.Navigator.gpu","css.properties.animation-timeline","css.properties.animation-timeline.scroll","css.properties.animation-timeline.view","css.properties.animation-trigger","css.properties.view-transition-name","api.Document.startViewTransition","api.Document.startViewTransition.options_callbackOptions_parameter","css.at-rules.view-transition","css.selectors.active-view-transition-type","css.at-rules.starting-style","css.properties.transition-behavior","css.types.easing-function.linear-function","css.properties.interpolate-size","api.Element.animate","css.properties.scroll-timeline","css.properties.timeline-scope","css.at-rules.media.prefers-reduced-motion","html.global_attributes.popover","api.ViewTransition.types","css.selectors.view-transition-group","css.properties.view-transition-class"].forEach(show);
for (const [id,f] of Object.entries(features)) if(/trigger|scroll-driven|view-transition/.test(id)) console.log("WF",id, f.status?.baseline, JSON.stringify(f.status?.support), f.compat_features?.slice(0,6).join(","));
