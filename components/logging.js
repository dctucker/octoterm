const util = require('util')
const fs = require('fs')

// convenience methods for getting stack information
Object.defineProperty(global, '__stack', {
get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__line', {
get: function() {
        return __stack[1].getLineNumber();
    }
});

Object.defineProperty(global, '__function', {
get: function() {
        return __stack[1].getFunctionName();
    }
});

// console.log always writes to debug.log
const log_file = fs.createWriteStream(__dirname + "/../debug.log", {flags:'w'})
console.log = (d) => {
	log_file.write(util.format(d) + "\n")
}
