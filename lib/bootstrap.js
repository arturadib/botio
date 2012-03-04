var shell = require('shelljs'),
    path = require('path'),
    program = require('commander');

shell.silent();

console.log('Bot.io will create configuration files and scripts into the current directory.')
console.log();
console.log('WARNING: This will overwrite any existing files.')
program.confirm('Continue? [y/n] ', function(ok) {
  if (!ok)
    process.exit(0);

  var bootstrapDir = path.resolve(__dirname+'/../bootstrap/');
  if (!shell.exists(bootstrapDir)) {
    console.log('Could not find bootstrap files in:', bootstrapDir);
    process.exit(1);
  }

  shell.cp('-f', bootstrapDir+'/*', '.');

  console.log('All done.');
  process.exit(0);
});
