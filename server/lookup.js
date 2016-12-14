const async = require('async');

const lookup = require('./lookupHelpers');
const errorHandler = require('./errorHandler');

module.exports = (app) => {

    app.get('/api/player/:region/:name', (req, res) => {
        const inputRegion = req.params.region;
        const inputName = req.params.name;

        async.waterfall([
            async.apply(lookup.processName, inputRegion, inputName),
            lookup.getSummonerID,
            lookup.getDDragonVersion,
            lookup.getSummonerRank,
            lookup.getSummonerHistory
        ], (err, accountType, region, summonerID, displayName, profileURL, tier, division, lp, decayMessage) => {
            if (err) {
                //console.log( errorHandler(err) );
                res.send({
                    err: errorHandler(err)
                });
            } else {

                res.send({
                    err: null,
                    accountType: accountType,
                    region: region,
                    summonerID: summonerID,
                    displayName: displayName,
                    profileURL: profileURL,
                    tier: tier,
                    division: division,
                    lp: lp,
                    decayMessage: decayMessage
                });
            }
        }) //end async.waterfall

    }); //end app.get
}
