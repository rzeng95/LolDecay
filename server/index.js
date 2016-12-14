'use strict';

const express = require('express');
const app = express();
const fallback = require('express-history-api-fallback');
const path = require('path');
const PORT = process.env.PORT || 3000;

const morgan = require('morgan');
app.use(morgan('dev'));

app.use(express.static('staticFiles'));

app.get('/api/hello', (req, res) => {
    res.send('oh hi!');
})

// handles /api/player/:region/:name
require('./lookup')(app);

app.use(express.static(path.resolve(__dirname, '..', 'build')));

//app.use(fallback(__dirname + '../build/index.html'));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
});



app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});
