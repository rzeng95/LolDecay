'use strict';

const request = require('request');
const utf8 = require('utf8');
const moment = require('moment');
require('moment-range');

const RateLimiter  = require('limiter').RateLimiter;
// Dev key allows us 10 requests per 10 seconds (10 000 ms)
// Production key allows us 3000 requests per 10 seconds
const limiter = new RateLimiter(3000, 10000);

const RIOT_API_KEY = process.env.RIOT_API_KEY || require('./SECRET')['RIOT_API_KEY'];
const constants = require('./constants');
let url;
let version;
let json;

module.exports = {

    // ==============================
    // Clean the input name and utf8 encode it
    // ==============================
    processName: function(region, name, callback) {
        name = name.toLowerCase().replace(/\s+/g, '');
        name = name.replace(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/gi, '');
        let utf8name = utf8.encode(name);
        if (!name) {
            callback('Invalid Name');
        } else {
            callback(null, region, name, utf8name);
        }
    },

    // ==============================
    // Use summoner/by-name Riot API endpoint to look up summoner ID
    // ==============================
    getSummonerID: function(region, name, utf8name, callback) {
        version = constants['SUMMONER_BY_NAME_VERSION'];
        url = `https://${region}.api.pvp.net/api/lol/${region}/v${version}` + `/summoner/by-name/${utf8name}?api_key=${RIOT_API_KEY}`;

        limiter.removeTokens(1, (err, remainingRequests) => {
            request(url, (err, res, output) => {
                if (!err && res.statusCode === 200) {
                    json = JSON.parse(output)[name];
                    console.log('hello')
                    console.log(json);
                    let displayName = `${json['name']} [${region.toUpperCase()}]`;
                    if (json['summonerLevel'] < 30) {
                        callback(null, 'sub30', region, json['id'], displayName, json['profileIconId']);
                    } else {
                        callback(null, null, region, json['id'], displayName, json['profileIconId']);
                    }
                } else {
                    if (res.statusCode === 404) {
                        callback('Could not find summoner!');
                    } else {
                        callback(res.statusCode);
                    }
                }
            }); // end request
        }); //end limiter
    },


    // ==============================
    // Get the latest version of DDragon (static file repo) to find the correct profile pic URL
    // ==============================
    getDDragonVersion: function(accountType, region, summonerID, displayName, profileID, callback) {
        url = 'https://ddragon.leagueoflegends.com/realms/na.json';
        request(url, (err, res, output) => {
            if (!err && res.statusCode === 200) {
                version = JSON.parse(output)['n']['profileicon'];
                let profileURL = `http://ddragon.leagueoflegends.com/cdn/` + `${version}/img/profileicon/${profileID}.png`;

                callback(null, accountType, region, summonerID, displayName, profileURL);
            } else {
                callback('DDragon static file site isn\'t working');
            }
        });
    },

    // ==============================
    // Find the summoner's rank (tier, division, LP)
    // ==============================
    getSummonerRank: function(accountType, region, summonerID, displayName, profileURL, callback) {
        version = constants['LEAGUE_BY_SUMMONER_VERSION'];
        url = `https://${region}.api.pvp.net/api/lol/${region}/v${version}/` + `league/by-summoner/${summonerID}/entry?api_key=${RIOT_API_KEY}`;

        limiter.removeTokens(1, (err, remainingRequests) => {
            request(url, (err, res, output) => {
                if (!err && res.statusCode === 200) {
                    json = JSON.parse(output)[summonerID];
                    let found = false;
                    for (let i in json) {
                        if (json[i]['queue'] === 'RANKED_SOLO_5x5') {
                            found = true;
                            let tier = json[i]['tier'];
                            let division = json[i]['entries'][0]['division'];
                            let lp = json[i]['entries'][0]['leaguePoints'];
                            callback(null, null, region, summonerID, displayName, profileURL, tier, division, lp)
                        }
                    }
                    if (!found) callback(null, 'wrongQueue', region, summonerID, displayName, profileURL);
                } else {
                    if (res.statusCode === 404) {
                        if (accountType) {
                            callback(null, accountType, region, summonerID, displayName, profileURL, null, null, null);
                        } else {
                            callback(null, 'unranked', region, summonerID, displayName, profileURL, null, null, null);
                        }
                    } else {
                        callback(res.statusCode);
                    }
                }
            }); //end request
        }); //end limiter
    },

    // ==============================
    // Find the last solo queue game played, and calculate days till decay 
    // ==============================
    getSummonerHistory: function(accountType, region, summonerID, displayName, profileURL, tier, division, lp, callback) {

        if (!accountType) {
            version = constants['RECENT_GAME_VERSION'];
            url = `https://${region}.api.pvp.net/api/lol/${region}/v${version}/` + `matchlist/by-summoner/${summonerID}?rankedQueues=` + `TEAM_BUILDER_RANKED_SOLO&beginIndex=0&endIndex=1&api_key=${RIOT_API_KEY}`;
            limiter.removeTokens(1, (err, remainingRequests) => {
                request(url, (err, res, output) => {
                    if (!err && res.statusCode === 200) {
                        let timestamp = JSON.parse(output)['matches'][0]['timestamp'];

                        let date = new Date(timestamp);
                        let currentTime = new Date();

                        let range = moment.range(date, currentTime);
                        let diff = range.diff('days');

                        let daysTillDecay;
                        let decayMessage;
                        if (tier === 'MASTER' || tier === 'CHALLENGER') {
                            daysTillDecay = 10 - diff;
                        } else {
                            daysTillDecay = 28 - diff;
                        }

                        if (daysTillDecay > 0 && daysTillDecay < 2) {
                            decayMessage = 'You are within 2 days of decaying. Play now!';
                        } else if (daysTillDecay <= 0) {
                            decayMessage = 'Your account is currently decaying. Oh no!';
                        } else {
                            decayMessage = `${daysTillDecay} days until you decay!`;
                        }

                        callback(null, accountType, region, summonerID, displayName, profileURL, tier, division, lp, decayMessage);

                    } else {
                        if (res.statusCode === 404) {
                            callback(null, 'noGames', region, summonerID, displayName, profileURL)
                        } else {
                            callback(res.statusCode);
                        }
                    }
                }); //end request
            }); //end limiter
        } else {
            callback(null, accountType, region, summonerID, displayName, profileURL, tier, division, lp, null);
        }


    }


}
