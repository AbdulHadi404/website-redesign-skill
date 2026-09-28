import { useSpring, animated } from "@react-spring/web"; export const A=()=>{const s=useSpring({from:{opacity:0},to:{opacity:1}}); return <animated.div style={s}/>};
