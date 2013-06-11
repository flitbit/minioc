"use strict";

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

