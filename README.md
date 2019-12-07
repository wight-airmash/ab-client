# ab-client
A hybrid nodejs and browser client for airmash.

It's in a very premature state. For example: aircrafts are not moving properly because clientside updates are not there yet. Todolist on [Trello](https://trello.com/b/PFLmPiJ2/ab-client)

# building

You'll need Node v12 or more, and the gulp-cli.

1. clone repository and submodule (`git clone --recurse-submodules git://github.com/spatiebot/ab-client.git`)
2. `npm i`

to create a browser client:

- `gulp browser`

will result in dist/index.html with a *very* premature browser client

- `gulp`

will result in dist/app.js with a nodejs client that only logs chat messages.

