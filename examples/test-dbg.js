var expect = require('expect.js')
, minioc = require('..')
;

var root = minioc.root
;

expect(minioc.has('$root')).to.be(true);

expect(minioc.has('$container')).to.be(true);

expect(minioc.get('$root')).to.be(root);

var test_value = "this is the test value"
, captured
;

expect(minioc.get('$container')).to.be(root);

expect(minioc.get('$test')).to.be();

expect(minioc.when('$test', function(eventual) {
					expect(captured).to.be();
					captured = eventual;
				})).to.be();

expect(captured).to.be();

minioc.register('$test').as.value(test_value);

expect(minioc.get('$test')).to.be(test_value);

expect(captured).to.be(test_value);

minioc.register('$test').as.value();
expect(minioc.get('$test')).to.be();

expect(minioc.get('$test')).to.be();
