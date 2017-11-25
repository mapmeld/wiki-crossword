// express setup
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const compression = require('compression');
const mongoose = require('mongoose');
const request = require('request');
const cheerio = require('cheerio');

const Canvas = require('canvas');
const Crossword = require('crossword');

const Game = require('./models/game.js');

console.log('Connecting to MongoDB (required)');
mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB_URI || 'localhost');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.use(express['static'](__dirname + '/static'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(cookieParser());
app.use(session({
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  secret: process.env.SESSION || 'fj23f90jfoijfl2mfp293i019eoijdoiqwj129',
  resave: false,
  saveUninitialized: false
}));

let findGoodTopic = (language, callback) => {
  request('https://' + language + '.wikipedia.org/wiki/Special:Random', (err, resp, body) => {
    if (err) {
      return callback(err);
    }
    let $ = cheerio.load(body);
    let articleName = $('#firstHeading').text();
    articleName = articleName.split(' (')[0].split(',')[0].replace("'", '');

    // remove year articles
    if (!isNaN(articleName * 1)) {
      return findGoodTopic(language, callback);
    }

    let firstArticlePara = $($('.mw-parser-output > p')[0])
    let articleText = firstArticlePara.text()
      .replace(/\[\d+\]/g, '');

    let biographyPotential = $('.biography').text();
    let biography = (biographyPotential.indexOf('Nacimiento') > -1 || biographyPotential.indexOf('Naissance') > -1 || biographyPotential.indexOf('Geboren') > -1);

    // make people articles feasible
    let lastName = false;
    if (articleName.indexOf(' ') > -1 && (articleText.indexOf('–') > -1 || articleText.indexOf('(born ') > -1 || biography)) {
      // last name only
      let articleNames = articleName.split(' ');
      articleName = articleNames.pop();
      if (articleNames[articleNames.length - 1] === 'de') {
        articleName = 'de' + articleName;
      }
      if (articleNames.length > 1 && articleNames[articleNames.length - 2] === 'de' && articleNames[articleNames.length - 1] === 'la') {
        articleName = 'dela' + articleName;
      }
      lastName = true;
    }
    if (articleName.indexOf(' ') > -1 || articleName.indexOf('-') > -1 || articleName.indexOf('!') > -1 || articleName.indexOf('?') > -1) {
      // articles with spaces and hyphens could be really confusing
      return findGoodTopic(language, callback);
    }

    // remove and smooth out multiple references to the name
    let nameInstances = firstArticlePara.find('b, em');
    for (let i = 0; i < nameInstances.length; i++) {
      articleText = articleText.replace($(nameInstances[i]).text(), '__');
    }
    articleText = articleText.replace(new RegExp(articleName, 'ig'), '__');
    articleText = articleText.substring(articleText.indexOf('__'))
      .replace('__ is ', '')
      .replace('__ are ', '')
      .replace('(__)', '')
      .replace(/\s+/, ' ');

    let formatText = articleText;
    let sentenceEnd = (language === 'my') ? '။' : '.';
    if (articleText.indexOf(sentenceEnd + ' ') > -1) {
      formatText = articleText.substring(0, articleText.indexOf(sentenceEnd + ' ')) + sentenceEnd;
      if (formatText.length < 100) {
        articleText = articleText.substring(articleText.indexOf(sentenceEnd + ' ') + 2);
        if (articleText.indexOf(sentenceEnd) > -1) {
          formatText += ' ' + articleText.substring(0, articleText.indexOf(sentenceEnd)) + sentenceEnd;
        }
      }
    }
    if ((formatText.indexOf('Coordinates: ') > -1) || (formatText.indexOf('Koordinaten: ') > -1) || (formatText.length < 6)) {
      return findGoodTopic(language, callback);
    }
    if (lastName) {
      formatText += ' (last name only)';
    }
    callback(null, articleName, formatText);
  });
};

app.get('/', (req, res) => {
  Game.findOne({ language: 'simple' }, (err, g) => {
    if (err) {
      res.json(err);
    } else if (!g) {
      res.redirect('/game/new');
    } else {
      res.render('index', g);
    }
  });
});

app.post('/game/new', (req, res) => {
  let language = req.body.language || 'simple';

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
        findGoodTopic(language, addWord);
      }
    };
    findGoodTopic(language, addWord);
  };

  addWords(9, (err, words) => {
    if (err) {
      throw err;
    }

    let width = 20;
    let height = 20;
    let canv = new Canvas(40 * width, 40 * height);
    let game = new Crossword(canv, width, height);
    game.clearCanvas(true);

    if (language === 'my') {
      /*
      game.setNumberTransform(function(n) {
        return myanmarNumbers(n, 'my');
      });
      */
    } else if (language === 'hi') {
      /*
      game.setNumberTransform(function(txt) {
        txt += '';
        var numbers = {
          '०': 0,
          '१': 1,
          '२': 2,
          '३': 3,
          '४': 4,
          '५': 5,
          '६': 6,
          '७': 7,
          '८': 8,
          '९': 9
        };

        var keys = Object.keys(numbers);
        for (var n = 0; n <= keys.length; n++) {
          var re = new RegExp(numbers[keys[n]] + "", "g");
          txt = txt.replace(re, keys[n]);
        }
        return txt;
      });*/
    } else if (language === 'ta') {
      /*
      game.setNumberTransform(function(txt) {
        txt += '';
        txt = txt.replace('100', '௱');
        txt = txt.replace('10', '௰');
        var numbers = {
          '௦': 0,
          '௧': 1,
          '௨': 2,
          '௩': 3,
          '௪': 4,
          '௫': 5,
          '௬': 6,
          '௭': 7,
          '௮': 8,
          '௯': 9
        };

        var keys = Object.keys(numbers);
        for (var n = 0; n <= keys.length; n++) {
          var re = new RegExp(numbers[keys[n]] + "", "g");
          txt = txt.replace(re, keys[n]);
        }
        return txt;
      });*/
    } else if (language === 'ar' || language === 'ps') {
      /*game.setNumberTransform(function(txt) {
        txt += '';
        var numbers = {
          '٠': 0,
          '١': 1,
          '٢': 2,
          '٣': 3,
          '٤': 4,
          '٥': 5,
          '٦': 6,
          '٧': 7,
          '٨': 8,
          '٩': 9
        };

        var keys = Object.keys(numbers);
        for (var n = 0; n <= keys.length; n++) {
          var re = new RegExp(numbers[keys[n]] + "", "g");
          txt = txt.replace(re, keys[n]);
        }
        console.log(txt);
        return txt;
      });*/
      game.setDirection('rtl');
    } else if (language === 'dv') {
      game.setDirection('rtl');
    }

    let added = [];

    let addClue = () => {
      if (words.length) {
        let toAdd = words.pop();
        console.log(toAdd);
        game.addWord(toAdd.name, (err, clueAnchor, direction) => {
          if (!err) {
            added.push({
              direction: direction,
              clueAnchor: clueAnchor,
              clue: toAdd.clue
              // , solution: toAdd.name.replace(/\w/g, '_')
            });
          }
          addClue();
        });
      } else {
        let g = new Game({
          image: canv.toDataURL(),
          clues: added,
          language: req.body.language
        });
        g.save((err) => {
          if (err) {
            res.json(err);
          } else {
            res.redirect('/game/' + g._id);
          }
        });
      }
    };
    addClue();
  });
});

app.get('/game/:id', (req, res) => {
  Game.findById(req.params.id, (err, g) => {
    res.render('index', g);
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log('app is running');
});

module.exports = app;
