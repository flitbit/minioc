var expect = require('expect.js')
, minioc = require('..')
;

var root = minioc.root
;

expect(root.has('$root')).to.be(true);

expect(root.has('$container')).to.be(true);

expect(root.get('$root')).to.be(root);

var test_value = "this is the test value"
, captured
;

expect(root.get('$container')).to.be(root);

expect(root.get('$test')).to.be(); // undefined

expect(root.get('$test', function(eventual) {
	expect(captured).to.be(); // undefined
	captured = eventual;
})).to.be();
expect(captured).to.be(); // undefined

expect(root.set('$test', test_value)).to.be(test_value);

expect(captured).to.be(test_value);

expect(root.set('$test')).to.be();

expect(root.get('$test')).to.be(); // undefined
