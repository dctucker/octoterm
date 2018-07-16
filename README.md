# octoterm

Octobox for Terminal


## Synopsis

Inspired by Octobox, but wanting to reduce the memory footprint, Octoterm was born. It uses the GitHub REST and GraphQL APIs to load metadata about notifications.


## Requirements

Writen for Node.

Run `npm install` to download dependencies.

Make sure you have exported a [Personal Access Token](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/) via the `GITHUB_TOKEN` environment variable from your `.profile`, `.bashrc` or whatever.


## Usage

```
./gh.js
```

- `h` `j` `k` `l` cursor movement
- `return` open selected notification in a web browser
- `o` open selected notification in the background
- `x` toggle selection
- `m` mute selection (not yet implemented)
- `/` search
- `r` refresh
- `q` quit
