import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const data=JSON.parse(readFileSync(new URL('../public/data/analysis.json',import.meta.url)));
assert.equal(data.emotions.length,6);
assert.ok(data.meta.authors>=200);
assert.equal(data.sentiment.length,data.meta.authors);
assert.equal(data.poets.length,data.meta.authors);
assert.equal(data.clusters.length,data.meta.clusters);
assert.ok(data.clusters.every(cluster=>cluster.size>=10));
assert.equal(data.clusters.reduce((sum,cluster)=>sum+cluster.size,0),data.meta.authors);
for(const poet of data.sentiment){
  assert.ok(poet.poems>=data.meta.minimumPoems);
  assert.ok(data.emotions.includes(poet.dominant));
  assert.ok(data.emotions.every(emotion=>Number.isFinite(poet.scores[emotion])&&poet.scores[emotion]>=0));
  assert.ok(data.emotions.every(emotion=>poet.evidence[emotion].poem.excerpt));
}
for(const poet of data.poets){
  assert.ok(poet.x>=-1&&poet.x<=1&&poet.y>=-1&&poet.y<=1);
  assert.ok(poet.keywords.length>=4);
}
console.log(`Analysis integrity passed: ${data.meta.authors} poets, ${data.meta.clusters} balanced clusters, sentiment evidence and bounded coordinates.`);
