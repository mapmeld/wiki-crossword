// express setup
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const compression = require('compression');
const mongoose = require('mongoose');
const csrf = require('csurf');
const request = require('request');
const cheerio = require('cheerio');

console.log('Connecting to MongoDB (required)');
mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB_URI || 'localhost');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
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

const csrfProtection = csrf({ cookie: true });

findGoodTopic = (callback) => {
  request('https://simple.wikipedia.org/wiki/Special:Random', (err, resp, body) => {
    if (err) {
      return callback(err);
    }
    let $ = cheerio.load(body);
    let articleName = $('#firstHeading').text();
    articleName = articleName.split(' (')[0].split(',')[0];
    if (articleName.indexOf(' ') > -1 || articleName.indexOf('-') > -1) {
      //return findGoodTopic(callback);
    }
    let articleText = $($('.mw-parser-output > p')[0]).text()
      .replace(new RegExp(articleName, 'gi'), '__')
      .replace(/\[\d+\]/g, '');
    articleText = articleText.substring(articleText.indexOf('__'))
      .replace('__ is ', '')
      .replace('__ are ', '');
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
    if (!formatText.length) {
      return findGoodTopic(callback);
    }
    callback(null, articleName, formatText);
  });
};

app.get('/', (req, res) => {
  findGoodTopic((err, articleName, articleText) => {
    res.json({
      name: articleName,
      text: articleText
    });
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log('app is running');
});

module.exports = app;
