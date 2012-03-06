// Import Unix-like commands
require('shelljs/global');

echo('[botio] #### Bot.io the house!');
echo('[botio] This default script is configured to simply echo the contents of your repo.');

for (file in ls()) {
  echo(file);
}
