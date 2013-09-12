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
  var HIT = amt.HIT;

  // Assignment class
  var Assignment = function( data ) {
    Base.call( this, data );
  };
  util.inherits( Assignment, Base );

  Assignment.prototype.mapping = {
    'id': 'AssignmentId',
    'life': 'LifetimeInSeconds'
  };
  Assignment.prototype.approve = function( message, callback ) {
    return amt.approveAssignment( this.id, message, callback );
  };
  Assignment.prototype.reject = function( message, callback ) {
    return amt.rejectAssignment( this.id, message, callback );
  };
  Assignment.prototype.approveRejected = function( message, callback ) {
    return amt.approveRejectedAssignment( this.id, message, callback );
  };

  
  // Static methods
  Assignment.get = function( id, callback ) {
    amt.getAssignment( id, function( err, assignmentObj, hitObj ) {
      if( err ) return callback( err );

      var assignment = new Assignment( assignmentObj );
      var hit = new HIT( hitObj );
      return callback( null, assignment, hit );
    } );
  };

  return Assignment;
};
