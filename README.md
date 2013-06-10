minioc (alpha) [![Build Status](https://travis-ci.org/flitbit/minioc.png)](http://travis-ci.org/flitbit/minioc)
======

A miniature, conventions-based IoC implementation for nodejs.

## Background

After using [angularjs](http://angularjs.org/) for a while I became envious of its IoC facility and decided to create something for nodejs that delivered similar convenience.

## `minioc` is an IoC container.

At its core, `minioc` is just a mapping between keys and values. It might be convenient to think of it as a hashtable, except that it behaves differently depending on how an item was put into it.

It understands 3 kinds of things:

* **values** - seems self explanitory
* **factories** - functions that produce values
* **constructors** - classes constructed on demand (depending on strategy)

When `register`ing items with the container, the caller has the option of indicating how the container should resolve the item. The defaults are:

* **values** - always resolved as given
* **factories** - produce a value for each call
* **constructors** - construct a new instance for each call

```javascript
var minioc = require('minioc');

// a value...
minioc.register('item_1').as.value("I'm a value");

// a factory...
minioc.register('item_2').as.factory(function() {
	return "I'm produced by a factory";
});

// a constructor (class)...
function Item_3() {
	this.toString = function() { return "I'm an instance created by constructor"; }
}

minioc.register('item_3').as.ctor(Item_3);


// Print them all to the console...
console.log(minioc.get('item_1').toString());
console.log(minioc.get('item_2').toString());
console.log(minioc.get('item_3').toString());
```

### Factories and Constructors as Values

Factories and constructors can be altered at the time of registration so that the result becomes the registered value rather than the target. This changes the defaults to:

* **factories** - invoked and its result captured to fulfill requests
* **constructor** - created and captured to filfill requests

```javascript
var minioc = require('..');

var factory_seed = 0
, ctor_seed = 0
;

var factory = function() {
	return "I'm produced by a factory with id: ".concat(factory_seed++);
};

// a factory as a value...
minioc.register('factory').from.factory(factory);

// a constructor (class) as a value...
function CtorExample() {
	this.id = ctor_seed++;

	this.toString = function() {
		return "I'm an instance created by constructor with id: "
		.concat(this.id);
	};
}

minioc.register('ctor').from.ctor(CtorExample);

// Print them to the console a couple of times
// to ensure they are the same value...
console.log(minioc.get('factory').toString());
console.log(minioc.get('ctor').toString());


console.log(factory().toString());
console.log((new CtorExample()).toString());

console.log(minioc.get('factory').toString());
console.log(minioc.get('ctor').toString());
```

### Singleton Immutability

Throughout a container's lifespan, registrations may be registered, unregistered, and modified. The exception is a singleton registration that already has a value.

```javascript
// a singleton value...
minioc.register('$name').as.singleton.value("value");

// a singleton factory...
minioc.register('$name').as.singleton.factory(function() { return "value"; });

// a singleton value factory...
minioc.register('$name').as.singleton.from.factory(function() { return "value"; });

// a singleton constructor
function MyClass() {
}
minioc.register('$name').as.singleton.ctor(MyClass);

// a singleton value constructor...
minioc.register('$name').as.singleton.from.ctor(MyClass);
```

Previously registered values may be unregistered unless they are `singletons`.

### Injection

`minioc` performs dependency injection on both factories and constructors. Its convention is to inject any argument whose names begin with a dollar sign ($); other named arguments must be _caller-supplied_.

If a registration requires injection and the corresponding registrations are not available to fulfill dependencies then the container won't resolve the target item.

There are several ways to instruct the container about dependencies:

* supply them during registration
* register them with the container (by convention)
* supply your own at the time of resolution.

## Installation

[node.js](http://nodejs.org)
```bash
$ npm install minioc
```

## Example

[readme-example-1.js](https://github.com/flitbit/minioc/blob/master/examples/readme-example-1.js)
```javascript
var minioc = require('minioc')
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
```

## Tests

Tests use [mocha](http://visionmedia.github.io/mocha/) and [expect.js](https://github.com/LearnBoost/expect.js/), so if you clone the [github repository](https://github.com/flitbit/minioc) you'll need to run:

```bash
npm install
```

... followed by ...

```bash
npm test
```

## API

### `minioc`

When you import the `minioc` module, the resulting object is a constructor for the Container class, but it also provides several convenience methods that can be used directly.

* `create` - _function_ - creates a new nested container.
* `get` - _function_ - gets an item according to its registration with the root container.
* `has` - _function_ - determines if an item has a registration with the root container.
* `register` - _function_ - registers a named item with the root container.
* `root` - _property_ - provides access to the root container.
* `when` - _function_ - registers a callback invoked when a named item becomes available in the root container.

### `Container`

Containers are nested. The root container always exists and most registrations will be made there. Nested containers provide isolation boundaries where registrations can be specialized (overriden).

#### constructor

Container's constructor takes an optional argument, `next`, which indicates where the container is nested. Containers form a chain back to the `root` container, so if `next` is omitted, it will automatically be chained to `root`.

#### behavior

* `get` - _function_ - gets an item according to its registration.
* `has` - _function_ - determines if an item has a registration.
* `register` - _function_ - registers a named item and returns its `Registration`.
* `when` - _function_ - registers a callback invoked when a named item becomes available.

### `Registration`

Registrations are used to instruct the container as to how each registered object should be treated. It establishes the behavior related to each.

### Function Descriptions

**get**: gets an item registered with the container

```javascript
var it = minioc.get('what');
```
If you're getting something that takes arguments, you may fulfill those arguments, overriding any injected or configured values.
```javascript
var it = minioc.get('what', { $domain: 'joe.bob.me' });
```

**has**: determines if the container can fulfill requests for an item
```javascript
if (minioc.has('what')) {
	console.log('yay');
}
```
**register**: registers an item with the container.

```javascript
// as a bare-value...
minioc.register('$calculator').as.value(new Calculator);

// ... or as a factory ...
minioc.register('$calculator').as.factory(function() {
	return new (Calculator());
});

// ... or as a ctor ...
minioc.register('$calculator').as.ctor(Calculator);
```

**when**: provides a callback to be invoked when a particular, named item gets registered.

```javascript
minioc.when('$calculator', function(it) {
	// `it` refers to the calculator here.
};
```

## Usage

Once minioc is installed, any module directly referencing the container must import it.

```javascript
var minioc = require('minioc');
```
## Obtaining a Container

Once imported, `minioc` can be used _as_ the root container.

```javascript
var minioc = require('minioc')
, expect = require('expect.js')
;

expect(minioc).to.have.property('has');
expect(minioc).to.have.property('get');
expect(minioc).to.have.property('when');
expect(minioc).to.have.property('register');
```

<a href="bald-values"></a>
### Registering Bald Values

Any javascript object can be placed in the container by name and retrieved later.
