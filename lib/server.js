var express = require('express'),
    request = require('request'),
    fs = require('fs'),
    path = require('path'),
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

function debug() {
  if (!global.debug)
    return;

  if (arguments.length === 0) {
    console.log();
    return;
  }

  var args = [].slice.call(arguments, 0);
  args.unshift((new Date())+': DEBUG :');
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

// static stuff
shell.mkdir('-p', config.public_dir);
app.use(express.static( path.resolve(config.public_dir) ));
app.use(express.directory( path.resolve(config.public_dir) ));

//
// POST /
//
app.post('/', function(req, res) {
  debug('received POST');
  debug('POST headers:', JSON.stringify(req.headers));
  debug('POST body:', JSON.stringify(req.body));

  // Release client
  res.send();

  var type = req.header('x-github-event');
  if (!type) {
    log('Invalid POST request (no x-github-event in header). Details:');
    log('From:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    log('Headers:', req.headers);
    log('Body:', req.body);
    return;
  }

  // Get payload. Body should already be parsed since presumably the hook has been set
  // to come with Content-Type: application/json
  var payload = req.body;

  switch (type) {
  //
  // issue_comment
  //
  case 'issue_comment':
    if (config.whitelist.indexOf(payload.sender.login) === -1) {
      debug('user not whitelisted ('+payload.sender.login+'). skipping req');
      return; // user not whitelisted, none of our business
    }

    if (!payload.issue.pull_request.html_url) {
      debug('comment not in a pull request. skipping req');
      return; // comment not in a pull request, none of our business
    }

    var commentBody = payload.comment.body,
        match = commentBody.match(/^\/botio *(\w*)/m);

    if (!match) {
      debug('not a bot command, skipping comment:', payload.comment.url);
      return; // not a bot command, none of our business
    }

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
      pull.head.short_sha = pull.head.sha.substr(0, 10);

      if (err) {
        log('Error getting pull request details:', err);
        return;
      }

      enqueueJob(payload, pull, command);
    });

    //
    // Enqueue job
    //
    function enqueueJob(payload, pull, command) {
      var jobInfo = {
        //@ + `private_dir`: Where tests will be run
        //@ + `public_dir`: Where files to be exposed to the web can be stored
        //@ + `public_url`: URL of public dir
        //@ + `base_url`: Git URL of the main repo
        //@ + `head_url`: Git URL of the pull request repo
        //@ + `head_ref`: Name of pull request branch
        //@ + `head_sha`: SHA of the most recent commit in the pull request
        //@ + `debug`: true if server invoked with --debug
        private_dir: path.resolve(config.private_dir+'/'+command+'-'+pull.head.short_sha),
        public_dir: path.resolve(config.public_dir+'/'+command+'-'+pull.head.short_sha),
        public_url: 'http://'+config.ip+':'+config.port+'/'+command+'-'+pull.head.short_sha,
        base_url: 'git://github.com/'+config.repo+'.git',
        head_url: pull.head.repo.git_url,
        head_ref: pull.head.ref,
        head_sha: pull.head.sha,
        debug: global.debug
      };

      log('Command queued at #'+queue.size()+' ("'+command+'" from @'+payload.sender.login+')');
      postComment({
        issue: payload.issue.number,
        title: 'Received',
        body: 'Command **'+command+'** from @'+payload.sender.login+' added to queue.\n\n'+
              'Current queue size: '+queue.size()+'\n\n'+
              'Live output at: '+jobInfo.public_url+'/output.txt'
      }, function() {
        queue.push(function() {
          runJob(payload, pull, command, jobInfo, function() {
            queue.next();
          });
        });
      });
    };

    //
    // Run job
    //
    function runJob(payload, pull, command, jobInfo, callback) {
      var outputPath = jobInfo.public_dir+'/output.txt',
          commandPath = shell.pwd()+'/on_'+command+'.js',
          commandLine = 'node '+commandPath+' > '+outputPath;

      shell.mkdir('-p', jobInfo.public_dir);
      shell.mkdir('-p', jobInfo.private_dir);

      debug('Running command line:', commandLine);
      child.exec(commandLine, { 
        timeout: (config.script_timeout || 3600)*1000,
        env: common.extend(process.env, { BOTIO_JOBINFO: JSON.stringify(jobInfo) }),
        cwd: jobInfo.private_dir
      }, function(err) {
        var output = shell.cat(outputPath),
            body = 'Full output at '+jobInfo.public_url+'/output.txt\n\n';

        // Any other messages from script?
        if (output) {
          var match = output.match(/^\!botio_message\:(.*)/mg);
          if (match)
            body += match.join('\n').replace(/\!botio_message\:/g, '');
        }

        if (err) {
          log('Command done - failed ("'+command+'" from @'+payload.sender.login+')');
          log('Cause:', err);
          postComment({
            issue: payload.issue.number,
            title: 'Failed',
            body: body
          });
          if (callback) callback();
          return;
        }

        log('Command done - success ("'+command+'" from @'+payload.sender.login+')');
        postComment({
          issue: payload.issue.number,
          title: 'Success',
          body: body
        });

        if (callback) callback();
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

if (global.debug)
  console.log('Debug mode ON');

//
// Start things up
//
checkCredentials(function() {
  log('Starting server at:', config.ip+':'+config.port);

  app.listen(config.port);
});
