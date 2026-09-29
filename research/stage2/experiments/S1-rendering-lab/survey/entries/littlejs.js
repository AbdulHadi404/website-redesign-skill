import { engineInit, drawRect, vec2, rgb } from 'littlejsengine';
import { ready, host } from './_ready.js';
engineInit(() => {}, () => {}, () => {}, () => { drawRect(vec2(0, 0), vec2(4, 4), rgb(1, 0, 0)); ready('webgl'); }, () => {}, [], host());
