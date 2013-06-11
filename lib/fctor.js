var util = require('util')
, Value = require('./value')
;

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

module.exports = Fctor;