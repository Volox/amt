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
  var Reward = amt.Reward;

  // HITType class
  var HITType = function( data ) {
    Base.call( this, data );
    this.checkData();
  };
  util.inherits( HITType, Base );

  HITType.prototype.mapping = {
    'title': 'Title',
    'description': 'Description',

    'reward': 'Reward',
    'duration': 'AssignmentDurationInSeconds',
  };
  HITType.prototype.checkData = function() {
    if( !this.title || this.title.trim().length===0 )
      throw new Error( 'Invalid or missing title' );

    if( !this.description || this.description.trim().length===0 )
      throw new Error( 'Invalid or missing description' );

    if( !this.reward && !( this.reward instanceof Reward ) )
      throw new Error( 'Invalid or missing reward' );

    if( !this.duration )
      throw new Error( 'Invalid or missing duration' );
  };


  HITType.prototype.create = function( callback ) {
    var _this = this;

    amt.createHITType( this, function( err, id ) {
      if( err ) return callback( err );

      _this.id = id;
      return callback( null, _this );
    } );
  };

  HITType.prototype.setNotification = function( notification, callback ) {
    if( this.id )
      return amt.setNotification( this.id, notification, callback );
    else
      return callback( new Error( 'HITType not registered to AMT' ) );
  };

  return HITType;
};