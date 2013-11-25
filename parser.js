/* Grammar
bool -> bool_term {+ bool_term}
bool_term -> bool_factor {^ bool_factor}
bool_factor -> bool_atom {bool_atom}
bool_atom -> bool_atom' | (bool) | var
*/
var Token = {
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
        }
        return false;
    },
    isVariable: function (c) {
        "use strict";
        return ((c >= "A" && c <= "Z") || (c >= "a" && c <= "z"));
    },
    isOperator: function (c) {
        "use strict";
        switch (c) {
        case "+":
        case "^":
        case "'":
        case "(":
        case ")":
            return true;
        }
        return false;
    }
}, bool, boolTerm, boolFactor, boolAtom; // Because of circular dependencies, it was necessary to convert these to assignment form in order to satisfy JSLint.
function AndExpression(left, right) {
    "use strict";
    this.evaluate = function (symbol_values) {
        return left.evaluate(symbol_values) && right.evaluate(symbol_values);
    };
}
function XorExpression(left, right) {
    "use strict";
    this.evaluate = function (symbol_values) {
        var p = left.evaluate(symbol_values),
            q = right.evaluate(symbol_values);
        return ((p && !q) || (!p && q));
    };
}
function OrExpression(left, right) {
    "use strict";
    this.evaluate = function (symbol_values) {
        return left.evaluate(symbol_values) || right.evaluate(symbol_values);
    };
}
function VariableExpression(symbol) {
    "use strict";
    this.evaluate = function (symbol_values) {
        return !!symbol_values[symbol];
    };
}
function NotExpression(unary) {
    "use strict";
    this.evaluate = function (symbol_values) {
        return !unary.evaluate(symbol_values);
    };
}
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
function InvalidTokenException(tok, position) {
    "use strict";
    this.position = position;
    this.tok = tok;
    this.toString = function () {
        return "Invalid token " + this.tok + " at position " + this.position;
    };
}
function MissingTokenException(given, expected, position) {
    "use strict";
    this.position = position;
    this.given = given;
    this.expected = expected;
    this.toString = function () {
        return "Missing token. Expected " + this.expected + " at position " + this.position;
    };
}
function InvalidExpressionException() {
    "use strict";
    this.toString = function () {
        return "Invalid Expression";
    };
}
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
    // get the next token on the stack
    this.nextToken = function () {
        return tokens[index++];
    };
    // get the current token
    this.token = function () {
        return tokens[index];
    };
    // verify the current token matches the specified token, and move to the next token
    this.match = function (c) {
        if (c !== this.token()) {
            throw new MissingTokenException(this.token(), c, index);
        }
        this.nextToken();
    };
    this.toString = function () {
        return tokens.toString();
    };
    // get a sorted list of all the variables in the expression
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
