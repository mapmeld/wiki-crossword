// express setup
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
//const MongoStore = require('connect-mongo')(session);
const compression = require('compression');
//const mongoose = require('mongoose');
const csrf = require('csurf');
const request = require('request');
const cheerio = require('cheerio');

const Canvas = require('canvas');
const Crossword = require('crossword');

//console.log('Connecting to MongoDB (required)');
//mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB_URI || 'localhost');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express['static'](__dirname + '/static'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(cookieParser());
/*
app.use(session({
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  secret: process.env.SESSION || 'fj23f90jfoijfl2mfp293i019eoijdoiqwj129',
  resave: false,
  saveUninitialized: false
}));
*/

const csrfProtection = csrf({ cookie: true });

let findGoodTopic = (callback) => {
  request('https://simple.wikipedia.org/wiki/Special:Random', (err, resp, body) => {
    if (err) {
      return callback(err);
    }
    let $ = cheerio.load(body);
    let articleName = $('#firstHeading').text();
    articleName = articleName.split(' (')[0].split(',')[0];

    // remove year articles
    if (!isNaN(articleName * 1)) {
      return findGoodTopic(callback);
    }

    let firstArticlePara = $($('.mw-parser-output > p')[0])
    let articleText = firstArticlePara.text()
      .replace(/\[\d+\]/g, '');

    // make people articles feasible
    let lastName = false;
    if (articleName.indexOf(' ') > -1 && (articleText.indexOf('–') > -1 || articleText.indexOf('(born ') > -1)) {
      // last name only
      articleName = articleName.split(' ');
      articleName = articleName[articleName.length - 1];
      lastName = true;
    }
    if (articleName.indexOf(' ') > -1 || articleName.indexOf('-') > -1) {
      // articles with spaces and hyphens could be really confusing
      return findGoodTopic(callback);
    }

    // remove and smooth out multiple references to the name
    let nameInstances = firstArticlePara.find('b, em');
    for (let i = 0; i < nameInstances.length; i++) {
      articleText = articleText.replace($(nameInstances[i]).text(), '__');
    }
    articleText = articleText.substring(articleText.indexOf('__'))
      .replace('__ is ', '')
      .replace('__ are ', '')
      .replace('(__)', '')
      .replace(/\s+/, ' ');

    let formatText = articleText;
    if (articleText.indexOf('. ') > -1) {
      formatText = articleText.substring(0, articleText.indexOf('. ')) + '.';
      if (formatText.length < 60) {
        articleText = articleText.substring(articleText.indexOf('. ') + 2);
        if (articleText.indexOf('.') > -1) {
          formatText += ' ' + articleText.substring(0, articleText.indexOf('.')) + '.';
        }
      }
    }
    if ((formatText.indexOf('Coordinates: ') > -1) || (!formatText.length)) {
      return findGoodTopic(callback);
    }
    if (lastName) {
      formatText += ' (last name only)';
    }
    callback(null, articleName, formatText);
  });
};

app.get('/', (req, res) => {
  let addWords = (number, callback) => {
    let words = [];
    let addWord = (err, articleName, articleClue) => {
      if (err) {
        return callback(err);
      }
      words.push({
        name: articleName,
        clue: articleClue
      });
      if (words.length === number) {
        callback(null, words);
      } else {
        findGoodTopic(addWord);
      }
    };
    findGoodTopic(addWord);
  };

  addWords(7, (err, words) => {
    if (err) {
      throw err;
    }

    let width = 20;
    let height = 20;
    let canv = new Canvas(40 * width, 40 * height);
    let game = new Crossword(canv, width, height);
    game.clearCanvas(true);

    let added = [];

    let addClue = () => {
      if (words.length) {
        let toAdd = words.pop();
        game.addWord(toAdd.name, (err, clueAnchor, direction) => {
          if (err) {
            return addClue();
          }
          added.push({
            direction: direction,
            clueAnchor: clueAnchor,
            clue: toAdd.clue
            // , solution: toAdd.name.replace(/\w/g, '_')
          });
          addClue();
        });
      } else {
        res.render('index', {
          image: canv.toDataURL(),
          clues: added
        });
      }
    };
    addClue();
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log('app is running');
});

module.exports = app;
