function TruthTableIterator(vars) {
    "use strict";
    var iterations = Math.pow(2, vars.length),
        index = 0;
    this.hasNext = function () {
        return index < iterations;
    };
    this.next = function () {
        var i, symbol_values = {},
            n = index;
        for (i = vars.length - 1; i >= 0; i--) {
            symbol_values[vars[i]] = n & 1;
            n = n >> 1;
        }
        index++;
        return symbol_values;
    };
}
function MinTerm(covers, bit_length, is_dont_care) {
    "use strict";
    var canJoin, k, n, tmp, j, that = this,
        number_of_ones = -1; // calculate this later
    this.covers = covers; // list of minterms (numbers) that this MinTerm covers (a joined MinTerm may cover multiple minterms)
    this.bits = new Array(bit_length); // the bit representation of the MinTerm ordered from lsb to msb (i.e. 7 = [001])
    this.is_dont_care = is_dont_care !== undefined ? false : is_dont_care;
    this.must_be_used = !is_dont_care; // when a pair of terms are joined, they no longer need to be used in the minimized function
    this.id = MinTerms.nextId();
    this.toString = function () {
        return this.bits.toString();
    };
    this.getNumberOfOnes = function () {
        if (number_of_ones === -1) {
            number_of_ones = 0;
            var i;
            for (i = 0; i < this.bits.length; i++) {
                if (this.bits[i] === 1) {
                    number_of_ones++;
                }
            }
        }
        return number_of_ones;
    };
    // determine if two MinTerms can be joined together (based on their bits).
    // Returns the index of the difference if the terms can be joined, otherwise -1
    canJoin = function (min_term) {
        if (that === min_term) {
            return -1;  // can't join with itself
        }
        if (that.bits.length === 1 && min_term.bits.length === 1) {
            return -1; // can't join 0 and 1
        }
        var i, a, b, index_of_diff = 0, // index where the difference occurred
            differences = 0;
        for (i = 0; i < that.bits.length; i++) {
            a = that.bits[i];
            b = min_term.bits[i];
            // the _ *must* match up
            if (a === "_" && b !== "_") {
                return -1;
            }
            if (b === "_" && a !== "_") {
                return -1;
            }
            // found a difference
            if (a !== b) {
                differences++;
                index_of_diff = i;
            }
            // we got too many differences
            if (differences > 1) {
                return -1;
            }
        }
        // if they are the same, don't join
        if (differences === 0) {
            return -1;
        }
        // alert(this.toString() + "\n" + min_term.toString());
        return index_of_diff;
    };
    this.join = function (min_term) {
        var cover, isdontcare, new_term, i, index_of_diff = canJoin(min_term);
        if (index_of_diff === -1) {
            return false;
        }
        // build a new MinTerm that covers both terms
        cover = this.covers.concat(min_term.covers);
        // its only a don't care if both the joined terms are don't cares
        isdontcare = this.is_dont_care && min_term.is_dont_care;
        new_term = new MinTerm(cover, this.bits.length, isdontcare);
        // set the bits of the new term
        for (i = 0; i < bit_length; i++) {
            new_term.bits[i] = this.bits[i];
            // mark the different bit
            if (i === index_of_diff) {
                new_term.bits[i] = "_";
            }
        }
        // flag the terms that were combined (they don't need to be used anymore)
        this.must_be_used = min_term.must_be_used = false;
        return new_term;
    };
    // determine if a minterm (m) is covered by this minterm
    this.coversMinTerm = function (m) {
        var i;
        for (i = 0; i < this.covers.length; i++) {
            if (m === this.covers[i]) {
                return true;
            }
        }
        return false;
    };
    // construct the bit array
    n = this.covers[0]; // build the bits array based on the first minterm covered
    tmp = n;
    j = 0;
    for (k = this.bits.length - 1; k >= 0; k--) {
        this.bits[j++] = tmp & 1;
        tmp = tmp >> 1;
    }
}
// MinTerm utilities
var MinTerms = {
    id: 0,
    nextId: function () {
        "use strict";
        return this.id++;
    },
    // get the number of bits necessary to store the largest min term or don't care
    getNormalizedBitLength: function (min_terms, dont_cares) {
        "use strict";
        var i, max = 1;
        for (i = 0; i < min_terms.length; i++) {
            if (min_terms[i] > max) {
                max = min_terms[i];
            }
        }
        for (i = 0; i < dont_cares.length; i++) {
            if (dont_cares[i] > max) {
                max = dont_cares[i];
            }
        }
        return Math.ceil(Math.log(max + 1) / Math.log(2));
    },
    // build a set of min terms using arrays of integers
    fromArray: function (min_terms, dont_cares) {
        "use strict";
        if (dont_cares === undefined) {
            dont_cares = [];
        }
        var i, bit_length = this.getNormalizedBitLength(min_terms, dont_cares),
            terms = [];
        for (i = 0; i < min_terms.length; i++) {
            terms.push(new MinTerm([min_terms[i]], bit_length));
        }
        for (i = 0; i < dont_cares.length; i++) {
            terms.push(new MinTerm([dont_cares[i]], bit_length, true));
        }
        return terms;
    },
    fromExpression: function (expr) {
        "use strict";
        var i, symbol_values, mins = [],
            lexer = new BooleanExpressionLexer(expr),
            vars = lexer.variables(),
            evaluator = bool(lexer),
            iter = new TruthTableIterator(vars);
        for (i = 0; iter.hasNext(); i++) {
            symbol_values = iter.next();
            if (evaluator.evaluate(symbol_values)) {
                mins.push(i);
            }
        }
        return this.fromArray(mins);
    }
};
function BooleanFunction(min_terms) {
    "use strict";
    this.findPrimeImplicants = function () {
        var groups = this.joinTerms(),
            terms = this.getRemainingTerms(groups);
        return terms;
    };
    this.joinTerms = function () {
        var i, by_ones, max_ones, j, ones, next_group, add_new_group, ones_length, search_group, a_term, k, b_term, new_term, groups = [];
        groups.push(min_terms);
        // for each group (we start off with one group, but add groups as we go...)
        for (i = 0; i < groups.length; i++) {
            // categorize the group by the number of ones in each term
            by_ones = {};
            max_ones = 0; // keep track of this so we can skip the last group
            for (j = 0; j < groups[i].length; j++) {
                ones = groups[i][j].getNumberOfOnes();
                // create list if it doesn't already exist
                if (!by_ones[ones]) {
                    by_ones[ones] = [];
                }
                by_ones[ones].push(groups[i][j]);
                if (ones > max_ones) {
                    max_ones = ones;
                }
            }
            // build the next group using a hash table to avoid duplicate terms
            next_group = {};
            add_new_group = false;
            for (ones_length in by_ones) {
                if (by_ones.hasOwnProperty(ones_length)) {
                    ones_length = parseInt(ones_length, 10); // this saves us from stupid bugs
                    search_group = by_ones[ones_length + 1];
                    // skip the max group and the group with no group with 1 more 1
                    if (ones_length !== max_ones && search_group) {
                        // for each term in the group
                        for (j = 0; j < by_ones[ones_length].length; j++) {
                            a_term = by_ones[ones_length][j];
                            // try to find a match if the search group
                            for (k = 0; k < search_group.length; k++) {
                                b_term = search_group[k];
                                new_term = a_term.join(b_term);
                                if (new_term) {
                                    // create the joined term and add it to the next group
                                    next_group[new_term.toString()] = new_term;
                                    add_new_group = true;
                                }
                            }
                        }
                    }
                }
            }
            // add the new group
            if (add_new_group) {
                groups.push([]);
                for (k in next_group) {
                    if (next_group.hasOwnProperty(k)) {
                        groups[i + 1].push(next_group[k]);
                    }
                }
            }
        }
        return groups;
    };
    this.getRemainingTerms = function (groups) {
        var i, j, term, k, remaining_terms = {}, // using a hash table to eliminate duplicates
            terms = [];
        // go through each group
        for (i = 0; i < groups.length; i++) {
            // go through each term in the group
            for (j = 0; j < groups[i].length; j++) {
                term = groups[i][j];
                // is it essential?
                if (!term.is_dont_care && term.must_be_used) {
                    remaining_terms[term.toString()] = term;
                }
            }
        }
        // we have all the essential terms (in a hash table). Convert it to an array
        for (k in remaining_terms) {
            if (remaining_terms.hasOwnProperty(k)) {
                terms.push(remaining_terms[k]);
                // alert(essential_terms[k].bits.toString());
            }
        }
        return terms;
    };
    this.getMinTerms = function () {
        return min_terms;
    };
    this.isMinTerm = function (n) {
        var i;
        for (i = 0; i < min_terms.length; i++) {
            if (min_terms[i].covers[0] === n) {
                return true;
            }
        }
        return false;
    };
    this.getNumberOfVars = function () {
        var i, max = 1;
        for (i = 0; i < min_terms.length; i++) {
            if (min_terms[i].covers[0] > max) {
                max = min_terms[i].covers[0];
            }
        }
        return Math.log(max) / Math.log(2) + 1;
    };
}
var PrimeImplicantTable = {
    // build a table that lists which MinTerm object covers the min_terms (passed in when this object was created)
    // For example, table would look like
    // {1 : [MinTerm obj, MinTerm obj],
    //  4 : [MinTerm obj],
    //  7 : [MinTerm obj, MinTerm obj, MinTerm obj}
    build: function (min_terms, primes) {
        "use strict";
        var i, n, j, table = {};
        // loop through each min term number
        for (i = 0; i < min_terms.length; i++) {
            // ignore don't cares
            if (!min_terms[i].is_dont_care) {
                n = min_terms[i].covers[0];
                table[n] = []; // create the list for the covering MinTerm objects
                // find the MinTerm objects that cover this min term, and push it onto this min term's list
                for (j = 0; j < primes.length; j++) {
                    if (primes[j].coversMinTerm(n)) {
                        table[n].push(primes[j]);
                        // alert(table[min_terms[i].covers[0]]);
                    }
                }
            }
        }
        return table;
    }
};
// Represented A + BC = [A, [B,C]
var SumOfProducts = {
    distribute: function (x, y) {
        "use strict";
        var i, j, tmp, z = [];
        for (i = 0; i < x.length; i++) {
            for (j = 0; j < y.length; j++) {
                tmp = this.removeDuplicates(x[i].concat(y[j]));
                z.push(tmp);
            }
        }
        z = this.applyIdentity(z);
        return z;
        // alert(this.prettyify(z));
        // alert(z.join("+"));
    },
    removeDuplicates: function (a) {
        "use strict";
        var i, k, b = {},
            tmp = [];
        for (i = 0; i < a.length; i++) {
            b[a[i]] = true;
        }
        for (k in b) {
            if (b.hasOwnProperty(k)) {
                tmp.push(k);
            }
        }
        return tmp;
    },
    // apply the identity x = x + xy
    applyIdentity: function (terms) {
        "use strict";
        var i, j, new_terms = [];
        for (i = 0; i < terms.length; i++) {
            for (j = 0; j < terms.length; j++) {
                if (terms[j] !== null && (terms[i] !== null && (i !== j && this.arrayContainsArray(terms[i], terms[j])))) {
                    if (terms[j].length > terms[i].length) {
                        terms[j] = null;
                    } else {
                        terms[i] = terms[j];
                        terms[j] = null;
                    }
                }
            }
        }
        for (i = 0; i < terms.length; i++) {
            if (terms[i] !== null) {
                new_terms.push(terms[i]);
            }
        }
        return new_terms;
    },
    inArray: function (a, c) {
        "use strict";
        var i;
        for (i = 0; i < a.length; i++) {
            if (a[i] === c) {
                return true;
            }
        }
        return false;
    },
    arrayContainsArray: function (a, b) {
        "use strict";
        var i, tmp, len = Math.min(a.length, b.length);
        if (a.length < b.length) {
            tmp = a;
            a = b;
            b = tmp;
        }
        for (i = 0; i < len; i++) {
            if (!this.inArray(a, b[i])) {
                return false;
            }
        }
        return true;
    },
    fromTable: function (table) {
        "use strict";
        var k, tuple, i, terms = [];
        for (k in table) {
            if (table.hasOwnProperty(k)) {
                tuple = [];
                for (i = 0; i < table[k].length; i++) {
                    tuple.push([table[k][i].id]);
                }
                terms.push(tuple);
            }
        }
        return terms;
    },
    reduce: function (set) {
        "use strict";
        if (set.length === 0) {
            return [];
        }
        if (set.length === 1) {
            return this.applyIdentity(set[0]);
        }
        var i, dis = this.distribute(set[0], set[1]);
        for (i = 2; i < set.length; i++) {
            dis = this.distribute(dis, set[i]);
        }
        return dis;
    },
    toSymbols: function (solns, primes, letters) {
        "use strict";
        if (solns.length === 0) {
            return [0]; // contradiction
        }
        // first build a lookup table
        var i, term, clause, j, bits, letters_offset, k, primes_lookup = {},
            list = [];
        for (i = 0; i < primes.length; i++) {
            primes_lookup[primes[i].id] = primes[i];
        }
        // loop through every solution
        for (i = 0; i < solns.length; i++) {
            clause = [];
            // loop through every MinTerm in this particular clause, map the bit pattern to letters, and join it with a "+"
            for (j = 0; j < solns[i].length; j++) {
                term = [];
                bits = primes_lookup[solns[i][j]].bits;
                letters_offset = bits.length - 1;
                for (k = bits.length - 1; k >= 0; k--) {
                    if (bits[k] === 0) {
                        term.push(letters[letters_offset - k] + "'");
                    } else {
                        if (bits[k] === 1) {
                            term.push(letters[letters_offset - k]);
                        }
                    }
                }
                clause.push(term.join(""));
            }
            list.push(clause.join("+"));
        }
        // alert(tmp.join("\n\n"));
        if (list.length === 1 && list[0] === "") {
            list[0] = "1"; // it's a tautology
        }
        return list;
    }
};
