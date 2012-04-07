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

exports.getConfig = function(config) {
  if (!config)
    config = {};

  // Import config
  if (shell.test('-f', './config.json')) {
    try {
      config = exports.extend(config, JSON.parse(shell.cat('./config.json')));
    } catch (e) {
      console.log('Invalid configuration file (config.json)');
      console.log();
      process.exit(1);
    }
  } else {
    console.log('Configuration file (config.json) not found in the current directory');
    console.log();
    process.exit(1);
  }
  
  return config;
}

// extend(target_obj, source_obj1 [, source_obj2 ...])
// Shallow extend, e.g.:
//    extend({a:1}, {b:2}, {c:3}) returns: {a:1, b:2, c:3}
exports.extend = function(target) {
  var sources = [].slice.call(arguments, 1);
  sources.forEach(function(source) {
    for (key in source) 
      target[key] = source[key];
  });
  
  return target;
}
