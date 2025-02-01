/**
 * Copyright (c) 2014, 2016, 2019 Tim Kuijsten
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

var assert = require('assert');

var async = require('async');

var LDJSONStream = require('./index');

var tasks = [];

/* throw */

assert.throws(function() { var ls = new LDJSONStream(''); return ls; }, null, 'opts must be an object');
assert.throws(function() { var ls = new LDJSONStream({ maxDocLength: '' }); return ls; }, null, 'should require opts.maxDocLength to be a number');
assert.throws(function() { var ls = new LDJSONStream({ maxDocs: '' }); return ls; }, null, 'opts.maxDocs must be a number');
assert.throws(function() { var ls = new LDJSONStream({ maxBytes: '' }); return ls; }, null, 'opts.maxBytes must be a number');
assert.throws(function() { var ls = new LDJSONStream({ hide: '' }); return ls; }, null, 'opts.hide must be a boolean');

/* async */

/* should be a writable stream */
tasks.push(function(done) {
  var ls = new LDJSONStream();
  ls.end(done);
});

/* should be a readable stream */
tasks.push(function(done) {
  var ls = new LDJSONStream();
  ls.resume();
  ls.on('end', done);
  ls.end();
});

/* should emit one valid empty object */
tasks.push(function(done) {
  var ls = new LDJSONStream();
  ls.on('data', function(buf) {
    assert.strictEqual(buf.toString(), '{}\n');
    done();
  });
  ls.end('{}\n');
});

/* should emit two valid empty objects */
tasks.push(function(done) {
  var ls = new LDJSONStream();
  var i = 0;
  ls.on('data', function(buf) {
    i++;
    assert.strictEqual(buf.toString(), '{}\n');
  });
  ls.on('end', function() {
    assert.strictEqual(i, 2);
    done();
  });
  ls.end('{}\n{}\n');
});

/* should emit two valid empty objects in object mode */
tasks.push(function(done) {
  var ls = new LDJSONStream({ objectMode: true });
  var i = 0;
  ls.on('data', function(obj) {
    i++;
    assert.deepEqual(obj, {});
  });
  ls.on('end', function() {
    assert.strictEqual(i, 2);
    done();
  });
  ls.end('{}\n{}\n');
});

/* should use maxDocs and leave the rest in the buffer */
tasks.push(function(done) {
  var ls = new LDJSONStream({ maxDocs: 1 });
  var i = 0;
  ls.on('data', function(buf) {
    i++;
    assert.strictEqual(buf.toString(), '{}\n');
  });
  ls.on('end', function() {
    assert.strictEqual(i, 1);
    assert.strictEqual(ls.buffer.toString('hex'), '7b7d0a');
    done();
  });
  ls.end('{}\n{}\n');
});

/* should err when more than maxBytes are written */
tasks.push(function(done) {
  var ls = new LDJSONStream({ maxBytes: 2 });
  ls.on('error', function(err) {
    assert.strictEqual(err.message, 'more than maxBytes received');
    done();
  });
  ls.on('data', function() { throw Error('incomplete object emitted'); });
  ls.end('{}\n');
});

/* should reset buffer after more than maxBytes are written */
tasks.push(function(done) {
  var ls = new LDJSONStream({ maxBytes: 2 });
  ls.on('error', function(err) {
    assert.strictEqual(err.message, 'more than maxBytes received');
    assert.strictEqual(ls.buffer.length, 0);
    done();
  });
  ls.on('data', function() { throw Error('incomplete object emitted'); });
  ls.write('{ ');
  ls.end('"foo": "bar" }\n');
});

/* should err when maxDocLength is exceeded */
tasks.push(function(done) {
  var ls = new LDJSONStream({ maxDocLength: 1 });
  ls.on('data', function() { throw Error('incomplete object emitted'); });
  ls.on('error', function(err) {
    assert.strictEqual(err.message, 'document exceeds configured maximum length');
    done();
  });
  ls.end('{}\n');
});

/* should err if max bytes is received, including newlines */
tasks.push(function(done) {
  var ls = new LDJSONStream({ maxDocLength: 2, maxBytes: 3 });
  ls.on('data', function() { throw Error('incomplete object emitted'); });
  ls.on('error', function(err) {
    assert.strictEqual(err.message, 'more than maxBytes received');
    done();
  });
  ls.end('{}\r\n');
});

/* should err if JSON is invalid */
tasks.push(function(done) {
  var ls = new LDJSONStream();
  ls.on('error', function(err) {
    assert.strictEqual(err.message, 'Unexpected token f in JSON at position 5');
    done();
  });
  ls.end('{ \r\n foo: "bar" }\n');
});

/* should err when only a newline is written */
tasks.push(function(done) {
  var ls = new LDJSONStream();
  ls.on('data', function() { throw Error('incomplete object emitted'); });
  ls.on('error', function(err) {
    assert.strictEqual(err.message, 'Unexpected end of JSON input');
    done();
  });
  ls.end('\r\n');
});

/* should support multi-line json */
tasks.push(function(done) {
  var ls = new LDJSONStream({ objectMode: true });
  ls.on('data', function(obj) {
    assert.deepEqual(obj, {
      foo: 'bar'
    });
    done();
  });
  ls.end('{ \r\n "foo": \n "bar" }\n');
});

/* should support both \n and \r\n line separators */
tasks.push(function(done) {
  var ls = new LDJSONStream();
  var count = 0;
  ls.on('data', function() {
    count++;
  });
  ls.on('end', function() {
    if (count != 3) {
      done(new Error('incorrect number of data items: ' + count));
    } else {
      done();
    }
  });
  ls.end('{}\n{}\r\n{}\n');
});


/* should deserialize a generated JSON string correctly */
tasks.push(function(done) {
  var obj = {
    foo: 'bar',
    bar: 42,
    baz: false,
    qux: null
  };

  var ls = new LDJSONStream({ objectMode: true });
  ls.on('data', function(data) {
    assert.deepEqual(data, {
      foo: 'bar',
      bar: 42,
      baz: false,
      qux: null
    });
    done();
  });
  ls.end(JSON.stringify(obj));
});

/* should deserialize two generated JSON strings correctly */
tasks.push(function(done) {
  var obj1 = {
    foo: 'bar'
  };

  var obj2 = {
    foo: 'baz',
    bar: 42,
    baz: false,
    qux: null
  };

  var ls = new LDJSONStream({ objectMode: true });

  var arr = [];

  ls.on('data', function(data) {
    arr.push(data);
  });

  ls.on('end', function() {
    assert.strictEqual(arr.length, 2);
    assert.deepEqual(arr[0], {
      foo: 'bar'
    });
    assert.deepEqual(arr[1], {
      foo: 'baz',
      bar: 42,
      baz: false,
      qux: null
    });
    done();
  });

  ls.end(JSON.stringify(obj1) + '\r\n' + JSON.stringify(obj2));
});

/* should handle large input buffers */
tasks.push(function(done) {
  var ls = new LDJSONStream({ objectMode: true });
  var i = 0;
  ls.on('data', function(obj) {
    i++;
    assert.deepEqual(obj, {});
  });
  ls.on('end', function() {
    assert.strictEqual(i, 10000);
    done();
  });
  ls.end('{}\n'.repeat(10000));
});

async.series(tasks, function(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('ok');
});
