/*
 * node-amt
 * https://github.com/Volox/node-amt
 *
 * Copyright (c) 2013 Riccardo Volonterio
 * Licensed under the MIT license.
 */


/* jshint camelcase: false */
var util = require( 'util' );
var Base = require( './Base' );

module.exports = exports = function( amt ) {
  
  // Reward class
  var Reward = function( data ) {
    Base.call( this, data );
    
    this.price = data;
    this.currency = this.currency || 'USD';
  };
  util.inherits( Reward, Base );

  Reward.prototype.mapping = {
    'price': 'Amount',
    'currency': 'CurrencyCode'
  };

  return Reward;
};