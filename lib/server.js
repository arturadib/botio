var express = require('express'),
    common = require('./common.js'),
    step = require('step');

var config = common.getConfig();

function log(msg) {
  console.log((new Date())+':', msg);
}

step(
  // Get public IP
  function() {
    process.stdout.write('Getting public IP of localhost... ');
    common.getPublicIp(this);
  },

  // Start server
  function(ip) {
    if (!ip) {
      console.log('FAILED');
      console.log('Please try again.');
      exit(1);
    }
    console.log(config.localIp = ip);
    config.botioUrl = 'http://'+config.localIp+':'+config.port;

    console.log('Starting server at:', config.localIp+':'+config.port);

    // HTTP server
    var app = express.createServer();
    app.use(express.bodyParser());
    app.use(app.router);
    app.listen(config.port);

    app.post('/', function(req, res) {
console.log(req.body);
      // var payLoad = JSON.parse(req.body.payload);
      // log('received ')
    });
  }
);
