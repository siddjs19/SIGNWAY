const test=require('node:test');const assert=require('node:assert/strict');const {plan}=require('../src/services/islPlanner');
test('planner only returns assets present in inventory',()=>{const p=plan('Hello and thank you');assert.ok(['complete','partial'].includes(p.status));assert.ok(p.segments.length>=1);for(const s of p.segments)assert.ok(s.url.startsWith('/assets/videos/isl/library/'));});
test('planner reports unsupported vocabulary without inventing assets',()=>{const p=plan('quizzicalwordnotinlibrary');assert.equal(p.status,'unsupported');assert.equal(p.segments.length,0);});
