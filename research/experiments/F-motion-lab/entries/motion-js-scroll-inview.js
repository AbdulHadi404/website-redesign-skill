import { animate, scroll, inView } from "motion"; scroll(animate(document.body,{opacity:[0,1]})); inView("section",(el)=>{animate(el,{opacity:1})});
