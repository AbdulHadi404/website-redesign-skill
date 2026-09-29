import { LazyMotion, domMax, m } from "motion/react"; export const A=()=> <LazyMotion features={domMax}><m.div layout layoutId="x" drag animate={{opacity:1}}/></LazyMotion>;
