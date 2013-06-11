"use strict";

var As = require('./as')
, Value = require('./value')
, Fctor = require('./fctor')
, ValueFctor = require('./valuefctor')
, Ctor = require('./ctor')
, ValueCtor = require('./valuector')
;

function Registration(name, container) {
	Object.defineProperties(this, {
		name: {
			value: name,
			enumerable: true
		},

		container: {
			value: container,
			enumerable: true
		},

		_callbacks: { value: [] }
	});
}

Object.defineProperties(Registration.prototype, {

	hasWaiters: {
		get: function() {
			return this._callbacks && this._callbacks.length;
		}
	},

	as: {
		get: function() {
			return new As(this);
		},
		enumerable: true
	},

	from: {
		get: function() {
			var as = new As(this);
			return as.from;
		},
		enumerable: true
	},

	notify:
	{
		value: function(callback, val, init) {
			var container = this.container;
			if (callback) {
				if (val && (init || val.has(this.container))) {
					callback(val.get(container, init));
				} else {
					this._callbacks.push(callback);
				}
			} else {
				var callbacks = this._callbacks
				, len = (callbacks) ? callbacks.length : 0
				, i = -1
				;
				while(++i < len) {
					callbacks[i](val.get(container, init));
				}
				this._callbacks.length = 0;
			}
		}
	},

	has:
	{
		value: function() {
			return (typeof this._value !== 'undefined');
		},
		enumerable: true
	},

	can:
	{
		value: function() {
			return this.has() && this._value.has(this.container);
		},
		enumerable: true,
	},

	when:
	{
		value: function(callback, init)
		{
			this.notify(callback, this._value, init);
		},
		enumerable: true
	},

	get:
	{
		value: function(init)
		{
			var val = this._value;
			if (typeof val !== 'undefined') return val.get(this.container, init);
		},
		enumerable: true,
	},

	setValue: {
		value: function(val, as) {
			this.checkAssignable();
			Object.defineProperty(this, '_value',
				{
					value: new Value(this),
					writable: true,
					configurable: true
				});
			if (as.singleton_intent && !this.isSingleton) {
				Object.defineProperty(this, 'isSingleton', {
					value: true,
					enumerable: true,
				});
			}
			this._value.set(val);
		}
	},

	checkAssignable: {
		value: function() {
			if (this.isSingleton && typeof this._value !== 'undefined') {
				throw new Error('Invalid operation; singleton `'
					.concat(this.name, '` cannot be assigned'));
			}
		},
		enumerable: true
	},

	checkReplaceable: {
		value: function(container) {
			return (this.container !== container
				&& !this._isSingleton
				&& !this._isLocked
				);
		},
		enumerable: true
	},

	setCallable: {
		value: function(callable, deps, as, cls) {
			this.checkAssignable();
			Object.defineProperty(this, '_value',
			{
				value: new (Function.prototype.bind.apply(cls, [null, this])),
				writable: true,
				configurable: true
			});
			if (as.singleton_intent && !this.isSingleton) {
				Object.defineProperty(this, 'isSingleton', {
					value: true,
					enumerable: true,
				});
			}
			this._value.set(this.container, callable, deps, as);
		}
	},

	setFactory: {
		value: function(factory, deps, as) {
			this.setCallable(factory, deps, as,
				(as.value_intent) ? ValueFctor : Fctor);
		}
	},

	setClass: {
		value: function(ctor, deps, as) {
			this.setCallable(ctor, deps, as,
				(as.value_intent) ? ValueCtor : Ctor);
		}
	}
});

module.exports = Registration;