"use strict";

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

function prepareArguments(deps, args, offset, init) {
	var len = deps.length
	, i = -1
	, res = args.slice(0)
	, name
	;
	while(++i < len) {
		name = deps[i].name;
		if (init.hasOwnProperty(name)) {
			res[i + offset] = init[name];
		}
	}
	return res;
}

Object.defineProperties(Registration.prototype, {
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
		value: function(callback, init) {
			if (callback) {
				if (typeof val !== 'undefined') {
					callback(this.get(init));
				} else {
					this._callbacks.push(callback);
				}
			} else {
				var callbacks = this._callbacks
				, len = (callbacks) ? callbacks.length : 0
				, i = -1
				, val = this._val
				, isFactory = this._isFactory
				;
				while(++i < len) {
					callbacks[i](this.get(init));
				}
				this._callbacks.length = 0;
			}
		}
	},

	has:
	{
		value: function() {
			return typeof this._val !== 'undefined';
		},
		enumerable: true
	},

	when:
	{
		value: function(callback, init)
		{
			this.notify(callback, init);
		},
		enumerable: true,
		writable: true
	},

	get:
	{
		value: function(init)
		{
		},
		enumerable: true,
		writable: true
	},

	setValue: {
		value: function(val, as) {
			if (typeof this._val !== 'undefined' && this.isSingleton) {
				throw new Error('Invalid operation; singleton `'
					.concat(this.name, '` cannot be re-assigned'));
			}
			this.get = function() { return val; };
			this.when = function(callback) { callback(val); };
			Object.defineProperty(this, '_val', { value: true, writable: true, configurable: true });
			if (as.singleton_intent && !this.isSingleton) {
				Object.defineProperty(this, 'isSingleton', {
					value: true,
					enumerable: true,
				});
			}
			this.notify();
		}
	},

	canSatisfyArguments: {
		value: function(container, deps) {
			var i = -1
			, len = deps.length
			, dep
			;
			while(++i < len) {
				dep = deps[i];
				if (dep.kind === 'd' && !container.has(dep.name)) {
					return false;
				}
			}
			return true;
		}
	},

	satisfyArguments:  {
		value: function(container, deps, args) {
			var i = -1
			, len = deps.length
			, dep
			;
			while(++i < len) {
				dep = deps[i];
				if (dep.kind === 'd') {
					args.push(container.get(dep.name));
				} else {
					args.push(dep.value);
				}
			}
			return args;
		}
	},

	checkAssignable: {
		value: function() {
			if (this.isSingleton && typeof this._val !== 'undefined') {
				throw new Error('Invalid operation; singleton `'
					.concat(this.name, '` cannot be assigned'));
			}
		},
		enumerable: true
	},

	setFactory: {
		value: function(factory, deps, as) {
			var self = this
			, finish = function() {
				var args, single, val;
				if (!self.has()) {
					if (self.canSatisfyArguments(self.container, deps)) {
						args = self.satisfyArguments(self.container, deps, []);
						if (as.value_intent) {
							val = factory.apply(self.container, args);
							self.get = function() { return val; };
							self.when = function(callback) { callback(val); };
						} else {
							self.get = function(init) {
								var prepared = (typeof init !== 'undefined')
								? prepareArguments(deps, args, 0, init) : args;
								return factory.apply(self.container, prepared);
							};
							self.when = function(cb, init) {
								var prepared = (typeof init !== 'undefined')
								? prepareArguments(deps, args, 0, init) : args;
								cb(factory.apply(self.container, prepared));
							}
						}
						Object.defineProperty(self, '_val', { value: true, writable: true, configurable: true });
						self.notify();
					}
				}
			}
			;
			if (this.has()) {
				if (typeof this._val !== 'undefined') {
					this.checkAssignable();
					delete this._val;
				}
				this.get = Registration.prototype.get;
				this.when = Registration.prototype.when;
			}
			if (as.singleton_intent && !this.isSingleton) {
				Object.defineProperty(this, 'isSingleton', {
					value: true,
					enumerable: true,
				});
			}
			deps.forEach(function (d) {
				if (d.kind === 'd') {
					self.container.when(d.name, finish);
				}
			});
			finish();
		}
	},

	setClass: {
		value: function(clazz, deps, as) {
			var self = this
			, finish = function() {
				var args, ctor, val;
				if (!self.has()) {
					if (self.canSatisfyArguments(self.container, deps)) {
						args = self.satisfyArguments(self.container, deps, [null]);
						if (as.value_intent) {
							val = new (Function.prototype.bind.apply(clazz, args));
							self.get = function() { return val; };
							self.when = function(callback) { callback(val); };
						} else {
							self.get = function(init) {
								var prepared = (typeof init !== 'undefined') ? prepareArguments(deps, args, 1, init) : args
								ctor = Function.prototype.bind.apply(clazz, prepared)
								;
								return new (ctor);
							};
							self.when = function(cb, init) {
								var prepared = (typeof init !== 'undefined') ? prepareArguments(deps, args, 1, init) : args
								, ctor = Function.prototype.bind.apply(clazz, prepared)
								;
								cb(new (ctor));
							};
						}
						Object.defineProperty(self, '_val', { value: true, writable: true, configurable: true });
						self.notify();
					}
				}
			}
			;
			if (this.has()) {
				if (typeof this._val !== 'undefined') {
					this.checkAssignable();
					delete this._val;
				}
				this.get = Registration.prototype.get;
				this.when = Registration.prototype.when;
			}
			if (as.singleton_intent && !this.isSingleton) {
				Object.defineProperty(this, 'isSingleton', {
					value: true,
					enumerable: true,
				});
			}
			deps.forEach(function (d) {
				if (d.kind === 'd') {
					self.container.when(d.name, finish);
				}
			});
			finish();
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
			}
			if (typeof name !== 'undefined') {
				if (name === '$container' || name === '$root') {
					throw new Error('Invalid operation; `'.concat(
						'` is reserved.'));
				}
				var reg = this._reg
				, current = reg[name]
				;
				if (!current) {
					reg[name] = current = new Registration(name, this);
					if (fn) {
						if (it.name) {
							current.as.ctor(it);
						} else {
							current.as.factory(it);
						}
					}
				}
				if (typeof val !== 'undefined' && typeof val !== 'function') {
					current.as.value(val);
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
Container.Registration = Registration;
Container.As = As;

module.exports = Container;
