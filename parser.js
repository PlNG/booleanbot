/**
 * Token generator:
 * @namespace {Token} Object
 * @property {Object} isWhitespace
 * @property {Object} isVariable
 * @property {Object} isOperator
 */
var Token = {
    /**
     * @param {string} c
     * @return {boolean}
     */
    isWhitespace: function (c) {
        "use strict";
        switch (c) {
        case " ":
        case "\n":
        case "\t":
        case "\r":
        case "\f":
        case "\v":
        case "\x00":
            return true;
        default:
            return false;
        }
    },
    /**
     * @param {string|undefined} c
     * @return {boolean}
     */
    isVariable: function (c) {
        "use strict";
        return ((c >= "A" && c <= "Z") || (c >= "a" && c <= "z"));
    },
    /**
     * @param {string} c
     * @return {boolean}
     */
    isOperator: function (c) {
        "use strict";
        switch (c) {
        case "+":
        case "^":
        case "'":
        case "(":
        case ")":
            return true;
        default:
            return false;
        }
    }
}, bool, boolTerm, boolFactor, boolAtom; // Because of circular dependencies, it was necessary to convert these to assignment form in order to satisfy JSLint.
/**
 * @constructor
 * @param {Object} left
 * @param {Object} right
 */
function AndExpression(left, right) {
    "use strict";
    /**
     * @param {Object} symbol_values
     * @return {boolean}
     */
    this.evaluate = function (symbol_values) {
        return left.evaluate(symbol_values) && right.evaluate(symbol_values);
    };
}
/**
 * This function is unused in minterm only input, for expression use only?
 * @constructor
 * @param {Object} left
 * @param {Object} right
 */
function XorExpression(left, right) {
    "use strict";
    /**
     * @param {Object} symbol_values
     * @return {boolean}
     */
    this.evaluate = function (symbol_values) {
        var p = left.evaluate(symbol_values),
            q = right.evaluate(symbol_values);
        return ((p && !q) || (!p && q));
    };
}
/**
 * @constructor
 * @param {Object} left
 * @param {Object} right
 */
function OrExpression(left, right) {
    "use strict";
    /**
     * @param {Object} symbol_values
     * @return {boolean}
     */
    this.evaluate = function (symbol_values) {
        return left.evaluate(symbol_values) || right.evaluate(symbol_values);
    };
}
/**
 * @constructor
 * @param {string} symbol
 */
function VariableExpression(symbol) {
    "use strict";
    /**
     * @param {Object} symbol_values
     * @return {boolean}
     */
    this.evaluate = function (symbol_values) {
        return !!symbol_values[symbol];
    };
}
/**
 * @constructor
 * @param {Object} unary
 */
function NotExpression(unary) {
    "use strict";
    /**
     * @param {Object} symbol_values
     * @return {boolean}
     */
    this.evaluate = function (symbol_values) {
        return !unary.evaluate(symbol_values);
    };
}
/*
 * Grammar:
 * bool -> bool_term {+ bool_term}
 * bool_term -> bool_factor {^ bool_factor}
 * bool_factor -> bool_atom {bool_atom}
 * bool_atom -> bool_atom' | (bool) | var
 */
/**
 * @param {Object} lexer
 * @return {Object}
 */
bool = function (lexer) {
    "use strict";
    var e = boolTerm(lexer);
    while (true) {
        if (lexer.token() === "+") {
            lexer.match("+");
            e = new OrExpression(e, boolTerm(lexer));
        } else {
            break;
        }
    }
    return e;
};
/**
 * @param {Object} lexer
 * @return {Object}
 */
boolTerm = function (lexer) {
    "use strict";
    var e = boolFactor(lexer);
    while (true) {
        if (lexer.token() === "^") {
            lexer.match("^");
            e = new XorExpression(e, boolFactor(lexer));
        } else {
            break;
        }
    }
    return e;
};
/**
 * @param {Object} lexer
 * @return {Object}
 */
boolFactor = function (lexer) {
    "use strict";
    var e = boolAtom(lexer);
    while (true) {
        // ANDs can ride up against another variable or a (
        if (Token.isVariable(lexer.token()) || lexer.token() === "(") {
            e = new AndExpression(e, boolAtom(lexer));
        } else {
            break;
        }
    }
    return e;
};
/**
 * @param {Object} lexer
 * @return {Object}
 */
boolAtom = function (lexer) {
    "use strict";
    var e = null;
    if (Token.isVariable(lexer.token())) {
        e = new VariableExpression(lexer.token());
        lexer.match(lexer.token());
    } else {
        if (lexer.token() === "(") {
            lexer.match("(");
            e = bool(lexer);
            lexer.match(")");
        } else {
            lexer.match("  "); // won't match anything, throws missing token exception
        }
    }
    // look for negative;
    if (lexer.token() === "'") {
        e = new NotExpression(e);
        lexer.match("'");
    }
    return e;
};
/**
 * @constructor
 * @param {string} tok
 * @param {number} position
 */
function InvalidTokenException(tok, position) {
    "use strict";
    this.position = position;
    this.tok = tok;
    /**
     * @return {string}
     */
    this.toString = function () {
        return "Invalid token " + this.tok + " at position " + this.position;
    };
}
/**
 * @constructor
 * @param {string|undefined} given
 * @param {string} expected
 * @param {number} position
 */
function MissingTokenException(given, expected, position) {
    "use strict";
    this.position = position;
    this.given = given;
    this.expected = expected;
    /**
     * @return {string}
     */
    this.toString = function () {
        return "Missing token. Expected " + this.expected + " at position " + this.position;
    };
}
/**
 * Unused
 * @constructor
 */
function InvalidExpressionException() {
    "use strict";
    /**
     * @return {string}
     */
    this.toString = function () {
        return "Invalid Expression";
    };
}
/**
 * @constructor
 * @param {string} expr
 */
function BooleanExpressionLexer(expr) {
    "use strict";
    var index = 0,
        tokens = [],
        parse = function () {
            // find all the tokens and push them on the stack
            var i, tok;
            for (i = 0; i < expr.length; i++) {
                tok = expr[i];
                if (!Token.isWhitespace(tok)) {
                    if (Token.isVariable(tok) || Token.isOperator(tok)) {
                        tokens.push(tok);
                    } else {
                        throw new InvalidTokenException(tok, i + 1);
                    }
                }
            }
        };
    /**
     * gets the next token on the stack
     * @return {string}
     */
    this.nextToken = function () {
        return tokens[index++];
    };
    /**
     * gets the current token
     * @return {string|undefined}
     */
    this.token = function () {
        return tokens[index];
    };
    /**
     * verifies that the current token matches the specified token, and moves to the next token
     * @param {string} c
     */
    this.match = function (c) {
        if (c !== this.token()) {
            throw new MissingTokenException(this.token(), c, index);
        }
        this.nextToken();
    };
    /**
     * @return {string}
     */
    this.toString = function () {
        return tokens.toString();
    };
    /**
     * gets a sorted list of all the variables in the expression
     * @return {Array.<string>}
     */
    this.variables = function () {
        // use a hash table to eliminate duplicate vars
        var i, k, vars = {},
            vars_array = [];
        for (i = 0; i < tokens.length; i++) {
            if (Token.isVariable(tokens[i])) {
                vars[tokens[i]] = tokens[i];
            }
        }
        // now load the variables into an array
        for (k in vars) {
            if (vars.hasOwnProperty(k)) {
                vars_array.push(vars[k]);
            }
        }
        vars_array.sort();
        return vars_array;
    };
    parse();
}
