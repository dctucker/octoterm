Are you _tired_ of sifting through notifications? Clicking through so many browser tabs, getting notified so often it makes your computer's memory explode?? There's got to be a better way!

# Introducing [Octoterm](https://github.com/dctucker/octoterm/blob/master/README.md)

Inspired by Octobox, Octoterm simplifies the experience of sorting, searching, and muting GitHub notifications, all while reducing the memory footprint. With the ability to open multiple notifications in a browser at once, or inspect the details of a notification right from your terminal, you'll find yourself clearing notifications more quickly and be that much closer to the mythical "Notifications (0)".

## Why?

If you're anything like me, you appreciate working with the command-line and [terminal user interfaces](https://en.wikipedia.org/wiki/Text-based_user_interface) because they're able to provide more immediate feedback and can be directly controlled from the keyboard with little need for mouse input.

## How did this come about?

It takes a while to figure out the best way to deal with notifications as a hubber. My path started at sending everything to email accessed by Gmail with a bunch of filters, to using Gmail Inbox to try and consolidate my notifications, to finally switching off the email option and using only Octobox. I liked using Octobox more than the previous two, but I still found parts of it a little bit slower than I'd like, such as being unable to load multiple notifications at once, or filter to show all Merged PRs or Closed Issues. One hack I tried was to implement a keyboard macro, so I could press a single button `F19` to: 

- Activate the application window for Octobox
- Press `j` `o` to move cursor down and open the next notification

This worked about 80% of the time, but still required intervention when the system was not in a state when this exact sequence of events would achieve the desired result, plus it often took about two seconds to complete its action before being ready for another key-press to repeat the process.

I finally sat down and decided to solve this problem with more code. I began learning about our REST API v3 and GraphQL v4 to synthesize the data needed to display a table with slightly more information than Octobox offered. Starting out with Python and `ncurses` (since they're my go-to and I have prior art to borrow from), I quickly hit a wall due to how Python wants to handle encoding and decoding JSON into `dict`s. Having recently completed several courses in React, Node/JS was a natural fit to evolve this project beyond the prototype phase.

## This software is still very much a work-in-progress

Head on over to [dctucker/octoterm](https://github.com/dctucker/octoterm) to give it a whirl if you're looking for a new way to manage notifications, and feel free to let me know how it can be improved by filing and Issue or a PR.

## What does it look like?

<img src="https://github.com/dctucker/octoterm/blob/master/Octoterm%20screenshot.png" />
