import { gsap } from "gsap"; import { Flip } from "gsap/Flip"; gsap.registerPlugin(Flip); const st=Flip.getState(".a"); Flip.from(st);
