var express = require('express'),
    request = require('request'),
    fs = require('fs'),
    shell = require('shelljs'),
    child = require('child_process'),
    common = require('./common'),
    queue = require('./queue'),
    config = common.getConfig();

if (!shell.which('git')) {
  console.log('Bot.io needs git. Please install git in your PATH and try again.');
  console.log();
  process.exit(1);
}

function log() {
  if (arguments.length === 0) {
    console.log();
    return;
  }

  var args = [].slice.call(arguments, 0);
  args.unshift((new Date())+':');
  console.log.apply(this, args);
}

// checkCredentials()
function checkCredentials(callback) {
  process.stdout.write('Verifying Github credentials... ');

  var url = 'https://'+global.user+':'+global.pwd+'@api.github.com';

  request.get(url, function(err, res, body) {
    if (err) {
      console.log('FAILED');
      console.log('Could not talk to Github');
      process.exit(1);
    }

    if (res && res.statusCode === 401) {
      console.log('FAILED');
      console.log('Bad Github credentials');
      process.exit(1);
    }

    console.log('OK');
    if (callback) callback();
  });
}

// postComment({issue:..., body:...})
function postComment(obj, callback) {
  var url = 'https://'+global.user+':'+global.pwd+'@api.github.com/repos/'+config.repo+'/issues/'+
            obj.issue+'/comments';

  obj.body = obj.body;

  request.post({
    url: url, 
    json: {
      body: '# '+obj.title+'\n\n'+
            obj.body
    }
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
        match = commentBody.match(/^\/botio *(\w*)/m);

    if (!match)
      return; // not a bot command, none of our business

    var command = match[1];
    if (!command || !shell.test('-f', './on_'+command+'.js')) {
      log('Invalid command ('+command+') from @'+payload.sender.login);
      postComment({
        issue: payload.issue.number,
        title: 'Invalid',
        body: "Command not understood: `"+command+"`."
      });
      return;
    }

    // Command is valid
    log('Processing command "'+command+'" from @'+payload.sender.login);

    //
    // Get pull request details
    //
    getPullDetails({issue: payload.issue.number}, function(err, pull) {
      // 'pull' contains stuff like pull.head.repo.url, pull.head.sha, pull.mergeable

      if (err) {
        log('Error getting pull request details:', err);
        return;
      }

      if (!pull.mergeable) {
        postComment({
          issue: payload.issue.number,
          body: 'This pull request cannot be automatically merged. Fix conflicts and try again.'
        });
        return;
      }

      enqueueJob(payload, pull, command);
    });

    //
    // Enqueue job
    //
    function enqueueJob(payload, pull, command) {
      log('Command queued at #'+queue.size()+' ("'+command+'" from @'+payload.sender.login+')');
      postComment({
        issue: payload.issue.number,
        title: 'Received',
        body: 'Command **'+command+'** from @'+payload.sender.login+' added to queue.\n\n'+
              'Current queue size: '+queue.size()
      }, function() {
        queue.push(function() {
          runJob(payload, pull, command);
        });
      });
    };

    //
    // Run job
    //
    function runJob(payload, pull, command) {
      child.exec('node on_'+command+'.js', { 
        timeout: config.script_timeout || 3600,
        env: { 
          BOTIO_ARGS: JSON.stringify({
            //@ + `private_dir`: Where tests will be run
            //@ + `base_url`: Git URL of the main repo
            //@ + `head_url`: Git URL of the pull request repo
            //@ + `head_sha`: SHA of the most recent commit in the pull request
            private_dir: config.private_dir || './private',
            base_url: 'git://github.com/'+config.repo+'.git',
            head_url: pull.head.repo.url,
            head_sha: pull.head.sha
          })
        }
      }, function(err, stdout, stderr) {
        if (err) {
          log('Command done - failed ("'+command+'" from @'+payload.sender.login+')');
          postComment({
            issue: payload.issue.number,
            title: 'Failed',
            body: stdout
          });
          return;
        }

        log('Command done - success ("'+command+'" from @'+payload.sender.login+')');
        postComment({
          issue: payload.issue.number,
          title: 'Success',
          body: stdout
        });
      }); // exec
    }; // runJob
    return;

  //
  // POST event not supported
  //
  default:
    return; // none of our business
  } // switch
});

//
// Start things up
//
checkCredentials(function() {
  log('Starting server at:', config.ip+':'+config.port);

  app.listen(config.port);
});
