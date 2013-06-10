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

expect(function() {
	minioc.register('$container');
}).to.throwError();

expect(function() {
	minioc.register('$root');
}).to.throwError();

var observed, unk = { says: 'Yay!' };

expect(minioc.has('$unk')).to.be(false);

expect(minioc.get('$unk')).to.be();

expect(observed).to.be.an('undefined');

minioc.when('$unk', function(unk) {
	observed = unk;
});

expect(observed).to.be.an('undefined');

minioc.register('$unk').as.value(unk);

expect(observed).to.be(unk);

var ours;
minioc.when('$unk', function(unk) {
	ours = unk;
});
expect(ours).to.be(unk);


var foo = { foo: 'bar' };
minioc.register('$foo').as.singleton.value(foo);

expect(minioc.has('$foo')).to.be(true);

expect(minioc.get('$foo')).to.be(foo);

expect(function() {
	minioc.unregister('$foo');
}).to.throwError();

expect(minioc.has('$foo')).to.be(true);

expect(minioc.get('$foo')).to.be(foo);


var bar_ctr = 0;
minioc.register('$bar').as.singleton.factory(function() {
	return { bar: bar_ctr++ };
});

expect(minioc.has('$bar')).to.be(true);
expect(minioc.can('$bar')).to.be(true);

expect(minioc.get('$bar')).to.eql({ bar: 0 });

expect(minioc.get('$bar')).to.eql({ bar: 1 });

expect(function() {
	minioc.unregister('$bar');
}).to.throwError();

expect(minioc.has('$bar')).to.be(true);

expect(minioc.get('$bar')).to.eql({ bar: 2 });

//
expect(minioc.get('$baz')).to.be();
//

var baz_ctr = 0;
minioc.register('$baz').from.factory(function() {
	return { baz: baz_ctr++ };
});

expect(minioc.has('$baz')).to.be(true);

expect(minioc.get('$baz')).to.eql({ baz: 0 });

expect(minioc.get('$baz')).to.eql({ baz: 0 });

minioc.unregister('$baz');

expect(minioc.has('$baz')).to.be(false);

expect(minioc.get('$baz')).to.be();

var qux_ctr = 0;
minioc.register('$qux').from.singleton.factory(function() {
	return { qux: qux_ctr++ };
});

expect(minioc.has('$qux')).to.be(true);

expect(minioc.get('$qux')).to.eql({ qux: 0 });

expect(minioc.get('$qux')).to.eql({ qux: 0 });

expect(function() {
	minioc.unregister('$bar');
}).to.throwError();

expect(minioc.has('$qux')).to.be(true);

expect(minioc.get('$qux')).to.eql({ qux: 0 });

var quux_ctr = 0;
minioc.register('$quux').as.factory(function($corge) {
	return { quux: quux_ctr++, corge: $corge };
});

expect(minioc.has('$quux')).to.be(true);

expect(minioc.can('$quux')).to.be(false);

expect(minioc.get('$quux')).to.eql({ quux: 0, corge: undefined });

expect(captured).to.be();

minioc.when('$quux', function(val) {
	captured = val;
});
expect(captured).to.be();

minioc.register('$corge').as.value('This be corge here.');

expect(captured).to.eql({ quux: 1, corge: 'This be corge here.'});

var ours;
minioc.when('$quux', function(val) {
	ours = val;
});
expect(ours).to.eql({ quux: 2, corge: 'This be corge here.'});

expect(minioc.get('$quux')).to.eql({ quux: 3, corge: 'This be corge here.'});
