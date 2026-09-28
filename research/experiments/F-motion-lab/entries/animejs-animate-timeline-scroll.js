import { animate, createTimeline, onScroll, stagger } from "animejs"; createTimeline().add("a",{x:10,delay:stagger(50)}); animate("b",{y:1,autoplay:onScroll()});
