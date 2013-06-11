var util = require('util')
, Ctor = require('./ctor')
;

function ValueCtor(reg) {
	ValueCtor.super_.call(this, reg);
}
util.inherits(ValueCtor, Ctor);

Object.defineProperties(ValueCtor.prototype, {

	get: {
		value: function(container, init) {
			if (typeof this._value === 'undefined') {
				this._value = Ctor.prototype.get.call(this, container, init);
			}
			return this._value;
		},
		enumerable: true,
		configurable: true
	}
});

module.exports = ValueCtor;