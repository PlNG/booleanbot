BooleanBot
==========
BooleanBot is a javascript implementation of the Quine-McCluskey Algorithm with a browser-based GUI.

Be aware that while the application supports 26 variables, the [NP-hardiness](http://en.wikipedia.org/wiki/NP-hard) of the algorithm and sheer amount of operations behind the algorithm means the program can't handle more than 5-6 variables before a browser throws unresponsiveness errors.

Originally by [satchamo/booleanbot](https://github.com/satchamo/booleanbot)

The License is MIT.

TODO:

Merge parser.js and logic.js and separate from gui.js for modularity, to make available for CommonJS
