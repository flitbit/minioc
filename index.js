"use strict";

var Future = require('futr')
;

var $root = new Future()
, FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
, STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
;

function Value() {
}
Object.defineProperties(Value.prototype, {
	get: {
		value: function (callback) {
			if (callback) callback(this._value);
			return this._value;
		}
	},
	set: {
		value: function(val) {
			this._value = val;
			return val;
		}
	},
	has: {
		value: function() { return true; }
	}
});

function Ctor(name, value) {
	this.name = name;
	this.val = new Future();
	if (typeof value !== 'undefined') {
		this.val.set(value);
	}
	this.has = function() {
		return this.val.has();
	};
	this.set = function(val) {
		return this.val.set(val);
	};
	this.get = function(callback) {
		return this.val.get(callback);
	};
}

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

Object.defineProperties(Container.prototype, {

	future: {
		value: function(what, kind, it) {
			var reg = this._reg;
			var futr = reg[what];
			if (!futr) {
				reg[what] = futr = new kind(it);
			}
			return futr;
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
		}
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
				f = this.future(what, Future);
				return f.get(callback);
			}
		},
		enumerable: true
	},
	set: {
		value: function (what, it) {
			if (typeof what !== 'undefined') {
				if (what === '$container' || what === '$root') {
					throw new Error('Invalid operation; `'.concat(
						'` is reserved.'));
				}
				var r = this._reg;
				if (typeof it === 'undefined') {
					delete r[what];
				} else {
					var f = this.future(what, Value);
					f.set(it);
				}
			}
			return it;
		},
		enumerable: true
	},
	single: {
		value: function (what, it, options, direct) {
			if (typeof what !== 'undefined') {
				var futr = this.future(what, Future);
				if (typeof it === 'object' || direct) {
					futr.set(it);
				} else if (typeof it === 'function') {
					if (!it.length) {
						futr.set(it.apply(this));
					} else {
						options = options || {};
						var deps = it.toString().replace(STRIP_COMMENTS,"").match(FN_ARGS)[1].split(',');
						var dependencies = []
						, i = -1
						, len = deps.length,
						finish = function() {
							var j = -1
							, args = []
							, dep 
							;
							while(++j < len) {
								dep = dependencies[j];
								if (dep.kind === 'f') {
									if (!dep.value.has()) return;
									args.push(dep.value.get());
								} else {
									args.push(dep.value);
								}
							}
							futr.set(it.apply(this, args));
						}
						;
						while(++i < len) {
							var dep = deps[i].trim();
							if (options.hasOwnProperty(dep)) {
								dependencies.push({ kind: 'u', value: options[dep] });
							} else {
								dependencies.push({ kind: 'f', value: this.future(dep, Future) });
								dependencies[i].value.get(finish);
							}
							finish();
						}
					}
				} else {
					throw new Error("I've got nothing to do with one of those.")
				}
			}
		}
	},
	each: {
		value: function (it, options) {
			if (typeof it !== 'function') {
				throw new TypeError('Invalid type: it must be a function.');
			}
			if (!it.name) {
				throw new Error('Invalid function: it must be named.');
			}
			if (!it.length) {
				futr.set(it.apply(this));
			} else {
				options = options || {};
				var deps = it.toString().replace(STRIP_COMMENTS,"").match(FN_ARGS)[1].split(',');
				var dependencies = []
				, i = -1
				, len = deps.length
				, fulfill = function() {
					var j = -1
					, args = []
					, dep 
					;
					while(++j < len) {
						dep = dependencies[j];
						if (dep.kind === 'd') {
							if (!dep.value.has()) return;
							args.push(dep.value.get());
						} else {
							args.push(dep.value);
						}
					}
					futr.set(it.apply(this, args));
				}
				;
				while(++i < len) {
					var dep = deps[i].trim();
					if (options.hasOwnProperty(dep)) {
						dependencies.push({ kind: 'u', value: options[dep] });
					} else {
						dependencies.push({ kind: 'd', value: dep });
					}
				}
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

module.exports = Container;
