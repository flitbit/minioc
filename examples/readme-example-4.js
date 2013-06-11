var minioc = require('..')
, expect = require('expect.js')
;

function My($data) {
	this.has = (typeof $data !== 'undefined');
	this.data = $data;
}

minioc.register('My').as.ctor(My);

// minioc has the registration...
expect(minioc.has('My')).to.be(true);

// ... but it can't fulfill the dependencies...
expect(minioc.can('My')).to.be(false);

var one = minioc.get('My');

expect(one).to.have.property('has');
expect(one.has).to.be(false);

expect(one).to.have.property('data');
expect(one.data).to.be.an('undefined');

var data =  {
	something: "of interest",
	other: "data"
};

// The dependency must be user-supplied...
var two = minioc.get('My', { $data: data });

expect(two).to.have.property('has');
expect(two.has).to.be(true);

expect(two).to.have.property('data');
expect(two.data).to.eql(data);

// Until the dependency can be met...
minioc.register('$data').as.value(data);

var three = minioc.get('My');

expect(three).to.have.property('has');
expect(three.has).to.be(true);

expect(three).to.have.property('data');
expect(three.data).to.eql(data);

