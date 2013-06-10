var minioc = require('..'),
expect = require('expect.js')
;

expect(minioc).to.have.property('has');
expect(minioc).to.have.property('get');
expect(minioc).to.have.property('when');
expect(minioc).to.have.property('register');

var root = minioc.root
;

expect(minioc.get('$container')).to.be(root);
expect(minioc.get('$root')).to.be(root);

root.register('$foo').as.value({
	bar: function() {
		console.log('foo');
	}
});

var foo = minioc.get('$foo');
expect(foo).to.be(root.get('$foo'));

minioc.register('$foo').as.singleton.value({
	bar: function() {
		console.log('bar');
	}
});

var bar = minioc.get('$foo');

expect(bar).to.not.be(foo);

expect(function() {
	minioc.register('$foo').as.value({
	bar: function() {
		console.log('baz');
	}
});
}).to.throwError();

function print_value_when_available(val) {
	if (typeof val === 'object')
		console.log(val.say());
	else
		console.log(val());
}

// Get some services that don't exist...
minioc.when('$a', print_value_when_available);
minioc.when('$b', print_value_when_available);
minioc.when('$c', print_value_when_available);
minioc.when('$d', print_value_when_available);

// Register some service providers...
//   Each of the provider's arguments will be
//   fulfilled by the c when they become
//   available.
minioc.register('$a').as.singleton.factory(function($b, $c) {
	return function () {
		return '`$a` ('.concat($b(), ', ', $c(), ')');
	}
});

expect(minioc.has('$a')).to.be.ok();
expect(minioc.can('$a')).to.not.be.ok();
expect(minioc.has('$b')).to.not.be.ok();
expect(minioc.can('$b')).to.not.be.ok();
expect(minioc.has('$c')).to.not.be.ok();
expect(minioc.can('$c')).to.not.be.ok();
expect(minioc.has('$d')).to.not.be.ok();
expect(minioc.can('$d')).to.not.be.ok();

minioc.register('$b').as.factory(function($d) {
	return function () {
		return '`$b` ('.concat($d.say(), ')');
	}
});

expect(minioc.has('$a')).to.be.ok();
expect(minioc.can('$a')).to.not.be.ok();
expect(minioc.has('$b')).to.be.ok();
expect(minioc.can('$b')).to.not.be.ok();
expect(minioc.has('$c')).to.not.be.ok();
expect(minioc.can('$c')).to.not.be.ok();
expect(minioc.has('$d')).to.not.be.ok();
expect(minioc.can('$d')).to.not.be.ok();

minioc.register('$c').as.factory(function($d) {
	return function () {
		return '`$c` ('.concat($d.say(), ')');
	}
});

expect(minioc.has('$a')).to.be.ok();
expect(minioc.can('$a')).to.not.be.ok();
expect(minioc.has('$b')).to.be.ok();
expect(minioc.can('$b')).to.not.be.ok();
expect(minioc.has('$c')).to.be.ok();
expect(minioc.can('$c')).to.not.be.ok();
expect(minioc.has('$d')).to.not.be.ok();
expect(minioc.can('$d')).to.not.be.ok();

// Optionally, pass in arguments that
// are already resolved or must be overridden...
function $d(e) {
	this.say = function() {
		return '`$d` ('.concat(e(), ')');
	}
}

minioc.register('$d').as.ctor($d,
	{
		e: function() { return "eeeeeee" }
	});

expect(minioc.has('$a')).to.be.ok();
expect(minioc.can('$a')).to.be.ok();
expect(minioc.has('$b')).to.be.ok();
expect(minioc.can('$b')).to.be.ok();
expect(minioc.has('$c')).to.be.ok();
expect(minioc.can('$c')).to.be.ok();
expect(minioc.has('$d')).to.be.ok();
expect(minioc.can('$d')).to.be.ok();

