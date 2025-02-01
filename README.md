# LDJSONStream

Parse a binary stream of stringified new line separated JSON objects and write
to output. Implements a Transform stream.

Features:
* [LDJSON](https://en.wikipedia.org/wiki/Line_Delimited_JSON) support
* [NDJSON](http://ndjson.org/) support
* simple and dependency free
* easy to audit


## Example

A simple filter that logs all objects that have the *name* *baz*:

```js
const Writable = require('stream').Writable;
const LDJSONStream = require('ld-jsonstream');

var ls = new LDJSONStream({ objectMode: true });

ls.pipe(new Writable({
  objectMode: true,
  write: function(obj, encoding, cb) {
    if (obj.name === 'baz') {
      console.log(obj);
    }
    cb();
  }
}));

ls.write('{ "name" : "bar" }\n{ "name" : "baz" }\n');
```

A more practical use case would be to read from stdin with something like:
`process.stdin.pipe(ls)`.


## Installation

```sh
$ npm install ld-jsonstream
```


## API

### LDJSONStream([opts])
* [opts] {Object} object containing optional parameters

opts:
* maxDocLength {Number, default 16777216} maximum JSON document size in bytes
* maxDocs {Number, default infinite} maximum number of documents to receive
* maxBytes {Number, default infinite} maximum number of bytes to receive
* readableObjectMode {Boolean, default false} Sets objectMode for the readable side of
  the stream. Note: the writable side of the stream can never be in object mode. If
  you have such a case, you don't need this module.
* objectMode {Boolean, default false} alias for readableObjectMode

events:
* "data" {Object}  emits one object at a time
* "end"  stream end

### this.bytesRead
* {Number} total number of bytes read


## Tests

```sh
$ npm test
```


## License

ISC

Copyright (c) 2014, 2015, 2016, 2019 Tim Kuijsten

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
