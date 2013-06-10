"use strict";

var util = require('util');

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
, STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
;

function extractDependenciesFrom(fn, dependencies, options) {
	if (fn.length) {
		var options = options || {};
		var deps = fn.toString().replace(STRIP_COMMENTS,"").match(FN_ARGS)[1].split(',')
		, i = -1
		, len = deps.length
		;
		while(++i < len) {
			var dep = deps[i].trim();
			if (options.hasOwnProperty(dep)) {
				dependencies.push({ kind: 'u', name: dep, value: options[dep] });
			} else if (dep.length && dep[0] === '$') {
				dependencies.push({ kind: 'd', name: dep });
			} else {
				dependencies.push({ kind: 'm', name: dep, value: undefined });
			}
		}
	}
}



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
					extractDependenciesFrom(factory, dependencies, options);
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
				extractDependenciesFrom(clazz, dependencies, options);
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

function Fctor(reg) {
	Fctor.super_.call(this, reg);
}
util.inherits(Fctor, Value);

Object.defineProperties(Fctor.prototype, {

	canSatisfyArguments: {
		value: function(container) {
			var deps = this._deps
			, i = -1
			, len = deps.length
			, dep
			;
			while(++i < len) {
				dep = deps[i];
				if (dep.kind === 'd' && !container.can(dep.name)) {
					return false;
				}
			}
			return true;
		}
	},

	prepareArguments: {
		value: function (container, args) {
			var deps = this._deps
			, len = deps.length
			, i = -1
			, res = this._args.slice(0)
			, offset = this._offset || 0
			, name
			;
			while(++i < len) {
				name = deps[i].name;
				if (deps[i].kind === 'd') {
					res[i + offset] = container.get(name);
				} else {
					res[i + offset] = deps[i].value;
				}
			}
			return res;
		}
	},

	prepareArgumentsWithInit: {
		value: function (container, init) {
			var deps = this._deps
			, len = deps.length
			, i = -1
			, res = this._args.slice(0)
			, offset = this._offset || 0
			, name
			;
			while(++i < len) {
				name = deps[i].name;
				if (init && init.hasOwnProperty(name)) {
					res[i + offset] = init[name];
				} else if (deps[i].kind === 'd') {
					res[i + offset] = container.get(name);
				} else {
					res[i + offset] = deps[i].value;
				}
			}
			return res;
		}
	},

	checkNotify: {
		value: function(container, deps, data) {
			var len = deps.length
			, i = -1
			;
			while(++i < len) {
				if (deps[i].kind === 'd'
					&& typeof data[deps[i].name] === 'undefined')
					return;
			}
			this._reg.notify(undefined, this, this.prepareArgumentsWithInit(container, data));
		}
	},

	finishNotify: {
		value: function(container, deps, i, name, data, value) {
			data[deps[i].name] = value;
			this.checkNotify(container, deps, data);
		}
	},

	prepareArgumentsForNotify: {
		value: function (container, deps) {
			var self = this
			, len = deps.length
			, i = -1
			, data = {}
			, name
			;
			while(++i < len) {
				name = deps[i].name;
				if (typeof deps[i].value !== 'undefined') {
					data[name] = deps[i].value;
				} else if (deps[i].kind === 'd') {
					if (container.can(name)) {
						data[name] = container.can(name)
					} else {
						container.when(name,
							this.finishNotify.bind(this, container, deps, i, name, data));
					}
				}
			}
			return data;
		}
	},

	has: {
		value: function(container) {
			return this.canSatisfyArguments(container);
		},
		enumerable: true,
		configurable: true
	},

	get: {
		value: function(container, init) {
			var container = this.container;
			var prepared = (typeof init !== 'undefined')
				? this.prepareArgumentsWithInit(container, init)
				: this.prepareArguments(container);
			return this._val.apply(container, prepared);
		},
		enumerable: true,
		configurable: true
	},

	set: {
		value: function(container, callable, deps, as) {
			var self = this
			, args = []
			;
			Object.defineProperties(this, {
				_deps: { value: deps },
				_args: { value: args },
				_val: { value: callable }
			});
			this.checkNotify(container, deps, this.prepareArgumentsForNotify(container, deps));
		},
		enumerable: true,
		configurable: true
	}

});

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
			if (callback) {
				if (val && (init || val.has(this.container))) {
					callback(val.get(init));
				} else {
					this._callbacks.push(callback);
				}
			} else {
				var callbacks = this._callbacks
				, len = (callbacks) ? callbacks.length : 0
				, i = -1
				;
				while(++i < len) {
					callbacks[i](val.get(init));
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
			if (typeof val !== 'undefined') return val.get(init);
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

var __root, __rootRef = new Registration('$root');

function Container(next, tenant) {
	var reg = {};
	var me = new Registration('$container').as.singleton.value(this);
	Object.defineProperties(reg, {
		$root : { value: __rootRef, enumerable: true },
		$container: { value: me, enumerable: true }
	});
	Object.defineProperties(this, {
		_reg: { value: reg },
		_next: { value: next || __root }
	});
}

Object.defineProperties(Container.prototype, {

	can: {
		value: function(what) {
			if (typeof what !== 'undefined') {
				var c = this
				, r
				;
				while(c) {
					r = c._reg;
					if (r.hasOwnProperty(what)) {
						return r[what].can();
					} else {
						c = c._next;
					}
				}
			}
			return false;
		},
		enumerable: true
	},

	has: {
		value: function(what) {
			if (typeof what !== 'undefined') {
				var c = this
				, r
				;
				while(c) {
					r = c._reg;
					if (r.hasOwnProperty(what)) {
						return r[what].has();
					} else {
						c = c._next;
					}
				}
			}
			return false;
		},
		enumerable: true
	},

	when: {
		value: function(what, callback, init) {
			if (typeof what !== 'undefined' && typeof callback === 'function') {
				var f, c = this;
				while(c) {
					if (c._reg.hasOwnProperty(what)) {
						return c._reg[what].when(callback, init);
					} else {
						c = c._next;
					}
				}
				this._reg[what] = f = new Registration(what, this);
				f.when(callback, init);
			}
		},
		enumerable: true
	},

	get: {
		value: function(what, init) {
			if (typeof what !== 'undefined') {
				var f, c = this;
				while(c) {
					if (c._reg.hasOwnProperty(what)) {
						return c._reg[what].get(init);
					} else {
						c = c._next;
					}
				}
				this._reg[what] = f = new Registration(what, this);
			}
		},
		enumerable: true
	},

	register: {
		value: function(it, val) {
			var name = it,
			fn = typeof it === 'function'
			;
			if (fn) {
				if (!it.name) {
					throw new Error("Invalid operation; it must be a string or a named function.");
				}
				name = it.name;
				val = it;
			}
			if (typeof name !== 'undefined') {
				if (name === '$container' || name === '$root') {
					throw new Error('Invalid operation; `'.concat(
						'` is reserved.'));
				}
				var reg = this._reg
				, current = reg[name]
				;
				if (!current || current.checkReplaceable(this)) {
					reg[name] = current = new Registration(name, this);
				} else {
					current.checkAssignable();
				}
				if (typeof val !== 'undefined') {
					if (fn || typeof val !== 'function') {
						if (val.name) {
							current.as.ctor(val);
						} else {
							current.as.factory(val);
						}
					} else {
						current.as.value(val);
					}
				}
				return current;
			}
		},
		enumerable: true
	},

	unregister: {
		value: function(what) {
			var reg = this._reg
				, current = reg[what]
				;
			if (current) {
				current.checkAssignable();
				delete this._reg[what];
				return true;
			}
			return false;
		},
		enumerable: true
	}

});

__root = new Container();
__rootRef.as.singleton.value(__root);

Object.defineProperties(Container, {

	root: {
		value: __root,
		enumerable: true
	},

	create: {
		value: function(next) {
			return new Container(next);
		},
		enumerable: true
	},

	can: {
		value: function(what) {
			return __root.can(what);
		},
		enumerable: true
	},

	has: {
		value: function(what) {
			return __root.has(what);
		},
		enumerable: true
	},

	when: {
		value: function(what, callback, init) {
			return __root.when(what, callback, init);
		},
		enumerable: true
	},

	get: {
		value: function(what, init) {
			return __root.get(what, init);
		},
		enumerable: true
	},

	register: {
		value: function(it, val) {
			return __root.register(it, val);
		},
		enumerable: true
	},

	unregister: {
		value: function(what) {
			return __root.unregister(what);
		},
		enumerable: true
	}
});

module.exports = Container;
