/**
 * Copyright (c) 2014, 2015, 2016, 2019 Tim Kuijsten
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

/* jshint -W116 */

var util = require('util');
var Transform = require('stream').Transform;

/**
 * LDJSONStream
 *
 * Parse a binary stream of stringified new line separated JSON objects and
 * write to output. Implements a Transform stream.
 *
 * Features:
 *   * simple
 *   * dependency free
 *   * easy to audit
 *   * LDJSON support
 *   * NDJSON support
 *
 * @param {Object} [opts] object containing optional parameters
 *
 * opts:
 *  maxDocLength {Number, default 16777216} maximum JSON document size in bytes
 *  maxDocs {Number, default infinite} maximum number of documents to receive
 *  maxBytes {Number, default infinite} maximum number of bytes to receive
 *  flush {Boolean, default true} whether to flush any remaining data on writer end
 *  debug {Boolean, default false} whether to do extra console logging or not
 *  hide {Boolean, default false} whether to suppress errors or not (used in tests)
 *  readableObjectMode {Boolean, default false} Sets objectMode for the readable side of
 *    the stream. Note: the writable side of the stream can never be in object mode. If
 *    you have such a case, you don't need this module.
 *  objectMode {Boolean, default false} alias for readableObjectMode
 *
 * @event "data" {Object}  emits one object at a time
 * @event "end"  emitted once the underlying cursor is closed
 */
function LDJSONStream(opts) {
  if (opts == null) { opts = {}; }
  if (typeof opts !== 'object') { throw new TypeError('opts must be an object'); }

  if (opts.maxDocLength != null && typeof opts.maxDocLength !== 'number') { throw new TypeError('opts.maxDocLength must be a number'); }
  if (opts.maxDocs != null && typeof opts.maxDocs !== 'number') { throw new TypeError('opts.maxDocs must be a number'); }
  if (opts.maxBytes != null && typeof opts.maxBytes !== 'number') { throw new TypeError('opts.maxBytes must be a number'); }
  if (opts.flush != null && typeof opts.flush !== 'boolean') { throw new TypeError('opts.flush must be a boolean'); }
  if (opts.debug != null && typeof opts.debug !== 'boolean') { throw new TypeError('opts.debug must be a boolean'); }
  if (opts.hide != null && typeof opts.hide !== 'boolean') { throw new TypeError('opts.hide must be a boolean'); }
  if (opts.writableObjectMode) { throw new Error('writableObjectMode is not supported, line delimited JSON is required as input'); }
  if (opts.objectMode != null && typeof opts.objectMode !== 'boolean') { throw new TypeError('opts.objectMode must be a boolean'); }
  if (opts.readableObjectMode != null && typeof opts.readableObjectMode !== 'boolean') {
    throw new TypeError('opts.readableObjectMode must be a boolean');
  }

  if (opts.objectMode) {
    opts.readableObjectMode = opts.objectMode;
    delete opts.objectMode;
  }
  Transform.call(this, opts);

  this._maxDocLength = opts.maxDocLength || 16777216;

  this._maxBytes = opts.maxBytes;
  this._maxDocs = opts.maxDocs;

  this._flushOpt = opts.flush != null ? opts.flush : true;
  this._debug = opts.debug || false;
  this._hide = !!opts.hide;
  this._objectMode = opts.readableObjectMode;

  this.bytesRead = 0;
  this.docsRead  = 0;

  this._docptr = 0;

  // initialize internal buffer
  this._reset();
}
util.inherits(LDJSONStream, Transform);

module.exports = LDJSONStream;

// reset internal buffer
LDJSONStream.prototype._reset = function _reset() {
  if (this._debug) { console.log('_reset'); }

  this.buffer = new Buffer(0);
  this._docptr = 0;
};

// read up to the next newline
LDJSONStream.prototype._parseDocs = function _parseDocs(cb) {
  for (;;) {
    if (this._debug) { console.log('_parseDocs'); }

    if (this._maxDocs && this.docsRead >= this._maxDocs) { cb(); return; }

    // move pointer to first newline character
    var found = false;
    while (!found && this._docptr < this.buffer.length) {
      if (~[0x0a, 0x0d].indexOf(this.buffer[this._docptr])) {
        found = true;
      }
      this._docptr++;
    }

    // if a newline is found, check if it's a carriage return followed by a newline
    var crnl = false;
    if (found && this._docptr < this.buffer.length && this.buffer[this._docptr] === 0x0d && this.buffer[this._docptr + 1] === 0x0a) {
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

    var rawdoc = this.buffer.slice(0, this._docptr);
    var obj;

    try {
      if (this._debug) { console.log('parse', rawdoc.toString()); }
      obj = JSON.parse(rawdoc);
    } catch (err) {
      if (this._debug) { console.error(err, rawdoc); }

      // support multi-line JSON
      if (err.message === 'Unexpected end of JSON input') {
        // look for next newline
        continue;
      } else {
        this._reset();
        cb(err);
      }
      return;
    }

    // shift document from internal buffer and nullify expected document length
    this.buffer = this.buffer.slice(this._docptr);
    this._docptr = 0;

    // push the raw or parsed doc out to the reader
    if (this._objectMode) {
      this.push(obj);
    } else {
      this.push(rawdoc);
    }
    this.docsRead++;

    // check if there might be any new document that can be parsed
    if (!this.buffer.length) {
      cb();
      return;
    }
  }
};

LDJSONStream.prototype._transform = function _transform(chunk, encoding, cb) {
  if (this._debug) { console.log('_transform', chunk); }

  this.bytesRead += chunk.length;

  if (this._maxBytes && this.bytesRead > this._maxBytes) {
    this._reset();
    cb(new Error('more than maxBytes received'));
    return;
  }

  var newLength = this.buffer.length + chunk.length;

  this.buffer = Buffer.concat([this.buffer, chunk], newLength);
  this._parseDocs(cb);
};

// parse any final object that does not end with a newline
LDJSONStream.prototype._flush = function _flush(cb) {
  if (this._debug) { console.log('_flush'); }

  if (!this._flushOpt) { cb(); return; }
  if (!this.buffer.length) { cb(); return; }
  if (this._maxDocs && this.docsRead >= this._maxDocs) { cb(); return; }

  var obj;

  try {
    obj = JSON.parse(this.buffer);
    // push the raw or parsed doc out to the reader
    if (this._objectMode) {
      this.push(obj);
    } else {
      this.push(this.buffer);
    }
    this.docsRead++;

    this._reset();
    cb();
  } catch (err) {
    if (this._debug) { console.error(err, this.buffer); }
    this._reset();
    cb(err);
  }
};
