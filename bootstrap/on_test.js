var botio = require('botio');
require('shelljs/global');

botio.message('#### Hello world');
botio.message('Your Botio installation works! View full output for the list of files in this repo');

botio.cloneAndMerge();

echo('These are the files in your repo:');

for (file in ls()) {
  echo('  '+file);
}

botio.cleanUp();
