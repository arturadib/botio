var botio = require(process.env['BOTIO_MODULE']);
require('shelljs/global');

// Recursively copy all files into public directory
cp('-R', '*', botio.public_dir);

botio.message('#### Published');
botio.message('You can view your repo files at: '+botio.public_url);
