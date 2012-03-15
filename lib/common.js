var request = require('request'),
    shell = require('shelljs');

exports.getPublicIp = function(callback) {
  request.get('http://ifconfig.me/ip', function(error, response, body){
    if (!callback)
      return;

    if (!error)
      callback(body.replace(/\s|\n/g, ''));
    else
      callback();
  });
};

exports.getConfig = function() {
  var config = {};

  if (!global.user || !global.pwd) {
    console.log('Missing Github credentials. Try --help');
    process.exit(1);
  }

  // Import config
  if (shell.test('-f', './config.json')) {
    config = JSON.parse(shell.cat('./config.json'));
  } else {
    console.log('Configuration file (config.json) not found in the current directory');
    console.log();
    process.exit(1);
  }

  config.baseUrl = 'https://'+global.user+':'+global.pwd+'@api.github.com/repos/'+config.repo+'/hooks';
  
  return config;
}
