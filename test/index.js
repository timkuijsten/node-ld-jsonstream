/**
 * Copyright (c) 2014, 2015 Tim Kuijsten
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

'use strict';

/*jshint -W068 */

var should = require('should');

var LDJSONStream = require('../index.js');

describe('LDJSONStream', function() {
  it('should require opts to be an object', function() {
    (function() { var ls = new LDJSONStream(''); return ls; }).should.throw('opts must be an object');
  });

  it('should require opts.maxDocLength to be a number', function() {
    (function() { var ls = new LDJSONStream({ maxDocLength: '' }); return ls; }).should.throw('opts.maxDocLength must be a number');
  });

  it('should require opts.maxBytes to be a number', function() {
    (function() { var ls = new LDJSONStream({ maxBytes: '' }); return ls; }).should.throw('opts.maxBytes must be a number');
  });

  it('should require opts.debug to be a boolean', function() {
    (function() { var ls = new LDJSONStream({ debug: '' }); return ls; }).should.throw('opts.debug must be a boolean');
  });

  it('should require opts.hide to be a boolean', function() {
    (function() { var ls = new LDJSONStream({ hide: '' }); return ls; }).should.throw('opts.hide must be a boolean');
  });

  it('should construct', function() {
    var ls = new LDJSONStream();
    return ls;
  });

  it('should be a writable stream', function(done) {
    var ls = new LDJSONStream();
    ls.end(done);
  });

  it('should be a readable stream', function(done) {
    var ls = new LDJSONStream();
    ls.resume();
    ls.on('end', done);
    ls.end();
  });

  it('should emit one valid empty object', function(done) {
    var ls = new LDJSONStream();
    ls.on('data', function(obj) {
      should.deepEqual(obj, {});
      done();
    });
    ls.end('{}\n');
  });

  it('should err when more than maxBytes are written', function(done) {
    var ls = new LDJSONStream({ maxBytes: 2 });
    ls.on('error', function(err) {
      should.strictEqual(err.message, 'more than maxBytes received');
      done();
    });
    ls.on('data', function() { throw Error('incomplete object emitted'); });
    ls.end('{}\n');
  });

  it('should err when maxDocLength is exceeded', function(done) {
    var ls = new LDJSONStream({ maxDocLength: 1 });
    ls.on('data', function() { throw Error('incomplete object emitted'); });
    ls.on('error', function(err) {
      should.strictEqual(err.message, 'document exceeds configured maximum length');
      done();
    });
    ls.end('{}\n');
  });

  it('should err if max bytes is received, including newlines', function(done) {
    var ls = new LDJSONStream({ maxDocLength: 2, maxBytes: 3 });
    ls.on('data', function() { throw Error('incomplete object emitted'); });
    ls.on('error', function(err) {
      should.strictEqual(err.message, 'more than maxBytes received');
      done();
    });
    ls.end('{}\r\n');
  });

  it('should err if JSON is invalid', function(done) {
    var ls = new LDJSONStream();
    ls.on('error', function(err) {
      should.strictEqual(err.message, 'Unexpected token f');
      done();
    });
    ls.end('{ \r\n foo: "bar" }\n');
  });

  it('should err when only a newline is written', function(done) {
    var ls = new LDJSONStream();
    ls.on('data', function() { throw Error('incomplete object emitted'); });
    ls.on('error', function(err) {
      should.strictEqual(err.message, 'Unexpected end of input');
      done();
    });
    ls.on('close', done);
    ls.end('\r\n');
  });

  it('should support multi-line json', function(done) {
    var ls = new LDJSONStream();
    ls.on('data', function(obj) {
      should.deepEqual(obj, {
        foo: 'bar'
      });
      done();
    });
    ls.end('{ \r\n "foo": \n "bar" }\n');
  });

  it('should deserialize a generated JSON string correctly', function(done) {
    var obj = {
      foo: 'bar',
      bar: 42,
      baz: false,
      qux: null
    };

    var ls = new LDJSONStream();
    ls.on('data', function(data) {
      should.deepEqual(data, {
        foo: 'bar',
        bar: 42,
        baz: false,
        qux: null
      });
      done();
    });
    ls.end(JSON.stringify(obj));
  });

  it('should deserialize two generated JSON strings correctly', function(done) {
    var obj1 = {
      foo: 'bar'
    };

    var obj2 = {
      foo: 'baz',
      bar: 42,
      baz: false,
      qux: null
    };

    var ls = new LDJSONStream();

    var arr = [];

    ls.on('data', function(data) {
      arr.push(data);
    });

    ls.on('end', function() {
      should.strictEqual(arr.length, 2);
      should.deepEqual(arr[0], {
        foo: 'bar'
      });
      should.deepEqual(arr[1], {
        foo: 'baz',
        bar: 42,
        baz: false,
        qux: null
      });
      done();
    });

    ls.end(JSON.stringify(obj1) + '\r\n' + JSON.stringify(obj2));
  });

  it('should skip noise in previous chunks and emit two generated JSON objects', function(done) {
    var noise = '289,df';

    var obj1 = {
      foo: 'bar'
    };

    var obj2 = {
      foo: 'baz',
      bar: 42,
      baz: false,
      qux: null
    };

    var ls = new LDJSONStream({ debug: false });

    var arr = [];

    ls.on('error', function(err) {
      should.strictEqual(err.message, 'Unexpected token ,');
    });

    ls.on('data', function(data) {
      arr.push(data);
    });

    ls.on('end', function() {
      should.strictEqual(arr.length, 2);
      should.deepEqual(arr[0], {
        foo: 'bar'
      });
      should.deepEqual(arr[1], {
        foo: 'baz',
        bar: 42,
        baz: false,
        qux: null
      });
      done();
    });

    ls.write(noise + '\n');
    ls.write(JSON.stringify(obj1) + '\n' + noise + '\n' + JSON.stringify(obj2));
    ls.write('\n' + JSON.stringify(obj2));
    ls.end();
  });
});
