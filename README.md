# Octoterm

Octobox for Terminal


## Synopsis

Inspired by Octobox, but wanting to reduce the memory footprint, Octoterm was born. It uses the GitHub REST and GraphQL APIs to load metadata about notifications.


## Requirements

Run `npm install` to download dependencies.

Make sure you have exported a [Personal Access Token](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/) via the `GITHUB_TOKEN` environment variable from your `.profile`, `.bashrc` or whatever.

Your access token must include `notifications`, `read:discussion`, `read:org`, `repo`, `user`, and should probably also include `read:packages` and `write:packages` (this is how I have mine configured and it seems to work).

## Usage

```
./gh.js
```

- `h` `j` `k` `l` cursor movement
- `return` open selected notification in a web browser
- `o` open selected notification in the background
- `x` toggle selection
- `m` mute selection
- `/` search
- `r` refresh
- `q` quit

## Screenshot
<img src='https://github.com/dctucker/octoterm/blob/master/screenshot.png' />

## Development

Feel free to create a PR or Issue in this repository, where it's a bugfix or an enhancement.
