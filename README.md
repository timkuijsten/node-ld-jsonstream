# LDJSONStream

Read a binary stream that contains new line separated JSON objects and emit each
as a JavaScript object.

Goal: simple, dependency free and easily auditable in an attempt to be secure.

Notes:
* implements LDJSON (https://en.wikipedia.org/wiki/Line_Delimited_JSON)
* based on bson-stream (https://www.npmjs.org/package/bson-stream)


## Example

Write two JSON objects to stdout:

    var LDJSONStream = require('ld-jsonstream');

    var ls = new LDJSONStream();

    ls.on('data', function(obj) {
      console.log(obj);
    });

    ls.write('{ "foo" : "bar" }\n{ "foo" : "baz" }\n');


## Installation

    $ npm install ld-jsonstream


## API

### LDJSONStream([opts])
* [opts] {Object} object containing optional parameters

opts:
* maxDocLength {Number, default 16777216} maximum JSON document size in bytes
* maxDocs {Number, default infinite} maximum number of documents to receive
* maxBytes {Number, default infinite} maximum number of bytes to receive
* flush {Boolean, default true} whether to flush any remaining data on writer end
* debug {Boolean, default false} whether to do extra console logging or not
* hide {Boolean, default false} whether to suppress errors or not (used in tests)

events:
* "data" {Object}  emits one object at a time
* "end"  stream end

Read a binary stream that contains new line separated JSON objects and emit each
as a JavaScript object.

### this.buffer
* {Buffer} buffer, can be used to manually flush any remaining bytes

### this.bytesRead
* {Number} total number of bytes read


## Tests

    $ npm test


## TODO

* implement [NDJSON](https://github.com/ndjson/ndjson-spec)


## License

ISC

Copyright (c) 2014, 2015, 2016 Tim Kuijsten

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
