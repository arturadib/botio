var request = require('request'),
    step = require('step'),
    shell = require('shelljs'),
    common = require('./common.js');

var config = null;

if (!global.user || !global.pwd) {
  console.log('Missing Github credentials. Try --help');
  process.exit(1);
}

// Import config
if (shell.exists('./botio.json')) {
  config = JSON.parse(shell.cat('./botio.json'));
} else {
  console.log('Configuration file not found in the current directory');
  process.exit(1);
}

var baseUrl = 'https://'+global.user+':'+global.pwd+'@api.github.com/repos/'+config.repo+'/hooks',
    localIp = '';

step(
  // Get public IP
  function() {
    process.stdout.write('Getting public IP of localhost... ');
    common.getPublicIp(this);
  },

  // Get existing hooks
  function(ip) {
    if (!ip) {
      console.log('FAILED');
      console.log('Please try again.');
      exit(1);
    }
    console.log(localIp = ip);
    botioUrl = 'http://'+localIp+':'+config.port;

    process.stdout.write('Getting existing Github hooks... ');
    request.get(baseUrl, this);
  },

  // Set up new hooks
  function(err, res, body) {
    if (err || res.statusCode !== 200) {
      console.log('FAILED');
      console.log();

      if (res && res.statusCode === 404) {
        console.log('Repo does not exist');
        console.log('Tried API URL:', baseUrl);
      }

      if (res && res.statusCode === 401)
        console.log('Bad Github credentials (got status code 401)');

      process.exit(1);
    }

    console.log('OK');
    body = JSON.parse(body);

    // Check if hooks already exist
    body.forEach(function(hook) {
      if (hook.config.url.indexOf(localIp) > -1) {
        console.log('Hooks already set up for this IP');
        process.exit(0);
      }
    });

    var payLoad = {
      name: 'web',
      active: true,
      events: ['push', 'pull_request', 'issue_comment'],
      config: { url: botioUrl, content_type: 'json' }
    };
    process.stdout.write('Setting up new hooks... ');

    request.post({url:baseUrl, json:payLoad}, this);
  },

  // Final messages
  function(err, res, body) {
    if (err || res.statusCode !== 201) {
      console.log('FAILED');
      console.log();

      if (res && res.statusCode === 404) {
        console.log('Repo does not exist');
        console.log('Tried API URL:', baseUrl);
      }

      if (res && res.statusCode === 401)
        console.log('Bad Github credentials (got status code 401)');

      process.exit(1);
    }

    console.log('OK');
  }
); // step
