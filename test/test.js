/* global describe,it, before */

// Test libraries
var fs = require( 'fs' );
var should = require( 'should' );
var AMT = require('../lib/node-amt.js');


describe( 'AMT test', function() {
  var amt, hit, hitType;

  var Notification;
  var HITType;
  var HIT;
  var Reward;

  // Init library
  before( function() {
  } );

  it( 'Should init', function( done ) {
    var config = JSON.parse( fs.readFileSync( __dirname+'/config.json', 'utf8' ) );
    
    ( function() {
      amt = new AMT( config );
      Notification = amt.Notification;
      HITType = amt.HITType;
      HIT = amt.HIT;
      Reward = amt.Reward;
    } ).should.not.throw();

    done();
  } );

  it( 'Should create an HITType', function( done ) {
    // Create the HITType
    hitType = new HITType( {
      title: 'Test',
      description: 'Test description',
      reward: new Reward( 0.01 ),
      duration: 60*1, // 1 minute
    } );

    // Register on AMT
    hitType.create( function( err, hitTypePassed ) {
      should.not.exist( err );
      should.exist( hitTypePassed );

      hitTypePassed.should.equal( hitType );
      return done();
    } );
  } );

  it( 'Should activate notification for hit type', function( done ) {

    // Create notification
    var notification = new Notification( {
      destination: 'http://volonterio.it/ping',
      transport: 'REST',
      events: [ 'AssignmentAccepted' ]
    } );

    hitType.setNotification( notification, done );
  } );

  it( 'Should create an HIT for the HITType', function( done ) {

    // Load Question
    var questionXml = fs.readFileSync( __dirname+'/HIT.xml', 'utf8' );

    // Create HIT
    hit = new HIT( {
      hitType: hitType,
      question: questionXml,
      life: 60*5 // 5 minutes
    } );

    hit.create( function ( err, hit, hitTypeId ) {
      should.not.exist( err );
      should.exist( hit );
      should.exist( hitTypeId );

      hit.should.be.an.instanceOf( HIT );
      hit.should.have.property( 'id' );
      hitTypeId.should.be.eql( hitType.id );

      return done();
    } );
  } );

  it( 'The HIT should be there', function( done ) {
    HIT.get( hit.id, done );
  } );

  it( 'The HIT should be the first in the search', function( done ) {
    var searchOptions = {
      SortDirection: 'Descending'
    };

    HIT.search( searchOptions, function ( err, hits, numResults, page, totalResults ) {
      should.not.exist( err );
      should.exist( hits );
      should.exist( numResults );
      should.exist( page );
      should.exist( totalResults );

      hits.should.be.an.instanceOf( Array );
      hits.length.should.be.above( 0 );

      page.should.be.eql( 1 );
      numResults.should.be.above( 0 );
      totalResults.should.be.above( 0 );

      should.exist( hits[ 0 ] );
      var firstHit = hits[ 0 ];
      firstHit.should.have.property( 'id', hit.id );


      return done();
    } );
  } );

  it( 'Expire the HIT', function( done ) {
    hit.expire( done );
  } );
  it( 'Dispose the HIT', function( done ) {
    hit.dispose( done );
  } );

  it( 'The HIT should be retrievable', function( done ) {
    HIT.get( hit.id, done );
  } );

  it( '.. but not appear in the search', function( done ) {
    var searchOptions = {
      SortDirection: 'Descending'
    };

    HIT.search( searchOptions, function ( err, hits, numResults, page, totalResults ) {
      should.not.exist( err );
      should.exist( hits );
      should.exist( numResults );
      should.exist( page );
      should.exist( totalResults );

      hits.should.be.an.instanceOf( Array );

      page.should.be.eql( 1 );

      if( hits[ 0 ] ) {
        var firstHit = hits[ 0 ];
        firstHit.should.have.property( 'id' );
        firstHit.id.should.not.be.eql( hit.id );
      }

      return done();
    } );
  } );
} );