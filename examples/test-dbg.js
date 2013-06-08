var expect = require('expect.js')
, minioc = require('..')
;

var root = minioc.root
, test_value = "this is the test value"
, captured
;

expect(minioc).to.have.property('create');
expect(minioc).to.have.property('get');
expect(minioc).to.have.property('has');
expect(minioc).to.have.property('register');
expect(minioc).to.have.property('root');
expect(minioc).to.have.property('when');

expect(minioc.has('$root')).to.be(true);

expect(minioc.has('$container')).to.be(true);

expect(minioc.get('$root')).to.be(root);

expect(minioc.get('$container')).to.be(root);

expect(minioc.has('$test')).to.be(false);

expect(minioc.get('$test')).to.be();

minioc.when('$test', function(eventual) {
	expect(captured).to.be();
	captured = eventual;
});
expect(captured).to.be();

minioc.register('$test').as.value(test_value);
expect(minioc.get('$test')).to.be(test_value);

expect(captured).to.be(test_value);

minioc.unregister('$test');
expect(minioc.get('$test')).to.be();

expect(minioc.has('$test')).to.be(false);

expect(minioc.get('$test')).to.be();

var foo = { bar: 'bar' };

minioc.register('$single').as.singleton.from.factory(function () {
	return foo;
});

expect(minioc.get('$single')).to.be(foo);

expect(function() {
	minioc.unregister('$single');
}).to.throwError();

expect(function() {
	minioc.register('$single').as.singleton.from.factory(function () {
		return { something: 'else' };
	});
}).to.throwError();

