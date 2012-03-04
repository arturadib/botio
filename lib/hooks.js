var request = require('request'),
    step = require('step'),
    shell = require('shelljs'),
    common = require('./common.js');

var config = common.getConfig();

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
    console.log(config.localIp = ip);
    config.botioUrl = 'http://'+config.localIp+':'+config.port;

    process.stdout.write('Getting existing Github hooks... ');
    request.get(config.baseUrl, this);
  },

  // Set up new hooks
  function(err, res, body) {
    if (err || res.statusCode !== 200) {
      console.log('FAILED');
      console.log();

      if (res && res.statusCode === 404) {
        console.log('Repo does not exist');
        console.log('Tried API URL:', config.baseUrl);
      }

      if (res && res.statusCode === 401)
        console.log('Bad Github credentials');

      process.exit(1);
    }

    console.log('OK');
    body = JSON.parse(body);

    // Check if hooks already exist
    body.forEach(function(hook) {
      if (hook.config.url.indexOf(config.localIp) > -1) {
        console.log('Hooks already set up for this IP');
        process.exit(0);
      }
    });

    var payLoad = {
      name: 'web',
      active: true,
      events: ['push', 'pull_request', 'issue_comment'],
      config: { url: config.botioUrl, content_type: 'json' }
    };
    process.stdout.write('Setting up new hooks... ');

    request.post({url:config.baseUrl, json:payLoad}, this);
  },

  // Final messages
  function(err, res, body) {
    if (err || res.statusCode !== 201) {
      console.log('FAILED');
      console.log();

      if (res && res.statusCode === 404) {
        console.log('Repo does not exist');
        console.log('Tried API URL:', config.baseUrl);
      }

      if (res && res.statusCode === 401)
        console.log('Bad Github credentials');

      process.exit(1);
    }

    console.log('OK');
  }
); // step
