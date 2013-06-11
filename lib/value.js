"use strict";

function Value(reg) {
	Object.defineProperty(this, '_reg', { value: reg });
}

Object.defineProperties(Value.prototype, {

	container: { get: function() { return this._reg.container; } },

	has: {
		value: function() {
			return (typeof this._val !== 'undefined');
		},
		enumerable: true
	},

	get: {
		value: function() {
			return this._val;
		},
		enumerable: true,
		configurable: true
	},

	set: {
		value: function(val) {
			Object.defineProperty(this, '_val', { value: val });
			this._reg.notify(undefined, this);
		},
		enumerable: true,
		configurable: true
	}

});

module.exports = Value;