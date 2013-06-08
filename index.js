"use strict";

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
, STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
;

function As(reg) {
	Object.defineProperties(this, {
		registration: {
			value: reg,
			enumerable: true
		}
	});
}

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

Object.defineProperties(As.prototype, {
	value: {
		value: function(val) {
			var reg = this.registration;
			reg.setValue(val, this.singleton_intent);
			return reg;
		},
		enumerable: true
	},

	factory: {
		value: function(factory, options) {
			var reg = this.registration;
			if (typeof factory === 'function') {
				var dependencies = [];
				if (!factory.length) {
					reg.setValue(factory.apply(reg.container), this.singleton_intent);
				} else {
					extractDependenciesFrom(factory, dependencies, options);
				}
				reg.setFactory(factory, dependencies, this.singleton_intent);
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
				reg.setClass(clazz, dependencies, this.singleton_intent);
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
		}
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

	set:
	{
		value: function(val, isFactory) {
			if (typeof this._val !== 'undefined' && this.isSingleton) {
				throw new Error('Invalid operation; singleton `'
					.concat(this.name, '` cannot be re-assigned'));
			}
			Object.defineProperties(this, {
				_val: { value: val },
				_isFactory: { value: isFactory && typeof val === "function" }
			});
			this.notify();
			return (isFactory) ? val() : val;
		}
	},

	setValue: {
		value: function(val, singleton_intent) {
			if (typeof this._val !== 'undefined' && this.isSingleton) {
				throw new Error('Invalid operation; singleton `'
					.concat(this.name, '` cannot be re-assigned'));
			}
			this.get = function() { return val; };
			this.when = function(callback) { callback(val); };
			Object.defineProperty(this, '_val', { value: true, writable: true, configurable: true });
			if (singleton_intent && !this.isSingleton) {
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

	setFactory: {
		value: function(factory, deps, singleton_intent) {
			var self = this
			, finish = function() {
				var args, single;
				if (!self.has()) {
					if (self.canSatisfyArguments(self.container, deps)) {
						args = self.satisfyArguments(self.container, deps, []);
						if (self.isSingleton) {
							self.get = function(init) {
								if (!single) {
									var prepared = (typeof init !== 'undefined')
									? prepareArguments(deps, args, 0, init) : args;
									single = factory.apply(self.container, prepared);
								}
								return single;
							};
							self.when = function(cb, init) {
								if (!single) {
									var prepared = (typeof init !== 'undefined')
									? prepareArguments(deps, args, 0, init) : args;
									single = factory.apply(self.container, prepared);
								}
								cb(single);
							};
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
					if (this.isSingleton) {
						throw new Error('Invalid operation; singleton `'
							.concat(this.name, '` cannot be re-assigned'));
					}
					delete this._val;
				}
				this.get = Registration.prototype.get;
				this.when = Registration.prototype.when;
				if (singleton_intent && !this.isSingleton) {
					Object.defineProperty(this, 'isSingleton', {
						value: true,
						enumerable: true,
					});
				}
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
		value: function(clazz, deps, singleton_intent) {
			var self = this
			, finish = function() {
				var args, ctor;
				if (!self.has()) {
					if (self.canSatisfyArguments(self.container, deps)) {
						args = self.satisfyArguments(self.container, deps, [null]);
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
						Object.defineProperty(self, '_val', { value: true, writable: true, configurable: true });
						self.notify();
					}
				}
			}
			;
			if (this.has()) {
				if (typeof this._val !== 'undefined') {
					if (this.isSingleton) {
						throw new Error('Invalid operation; singleton `'
							.concat(this.name, '` cannot be re-assigned'));
					}
					delete this._val;
				}
				this.get = Registration.prototype.get;
				this.when = Registration.prototype.when;
				if (singleton_intent && !this.isSingleton) {
					Object.defineProperty(this, 'isSingleton', {
						value: true,
						enumerable: true,
					});
				}
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

var $root = new Registration('$root');

function Container(next, tenant) {
	var reg = {};
	var me = new Registration('$container').as.singleton.value(this);
	Object.defineProperties(reg, {
		$root: { value: $root, enumerable: true },
		$container: { value: me, enumerable: true }
	});
	Object.defineProperties(this, {
		_reg: { value: reg },
		_next: { value: next || $root.get() }
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
	}

});

$root.as.singleton.value(new Container());

Object.defineProperties(Container, {

	root: {
		get: function() {
			return $root.get();
		},
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
			return $root.get().has(what);
		},
		enumerable: true
	},

	when: {
		value: function(what, callback, init) {
			return $root.get().when(what, callback, init);
		},
		enumerable: true
	},

	get: {
		value: function(what, init) {
			return $root.get().get(what, init);
		},
		enumerable: true
	},

	register: {
		value: function(it, val) {
			return $root.get().register(it, val);
		}
	}
});
Container.Registration = Registration;
Container.As = As;

module.exports = Container;
