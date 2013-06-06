var expect = require('expect.js')
, minioc = require('..')
;

describe("Minioc", function() {
	describe('with the root container', function() {
		var root = minioc.root
		;

		it('#has returns true for $root', function() {
			expect(root.has('$root')).to.be(true);
		});

		it('#has returns true for $container', function() {
			expect(root.has('$container')).to.be(true);
		});

		it('#get with $root resolves itself', function() {
			expect(root.get('$root')).to.be(root);
		});

		describe('and the undefined #test', function() {
			var test_value = "this is the test value"
			, captured
			;

			it('#get with $container resolves itself', function() {
				expect(root.get('$container')).to.be(root);
			});

			it('#get with non-existent $test resolves undefined', function() {
				expect(root.get('$test')).to.be(); // undefined
			});

			it('#get(callback) with non-existent $test resolves undefined', function() {
				expect(root.get('$test', function(eventual) {
					expect(captured).to.be(); // undefined
					captured = eventual;
				})).to.be();
				expect(captured).to.be(); // undefined
			});

			it('#register $test as a value, can get the same value back', function() {
				root.register('$test').as.value(test_value);

				expect(root.get('$test')).to.be(test_value);
			});

			it('after the #set, the callback from the previous #get is given the value.', function() {
				expect(captured).to.be(test_value);
			});

			it('#register $test as undefined removes the value from the container', function() {
				root.register('$test').as.value();
				expect(root.get('$test')).to.be();
			});

			it('#get with non-existent $test resolves undefined', function() {
				expect(root.get('$test')).to.be(); // undefined
			});

		});


	});

});