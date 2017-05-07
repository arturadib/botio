var request = require('request'),
    shell = require('shelljs'),
    program = require('commander'),
    path = require('path'),
    common = require('./common.js'),
    bootstrap = {},
    config = {};

shell.silent();

if (!global.user || !global.pwd) {
  console.log('Missing user credentials argument. See --help.');
  console.log();
  process.exit(1);
}

if (!shell.which('git')) {
  console.log('Bot.io needs git. Please install git in your PATH and try again.');
  console.log();
  process.exit(1);
}

config = common.getConfig(config);

var githubHooksUrl = 'https://'+global.user+':'+global.pwd+'@api.github.com/repos/'+config.repo+'/hooks';

// Make sure hooks are not already set
bootstrap.checkHooks = function() {
  process.stdout.write('Getting existing Github hooks... ');
  request.get(githubHooksUrl, {headers: {'User-Agent': "botio"}}, function(err, res, body) {
    if (err || res.statusCode !== 200) {
      console.log('FAILED');
      console.log();

      if (res && res.statusCode === 404)
        console.log('Repo does not exist or repo access forbidden. You need admin privileges to setup Botio.');

      if (res && res.statusCode === 401)
        console.log('Bad Github credentials');

      process.exit(1);
    }

    console.log('OK');

    // Check if hooks already exist
    body = JSON.parse(body);
    body.forEach(function(hook) {
      if (hook.active && 
          hook.name === 'web' &&
          hook.config && hook.config.url && hook.config.url.indexOf(config.host) > -1) {
        console.log();
        console.log('Hooks already set up for this host. You must first erase them via Github\'s admin interface.');
        process.exit(0);
      }
    });

    // If here, we need new hooks
    bootstrap.setupHooks();
  });
};

// Set up hooks
bootstrap.setupHooks = function() {
  var payload = {
    name: 'web',
    active: true,
    events: [
      'push',
      'pull_request',
      'issue_comment'
    ],
    config: { 
      url: 'http://'+config.host+':'+config.port,
      content_type: 'json'
    }
  };
  if (config.github_secret) {
    payload.config.secret = config.github_secret;
  }

  process.stdout.write('Setting up new hooks... ');
  request.post({url: githubHooksUrl, json: payload, headers: {'User-Agent':'botio'}}, function(err, res, body) {
    if (err || res.statusCode !== 201) {
      console.log('FAILED');
      console.log();

      if (res && res.statusCode === 404)
        console.log('Repo does not exist or repo access forbidden');

      if (res && res.statusCode === 401)
        console.log('Bad Github credentials');

      process.exit(1);
    }

    console.log('OK');
    process.exit(0);
  }); // request.post
}

bootstrap.checkHooks();
