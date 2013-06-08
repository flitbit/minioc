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
		it('#has returns false for undefined $test', function() {
			expect(minioc.has('$test')).to.be(false);
		});

		it('#get with undefined $test resolves undefined', function() {
			expect(minioc.get('$test')).to.be();
		});

		it('#when(callback) with non-existent $test resolves undefined', function() {
			minioc.when('$test', function(eventual) {
				expect(captured).to.be();
				captured = eventual;
			});
			expect(captured).to.be();
		});

		it('#register $test as a value does not throw and value can be subsequently resolved', function() {
			minioc.register('$test').as.value(test_value);
			expect(minioc.get('$test')).to.be(test_value);
		});

		it('due to the preceding registraiont of the $test item, the callback from the previous #when is given the value.', function() {
			expect(captured).to.be(test_value);
		});

		it('#unregister $test removes it from the container', function() {
			minioc.unregister('$test');
			expect(minioc.get('$test')).to.be();
		});

		it('#has returns false for undefined $test', function() {
			expect(minioc.has('$test')).to.be(false);
		});

		it('#get with undefined $test resolves undefined', function() {
			expect(minioc.get('$test')).to.be();
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
					minioc.unregister('$bar');
				}).to.throwError();
			});

			it('is known to the container after unregister attempt', function() {
				expect(minioc.has('$qux')).to.be(true);
			});

			it('resolves after unregister attempt', function() {
				expect(minioc.get('$qux')).to.eql({ qux: 0 });
			});

		});
	});
});