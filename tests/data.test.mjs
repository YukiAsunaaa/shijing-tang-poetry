import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../public/data/poetry.json',import.meta.url)));
assert.equal(data.categories.length,5);
assert.ok(data.meta.headerCount>=data.meta.records);
for(const category of data.categories){
  assert.equal(new Set(category.items.map(t=>t.name)).size,category.items.length);
  for(const term of category.items){
    assert.ok(term.count>=term.poems && term.poems>0);
    assert.ok(term.poems<=data.meta.records);
    assert.ok(term.examples.length>0);
    for(const id of term.examples){
      assert.ok(data.poems[id]?.body.includes(term.name),`${term.name}: missing matching source ${id}`);
      assert.ok(data.poems[id].author);
      assert.ok(!/卷\d+_\d+/.test(data.poems[id].body));
    }
  }
}
console.log(`Data integrity passed: ${data.meta.records} records, ${Object.keys(data.poems).length} verified poem examples.`);
