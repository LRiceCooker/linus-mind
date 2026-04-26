# linus-mind

Reading the mind of Linus Torvalds, one commit at a time.

**[lricecooker.github.io/linus-mind](https://lricecooker.github.io/linus-mind/)**

A tiny web app that turns Linus' commit messages into a reading experience. Pick a repo, scroll through the commits like pages of a book. That's it.

## Why

Linus Torvalds writes commit messages like short essays — opinionated, precise, sometimes furious, always worth reading. This app lets you read them properly, on your phone, on the couch, like a book.

## Run it

Open `index.html` in a browser. Done.

Or with a local server:

```
npx serve . -s
```

## Stack

HTML, CSS, vanilla JS. No framework, no build step, no dependencies.
Commits are fetched from GitHub's public API (60 requests/hour, no token needed).

## License

[Beerware](LICENSE)
