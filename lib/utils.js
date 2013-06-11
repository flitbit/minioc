"use strict";

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m
, STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
;

function extractDependenciesFrom(fn, dependencies, options) {
	if (fn.length) {
		options = options || {};
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

module.exports.extractDependenciesFrom = extractDependenciesFrom;