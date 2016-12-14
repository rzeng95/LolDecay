'use strict';

const express = require('express');
const app = express();
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

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/build/index.html');
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});
// const async = require('async');
//
// const lookup = require('./lookup');
// const errorHandler = require('./errorHandler');
//
//
//
// const inputRegion = 'na';
// const inputName = 'dyrus';
//
// async.waterfall([
//     async.apply(lookup.processName, inputRegion, inputName),
//     lookup.getSummonerID,
//     lookup.getDDragonVersion,
//     lookup.getSummonerRank,
//     lookup.getSummonerHistory
// ], (err, accountType, region, summonerID, displayName, profileURL, tier, division, lp, decayMessage) => {
//     if (err) {
//         console.log( errorHandler(err) );
//     } else {
//
//         console.log('accountType: ' + accountType);
//         console.log('region: ' + region);
//         console.log('summonerID: ' + summonerID);
//         console.log('displayName: ' + displayName);
//         console.log('profileURL: ' + profileURL);
//         console.log('tier: ' + tier);
//         console.log('division: ' + division);
//         console.log('lp: ' + lp);
//         console.log('decay message: ' + decayMessage);
//         // switch (accountType) {
//         //     case
//         // }
//     }
// })
