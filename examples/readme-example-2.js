var minioc = require('..');

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