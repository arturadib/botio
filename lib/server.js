var express = require('express'),
    request = require('request'),
    fs = require('fs'),
    child = require('child_process'),
    common = require('./common'),
    queue = require('./queue'),
    config = common.getConfig();

function log() {
  if (arguments.length === 0) {
    console.log();
    return;
  }

  var args = [].slice.call(arguments, 0);
  args.unshift((new Date())+':');
  console.log.apply(this, args);
}

// postComment({issue:..., body:...})
function postComment(obj, callback) {
  var url = 'https://'+global.user+':'+global.pwd+'@api.github.com/repos/'+config.repo+'/issues/'+
            obj.issue+'/comments';

  obj.body = '# Bot.io response\n\n'+
             obj.body+
             '\n\n----\n_This project\'s master branch is guarded by [Bot.io](http://github.com/arturadib/botio)._';

  request.post({
    url: url, 
    json: {body: obj.body}
  }, function(err, res, body) {
    if (err || !res || res.statusCode !== 200) {
      if (callback) callback('Status code:' + res ? res.statusCode : '(unknown)');
      return;
    }

    if (callback) callback(null);
  });
}

// getPullDetails({issue:...})
function getPullDetails(obj, callback) {
  var url = 'https://'+global.user+':'+global.pwd+'@api.github.com/repos/'+config.repo+'/pulls/'+obj.issue;

  request.get(url, function(err, res, body) {
    if (err || !res || res.statusCode !== 200) {
      if (callback) callback('Status code:' + res ? res.statusCode : '(unknown)');
      return;
    }

    var pull = JSON.parse(body);
    if (callback) callback(null, pull);
  });
}

//
// HTTP server
//
var app = express.createServer();
app.use(express.bodyParser());
app.use(app.router);

//
// POST /
//
app.post('/', function(req, res) {
  var type = req.header('x-github-event');
  if (!type) {
    log('Invalid POST request (no x-github-event in header). Details:');
    log('From:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    log('Headers:', req.headers);
    log('Body:', req.body);
    return;
  }

  // Get payload
  var payload = null;
  try {
    payload = JSON.parse(req.body.payload);
  } catch(e) {
    log('Could not parse payload from POST.');
    log('POST body:', req.body);
    return;
  }

  switch (type) {
    //
    // issue_comment
    //
    case 'issue_comment':
      if (config.whitelist.indexOf(payload.sender.login) === -1)
        return; // user not whitelisted, none of our business

      if (!payload.issue.pull_request.html_url)
        return; // comment not in a pull request, none of our business

      var commentBody = payload.comment.body,
          match = commentBody.match(/^-botio *(\w*)/m);

      if (!match)
        return; // not a bot command, none of our business

      var command = match[1];
      if (!command || !(command in config.on)) {
        log('Invalid command ('+command+') from @'+payload.sender.login);
        postComment({
          issue: payload.issue.number,
          body: "Uh, not sure I know what you mean by this command `"+command+"`. Here's what I understand:\n\n"+
                (function() { var list=''; for (cmd in config.on) list+='+ `'+cmd+'`\n'; return list; })()
        });
        return;
      }

      // Command is valid
      log('Processing command "'+command+'" from @'+payload.sender.login);

      // Get pull request details
      getPullDetails({issue: payload.issue.number}, function(err, pull) {
        if (err) {
          log('Error getting pull request details:', err);
          return;
        }

        var pullUrl = pull.head.repo.url,
            pullSha = pull.head.sha,
            pullMergeable = pull.mergeable; // sha of most recent commit in pull request

        if (!pullMergeable) {
          postComment({
            issue: payload.issue.number,
            body: 'This pull request cannot be automatically merged. Fix conflicts and try again.'
          });
          return;
        }

        // Post "processing command"
        log('Command "'+command+'" from @'+payload.sender.login+' added to queue: #'+queue.size());
        postComment({
          issue: payload.issue.number,
          body: 'Processing command **'+command+'** from @'+payload.sender.login+'\n\n'+
                'Queue size: '+queue.size()
        }, function() {

          // Enqueue job
          enqueueJob(config.on[command], function(err, output) {
            if (err) {
              postComment({
                issue: payload.issue.number,
                body: '## Failed\n\n'+
                      output
              });
              return;
            }

            log('Done (command "'+command+'" from @'+payload.sender.login+')');

            postComment({
              issue: payload.issue.number,
              body: '## Success\n\n'+
                    output
            });
          }); // enqueueJob

        }); // postComment
      }); // getPullDetails
      return;

    //
    // POST event not supported
    //
    default:
      return; // none of our business
  } // switch
});

log('Starting server at:', config.ip+':'+config.port);
app.listen(config.port);


// enqueueJob()
function enqueueJob(cmd, callback) {
queue.push(function() {

  child.exec(cmd, 
    { 
      timeout: config.script_timeout || 3600 
    }, function(err, stdout, stderr) {
      if (callback) callback(err, stdout);
    }
  ); // exec

}); // queue.push
} // enqueue
