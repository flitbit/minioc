"use strict";

var util = require('util')
, Fctor = require('./fctor')
;

function ValueFctor(reg) {
	ValueFctor.super_.call(this, reg);
}
util.inherits(ValueFctor, Fctor);

Object.defineProperties(ValueFctor.prototype, {

	get: {
		value: function(container, init) {
			if (typeof this._value === 'undefined') {
				this._value = Fctor.prototype.get.call(this, container, init);
			}
			return this._value;
		},
		enumerable: true,
		configurable: true
	}
});

module.exports = ValueFctor;