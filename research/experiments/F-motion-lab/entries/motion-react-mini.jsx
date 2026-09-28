import { useAnimate } from "motion/react-mini"; export const A=()=>{const [s,a]=useAnimate(); return <div ref={s} onClick={()=>a(s.current,{opacity:1})}/>};
