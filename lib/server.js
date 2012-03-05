var express = require('express'),
    request = require('request'),
    vm = require('vm'),
    common = require('./common.js'),
    config = common.getConfig(),
    botio = {};

function log() {
  if (arguments.length === 0) {
    console.log();
    return;
  }

  var args = [].slice.call(arguments, 0);
  args.unshift((new Date())+':');
  console.log.apply(this, args);
}

//
// Botio API
//

// postComment
botio.postComment = function(str) {
  log(str);
}

//
// HTTP server
//
var app = express.createServer();
app.use(express.bodyParser());
app.use(app.router);

app.post('/', function(req, res) {
  var type = req.header('x-github-event');
  if (!type) {
    log('Invalid POST request (no x-github-event in header). Details:');
    log('From:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    log('Headers:', req.headers);
    log('Body:', req.body);
    return;
  }

  var payload = null;
  try {
    payload = JSON.parse(req.body.payload);
  } catch(e) {
    log('Could not parse payload from POST.');
    log('POST body:', req.body);
    return;
  }

  //
  // Comment
  //
  if (type === 'issue_comment') {
    if (config.whitelist.indexOf(payload.sender.login) === -1) {
      log('Invalid user (not whitelisted):', payload.sender.login);
      return;
    }

    var commentBody = payload.comment.body,
        match = commentBody.match(/^-botio *(\w*)/m);

    if (!match)
      return; // not a bot command, none of our business

    var command = match[1];
    if (!command) {
      botio.postComment("No command, nothing to do. Yo, that's boring.");
      return;
    }

    log('Processing command '+command+' from @'+payload.sender.login);

    // if (fs.existsSync('on_'+))
  }
});

log('Starting server at:', config.ip+':'+config.port);
app.listen(config.port);
