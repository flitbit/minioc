"use strict";

var Future = require('futr')
;

var $root = new Future()
, FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
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
					if (!factory.length) {
						reg.setValue(factory.apply(reg.container), this.singleton_intent);
					} else {
						options = options || {};
						var deps = factory.toString().replace(STRIP_COMMENTS,"").match(FN_ARGS)[1].split(',')
						, dependencies = []
						, i = -1
						, len = deps.length
						;
						while(++i < len) {
							var dep = deps[i].trim();
							if (options.hasOwnProperty(dep)) {
								dependencies.push({ kind: 'u', value: options[dep] });
							} else {
								dependencies.push({ kind: 'd', dep: dep});
							}
						}
					}
					reg.setFactory(factory, dependencies, this.singleton_intent);
				} else {
					throw new TypeError('Invalid argument; factory must be a factory function.');
				}
			},
			enumerable: true
		},

		ctor: {
			value: function(clazz, options) {
				var reg = this.registration;
				if (typeof clazz === 'function') {
					options = options || {};
					var deps = clazz.toString().replace(STRIP_COMMENTS,"").match(FN_ARGS)[1].split(',')
					, dependencies = []
					, i = -1
					, len = deps.length
					;
					while(++i < len) {
						var dep = deps[i].trim();
						if (options.hasOwnProperty(dep)) {
							dependencies.push({ kind: 'u', value: options[dep] });
						} else {
							dependencies.push({ kind: 'd', dep: dep});
						}
					}
				reg.setClass(clazz, dependencies, this.singleton_intent);
			} else {
				throw new TypeError('Invalid argument; clazz must be a factory function.');
			}
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

		_futr: {
			value: new Future(),
			writable: true
		},

		_callbacks: {
			get: function() {
				return this._futr._callbacks;
			}
		}
	});
}

Object.defineProperties(Registration.prototype, {
	as: {
		get: function() {
			return new As(this);
		}
	},

	get: {
		value: function(callback) {
			return this._futr.get(callback);
		},
		enumerable: true
	},

	set: {
		value: function(val) {
			return this._futr.set(val);
		},
		enumerable: true
	},

	has: {
		value: function() {
			return this._futr.has();
		},
		enumerable: true
	},

	notify: {
		value: function(callback) {
			this._futr.notify(callback);
		},
		enumerable: true
	},

	setValue: {
		value: function(val, singleton_intent) {
			var f = this._futr
			, waiters
			;
			if (f.has(this.container)) {
				if (this.isSingleton) {
					throw new Error('Invalid operation; singleton `'
						.concat(this.name, '` cannot be re-assigned'));
				}
				waiters = f._callbacks;
				this._futr = f = new Future(val);
				waiters.forEach(function(cb) { f.notify(cb); });
			} else {
				f.set(val);
			}
			if (singleton_intent && !this.isSingleton) {
				Object.defineProperty(this, 'isSingleton', {
					value: true,
					enumerable: true,
				});
			}
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
				if (dep.kind === 'd' && !container.has(dep.dep)) {
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
					args.push(container.get(dep.dep));
				} else {
					args.push(dep.value);
				}
			}
			return args;
		}
	},

	setFactory: {
		value: function(factory, deps, singleton_intent) {
			var f = this._futr
			, waiters
			, self = this
			, finish = function() {
				var args, single;
				if (!f.has()) {
					if (self.canSatisfyArguments(self.container, deps)) {
						args = self.satisfyArguments(self.container, deps, []);
						if (self.isSingleton) {
							f.set(function() {
								if (!single) {
									single = factory.apply(self.container, args);
								}
								return single;
							}, true);
						} else {
							f.set(function() {
								return factory.apply(self.container, args);
							}, true);
						}
					}
				}
			}
			;
			if (f.has(this.container)) {
				if (this.isSingleton) {
					throw new Error('Invalid operation; singleton `'
						.concat(this.name, '` cannot be re-assigned'));
				}
				waiters = f._callbacks;
				this._futr = f = new Future(val);
				waiters.forEach(function(cb) { f.notify(cb); });

				if (singleton_intent && !this.isSingleton) {
					Object.defineProperty(this, 'isSingleton', {
						value: true,
						enumerable: true,
					});
				}
			}
			deps.forEach(function (d) {
				if (d.kind === 'd') {
					self.container.get(d.dep, finish);
				}
			});
			finish();
		}
	},

	setClass: {
		value: function(clazz, deps, singleton_intent) {
			var f = this._futr
			, waiters
			, self = this
			, finish = function() {
				var args, ctor;
				if (!f.has()) {
					if (self.canSatisfyArguments(self.container, deps)) {
						args = self.satisfyArguments(self.container, deps, [null]);
						ctor = Function.prototype.bind.apply(clazz, args);
						f.set(function() {
							return new (ctor);
						}, true);
					}
				}
			}
			;
			if (f.has(this.container)) {
				if (this.isSingleton) {
					throw new Error('Invalid operation; singleton `'
						.concat(this.name, '` cannot be re-assigned'));
				}
				waiters = f._callbacks;
				this._futr = f = new Future(val);
				waiters.forEach(function(cb) { f.notify(cb); });

				if (singleton_intent && !this.isSingleton) {
					Object.defineProperty(this, 'isSingleton', {
						value: true,
						enumerable: true,
					});
				}
			}
			deps.forEach(function (d) {
				if (d.kind === 'd') {
					self.container.get(d.dep, finish);
				}
			});
			finish();
		}	},
});

function Container(next, tenant) {
	var reg = {};
	Object.defineProperties(reg, {
		$root: { value: $root, enumerable: true },
		$container: { value: new Future(this), enumerable: true }
	});
	Object.defineProperties(this, {
		_reg: { value: reg },
		_next: { value: next || $root.get() }
	});
}

function defaultEnsureFuture(current) {
	var waiters;
	if (current) {
		if (current instanceof Future && !current.has()) return current;
		if (current._callbacks && current._callbacks.length) {
				wiaters = current._callbacks;
		}
	}
	var res = new Future();
	if (waiters) {
		waiters.forEach(function(cb) {
			res.notify(cb);
		});
	}
	return res;
}

Object.defineProperties(Container.prototype, {

	ensure: {
		value: function(what, ctor) {
			var replace
			, reg = this._reg
			, current = reg[what]
			;
			if (current && current instanceof Singleton && current.has(this)) {
				throw Error('Invalid operation: singletons cannot be replaced once they have been created.');
			}
			replace = ctor(current);
			if (typeof replace === 'undefined') {
				delete reg[what];
			} else {
				reg[what] = replace;
			}
			return replace
		}
	},

	has: {
		value: function(what) {
			if (typeof what !== 'undefined') {
				var c = this;
				while(c) {
					if (c._reg.hasOwnProperty(what)) {
						return c._reg[what].has();
					} else {
						c = c._next;
					}
				}
			}
			return false;
		},
		enumerable: true
	},

	get: {
		value: function(what, callback) {
			if (typeof what !== 'undefined') {
				var f, c = this;
				while(c) {
					if (c._reg.hasOwnProperty(what)) {
						return c._reg[what].get(callback);
					} else {
						c = c._next;
					}
				}
				this._reg[what] = f = new Registration(what, this);
				return f.get(callback);
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
						current.as.ctor(it);
						return current;
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

$root.set(new Container());

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
	}
});
Container.Registration = Registration;
Container.As = As;

module.exports = Container;
