"use strict";

var util = require('util')
, As = require('./as')
, Registration = require('./registration')
;

var __root
, __rootRef = new Registration('$root')
, __unfulfilledCount = 0
;

function Container(next, tenant) {
	var reg = {}
	, me = new Registration('$container').as.singleton.value(this)
	;

	Object.defineProperties(reg, {
		$root : { value: __rootRef, enumerable: true },
		$container: { value: me, enumerable: true }
	});
	Object.defineProperties(this, {
		_reg: { value: reg },
		_unfulfilled: { value: {} },
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

	fulfill: {
		value: function(id, fn) {
			if ('string' !== typeof id || !id) throw new Error('Identifier must be provided as the first argument.');
			if ('function' !== typeof fn) throw new Error('Function must be provided as the second argument.');
			var reg
			, self = this
			, recorded = id.concat(++__unfulfilledCount);
			;
			this._unfulfilled[recorded] = reg;
			reg = new Registration(id, this);
			reg.as.factory(fn);
			reg.when(function(it) {
				delete self._unfulfilled[recorded];
			});
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
