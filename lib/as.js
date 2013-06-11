var utils = require('./utils')
;

function As(reg) {
	Object.defineProperties(this, {
		registration: {
			value: reg,
			enumerable: true
		}
	});
}

Object.defineProperties(As.prototype, {
	value: {
		value: function(val) {
			var reg = this.registration;
			reg.setValue(val, this);
			return reg;
		},
		enumerable: true
	},

	factory: {
		value: function(factory, options) {
			var reg = this.registration;
			if (typeof factory === 'function') {
				var dependencies = [];
				if (factory.length) {
					utils.extractDependenciesFrom(factory, dependencies, options);
				}
				reg.setFactory(factory, dependencies, this);
			} else {
				throw new TypeError('Invalid argument; factory must be a factory function.');
			}
			return reg;
		},
		enumerable: true
	},

	ctor: {
		value: function(clazz, options) {
			var reg = this.registration;
			if (typeof clazz === 'function') {
				var dependencies = [];
				utils.extractDependenciesFrom(clazz, dependencies, options);
				reg.setClass(clazz, dependencies, this);
			} else {
				throw new TypeError('Invalid argument; clazz must be a factory function.');
			}
			return reg;
		},
		enumerable: true
	},

	singleton: {
		get: function() {
			this.singleton_intent = true;
			return this;
		},
		enumerable: true
	},

	from: {
		get: function() {
			this.value_intent = true;
			return this;
		},
		enumerable: true
	}

});

module.exports = As;