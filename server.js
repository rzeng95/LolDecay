var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'jade');
app.set('port', (process.env.PORT || 5000));
app.use(express.static('public'));

var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 120);

var moment = require('moment');
require('moment-range');

var iconv = require('iconv-lite');

var request = require('request');
var defaultImg = 'http://probablyprogramming.com/wp-content/uploads/2009/03/handtinytrans.gif';
var img = defaultImg;


var summonerByNameVersion = '1.4';
var leagueVersion='2.5';
var matchListVersion = '2.2';


var API_KEY = process.env.apikey;

app.get('/changelog',function (req, res) {
  res.render('changelog');
});
app.get('/contact',function (req, res) {
  res.render('contact');
});
app.get('/about',function (req, res) {
  res.render('about');
});

app.get('/', function (req, res) {
  res.render('index', {o_img:defaultImg});
});

app.post('/', function (req, res) {

  var NAME = req.body.input_summoner;

  if (/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/.test(NAME) || NAME == "") {
    message = "Please enter valid summoner name";
    res.render('index', {o_img:defaultImg, o_msg:message});
  }

  else {

    limiter.removeTokens(1, function() {
      NAME = NAME.toLowerCase().replace(/\s+/g, '');

      var str = '%';
      var buf = iconv.encode(NAME, 'utf-8');
      for (i = 0; i < buf.length; i++) {

        var hexstr = buf[i].toString(16);
        //console.log(i + ' ' + buf[i] + ' | ' + hexstr);
        str += hexstr;
        if (i != buf.length-1) {str += '%'};
      }
      str = str.toUpperCase();
      //console.log(str);
      var message;

      var URL0 = 'https://ddragon.leagueoflegends.com/realms/na.json'
      makeRequest(URL0, function(code,resp){

        if (code != -1) {
          message = 'Error! Something wrong happened with ddragon static files site'
          res.render('index', {o_img:defaultImg, o_msg:message})
        }
        else {
          var profileIconVersion = resp['n']['profileicon'];

          var REGION = req.body.input_region;
          var URL1 = 'https://' + REGION + '.api.pvp.net/api/lol/' + REGION + '/v' + summonerByNameVersion + '/summoner/by-name/' + str + '?api_key=' + API_KEY;

          makeRequest(URL1, function(code, resp) {
            if (code != -1) {
              if (code == 400) {
                  message = "[1] Error 400: Bad request made. Whoops...";
              }
              else if (code == 401) {
                message = "[1] Out-of-date API key. Whoops...";
              }
              else if (code == 404) {
                message = "Could not find summoner!";
              }
              else if (code == 429) {
                message = "Rate limit exceeded! Whoops...";
              }
              else if (code == 500) {
                message = "[1] Error 500 : Internal issues with Riot's API servers. Try again in a few minutes.";
              }
              else if (code == 503) {
                message = "[1] Error 503 : Riot's API servers unavailable. Try again in a few minutes.";
              }
              else {
                message = "Unexpected error (1) : " + code;
              }
              res.render('index', {o_img:defaultImg, o_msg:message});
            }
            else {
              var summonerName = resp[NAME]['name'];
              var summonerNameRegion = summonerName + '     ' + '[' + REGION.toUpperCase() + ']';
              var summonerID = resp[NAME]['id'];
              var summonerIcon = resp[NAME]['profileIconId'];

              img = "http://ddragon.leagueoflegends.com/cdn/" + profileIconVersion + "/img/profileicon/" + summonerIcon + ".png";
              //console.log(summonerID);
              var URL2 = 'https://' + REGION + '.api.pvp.net/api/lol/' + REGION + '/v' + leagueVersion + '/league/by-summoner/' + summonerID + '/entry?api_key=' + API_KEY;
              makeRequest(URL2, function(code, resp){

                if (code != -1) {
                  if (code == 400) {
                    message = "[2] Error 400: Bad request made. Whoops...";
                    res.render('index', {o_img:defaultImg, o_msg:message});
                  }
                  else if (code == 401) {
                    message = "[2] Error 401: Bad API key. Whoops...";
                    res.render('index', {o_img:defaultImg, o_msg:message});
                  }

                  else if (code == 404) {
                    message = "You don\'t need to worry about solo queue decay!";
                    res.render('index', {o_img:img, o_name:summonerNameRegion, o_rank:'Unranked', o_msg:message});
                  }
                  else if (code == 429) {
                    message = "Rate limit exceeded! Whoops...";
                    res.render('index', {o_img:defaultImg, o_msg:message});
                  }
                  else if (code == 500) {
                    message = "[2] Error 500 : Internal issues with Riot's API servers. Try again in a few minutes.";
                    res.render('index', {o_img:defaultImg, o_msg:message});
                  }
                  else if (code == 503) {
                    message = "[2] Error 503 : Riot's API servers unavailable. Try again in a few minutes.";
                    res.render('index', {o_img:defaultImg, o_msg:message});
                  }
                  else {
                    message = "Unexpected error (2) : " + code;
                    res.render('index', {o_img:img, o_msg:message});
                  }
                }
                else {

                  var summonerTier = resp[summonerID]['0']['tier'];
                  var summonerDivision = resp[summonerID]['0']['entries']['0']['division'];
                  var summonerLP = resp[summonerID]['0']['entries']['0']['leaguePoints'];
                  var summonerRank = summonerTier + ' ' + summonerDivision + ' ' + summonerLP + ' LP';

                  var summonerPlayerOrTeamName = resp[summonerID]['0']['entries']['0']['playerOrTeamName'];
                  if (summonerPlayerOrTeamName != summonerName) {
                    summonerRank = 'Unranked';
                    message = 'You don\'t need to worry about solo queue decay!';
                    res.render('index', {o_img:img, o_name:summonerNameRegion, o_rank:summonerRank, o_msg:message});
                  }
                  else if (summonerTier == "BRONZE" || summonerTier == "SILVER" || summonerTier == "GOLD" ) {
                    message = 'Bronze, Silver, and Gold accounts do not decay.';
                    res.render('index', {o_img:img, o_name:summonerNameRegion, o_rank:summonerRank, o_msg:message});

                  }
                  else {

                    var URL3 = 'https://' + REGION + '.api.pvp.net/api/lol/' + REGION + '/v' + matchListVersion + '/matchlist/by-summoner/' + summonerID + '?rankedQueues=RANKED_SOLO_5x5&beginIndex=0&endIndex=1&api_key=' + API_KEY;
                    makeRequest(URL3, function(code, resp) {
                      if (code != -1) {
                        if (code == 404) {
                          message = "No solo queue games found!";
                          res.render('index', {o_img:img, o_name:summonerNameRegion, o_msg:message});
                        }
                        else if (code == 429) {
                          message = "Rate limit exceeded! Whoops...";
                          res.render('index', {o_img:defaultImg, o_name:summonerNameRegion, o_msg:message});
                        }
                        else if (code == 500) {
                          message = "[3] Error 500 : Internal issues with Riot's API servers. Try again in a few minutes.";
                          res.render('index', {o_img:defaultImg, o_msg:message});
                        }
                        else if (code == 503) {
                          message = "[3] Error 503 : Riot's API servers unavailable. Try again in a few minutes.";
                          res.render('index', {o_img:defaultImg, o_msg:message});
                        }

                        else {
                          message = "Unexpected error (3) : " + code;
                          res.render('index', {o_img:img, o_name:summonerNameRegion, o_msg:message});
                        }
                      }
                      else {

                        var lastPlayedDate = resp['matches'][0]['timestamp'];

                        var date = new Date (lastPlayedDate);
                        var date2 = new Date ();

                        var daterange = moment.range(date, date2);
                        var diff = daterange.diff('days');
                        var daysTillDecay;
                        if (summonerTier == "MASTER" || summonerTier == "CHALLENGER") {
                          daysTillDecay = 9 - diff;
                        }
                        else {
                          daysTillDecay = 27 - diff;
                        }



                        if (daysTillDecay > 0 && daysTillDecay < 2) {
                          message = "You are within 2 days of decaying. Play now!";
                        }
                        else if (daysTillDecay < 0) {
                          message = "You are decaying. Oh no!";
                        }
                        else {
                          message = daysTillDecay + " days until you decay!";
                        }
                        res.render('index', {o_img:img, o_name:summonerNameRegion, o_rank:summonerRank, o_msg:message});

                      } //end url3 else statement
                    }); //end url3 makeRequest
                  } //end check for player or team else statement

                } //end url2 else statement
              }); //end url2 makeRequest

            } //end url1 else statement

          }); //end url1 makeRequest
        }//end makeRequest0 else statement
      })//end makeRequest0
    }); //end rate limiting
  } //end special characters check else statement
}); //end app.post


function makeRequest(url, callback) {
  request(url, function (err, res, body) {
        var result;
        var code;

        if (!err && res.statusCode == 200) {
          result = JSON.parse(body);
          code = -1;
        }
        else {
          code = res.statusCode;
          result = "";
          if (res.statusCode == "429") console.log("429");
        }
        callback(code, result);
      });
}

app.listen(app.get('port'), function() {
  console.log('App is running on port', app.get('port'));
});
