import { gsap } from "gsap"; import { ScrollTrigger } from "gsap/ScrollTrigger"; gsap.registerPlugin(ScrollTrigger); gsap.to("body",{opacity:1,scrollTrigger:"body"});
