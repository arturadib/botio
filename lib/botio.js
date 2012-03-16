// botio.js - external module to be used by user scripts
// Grabs environment variables from server.js
var shell = require('shelljs');

var args = {};
if ('BOTIO_ARGS' in process.env)
  args = JSON.parse(process.env['BOTIO_ARGS']);

for (key in args)
  exports[key] = args[key];
