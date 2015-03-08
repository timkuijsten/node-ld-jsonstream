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

var util = require('util');
var Transform = require('stream').Transform;

/**
 * LDJSONStream
 *
 * Read a binary stream that contains new line separated JSON objects and emit each
 * as a JavaScript object.
 *
 * Goal: simple, dependency free and easy to audit in an attempt to be secure.
 *
 * Note: implements LDJSON (https://en.wikipedia.org/wiki/Line_Delimited_JSON)
 *
 * @param {Object} [opts] object containing optional parameters
 *
 * opts:
 *  maxDocLength {Number, default 16777216} maximum JSON document size in bytes
 *  maxBytes {Number, default infinite} maximum number of bytes to receive
 *  debug {Boolean, default false} whether to do extra console logging or not
 *  hide {Boolean, default false} whether to suppress errors or not (used in tests)
 *
 * @event "data" {Object}  emits one object at a time
 * @event "end"  emitted once the underlying cursor is closed
 */
function LDJSONStream(opts) {
  if (typeof opts !== 'undefined' && typeof opts !== 'object') { throw new TypeError('opts must be an object'); }
  opts = opts || {};

  if (typeof opts.maxDocLength !== 'undefined' && typeof opts.maxDocLength !== 'number') { throw new TypeError('opts.maxDocLength must be a number'); }
  if (typeof opts.maxBytes !== 'undefined' && typeof opts.maxBytes !== 'number') { throw new TypeError('opts.maxBytes must be a number'); }
  if (typeof opts.debug !== 'undefined' && typeof opts.debug !== 'boolean') { throw new TypeError('opts.debug must be a boolean'); }
  if (typeof opts.hide !== 'undefined' && typeof opts.hide !== 'boolean') { throw new TypeError('opts.hide must be a boolean'); }

  Transform.call(this, opts);

  this._maxDocLength = opts.maxDocLength || 16777216;

  this._maxBytes = opts.maxBytes;

  this._debug = opts.debug || false;
  this._hide = !!opts.hide;

  this._writableState.objectMode = false;
  this._readableState.objectMode = true;

  this._docptr = 0;

  // initialize internal buffer
  this._reset();
}
util.inherits(LDJSONStream, Transform);

module.exports = LDJSONStream;

// reset internal buffer
LDJSONStream.prototype._reset = function _reset() {
  if (this._debug) { console.log('_reset'); }

  this._buffer = new Buffer(0);
  this._docptr = 0;
};

// read up to the next newline
LDJSONStream.prototype._parseDocs = function _parseDocs(cb) {
  if (this._debug) { console.log('_parseDocs'); }

  // move pointer to first newline character
  var found = false;
  while (!found && this._docptr < this._buffer.length) {
    if (~[0x0a, 0x0d].indexOf(this._buffer[this._docptr])) {
      found = true;
    }
    this._docptr++;
  }

  // if a newline is found, check if it's a carriage return followed by a newline
  var crnl = false;
  if (found && this._docptr < this._buffer.length && this._buffer[this._docptr] === 0x0d && this._buffer[this._docptr + 1] === 0x0a) {
    this._docptr++;
    crnl = true;
  }

  // enforce max doc length
  if (this._docptr - (crnl ? 2 : 1) > this._maxDocLength) {
    // discard buffer
    this._reset();
    cb(new Error('document exceeds configured maximum length'));
    return;
  }

  if (!found) {
    // wait for more chunks
    cb();
    return;
  }

  // since a newline is found, try to read and parse it as JSON

  var rawdoc = this._buffer.slice(0, this._docptr);
  var obj;

  try {
    if (this._debug) { console.log('parse', rawdoc.toString()); }
    obj = JSON.parse(rawdoc);
  } catch (err) {
    if (this._debug) { console.error(err); }

    // support multi-line JSON
    if (err.message === 'Unexpected end of input') {
      // look for next newline
      this._parseDocs(cb);
    } else {
      this._reset();
      cb(err);
    }
    return;
  }

  // shift document from internal buffer and nullify expected document length
  this._buffer = this._buffer.slice(this._docptr);
  this._docptr = 0;

  // push the parsed doc out to the reader
  this.push(obj);

  // check if there might be any new document that can be parsed
  if (this._buffer.length) {
    this._parseDocs(cb);
  } else {
    cb();
  }
};

LDJSONStream.prototype._transform = function _transform(chunk, encoding, cb) {
  if (this._debug) { console.log('_transform', chunk); }

  var newLength = this._buffer.length + chunk.length;

  if (this._maxBytes && newLength > this._maxBytes) {
    this._reset();
    cb(new Error('more than maxBytes received'));
    return;
  }

  this._buffer = Buffer.concat([this._buffer, chunk], newLength);
  this._parseDocs(cb);
};

// parse any final object that does not end with a newline
LDJSONStream.prototype._flush = function _flush(cb) {
  if (this._debug) { console.log('_flush'); }

  if (!this._buffer.length) { cb(); return; }

  var obj;

  try {
    obj = JSON.parse(this._buffer);

    // push the parsed doc out to the reader
    this.push(obj);

    this._reset();
    cb();
  } catch (err) {
    this._reset();
    cb(err);
  }
};
