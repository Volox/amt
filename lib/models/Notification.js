/*
 * node-amt
 * https://github.com/Volox/node-amt
 *
 * Copyright (c) 2013 Riccardo Volonterio
 * Licensed under the MIT license.
 */

/* jshint camelcase: false */
var util = require( 'util' );
var _ = require( 'underscore' );
var Base = require( './Base' );


module.exports = exports = function( amt ) {
  // Notification class
  var Notification = function( data ) {
    Base.call( this, data );
    this.checkData();

    // Data
    this.version = '2006-05-05';
    this.active = _.isUndefined( data.active )? true : data.active;
  };
  util.inherits( Notification, Base );

  Notification.prototype.baseName = 'Notification';
  Notification.prototype.mapping = {
    'destination': 'Destination',
    'transport': 'Transport',
    'events': 'EventType',
    'version': 'Version',
    'active': 'Active'
  };


  Notification.prototype.checkData = function() {
    if( !this.destination || this.destination.trim().length===0 )
      throw new Error( 'Invalid or missing destination' );

    var validTransport = [
      'Email',
      'SOAP',
      'SQS',
      'REST'
    ];
    if( !this.transport || this.transport.trim().length===0 || !_.contains( validTransport, this.transport ) )
      throw new Error( 'Invalid or missing transport' );

    var validEvents = [
      'AssignmentAccepted',
      'AssignmentAbandoned',
      'AssignmentReturned',
      'AssignmentSubmitted',
      'HITReviewable',
      'HITExpired',
      'Ping',
    ];

    if( !this.events || !_.isArray( this.events ) || _.difference( this.events, validEvents ).length>0 )
      throw new Error( 'Invalid or missing events' );
  };


  Notification.prototype.toAMTObject = function() {
    var object = Notification.super_.prototype.toAMTObject.call( this );

    // Custom assignements
    object.Notification = [ object.Notification ];

    return object;
  };


  return Notification;
};
