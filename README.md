## Wiki-Crossword

[![Greenkeeper badge](https://badges.greenkeeper.io/mapmeld/wiki-crossword.svg)](https://greenkeeper.io/)

NodeJS/Express server that generates articles from the Simple English Wikipedia
(hopefully more in the future).

Future goals and bug reports: https://github.com/mapmeld/wiki-crossword/issues

<img src="http://i.imgur.com/MohDLRa.png"/>

## How the Clue-Builder Works

Ideally this would use fancy natural language processing, but for now it is some JavaScript making
assumptions about wiki articles.

A typical first paragraph on an article on Simple English Wikipedia:

```
Wilf Cude

Wilf Reginald Cude (4 July 1910 – 5 May 1968)[1] was a NHL ice hockey centre who played 10 seasons for numerous NHL teams. Cude learned to play hockey in Winnipeg. He led the Detroit Red Wings to their first Stanley Cup finals although they lost to the Chicago Black Hawks three games to one in a best-of-five series.
```

The JS parser goes through these steps:

- extract title from the article HTML, removing any parens or commas, avoiding articles for numbers or years
- extract first paragraph from the article HTML, removing any citation links
- if the title has spaces, and is a person's name (paragraph says (born YYYY) or (YYYY-YYYY)), change solution to last name in title (Cude)
- reject remaining articles with spaces or unexpected punctuation
- assume a -b- or -em- tag (such as "Wilf Reginald Cude" here) is repeating the title, and replace with a blank \_
- remove any \_ is, \_ are, (\_), or other openings to make sentence more clue-like
- cut clue down to the first sentence unless it is too short and needs a second sentence

Final output:

```
___ (4 July 1910 – 5 May 1968) was a NHL ice hockey centre who played 10 seasons for numerous NHL teams. (last name only)
```

## Requirements

MongoDB, NodeJS, Cairo (or other library to support node-canvas)

The ```crossword``` module supports several scripts in Unicode, but no right-to-left language support yet.

I was unable to get node-canvas working on Heroku now that various buildpacks
backup modules are outdated, so I got a DigitalOcean box.

```
mongod
export SESSION='SECRETKEY'
npm start &
disown
exit
```

## License

Open source, MIT license

Wikipedia content is available on a Creative Commons license
