var botio = require(process.env['BOTIO_MODULE']);
require('shelljs/global');

echo('These are the files in your repo:');
ls().forEach(function(file) {
  echo('  '+file);
});

botio.message('#### Hello world');
botio.message('Your Botio installation works! View full output for the list of files in this repo');
