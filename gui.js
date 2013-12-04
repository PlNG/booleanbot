$(document).ready(function () {
    "use strict";
    $(".panel").hide();
    $("#home-panel").show();
    $("#back").click(function () {
        $(".panel").hide();
        $("#home-panel").show();
        return false; // prevent link from working
    });
    $("#button-expression").click(function () {
        $(".panel").hide();
        $("#expression-panel").show();
        $("#expression-panel-input").select();
        $("#expression-panel-input").focus();
    });
    $("#button-truth-table").click(function () {
        $(".panel").hide();
        $("#truth-table-panel-one").show();
        $("#truth-table-panel-one-input").select();
        $("#truth-table-panel-one-input").focus();
    });
    $("#button-min-terms").click(function () {
        $(".panel").hide();
        $("#min-terms-panel").show();
        $("#min-terms-panel-input").select();
        $("#min-terms-panel-input").focus();
    });
    $("#expression-panel-submit").click(function () {
        var min_terms, message, i, f, vars, drawer, input = $("#expression-panel-input").val();
        try {
            min_terms = MinTerms.fromExpression(input);
        } catch (e) {
            if (e instanceof InvalidTokenException) {
                message = "Syntax Error: ";
                for (i = 0; i < input.length; i++) {
                    if (i + 1 === e.position) {
                        message += "<strong class='error'>" + input[i] + "</strong>";
                    } else {
                        message += input[i];
                    }
                }
                $("#expression-panel-input-message").html(message);
                $("#expression-panel-input-message").removeClass("hide");
                return;
            }
            if (e instanceof MissingTokenException) {
                message = "Missing Token: ";
                for (i = 0; i < input.length; i++) {
                    if (i + 1 === e.position) {
                        message += "<strong class='error'>" + input[i] + "</strong>";
                    } else {
                        message += input[i];
                    }
                }
                $("#expression-panel-input-message").html(message);
                $("#expression-panel-input-message").removeClass("hide");
                return;
            }
            $("#expression-panel-input-message").html("Invalid Expression!");
            $("#expression-panel-input-message").removeClass("hide");
            return;
        }
        $("#expression-panel-input-message").addClass("hide");
        $(".panel").hide();
        f = new BooleanFunction(min_terms);
        // draw the output using the variables in the expression
        vars = SumOfProducts.removeDuplicates(input.replace(/[^a-zA-Z]/g, "").split(""));
        vars.sort();
        drawer = new BooleanFunctionOut(f, vars);
        drawer.render();
    });
    /**
     * Converts the input from a string to an array.
     * @param {string} input
     * @return {Array.<number>}
     */
    var termInputStringToArray = function (input) {
        if ($.trim(input) === "") {
            return [];
        }
        var i, sub_terms, start, end, j, terms = input.split(","),
            output = [];
        for (i = 0; i < terms.length; i++) {
            if ($.trim(terms[i]) !== "") {
                // min terms can be input as a range (e.g. 2-6)
                // if they are, we need to add all the terms in the range
                sub_terms = terms[i].split("-");
                if (sub_terms.length === 2) { // it's a range
                    start = parseInt($.trim(sub_terms[0]), 10);
                    end = parseInt($.trim(sub_terms[1]), 10);
                    for (j = start; j <= end; j++) {
                        output.push(j);
                    }
                } else { // not a range, just add the term
                    output.push(parseInt($.trim(terms[i]), 10));
                }
            }
        }
        return output;
    };
    $("#min-terms-panel-submit").click(function () {
        $(".panel").hide();
        var dont_cares, f, alpha, drawer, input = $("#min-terms-panel-input").val(),
            min_terms = termInputStringToArray(input);
        input = $("#min-terms-panel-input-two").val();
        dont_cares = termInputStringToArray(input);
        min_terms = MinTerms.fromArray(min_terms, dont_cares);
        f = new BooleanFunction(min_terms);
        alpha = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
        drawer = new BooleanFunctionOut(f, alpha.slice(0, f.getNumberOfVars()));
        drawer.render();
    });
    $("#truth-table-panel-one-submit").click(function () {
        $(".panel").hide();
        var i, v, iter, n, symbol_values, input = $("#truth-table-panel-one-input").val(),
            vars_input = input.split(","),
            table_header = $("<tr>"),
            table_body = [],
            vars = [];
        for (i = 0; i < vars_input.length; i++) {
            v = $.trim(vars_input[i]);
            if (v !== "") {
                vars.push(v);
            }
        }
        // remove old truth table
        $("#truth-table-panel-two table thead tr").remove();
        $("#truth-table-panel-two table tbody tr").remove();
        // add header
        table_header.append("<th>#</th>");
        for (i = 0; i < vars.length; i++) {
            table_header.append("<th>" + vars[i] + "</th>");
        }
        table_header.append("<th>Out</th>");
        $("#truth-table-panel-two table thead").append(table_header);
        // add table body
        iter = new TruthTableIterator(vars);
        for (n = 0; iter.hasNext(); n++) {
            if (n % 2 === 0) {
                table_body.push("<tr class='toggle-me'>");
            } else {
                table_body.push("<tr class='odd toggle-me'>");
            }
            symbol_values = iter.next();
            table_body.push("<th>" + n + "</th>");
            for (i = 0; i < vars.length; i++) {
                table_body.push("<td>");
                table_body.push(symbol_values[vars[i]]);
                table_body.push("</td>");
            }
            table_body.push("<td  id='mt" + n + "'>0</td>");
            table_body.push("</tr>");
        }
        $("#truth-table-panel-two-body").html(table_body.join(""));
        // handle the clicks
        $(".toggle-me").live("mousedown", function () {
            var $el = $(this).children("td:last"),
                val = $el.text();
            if (val === "0") {
                $el.text("1");
                $el.addClass("one");
                $el.removeClass("dont-care");
            } else {
                if (val === "1") {
                    $el.text("X");
                    $el.addClass("dont-care");
                    $el.removeClass("one");
                } else {
                    $el.text("0");
                    $el.removeClass("one");
                    $el.removeClass("dont-care");
                }
            }
            return false; // prevents the row from highlighting
        });
        $("#truth-table-panel-two").show();
    });
    $("#truth-table-panel-two-submit").click(function () {
        $(".panel").hide();
        var i, min_terms, f, drawer, alpha = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],
            ones = [],
            $ones = $("#truth-table-panel-two-body .one"),
            dont_cares = [],
            $dont_cares = $("#truth-table-panel-two-body .dont-care");
        for (i = 0; i < $ones.length; i++) {
            ones.push(parseInt($($ones[i]).attr("id").substr(2), 10));
        }
        for (i = 0; i < $dont_cares.length; i++) {
            dont_cares.push(parseInt($($dont_cares[i]).attr("id").substr(2), 10));
        }
        min_terms = MinTerms.fromArray(ones, dont_cares);
        f = new BooleanFunction(min_terms);
        drawer = new BooleanFunctionOut(f, alpha);
        drawer.render();
    });
});
/**
 * @constructor
 * @param {Object} f
 * @param {Array.<string>} vars
 */
function BooleanFunctionOut(f, vars) {
    "use strict";
    this.buildTruthTable = function () {
        // remove old truth table
        $("#truth-table-output table thead tr").remove();
        $("#truth-table-output table tbody tr").remove();
        // add header
        var i, iter, n, symbol_values, table_header = $("<tr>"),
            table_body = [];
        table_header.append("<th>#</th>");
        for (i = 0; i < vars.length; i++) {
            table_header.append("<th>" + vars[i] + "</th>");
        }
        table_header.append("<th>Out</th>");
        $("#truth-table-output table thead").append(table_header);
        // add table body
        iter = new TruthTableIterator(vars);
        for (n = 0; iter.hasNext(); n++) {
            if (n % 2 === 0) {
                table_body.push("<tr>");
            } else {
                table_body.push("<tr class='odd'>");
            }
            symbol_values = iter.next();
            table_body.push("<th>" + n + "</th>");
            for (i = 0; i < vars.length; i++) {
                table_body.push("<td>");
                table_body.push(symbol_values[vars[i]]);
                table_body.push("</td>");
            }
            table_body.push("<td>");
            table_body.push(f.isMinTerm(n) ? 1 : 0);
            table_body.push("</td>");
            table_body.push("</tr>");
        }
        document.getElementById("truth-table-output-body").innerHTML = table_body.join("");
        $("#output").show();
    };
    this.buildExpressionList = function () {
        var i, prime_imps = f.findPrimeImplicants(),
            table = PrimeImplicantTable.build(f.getMinTerms(), prime_imps),
            sum_of_prods = SumOfProducts.fromTable(table),
            solns = SumOfProducts.reduce(sum_of_prods),
            pretty = SumOfProducts.toSymbols(solns, prime_imps, vars);
        $("#expressions-output-body tr").remove();
        for (i = 0; i < pretty.length; i++) {
            $("#expressions-output-body").append("<tr><td>" + pretty[i] + "</td></tr>");
        }
        f = new BooleanFunction(MinTerms.fromExpression(pretty[0]));
    };
    this.buildMinTermList = function () {
        var i, terms = f.getMinTerms(),
            mins = [];
        for (i = 0; i < terms.length; i++) {
            mins.push(terms[i].covers[0]);
        }
        mins.sort(function (a, b) {
            return a - b;
        });
        $("#min-terms-output").text(mins.join(", "));
    };
    this.render = function () {
        this.buildExpressionList(); // this comes first!!
        this.buildTruthTable();
        this.buildMinTermList();
    };
    // trim excess variables
    vars = vars.slice(0, f.getNumberOfVars());
}
