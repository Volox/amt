/*
 * node-amt
 * https://github.com/Volox/node-amt
 *
 * Copyright (c) 2013 Riccardo Volonterio
 * Licensed under the MIT license.
 */

var _ = require( 'underscore' );
var crypto = require( 'crypto' );
var request = require( 'request' );
var xml2js = require( 'xml2js' );
var async = require( 'async' );

var Base = require( './models/Base' );

var AMT = function AMTConstructor( config ) {
  // Sandox or Mturk
  this.url = 'https://mechanicalturk.sandbox.amazonaws.com';
  if( config.sandbox===false )
    this.url = 'https://mechanicalturk.amazonaws.com/';

  // Default version
  this.version = config.version || '2012-03-25';

  // Key and secret
  this.key = config.key;
  if( this.key.trim().length===0 )
    throw new Error( 'The AWS key is not valid' );

  this.secret = config.secret;
  if( this.secret.trim().length===0 )
    throw new Error( 'The AWS secret key is not valid' );


  // Load models
  this.Notification = require( './models/Notification' )( this );
  this.Assignment = require( './models/Assignment' )( this );
  this.HITType = require( './models/HITType' )( this );
  this.Reward = require( './models/Reward' )( this );
  this.HIT = require( './models/HIT' )( this );
};

AMT.prototype.sign = function( service, operation, timestamp ) {
  var hmac = crypto.createHmac( 'sha1', this.secret );
  hmac.update( service + operation + timestamp );
  return hmac.digest( 'base64' );
};
AMT.prototype._checkResponse = function( operation, json, callback ) {
  var response = json[ operation+'Response' ] || json.Response;
  
  if( !response )
    return callback( new Error( 'Malformed response' ) );
  
  // Try to find the Request Node
  var request = response.Request;
  if( !request ) {
    request = _.find( response, function( node ) {
      return node.Request;
    } );
    request = request? request.Request : undefined;
  }

  // Check errors
  var errors = [];
  // Generic errors
  if( response.Errors && response.Errors.Error )
    errors.push( response.Errors.Error );
  // Request Error
  if( request && request.IsValid && request.IsValid.toLowerCase()==='false' ) {
    if( request.Errors && request.Errors.Error )
      errors.push( request.Errors.Error );
  }

  // Send errors
  if( errors.length>0 ) {
    errors = _.map( errors, function( error ) {
      return error.Code + ': ' + error.Message;
    } );
    return callback( errors );
  }

  if( !request && !errors )
    return callback( new Error( 'Cannot find a Request node, unable to check if the response is valid' ) );

  if( response[ operation+'Result' ] )
    response = response[ operation+'Result' ];

  response = _.omit( response, 'OperationRequest', 'Request' );

  return callback( null, response );
};
AMT.prototype._parseResponse = function _parseResponse( xml, callback  ) {
  if( !_.isString( xml ) )
    return callback( new Error( 'The xml must be a string' ) );

  return this._parse( xml, callback );
};

AMT.prototype._parse = function( xml, callback ) {
  if( !_.isString( xml ) )
    return callback( new Error( 'The xml must be a string' ) );

  // Parser options
  var parserOptions = {
    explicitArray: false,
    ignoreAttrs: true,
    explicitChildren: false,
    strict: true
  };
  var parser = new xml2js.Parser( parserOptions );

  return parser.parseString( xml, callback );
};
AMT.prototype.doRequest = function doRequest( options, callback ) {
  var method = options.method;
  var operation = options.operation;
  var params = options.params;
  var data = options.data;
  var rootElement = options.rootElement;

  // Check method
  method = method.toUpperCase() || 'GET';
  if( method!=='GET' && method!=='POST' )
    return callback( new Error( 'Invalid method: '+method ) );
  
  // Check operation
  if( operation.trim().length===0 )
    return callback( new Error( 'Invalid operation: '+operation ) );

  // Check data
  if( data && !(data instanceof Base ) )
    return callback( new Error( 'Invalid data payload' ) );

  var timestamp = new Date().toISOString();
  var service = 'AWSMechanicalTurkRequester';
  var signature = this.sign( service, operation, timestamp );

  var qs = {
    Service: service,
    Operation: operation,
    AWSAccessKeyId: this.key,
    Version: this.version,
    Signature: signature,
    Timestamp: timestamp
  };
  var reqOptions = {
    url: this.url,
    method: method,
    qs: qs
  };
  
  reqOptions.qs = _.defaults( qs, params );

  if( method==='POST' && data ) {
    reqOptions.body = data.toXMLParameter();
    reqOptions.headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
  } else if( method==='GET' && data ) {
    reqOptions.qs = _.defaults( reqOptions.qs, data.toAMTObject() );
  }

  // Stick to AMT format
  _.each( reqOptions.qs, function( obj, name ) {
    if( _.isArray( obj ) ) {
      _.each( obj, function( value, i ) {
        reqOptions.qs[ name+'.'+(i+1) ] = value;
      } );
      delete reqOptions.qs[ name ];
    }
  } );

  var makeRequest = function( cb ) {
    return request( reqOptions, function( err, req, xml ) {
      if( err ) return cb( err );

      return cb( null, xml );
    } );
  };
  var parseResponse = _.bind( this._parseResponse, this );
  var checkResponse = _.bind( this._checkResponse, this, operation );
  var getRootElement = function( json, callback ) {
    var element = json;
    if( rootElement && rootElement.length>0 && element[ rootElement ] )
      element = element[ rootElement ];
    
    return callback( null, element );
  };

  var actions = [
    makeRequest,
    parseResponse,
    checkResponse,
    getRootElement
  ];

  return async.waterfall( actions, callback );
};

// AMT operations

// HIT type
AMT.prototype.createHITType = function( hitType, callback ) {
  return this.doRequest( {
    method: 'POST',
    operation: 'RegisterHITType',
    data: hitType,
    rootElement: 'HITTypeId'
  }, callback );
};

// HIT
AMT.prototype.createHIT = function( hit, callback ) {
  return this.doRequest( {
    method: 'POST',
    operation: 'CreateHIT',
    data: hit,
    
  }, function( err, data ) {
    if( err ) return callback( err );

    var hit = data.HIT;

    return callback( null, hit.HITId, hit.HITTypeId );
  } );
};
AMT.prototype.getHIT = function( hitId, callback ) {
  return this.doRequest( {
    method: 'GET',
    operation: 'GetHIT',
    params: {
      HITId: hitId,
      ResponseGroup: ['Minimal','HITDetail','HITQuestion','HITAssignmentSummary']
    },
    rootElement: 'HIT'
  }, callback );
};
AMT.prototype.disableHIT = function( hitId, callback ) {
  return this.doRequest( {
    method: 'GET',
    operation: 'DisableHIT',
    params: {
      HITId: hitId
    }
  }, callback );
};
AMT.prototype.disposeHIT = function( hitId, callback ) {
  return this.doRequest( {
    method: 'GET',
    operation: 'DisposeHIT',
    params: {
      HITId: hitId
    }
  }, callback );
};
AMT.prototype.ExtendHIT = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.expireHIT = function( hitId, callback ) {
  return this.doRequest( {
    method: 'GET',
    operation: 'ForceExpireHIT',
    params: {
      HITId: hitId
    }
  }, callback );
};
AMT.prototype.SetHITAsReviewing = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetReviewableHITs = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetReviewResultsForHIT = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.searchHITs = function( params, callback ) {
  return this.doRequest( {
    method: 'GET',
    operation: 'SearchHITs',
    params: _.defaults( {
      ResponseGroup: ['Minimal','HITDetail','HITQuestion','HITAssignmentSummary']
    }, params )
  }, function( err, data ) {
    if( err ) return callback( err );

    var numResults = parseInt( data.NumResults, 10 );
    var pageNumber = parseInt( data.PageNumber, 10 );
    var totalNumResults = parseInt( data.TotalNumResults, 10 );
    var hits = data.HIT || [];
    if( !_.isArray( hits ) )
      hits = [ hits ];
    return callback( null, hits, numResults, pageNumber, totalNumResults );
  } );
};

// Assignment
AMT.prototype.approveAssignment = function( assignmentId, message, callback ) {
  // In case of 2 parameter the message is skipped
  if( arguments.length===2 ) {
    callback = message;
    message = undefined;
  }

  return this.doRequest( {
    method: 'GET',
    operation: 'ApproveAssignment',
    params: {
      AssignmentId: assignmentId,
      RequesterFeedback: message
    }
  }, callback );
};
AMT.prototype.rejectAssignment = function( assignmentId, message, callback ) {
  // In case of 2 parameter the message is skipped
  if( arguments.length===2 ) {
    callback = message;
    message = undefined;
  }

  return this.doRequest( {
    method: 'GET',
    operation: 'RejectAssignment',
    params: {
      AssignmentId: assignmentId,
      RequesterFeedback: message
    }
  }, callback );
};
AMT.prototype.approveRejectedAssignment = function( assignmentId, message, callback ) {
  // In case of 2 parameter the message is skipped
  if( arguments.length===2 ) {
    callback = message;
    message = undefined;
  }

  return this.doRequest( {
    method: 'GET',
    operation: 'ApproveRejectedAssignment',
    params: {
      AssignmentId: assignmentId,
      RequesterFeedback: message
    }
  }, callback );
};
AMT.prototype.getAssignment = function( assignmentId, callback ) {
  return this.doRequest( {
    method: 'GET',
    operation: 'GetAssignment',
    params: {
      AssignmentId: assignmentId
    }
  }, function( err, data ) {
    if( err ) return callback( err );

    return callback( null, data.Assignment, data.HIT );
  } );
};
AMT.prototype.getAssignmentsForHit = function( hitId, params, callback ) {
  return this.doRequest( {
    method: 'GET',
    operation: 'GetAssignmentsForHIT',
    params: _.defaults( {
      HITId: hitId
    }, params )
  }, function( err, data ) {
    if( err ) return callback( err );

    var numResults = parseInt( data.NumResults, 10 );
    var pageNumber = parseInt( data.PageNumber, 10 );
    var totalNumResults = parseInt( data.TotalNumResults, 10 );
    var assignments = data.Assignment || [];
    return callback( null, assignments, numResults, pageNumber, totalNumResults );
  } );
};

// Notification related
AMT.prototype.setNotification = function( hitTypeId, notification, callback ) {
  return this.doRequest( {
    method: 'POST',
    operation: 'SetHITTypeNotification',
    params: {
      HITTypeId: hitTypeId
    },
    data: notification
  }, callback );
};
AMT.prototype.testNotification = function( event, notification, callback ) {
  return this.doRequest( {
    method: 'POST',
    operation: 'SendTestEventNotification',
    params: {
      TestEventType: event
    },
    data: notification
  }, callback );
};

// Generic
AMT.prototype.GetAccountBalance = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetRequesterStatistic = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetRequesterWorkerStatistic = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};



// Others
AMT.prototype.AssignQualification = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.BlockWorker = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.ChangeHITTypeOfHIT = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.CreateQualificationType = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.DisposeQualificationType = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetBlockedWorkers = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetBonusPayments = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetFileUploadURL = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetHITsForQualificationType = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetQualificationsForQualificationType = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetQualificationRequests = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetQualificationScore = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GetQualificationType = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GrantBonus = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.GrantQualification = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.Help = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.NotifyWorkers = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.RejectQualificationRequest = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.RevokeQualification = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.SearchQualificationTypes = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.SetHITAsReviewing = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.UnblockWorker = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.UpdateQualificationScore = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};
AMT.prototype.UpdateQualificationType = function( data, callback ) {
  return callback( new Error( 'Not yet implemented!' ) );
};



module.exports = exports = AMT;
