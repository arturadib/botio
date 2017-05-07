var request = require('request'),
    shell = require('shelljs'),
    program = require('commander'),
    path = require('path'),
    common = require('./common.js'),
    bootstrap = {},
    config = {};

shell.silent();

if (!global.repo) {
  console.log('Missing repo argument. See --help.');
  console.log();
  process.exit(1);
}

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

// Get params from globals
config.repo = global.repo;

// Copy bootstrap/ files into current dir
bootstrap.copyFiles = function() {
  console.log('Bot.io will create configuration files and scripts into the current directory.')
  console.log();

  if (!global.force) {
    console.log('WARNING: This will overwrite any existing files.')
    program.confirm('Continue? [y/n] ', function(ok) {
      if (!ok)
        process.exit(0);

      copyFiles();
    });
  } else {
    copyFiles();
  }

  function copyFiles() {
    var bootstrapDir = path.resolve(__dirname+'/../bootstrap/');
    if (!shell.test('-d', bootstrapDir)) {
      console.log('Could not find bootstrap files in:', bootstrapDir);
      process.exit(1);
    }

    shell.cp('-f', bootstrapDir+'/*', '.');

    process.stdout.write('Installing necessary npm packages... ');
    if (!shell.exec('npm install', {silent:true})) {
      console.log('FAILED');
      console.log('"npm install" failed');
      process.exit(1);
    }
    console.log('OK');

    config = common.getConfig(config);

    // Next step
    bootstrap.getIp();
  }; // copyFiles()
};

// Get public IP
bootstrap.getIp = function() {
  process.stdout.write('Getting public IP of localhost... ');
  common.getPublicIp(function(ip) {
    if (!ip) {
      console.log('FAILED');
      console.log('Please try again.');
      process.exit(1);
    }
    console.log(config.host = ip);

    bootstrap.getWhitelist();
  });
};

// Get list of repo collaborators
bootstrap.getWhitelist = function() {
  var url = 'https://'+global.user+':'+global.pwd+'@api.github.com/repos/'+config.repo+'/collaborators';

  process.stdout.write('Getting list of repo collaborators (whitelist)... ');
  request.get(url, {headers: {'User-Agent': "botio"}}, function(err, res, body) {
    if (err || res.statusCode !== 200) {
      console.log('FAILED');
      console.log();

      if (res && res.statusCode === 404)
        console.log('Repo does not exist (404) or repo access forbidden.');

      if (res && res.statusCode === 401)
        console.log('Bad Github credentials');

      process.exit(1);
    }

    console.log('OK');
    config.whitelist = [];

    body = JSON.parse(body);
    body.forEach(function(user) {
      config.whitelist.push(user.login);
    });

    bootstrap.saveConfig();
  });
};

// Save config to file
bootstrap.saveConfig = function() {
  JSON.stringify(config, null, 2).to('config.json');
  console.log();
  process.exit(0);
}

bootstrap.copyFiles();
