var container = require('..'),
expect = require('expect.js')
;

var root = container.root
, c = container.create();
;

expect(c.get('$container')).to.be(c);
expect(c.get('$root')).to.be(root);

root.register('$foo').as.value({
	bar: function() {
		console.log('foo');
	}
});

var foo = c.get('$foo');
expect(foo).to.be(root.get('$foo'));

c.register('$foo').as.singleton.value({
	bar: function() {
		console.log('bar');
	}
});

var bar = c.get('$foo');

expect(bar).to.not.be(foo);

expect(function() {
	c.register('$foo').as.value({
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
c.get('$a', print_value_when_available);
c.get('$b', print_value_when_available);
c.get('$c', print_value_when_available);
c.get('$d', print_value_when_available);

// Register some service providers...
//   Each of the provider's arguments will be
//   fulfilled by the container when they become
//   available.
c.register('$a').as.singleton.factory(function($b, $c) {
	return function () {
		return '`$a` ('.concat($b(), ', ', $c(), ')');
	}
});

expect(c.has('$a')).to.not.be.ok();
expect(c.has('$b')).to.not.be.ok();
expect(c.has('$c')).to.not.be.ok();
expect(c.has('$d')).to.not.be.ok();


c.register('$b').as.factory(function($d) {
	return function () {
		return '`$b` ('.concat($d.say(), ')');
	}
});

expect(c.has('$a')).to.not.be.ok();
expect(c.has('$b')).to.not.be.ok();
expect(c.has('$c')).to.not.be.ok();
expect(c.has('$d')).to.not.be.ok();

c.register('$c').as.factory(function($d) {
	return function () {
		return '`$c` ('.concat($d.say(), ')');
	}
});

expect(c.has('$a')).to.not.be.ok();
expect(c.has('$b')).to.not.be.ok();
expect(c.has('$c')).to.not.be.ok();
expect(c.has('$d')).to.not.be.ok();

// Optionally, pass in arguments that
// are already resolved or must be overridden...
function $d(e) {
	this.say = function() {
		return '`$d` ('.concat(e(), ')');
	}
}

c.register('$d').as.ctor($d,
	{
		e: function() { return "eeeeeee" }
	});

expect(c.has('$a')).to.be.ok();
expect(c.has('$b')).to.be.ok();
expect(c.has('$c')).to.be.ok();
expect(c.has('$d')).to.be.ok();

