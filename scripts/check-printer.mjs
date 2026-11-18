import assert from 'node:assert/strict';
import {printState} from '../dist/printer-motion.js';
let last=printState(0),maxRock=0;
for(let t=0;t<=150;t+=.05){const s=printState(t);for(const v of Object.values(s))assert(Number.isFinite(v));assert(s.height>=.07&&s.height<=.33);assert(Math.abs(s.rockX)<.006&&Math.abs(s.rockZ)<.005);assert(Math.abs(s.x)<.15&&Math.abs(s.z)<.15);assert(Math.abs(s.shiftX)<.0021);if(t%72>.1)assert(Math.abs(s.x-last.x)<.04);maxRock=Math.max(maxRock,Math.abs(s.rockX),Math.abs(s.rockZ));last=s;}
console.log(`150 s of motion checked: toolpath stays on plate; rocking below ${(maxRock*180/Math.PI).toFixed(2)} degrees.`);
