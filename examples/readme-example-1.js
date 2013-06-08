var minioc = require('..')
, expect   = require('expect.js')
;

// There is always a root container...
var root = minioc.root;
expect(root).to.be.ok();

// When you've got a container, it has no registrations
// except itself ($container) and the root ($root)...

expect(minioc.get('$container')).to.be(root);
expect(minioc.get('$root')).to.be(root);

// You can register values...

minioc.register('four').as.value(4);
expect(minioc.get('four')).to.be(4);

var foo = { what: 'foo' };
minioc.register('$foo').as.value(foo);
expect(minioc.get('$foo')).to.be(foo);

// You can register factories, each #get will invoke
// the factory and return the result...

var factory = function() {
	// within factories, `this` is bound to the container...
	return this.get('$foo');
};

minioc.register('$factory').as.factory(factory);
expect(minioc.get('$factory')).to.be(foo);

// You can register factories that take arguments you
// expect to be injected, I adopted the convention
// used by angularjs: arguments beginning with `$`
// will be fulfilled by the container...

var accessor = function($foo) {
	return $foo;
}

minioc.register('$accessor').as.factory(accessor);
expect(minioc.get('$accessor')).to.be(foo);

// You may also supply your own arguments in place of those
// that would have been injected...

var bar = { what: 'bar' };
var it = minioc.get('$accessor', { $foo: bar });
expect(it).to.be(bar);

// You can register classes; each #get will invoke the
// constructor and return the result...

function Person(name, age) {
	this.name = name || 'unknown';
	this.age = (typeof age !== 'undefined') ? age : 'nunya';
}

minioc.register('Person').as.ctor(Person);

var first = minioc.get('Person');
expect(first).to.be.a(Person);

var second = minioc.get('Person');
expect(second).to.be.a(Person);

expect(second).to.not.be(first);

// You can initialize arguments to constructors by name...

var info = { name: 'Phillip', age: 'old enough to know better' };
var me = minioc.get('Person', info);

expect(me.name).to.be(info.name);
expect(me.age).to.be(info.age);



