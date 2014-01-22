/*
 * Accrue.js
 * http://accruejs.com
 * Author: James Pederson (jpederson.com)
 * Licensed under the MIT, GPL licenses.
 */

;(function( $, window, document, undefined ){

    // let's start our plugin logic
    $.extend($.fn, {
        accrue: function( options ){

            // set our options from the defaults, overriding with the
            // parameter we pass into this function.
			options = $.extend( { calculationMethod: calculateBasic }, $.fn.accrue.options, options );

            // Iterate through all the matching elements and return
            // the jquery object to preserve chaining.
	        return this.each(function(){

                // Store a jQuery object for our element so we can use it
                // inside our other bindings.
	            var elem = $(this);

                if ( !elem.find(".form").length ) {
                    elem.append( '<div class="form"></div>' );
                }

                // Get the amount, rate(s), and term - and clean the values
                var amount = get_field( elem, options, "amount" );
                var rate = get_field( elem, options, "rate" );
                var term = get_field( elem, options, "term" );
                if ( options.mode=="compare" ) {
                    var rate_compare = get_field( elem, options, "rate_compare" );
                }

                // If we are using the default results div and it doesn't exist, create it.
                if ( elem.find(".results").length==0 ) {
                    elem.append('<div class="results"></div>');
                }


                // Set the output div as a variable so we can refer to it more easily.
                var output_elem=elem.find(".results");

                // Do our calculations based on which mode we're in.
                switch ( options.mode ) {

                    case "basic":

                        var calculation_method = calculateBasic;

                    break;

                    case "compare":

                        var calculation_method = calculateComparison;

                    break;

                    case "amortization":

                        var calculation_method = calculateAmortization;

                    break;

                }

                // Get the information about the loan.
                calculation_method( elem, options, output_elem );

                if ( options.operation=="button" ) {

                    // If we are using button operation mode and the button doesn't exist, create one.
                    if ( elem.find("button").length==0 ) {
                        elem.find(".form").append('<button class="accrue-calculate">'+options.button_label+'</button>');
                    }

                    // If the developer has chosen to bind to a button instead
                    // of operate on keyup, let's set up a click event binding
                    // that performs the calculation.
                    elem.find("button, input[type=submit]").each(function(){
                        event.preventDefault();
                        $(this).click(function(){
                            calculation_method( elem, options, output_elem );
                        });
                    });

                } else {

                    elem.find("input, select").each(function(){
                        $(this).bind( "keyup change", function(){
                            calculation_method( elem, options, output_elem );
                        });
                    });

                }

                // If the developer has chosen to bind to a button instead
                // of operate on keyup, let's set up a click event binding
                // that performs the calculation.
                elem.find("form").each(function(){
                    $(this).submit(function(){
                        event.preventDefault();
                        calculation_method( elem, options, output_elem );
                    });
                });

	        });
	    }
    });

    // DEFAULTS
    // Set up some default options for our plugin that can be overridden 
    // as needed when we actually instantiate our plugin on a form.
    $.fn.accrue.options = {
        mode: "basic",
        operation: "keyup",
        default_values: {
            amount: "$7,500",
            rate: "7%",
            rate_compare: "1.49%",
            term: "36m",
        },
        field_titles: {
            amount: "Loan Amount",
            rate: "Rate (APR)",
            rate_compare: "Comparison Rate",
            term: "Term"
        },
        button_label: "Calculate",
        field_comments: {
            amount: "",
            rate: "",
            rate_compare: "",
            term: "Format: 12m, 36m, 3y, 7y"
        },
        error_text: "Please fill in all fields.",
        callback: function ( elem, data ){}
    }


    // GET FIELD
    // A function just for grabbing the value from a particular field.
    // We need this because if the field doesn't exist, the plugin will
    // create it for them.
    var get_field = function( elem, options, name ) {

        // Check for an input with a class of the name.
        var field=( elem.find("."+name).length ? elem.find("."+name) : ( elem.find(".accrue-"+name).length ? elem.find(".accrue-"+name) : ( elem.find( "input[name~="+name+"]" ).length ? elem.find( "input[name~="+name+"]" ) : "" ) ) );
        
        if ( field.length ) {
            return field.val();
        }

        elem.find(".form").append('<div class="accrue-field-'+name+'"><p><label>'+options.field_titles[name]+':</label><input type="text" class="'+name+'" value="'+options.default_values[name]+'" />'+( options.field_comments[name].length>0 ? "<small>"+options.field_comments[name]+"</small>" : '' )+'</p></div>');
        return elem.find("."+name).val();

    }


    // CALCULATE BASIC
    var calculateBasic = function( elem, options, output_elem ){

        // get the loan information from the current values in the form.
        var loan_info = $.loanInfo({
            amount: get_field( elem, options, "amount" ),
            rate: get_field( elem, options, "rate" ),
            term: get_field( elem, options, "term" )
        });

        // if valid, output into the output_elem that was passed into this function.
        if ( loan_info!==0 ) {

            output_elem.html( '<p class="monthly-payments"><strong>Monthly Payment:</strong><br />$'+loan_info.payment_amount_formatted+'</p>'+
                '<p class="number-payments"><strong>Number of Payments:</strong><br />'+loan_info.num_payments+'</p>'+
                '<p class="total-payments"><strong>Total Payments:</strong><br />$'+loan_info.total_payments_formatted+'</p>'+
                '<p class="total-interest"><strong>Total Interest:</strong><br />$'+loan_info.total_interest_formatted+'</p>' );

        } else {

            // if the values for the loan calculation aren't valid, provide an error.
            output_elem.html( '<p class="error">'+options.error_text+'</p>' );
        }

        options.callback( elem, loan_info );
    }



    // CALCULATE COMPARE
    var calculateComparison = function( elem, options, output_elem ){
        var loan_1_info = $.loanInfo({
                amount: get_field( elem, options, "amount" ),
                rate: get_field( elem, options, "rate" ),
                term: get_field( elem, options, "term" )
            }),
            loan_2_info = $.loanInfo({
                amount: get_field( elem, options, "amount" ),
                rate: get_field( elem, options, "rate_compare" ),
                term: get_field( elem, options, "term" )
            }),
            callback_data = {
                loan_1: loan_1_info,
                loan_2: loan_2_info
            };
        if ( loan_1_info!==0 && loan_2_info!==0 ) {
            output_elem.html( '<p class="total-savings">Save $'+(loan_1_info.total_interest-loan_2_info.total_interest).toFixed(2)+' in interest!</p>' );
        } else {
            output_elem.html( '<p class="error">Please fill in all fields.</p>' );
        }

        options.callback( elem, callback_data );
    }



    // CALCULATE AMORTIZATION SCHEDULE
    var calculateAmortization = function( elem, options, output_elem ){
        var loan_info = $.loanInfo({
                amount: get_field( elem, options, "amount" ),
                rate: get_field( elem, options, "rate" ),
                term: get_field( elem, options, "term" )
            });
        if ( loan_info!==0 ) {
            var output_content = '<table class="accrue-amortization">'+
                    '<tr>'+
                    '<th class="accrue-payment-number">#</th>'+
                    '<th class="accrue-payment-amount">Payment Amt.</th>'+
                    '<th class="accrue-total-interest">Total Interest</th>'+
                    '<th class="accrue-total-payments">Total Payments</th>'+
                    '<th class="accrue-balance">Balance</th>'+
                    '</tr>',
                interest_per_payment = loan_info.payment_amount-(loan_info.original_amount/loan_info.num_payments),
                amount_from_balance = loan_info.payment_amount-interest_per_payment;
                counter_interest = 0,
                counter_payment = 0,
                counter_balance = parseInt(loan_info.original_amount);
            for ( var i=0; i<loan_info.num_payments; i++) { 
                counter_interest = counter_interest+interest_per_payment;
                counter_payment = counter_payment+loan_info.payment_amount;
                counter_balance = counter_balance-amount_from_balance;

                //
                var cell_tag = "td";
                if ( i==(loan_info.num_payments-1) ) {
                    cell_tag = "th";
                }
                output_content = output_content+ 
                    '<tr>'+
                    '<'+cell_tag+' class="accrue-payment-number">'+(i+1)+'</'+cell_tag+'>'+
                    '<'+cell_tag+' class="accrue-payment-amount">$'+loan_info.payment_amount_formatted+'</'+cell_tag+'>'+
                    '<'+cell_tag+' class="accrue-total-interest">$'+counter_interest.toFixed(2)+'</'+cell_tag+'>'+
                    '<'+cell_tag+' class="accrue-total-payments">$'+counter_payment.toFixed(2)+'</'+cell_tag+'>'+
                    '<'+cell_tag+' class="accrue-balance">$'+counter_balance.toFixed(2)+'</'+cell_tag+'>'+
                    '</tr>';
            }
            output_content = output_content+
                '</table>';
            output_elem.html( output_content );
        } else {
            output_elem.html( '<p class="error">Please fill in all fields.</p>' );
        }

        options.callback( elem, loan_info );
    }



    // BASIC LOGGING FUNCTION
    // Checks to see if the console is available before outputting
    // anything through console.log()
    var log = function( message ){
        if ( window.console ) {
            console.log( message );
        }
    }


    // GENERAL LOAN INFORMATION FUNCTION
    // This is the public function we use inside our plugin function
    // and we're exposing it here so that we can also provide generic
    // calculations that just return JSON objects that can be used
    // for custom-developed plugins.
	$.loanInfo = function( input ) {

        var amount = ( typeof( input.amount )!=="undefined" ? input.amount : 0 ).replace(/[^\d.]/ig, ''),
            rate = ( typeof( input.rate )!=="undefined" ? input.rate : 0 ).replace(/[^\d.]/ig, ''),
            term = ( typeof( input.term )!=="undefined" ? input.term : 0 );

        // parse year values passed into the term value
        if ( term.match("y") ) {
            term = parseInt( term.replace(/[^\d.]/ig, '') )*12;
        } else {
            term = parseInt( term.replace(/[^\d.]/ig, '') );
        }

        // process the input values
        var monthly_interest = rate / 100 / 12;

        // Now compute the monthly payment amount.
        var x = Math.pow(1 + monthly_interest, term),
            monthly = (amount*x*monthly_interest)/(x-1);

        // If the result is a finite number, the user's input was good and
        // we have meaningful results to display
        if ( amount*rate*term>0 ) {
            // Fill in the output fields, rounding to 2 decimal places
            return {
                original_amount: amount,
                payment_amount: monthly,
                payment_amount_formatted: monthly.toFixed(2),
                num_payments: term,
                total_payments: ( monthly * term ), 
                total_payments_formatted: ( monthly * term ).toFixed(2), 
                total_interest: ( ( monthly * term ) - amount ),
                total_interest_formatted: ( ( monthly * term ) - amount ).toFixed(2)
            };
        } else {
            // The numbers provided won't provide good data as results,
            // so we'll return 0 so it's easy to test if one of the fields
            // is empty or invalid.
            return 0;
        }
    };

})( jQuery, window, document );