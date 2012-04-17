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

// e.g. randomHash(10) == 'e40df14549'
function randomHash(count) {
  if (count === 1)
    return parseInt(16*Math.random()).toString(16);
  else {
    var hash = '';
    for (var i=0; i<count; i++)
      hash += randomHash(1);
    return hash;
  }
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
      body: '#### From: '+config.name+'\n\n'+
            '----\n\n'+
            '# '+obj.title+'\n\n'+
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

// runJob()
function runJob(jobInfo, callback) {
  var outputPath = jobInfo.public_dir+'/output.txt',
      scriptPath = shell.pwd()+'/on_'+jobInfo.event+'.js',
      commandLine = 'node '+scriptPath+' > '+outputPath;

  shell.mkdir('-p', jobInfo.public_dir);
  shell.mkdir('-p', jobInfo.private_dir);

  debug('jobInfo:', JSON.stringify(jobInfo));
  debug('Running command line:', commandLine);

  var t0 = Date.now();
  child.exec(commandLine, { 
    timeout: (config.script_timeout || 3600)*1000,
    env: common.extend(process.env, { 
      BOTIO_JOBINFO: JSON.stringify(jobInfo),
      BOTIO_MODULE: __dirname+'/module.js'
    }),
    cwd: jobInfo.private_dir
  }, function(err) {
    var t1 = Date.now(),
        output = shell.cat(outputPath),
        body = 'Full output at '+jobInfo.public_url+'/output.txt\n\n'+
               'Total script time: '+((t1-t0)/(60*1000)).toFixed(2)+' mins\n\n';

     // Ensure the private dir is cleaned up
    shell.rm('-rf', jobInfo.private_dir);

    // Any other messages from script?
    if (output) {
      var match = output.match(/^\!botio_message\:(.*)/mg);
      if (match)
        body += match.join('\n').replace(/\!botio_message\:/g, '');
    }

    if (err) {
      log('Script failed ('+jobInfo.id+')');
      log('Cause:', err);
      if (jobInfo.issue) {
        postComment({
          issue: jobInfo.issue,
          title: 'Failed',
          body: body
        });
      }
      if (callback) callback();
      return;
    }

    log('Script successful ("'+jobInfo.id+'")');
    if (jobInfo.issue) {
      postComment({
        issue: jobInfo.issue,
        title: 'Success',
        body: body
      });
    }
    if (callback) callback();
  }); // exec
}; // runJob

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

  // Refresh config from file
  config = common.getConfig();

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
  // Event: issue_comment
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
        handle = config.handle || 'botio',
        match = commentBody.match(new RegExp('^\/'+handle+' +(\\w+)', 'm'));

    if (!match) {
      debug('not a bot command, skipping comment:', payload.comment.url);
      return; // not a bot command, none of our business
    }

    var command = match[1];

    //
    // /botio help
    //
    if (command === 'help') {
      var commands = shell.ls('on_cmd_*.js').join('\n').replace(/on_cmd_(\w+)\.js/g, '$1');
      log('Sending help text to @'+payload.sender.login);
      postComment({
        issue: payload.issue.number,
        title: 'Help',
        body: "Available commands:\n\n```\n"+commands+"\n```"
      });
      return;
    }

    //
    // /botio INVALID
    //
    if (!command || !shell.test('-f', './on_cmd_'+command+'.js')) {
      log('Command not implemented ('+command+') from @'+payload.sender.login);
      postComment({
        issue: payload.issue.number,
        title: 'Invalid',
        body: "Command not implemented: `"+command+"`."
      });
      return;
    }

    //
    // /botio valid
    //

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

      maybeEnqueueJob(payload, pull, 'cmd_'+command);
    });

    //
    // Enqueue job if configured to do so, otherwise just run the job
    //
    function maybeEnqueueJob(payload, pull, event) {
      var id = randomHash(15),
          jobInfo = {
            id: id,
            event: event,
            issue: payload.issue.number,
            private_dir: path.resolve(config.private_dir+'/'+id),
            public_dir: path.resolve(config.public_dir+'/'+id),
            public_url: 'http://'+config.host+':'+config.port+'/'+id,
            base_url: 'git://github.com/'+config.repo+'.git',
            head_url: pull.head.repo.git_url,
            head_ref: pull.head.ref,
            head_sha: pull.head.sha,
            debug: global.debug
          };

      if (config.use_queue)
        log('Command queued at #'+queue.size()+' ("'+event+'" from @'+payload.sender.login+', id: '+id+')');
      else
        log('Running command "'+event+'" from @'+payload.sender.login+', id: '+id);

      postComment({
        issue: payload.issue.number,
        title: 'Received',
        body: 'Command **'+event+'** from @'+payload.sender.login+' received.'+
              (config.use_queue ? ' Current queue size: '+queue.size() : '') +
              '\n\nLive output at: '+jobInfo.public_url+'/output.txt'
      }, function() {
        if (config.use_queue) {
          queue.push(function() {
            runJob(jobInfo, function() {
              queue.next();
            });
          }); // queue.push
        } else {
          runJob(jobInfo);
        }
      }); // postComment()
    }; // maybeEnqueueJob()

  //
  // Event: push
  //
  case 'push':
    if (payload.ref !== 'refs/heads/master') {
      debug('push event not to master branch ('+payload.ref+'). skipping req');
      return;
    }

    if (!shell.test('-f', './on_push.js')) {
      log('Command not implemented (push)');
      return;
    }

    var id = randomHash(15),
        jobInfo = {
          id: id,
          event: 'push',
          issue: null,
          private_dir: path.resolve(config.private_dir+'/'+id),
          public_dir: path.resolve(config.public_dir+'/'+id),
          public_url: 'http://'+config.host+':'+config.port+'/'+id,
          base_url: null,
          head_url: 'git://github.com/'+config.repo+'.git',
          head_ref: 'master',
          head_sha: payload.head_commit.id,
          debug: global.debug
        };

    if (config.use_queue) {
      queue.push(function() {
        runJob(jobInfo, function() {
          queue.next();
        });
      }); // queue.push
    } else {
      runJob(jobInfo);
    }
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
  log('Starting server at:', config.host+':'+config.port);

  app.listen(config.port);
});
