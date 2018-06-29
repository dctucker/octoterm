# octoterm
Octobox for Terminal

## Synopsis

Inspired by Octobox, but wanting to reduce the memory footprint, Octoterm was born. It uses the GitHub REST and GraphQL APIs to load metadata about notifications.

## Requirements

Written for Python 2, not tested with 3. Will probably be rewritten in JavaScript.

Uses the [requests](http://docs.python-requests.org) library. You can get it with `easy_install` or `pip`.


## Usage

python gh.py

- `h` `j` `k` `l` cursor movement
- `return` open selected notification in a web browser
- `o` open selected notification in the background
- `x` toggle selection
- `m` mute selection (not yet implemented)
- `/` search
- `r` refresh
- `q` quit


