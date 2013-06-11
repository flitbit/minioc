var util = require('util')
, Fctor = require('./fctor')
;

function Ctor(reg) {
	Ctor.super_.call(this, reg);
}
util.inherits(Ctor, Fctor);

Object.defineProperties(Ctor.prototype, {

	get: {
		value: function(container, init) {
			var prepared = (typeof init !== 'undefined')
				? this.prepareArgumentsWithInit(container, init)
				: this.prepareArguments(container)
			, ctor = Function.prototype.bind.apply(this._val, prepared)
			;
			return new (ctor);
		},
		enumerable: true,
		configurable: true
	},

	set: {
		value: function(container, ctor, deps, as) {
			var args = [null]
			;
			Object.defineProperties(this, {
				_deps: { value: deps },
				_args: { value: args },
				_offset: { value: 1 },
				_val: { value: ctor }
			});
			this.checkNotify(container, deps, this.prepareArgumentsForNotify(container, deps));
		},
		enumerable: true,
		configurable: true
	}

});

module.exports = Ctor;