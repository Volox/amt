# Amazon Mechanical Turk (AMT)

Node API for Amazon Mechanical Turk, heavily inspired by [mturk](https://github.com/jefftimesten/mturk) by [jefftimesten](https://github.com/jefftimesten/).

## Getting Started
Install the module with: `npm install amt`

```javascript
var AMT = require('amt');
amt = new AMT( {
  key: 'API_KEY',
  secret: 'SECRET_KEY',
} );

var hit = new amt.HIT( {
  title: 'Test',
  description: 'Test description',
  reward: new amt.Reward( 0.01 ),
  question: 'Some super complex xml here',
  duration: 60*1, // 1 minute,
  life: 60*5 // 5 minutes
} );

hit.create( function( err, hit ) {
  // hit created! wow
} );
```

# Documentation

## Simple objects

* Reward
* Notification

## HITType
Class description.
### hitType.create( *callback* )
**TODO**
### hitType.setNotification( *notification*, *callback* )
**TODO**

## HIT
Class description.

Static methods:

* HIT.get( id, callback )
* HIT.search( params, callback )

### hit.create( *callback* )
**TODO**
### hit.disable( *callback* )
**TODO**
### hit.dispose( *callback* )
**TODO**
### hit.expire( *callback* )
**TODO**
### hit.getAssignments( *params*, *callback* )
**TODO**


## Assignment
Class description.

Static methods:

* Assignment.get( id, callback )

### assignment.approve( *message*, *callback* );
**TODO**
### assignment.reject( *message*, *callback* );
**TODO**
### assignment.approveRejected( *message*, *callback* );
**TODO**

# Examples

See [test.js](test/test.js)

# License
Copyright (c) 2013 Riccardo Volonterio. Licensed under the MIT license.