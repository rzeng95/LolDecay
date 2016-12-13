'use strict';

const async = require('async');

const lookup = require('./lookup');
const errorHandler = require('./errorHandler');



const inputRegion = 'na';
const inputName = 'dyrus';

async.waterfall([
    async.apply(lookup.processName, inputRegion, inputName),
    lookup.getSummonerID,
    lookup.getDDragonVersion,
    lookup.getSummonerRank,
    lookup.getSummonerHistory
], (err, accountType, region, summonerID, displayName, profileURL, tier, division, lp, decayMessage) => {
    if (err) {
        console.log( errorHandler(err) );
    } else {

        console.log('accountType: ' + accountType);
        console.log('region: ' + region);
        console.log('summonerID: ' + summonerID);
        console.log('displayName: ' + displayName);
        console.log('profileURL: ' + profileURL);
        console.log('tier: ' + tier);
        console.log('division: ' + division);
        console.log('lp: ' + lp);
        console.log('decay message: ' + decayMessage);
        // switch (accountType) {
        //     case
        // }
    }
})
