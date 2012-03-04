var request = require('request');

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
