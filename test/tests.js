'use strict';

var expect = require('expect.js')
, minioc = require('..')
;

describe("Minioc", function() {

	describe('when treating minioc as the root container', function() {
		var root = minioc.root
		, test_value = "this is the test value"
		, captured
		;

		it('convenience methods are exposed', function() {
			expect(minioc).to.have.property('create');
			expect(minioc).to.have.property('get');
			expect(minioc).to.have.property('has');
			expect(minioc).to.have.property('register');
			expect(minioc).to.have.property('root');
			expect(minioc).to.have.property('when');
		});

		it('#has returns true for $root', function() {
			expect(minioc.has('$root')).to.be(true);
		});

		it('#has returns true for $container', function() {
			expect(minioc.has('$container')).to.be(true);
		});

		it('#get with $root resolves itself', function() {
			expect(minioc.get('$root')).to.be(root);
		});

		it('#get with $container resolves itself', function() {
			expect(minioc.get('$container')).to.be(root);
		});

		it('#register with $container fails because the container is a self-reference', function() {
			expect(function() {
				minioc.register('$container');
			}).to.throwError();
		});

		it('#register with $root fails because the root is immutable', function() {
			expect(function() {
				minioc.register('$root');
			}).to.throwError();
		});

		describe('an item that is not registered', function() {
			var observed, unk = { says: 'Yay!' };

			it('is not known to the container', function() {
				expect(minioc.has('$unk')).to.be(false);
			});

			it('cannot be retrieved', function() {
				expect(minioc.get('$unk')).to.be();
			});

			it('can be asynchronously retrieved via callback', function() {
				expect(observed).to.be.an('undefined');

				minioc.when('$unk', function(unk) {
					observed = unk;
				});

				expect(observed).to.be.an('undefined');
			});

			it('can be registered', function() {
				minioc.register('$unk').as.value(unk);
			});

			it('invokes prior callbacks when registered', function() {
				expect(observed).to.be(unk);
			});

			it('immediately fulfills asynchronous requests once registered', function() {
				var ours;
				minioc.when('$unk', function(unk) {
					ours = unk;
				});
				expect(ours).to.be(unk);
			});

		});

		describe('an item registered as a singleton value', function() {
			var foo = { foo: 'bar' };
			minioc.register('$foo').as.singleton.value(foo);

			it('is known to the container', function() {
				expect(minioc.has('$foo')).to.be(true);
			});

			it('can be retrieved', function() {
				expect(minioc.get('$foo')).to.be(foo);
			});

			it('cannot be unregistered', function() {
				expect(function() {
					minioc.unregister('$foo');
				}).to.throwError();
			});

			it('is known to the container after unregister attempt', function() {
				expect(minioc.has('$foo')).to.be(true);
			});

			it('resolves after unregister attempt', function() {
				expect(minioc.get('$foo')).to.be(foo);
			});

		});

		describe('an item registered as a singleton factory', function() {
			var bar_ctr = 0;
			minioc.register('$bar').as.singleton.factory(function() {
				return { bar: bar_ctr++ };
			});

			it('is known to the container', function() {
				expect(minioc.has('$bar')).to.be(true);
			});

			it('is resolvable', function() {
				expect(minioc.can('$bar')).to.be(true);
			});

			it('can be retrieved', function() {
				expect(minioc.get('$bar')).to.eql({ bar: 0 });
			});

			it('each retrieval invokes the singleton factory', function() {
				expect(minioc.get('$bar')).to.eql({ bar: 1 });
			});

			it('cannot be unregistered', function() {
				expect(function() {
					minioc.unregister('$bar');
				}).to.throwError();
			});

			it('is known to the container after unregister attempt', function() {
				expect(minioc.has('$bar')).to.be(true);
			});

			it('resolves after unregister attempt', function() {
				expect(minioc.get('$bar')).to.eql({ bar: 2 });
			});

		});

		describe('an item registered as a factory with value intent', function() {
			var baz_ctr = 0;
			minioc.register('$baz').from.factory(function() {
				return { baz: baz_ctr++ };
			});

			it('is known to the container', function() {
				expect(minioc.has('$baz')).to.be(true);
			});

			it('can be retrieved', function() {
				expect(minioc.get('$baz')).to.eql({ baz: 0 });
			});

			it('each retrieval receives the same result', function() {
				expect(minioc.get('$baz')).to.eql({ baz: 0 });
			});

			it('can be unregistered', function() {
				minioc.unregister('$baz');
			});

			it('is not known to the container after unregister', function() {
				expect(minioc.has('$baz')).to.be(false);
			});

			it('fails to resolve after unregister', function() {
				expect(minioc.get('$baz')).to.be();
			})
		});

		describe('an item registered as a singleton factory with value intent', function() {
			var qux_ctr = 0;
			minioc.register('$qux').from.singleton.factory(function() {
				return { qux: qux_ctr++ };
			});

			it('is known to the container', function() {
				expect(minioc.has('$qux')).to.be(true);
			});

			it('can be retrieved', function() {
				expect(minioc.get('$qux')).to.eql({ qux: 0 });
			});

			it('each retrieval receives the same result', function() {
				expect(minioc.get('$qux')).to.eql({ qux: 0 });
			});

			it('cannot be unregistered', function() {
				expect(function() {
					minioc.unregister('$qux');
				}).to.throwError();
			});

			it('is known to the container after unregister attempt', function() {
				expect(minioc.has('$qux')).to.be(true);
			});

			it('resolves after unregister attempt', function() {
				expect(minioc.get('$qux')).to.eql({ qux: 0 });
			});

		});

		describe('an item registered as a factory with injection dependency', function() {
			var quux_ctr = 0
			, captured
			;

			minioc.register('$quux').as.factory(function($corge) {
				return { quux: quux_ctr++, corge: $corge };
			});

			it('is known to the container', function() {
				expect(minioc.has('$quux')).to.be(true);
			});

			it('cannot be fully resolved', function() {
				expect(minioc.can('$quux')).to.be(false);
			});

			it('is not resolvable without its dependency', function() {
				expect(minioc.can('$quux')).to.be(false);
			});

			it('cannot be retrieved without init data', function() {
				expect(minioc.get('$quux')).to.eql({ quux: 0, corge: undefined});
			});

			it('can be asynchronously retrieved via callback', function() {
				expect(captured).to.be();
				minioc.when('$quux', function(val) {
					captured = val;
				});
				expect(captured).to.be();
			});

			it('can registere the missing value', function() {
				minioc.register('$corge').as.value('This be corge here.');
			});

			it('invokes prior callbacks when registered', function() {
				expect(captured).to.eql({ quux: 1, corge: 'This be corge here.'});
			});

			it('immediately fulfills asynchronous requests once registered', function() {
				var ours;
				minioc.when('$quux', function(val) {
					ours = val;
				});
				expect(ours).to.eql({ quux: 2, corge: 'This be corge here.'});
			});

		});

		describe('an item registered as a ctor', function() {
			var grault_ctr = 0;
			function Grault() {
				this.grault = grault_ctr++;
			}
			minioc.register('Grault').as.ctor(Grault);

			it('is known to the container', function() {
				expect(minioc.has('Grault')).to.be(true);
			});

			it('is resolvable', function() {
				expect(minioc.can('Grault')).to.be(true);
			});

			it('can be retrieved', function() {
				expect(minioc.get('Grault')).to.eql({ grault: 0 });
			});

			it('each retrieval gets a new instance', function() {
				expect(minioc.get('Grault')).to.eql({ grault: 1 });
			});

			it('can be unregistered', function() {
				minioc.unregister('Grault');
			});

			it('is unknown to the container after unregister', function() {
				expect(minioc.has('Grault')).to.be(false);
			});

			it('fails to resolve after unregister', function() {
				expect(minioc.get('Grault')).to.be();
			});

		});

		describe('an item registered as a singleton ctor', function() {
			var garply_ctr = 0;
			function Garply() {
				this.garply = garply_ctr++;
			}
			minioc.register('Garply').as.singleton.ctor(Garply);

			it('is known to the container', function() {
				expect(minioc.has('Garply')).to.be(true);
			});

			it('is resolvable', function() {
				expect(minioc.can('Garply')).to.be(true);
			});

			it('can be retrieved', function() {
				expect(minioc.get('Garply')).to.eql({ garply: 0 });
			});

			it('each retrieval gets a new instance', function() {
				expect(minioc.get('Garply')).to.eql({ garply: 1 });
			});

			it('cannot be unregistered', function() {
				expect(function() {
					minioc.unregister('Garply');
				}).to.throwError();
			});

			it('is known to the container after unregister attempt', function() {
				expect(minioc.has('Garply')).to.be(true);
			});

			it('resolves after unregister attempt', function() {
				expect(minioc.get('Garply')).to.eql({ garply: 2 });
			});

		});

		describe('an item registered as a singleton ctor with value intent', function() {
			var waldo_ctr = 0;
			function Waldo() {
				this.waldo= waldo_ctr++;
			}
			minioc.register('Waldo').as.singleton.from.ctor(Waldo);

			it('is known to the container', function() {
				expect(minioc.has('Waldo')).to.be(true);
			});

			it('is resolvable', function() {
				expect(minioc.can('Waldo')).to.be(true);
			});

			it('can be retrieved', function() {
				expect(minioc.get('Waldo')).to.eql({ waldo: 0 });
			});

			it('each retrieval gets the same instance', function() {
				expect(minioc.get('Waldo')).to.eql({ waldo: 0 });
			});

			it('cannot be unregistered', function() {
				expect(function() {
					minioc.unregister('Waldo');
				}).to.throwError();
			});

			it('is known to the container after unregister attempt', function() {
				expect(minioc.has('Waldo')).to.be(true);
			});

			it('resolves after unregister attempt', function() {
				expect(minioc.get('Waldo')).to.eql({ waldo: 0 });
			});

		});

	});
});