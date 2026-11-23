# Journaling

A journal in the browser: write, edit and delete entries, stored locally, with a light and dark theme.

![Screenshot of Journaling with two entries](docs/journaling-two-entries.png)

## Features

- Create, edit and delete entries in a modal dialog (`<dialog>`)
- Entries persist in `localStorage`
- Dark mode toggle that remembers the choice
- Empty state with a call to action
- Edit and delete are always visible and reachable with the keyboard

## Tech

- HTML (Dialog API, `<template>`), CSS custom properties, vanilla JavaScript
- `localStorage` for persistence
- No build step, no dependencies

## How to run

Open the live version: **[aaronkuy.github.io/journaling](https://aaronkuy.github.io/journaling/)**

Or run it locally:

```bash
git clone https://github.com/aaronkuy/journaling.git
cd journaling
open index.html        # macOS; on Linux use xdg-open, on Windows start
```

Run the tests (Node.js 20 or newer, nothing to install):

```bash
node --test
```

## Where the data lives

Entries are saved only in this browser's `localStorage`. They are not sent anywhere, and clearing the site data deletes them. The live version shares its origin (`aaronkuy.github.io`) with other projects, and every page on an origin can read the same `localStorage`, so do not keep anything confidential in it.

## Credits

This project started from a tutorial for a notes app built with HTML, CSS and JavaScript on top of `localStorage`. The program flow (one array of entries, one dialog for both creating and editing, a theme toggle) follows that tutorial, with "notes" renamed to "entries". The stylesheet was replaced with a new design in October 2026.

Changes on top of the tutorial, each visible in the commit history:

- Entries are built from a `<template>` and filled through `textContent`. The tutorial put the text into `innerHTML`, which let a title such as `<img src=x onerror=…>` run as script.
- One delegated click listener replaces the inline `onclick` attributes, which allows a Content-Security-Policy (`default-src 'self'; img-src 'self' data:`).
- Reading and writing `localStorage` is guarded. Broken stored data no longer stops the page, and a failed write keeps the dialog open with a message instead of losing the text.
- The list logic lives in `store.js` without DOM access and has tests in `test/`.

## Not done yet

- Deleting has no confirmation and no undo
- Entries have no date
- Closing the dialog discards a draft without asking
- No search, no export or import

## License

MIT, see [LICENSE](LICENSE). The copyright notice refers to the changes made in this repository, not to the tutorial code the app started from (see [Credits](#credits)).
