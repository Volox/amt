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
  var Assignment = amt.Assignment;
  var Reward = amt.Reward;

  // HIT class
  var HIT = function( data ) {
    Base.call( this, data );
    this.checkData();

    if( !this.hitTypeId && this.hitType )
      this.hitTypeId = this.hitType.id;
  };
  util.inherits( HIT, Base );

  // Overrides
  HIT.prototype.mapping = {
    'id': 'HITId',
    'title': 'Title',
    'description': 'Description',
    'question': 'Question',
    'status': 'HITStatus',

    'hitTypeId': 'HITTypeId',
    'hitLayoutId': 'HITLayoutId',
    
    'reward': 'Reward',
    'duration': 'AssignmentDurationInSeconds',
    'life': 'LifetimeInSeconds'
  };
  HIT.prototype.checkData = function() {
    // Check if hitLayoutId or question is present
    if( !this.question && !this.hitLayoutId )
      throw new Error( 'Either a question parameter or a hitLayoutId parameter must be provided.' );
    
    // If hitType is not specified
    if( !this.hitTypeId && !this.hitType ) {
      if( !this.title || this.title.trim().length===0 )
        throw new Error( 'Invalid or missing title' );

      if( !this.description || this.description.trim().length===0 )
        throw new Error( 'Invalid or missing description' );

      if( !this.reward && !( this.reward instanceof Reward ) )
        throw new Error( 'Invalid or missing reward' );

      if( !this.duration )
        throw new Error( 'Invalid or missing duration' );
    }

    if( this.hitType && !this.hitType.id )
      throw new Error( 'Unable to associate a HIT to an unregistered HITType, missing id parameter.' );
  };
  HIT.prototype.fromAMTObject = function( object ) {
    HIT.super_.prototype.fromAMTObject.call( this, object );

    this.reward = new Reward( this.reward );
  };
  HIT.prototype.toAMTObject = function() {
    var object = HIT.super_.prototype.toAMTObject.call( this );

    // Custom assignements
    if( this.reward instanceof Reward )
      object.Reward = this.reward.toAMTObject();

    return object;
  };


  // Methods
  HIT.prototype.create = function( callback ) {
    var _this = this;

    // Check HIT life
    if( !this.life )
      throw new Error( 'Invalid or missing life (muhahahha)' );

    amt.createHIT( this, function( err, id, hitTypeId ) {
      if( err ) return callback( err );

      _this.id = id;
      return callback( null, _this, hitTypeId );
    } );
  };
  HIT.prototype.disable = function( callback ) {
    return amt.disableHIT( this.id, callback );
  };
  HIT.prototype.dispose = function( callback ) {
    return amt.disposeHIT( this.id, callback );
  };
  HIT.prototype.expire = function( callback ) {
    return amt.expireHIT( this.id, callback );
  };
  HIT.prototype.getAssignments = function( params, callback ) {
    amt.getAssignmentsForHit( params, function( err, assignmentObjects, numResults, pageNumber, totalNumResults ) {
      if( err ) return callback( err );

      var assignments = _.map( assignmentObjects, function( assignmentObj ) {
        return new Assignment( assignmentObj );
      } );

      return callback( null, assignments, numResults, pageNumber, totalNumResults );
    } );
  };



  // Static methods
  HIT.get = function( id, callback ) {
    amt.getHIT( id, function( err, hitObj ) {
      if( err ) return callback( err );

      var hit = new HIT( hitObj );
      return callback( null, hit );
    } );
  };

  HIT.search = function( params, callback ) {
    amt.searchHITs( params, function( err, hitObjects, numResults, pageNumber, totalNumResults ) {
      if( err ) return callback( err );

      var hits = _.map( hitObjects, function( hitObj ) {
        return new HIT( hitObj );
      } );

      return callback( null, hits, numResults, pageNumber, totalNumResults );
    } );
  };


  return HIT;
};
