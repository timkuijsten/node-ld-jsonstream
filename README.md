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
* maxBytes {Number, default infinite} maximum number of bytes to receive
* debug {Boolean, default false} whether to do extra console logging or not
* hide {Boolean, default false} whether to suppress errors or not (used in tests)

Read a binary stream that contains new line separated JSON objects and emit each
as a JavaScript object.


## Tests

    $ mocha test


## License

MIT

Copyright (c) 2014 Tim Kuijsten

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
