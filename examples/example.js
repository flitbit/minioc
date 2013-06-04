var container = require('..'),
expect = require('expect.js')
;

var root = container.root
, c = container.create();
;

expect(c.get('$container')).to.be(c);
expect(c.get('$root')).to.be(root);

root.set('$foo', {
	bar: function() {
		console('foo');
	}
});

var foo = c.get('$foo');
expect(foo).to.be(root.get('$foo'));

c.set('$foo', {
	bar: function() {
		console('bar');
	}
});

var bar = c.get('$foo');

expect(bar).to.not.be(foo);

function print_value_when_available(val) {
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
c.single('$a', function($b, $c) {
	return function () {
		return '`$a` ('.concat($b(), ', ', $c(), ')');
	}
});

expect(c.has('$a')).to.not.be.ok();
expect(c.has('$b')).to.not.be.ok();
expect(c.has('$c')).to.not.be.ok();
expect(c.has('$d')).to.not.be.ok();

c.single('$b', function($d) {
	return function () {
		return '`$b` ('.concat($d(), ')');
	}
});

expect(c.has('$a')).to.not.be.ok();
expect(c.has('$b')).to.not.be.ok();
expect(c.has('$c')).to.not.be.ok();
expect(c.has('$d')).to.not.be.ok();

c.single('$c', function($d) {
	return function () {
		return '`$c` ('.concat($d(), ')');
	}
});

expect(c.has('$a')).to.not.be.ok();
expect(c.has('$b')).to.not.be.ok();
expect(c.has('$c')).to.not.be.ok();
expect(c.has('$d')).to.not.be.ok();

// Optionally, pass in arguments that
// are already resolved or must be overridden...
c.single('$d',
	function(e) {
		return function () {
			return '`$d` ('.concat(e(), ')');
		}
	},
	{
		e: function() { return "eeeeeee" }
	});

expect(c.has('$a')).to.be.ok();
expect(c.has('$b')).to.be.ok();
expect(c.has('$c')).to.be.ok();
expect(c.has('$d')).to.be.ok();

