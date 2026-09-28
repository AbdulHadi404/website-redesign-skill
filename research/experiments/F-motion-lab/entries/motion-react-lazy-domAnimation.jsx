import { LazyMotion, domAnimation, m } from "motion/react"; export const A=()=> <LazyMotion features={domAnimation} strict><m.div animate={{opacity:1}}/></LazyMotion>;
