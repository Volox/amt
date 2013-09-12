/*
 * node-amt
 * https://github.com/Volox/node-amt
 *
 * Copyright (c) 2013 Riccardo Volonterio
 * Licensed under the MIT license.
 */

var _ = require( 'underscore' );

// Base class for models
var Base = function( data ) {
  if( _.isObject( data ) )
    this.fromAMTObject( data );
};

// Methods
Base.prototype.fromAMTObject = function( object ) {
  var inveseMapping = _.invert( this.mapping );
  var _this = this;

  _.each( object, function( value, key ) {
    if( inveseMapping[ key ] ) {
      _this[ inveseMapping[ key ] ] = value;
    } else {
      _this[ key ] = value;
    }
  } );
};
Base.prototype.toAMTObject = function() {
  var object = {};
  var _this = this;
  
  var baseObject = object;
  if( this.baseName ) {
    object[ this.baseName ] = {};
    baseObject = object[ this.baseName ];
  }
  _.each( this.mapping, function( amtName, localName ) {
    if( _this[ localName ] )
      baseObject[ amtName ] = _this[ localName ];
  } );

  return object;
};

Base.prototype.encode = encodeURI;
Base.prototype.baseName = false;
//Base.prototype.encode = encodeURIComponent;

Base.prototype.toXMLParameter = function() {
  var amtObject = this.toAMTObject();
  var lines = [];
  var _this = this;

  function awsFormat( node, name, path ) {
    path = path || '';
    // Exit condition
    if( _.isNumber( node ) || _.isString( node ) || _.isBoolean( node ) ) {
      var line = path+name+'='+_this.encode( node );
      lines.push( line );
      return;
    } else if( _.isArray( node ) && !_.isObject( node[ 0 ] ) ) {
      _.each( node, function ( value, index ) {
        var line = path+name+'.'+(index+1)+'='+_this.encode( value );
        lines.push( line );
      } );
    } else {
      // Keep track of child index
      var childIndexMap = {};

      _.each( node, function ( childNode, childName ) {
        childIndexMap[ childName ] = childIndexMap[ childName ] || 0;
        childIndexMap[ childName ] += 1;
        var index = childIndexMap[ childName ];

        if( name && path==='' )
          path += name+'.'+index+'.';
        awsFormat( childNode, childName, path );
      } );
      return;
    }
  }

  awsFormat( amtObject );
  
  return lines.join( '&' );
};


module.exports = exports = Base;
