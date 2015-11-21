var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'jade');
app.set('port', (process.env.PORT || 5000));
app.use(express.static('public'));

var CronJob = require('cron').CronJob;


var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 120);

var moment = require('moment');
require('moment-range');

var iconv = require('iconv-lite');

var request = require('request');
var defaultImg = 'http://probablyprogramming.com/wp-content/uploads/2009/03/handtinytrans.gif';
var img = defaultImg;

var mongoose = require('mongoose');
var CREDENTIALS = process.env.credentials;
mongoose.connect('mongodb://' + CREDENTIALS + '@ds057204.mongolab.com:57204/loldecay-db');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

//DATABASE SCHEMA SETUP
var PlayerSchema = mongoose.Schema({
  summoner_id: String,
  account_name: String,
  account_region: String,
  email: String,
  days_left: Number
})

var Player = mongoose.model('Player', PlayerSchema);



var summonerByNameVersion = '1.4';
var leagueVersion='2.5';
var matchListVersion = '2.2';


var API_KEY = process.env.apikey;

var nodemailer = require('nodemailer')
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'loldecay.alerts@gmail.com',
        pass: process.env.emailpassword
    }
}, {
    from: 'LoLDecay <loldecay.alerts@gmail.com>'
});
/*
transporter.sendMail({
  to: 'roland.zeng@gmail.com',
  subject:'hi',
  text:'hello world'

})
*/


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
        str += hexstr;
        if (i != buf.length-1) {str += '%'};
      }
      str = str.toUpperCase();
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
              if (typeof(resp[NAME]) === 'undefined')
                res.render('index', {o_img:defaultImg, o_msg:'Could not find summoner! Perhaps recent name change?'});
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
              } //end else statement for checking for recently-changed names
            } //end url1 else statement

          }); //end url1 makeRequest
        }//end makeRequest0 else statement
      })//end makeRequest0
    }); //end rate limiting
  } //end special characters check else statement
}); //end app.post

app.get('/changelog',function (req, res) {
  res.render('changelog');
})

app.get('/notify',function (req, res) {
  res.render('notify');
})

app.post('/notify',function(req,res) {

  var NAME = req.body.register_name;
  var REGION = req.body.register_region;
  var EMAIL = req.body.register_email;
  var message;
  //message = NAME + ' ' + EMAIL;
  //res.render('verify', {o_msg:message});

  if (/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/.test(NAME) || NAME == "") {
    message = "Please enter valid summoner name. Result not stored.";
    res.render('verify', {o_msg:message});
  }
  else {
    NAME = NAME.toLowerCase().replace(/\s+/g, '');
    var str = '%';
    var buf = iconv.encode(NAME, 'utf-8');
    for (i = 0; i < buf.length; i++) {

      var hexstr = buf[i].toString(16);
      str += hexstr;
      if (i != buf.length-1) {str += '%'};
    }
    str = str.toUpperCase();

    var URL1 = 'https://' + REGION + '.api.pvp.net/api/lol/' + REGION + '/v' + summonerByNameVersion + '/summoner/by-name/' + str + '?api_key=' + API_KEY;
    makeRequest(URL1, function(code, resp){
      switch (code) {
        case -1:
          if (typeof(resp[NAME]) === 'undefined') {
            message = "Please enter valid summoner name. Result not stored.";
            res.render('verify', {o_msg:message});
          }
          else {
            var summonerName = resp[NAME]['name'];
            var summonerNameRegion = summonerName + '     ' + '[' + REGION.toUpperCase() + ']';
            var summonerID = resp[NAME]['id'];
            //message = summonerNameRegion + ' ' + summonerID;
            //res.render('verify',{o_msg:message});

            var URL2 = 'https://' + REGION + '.api.pvp.net/api/lol/' + REGION + '/v' + leagueVersion + '/league/by-summoner/' + summonerID + '/entry?api_key=' + API_KEY;
            makeRequest(URL2, function(code, resp){
              switch (code) {
                case -1:
                  var summonerTier = resp[summonerID]['0']['tier'];
                  var summonerPlayerOrTeamName = resp[summonerID]['0']['entries']['0']['playerOrTeamName'];
                  if (summonerPlayerOrTeamName != summonerName) {
                    message = 'This account does not need to worry about solo queue decay! Result not stored.';
                    res.render('verify', {o_msg:message});
                  }
                  else if (summonerTier == "BRONZE" || summonerTier == "SILVER" || summonerTier == "GOLD" ) {
                    message = 'Bronze, Silver, and Gold accounts do not decay. Result not stored.';
                    res.render('verify', {o_msg:message});

                  }
                  else {
                    var URL3 = 'https://' + REGION + '.api.pvp.net/api/lol/' + REGION + '/v' + matchListVersion + '/matchlist/by-summoner/' + summonerID + '?rankedQueues=RANKED_SOLO_5x5&beginIndex=0&endIndex=1&api_key=' + API_KEY;
                    makeRequest(URL3, function(code, resp) {
                      switch (code) {
                        case -1:
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
                          if (daysTillDecay <= 0) daysTillDecay = 0;
                          //info to store in DB: summoner ID, email, summonerNameRegion, daysTillDecay

                          //first, search if the email we want is already in the db.

                          var pl = new Player();

                          pl.account_name = summonerNameRegion;
                          pl.account_region = REGION;
                          pl.email = EMAIL;
                          pl.days_left = daysTillDecay;
                          pl.summoner_id = summonerID;
                          pl.save(function(err) {
                            if (err)
                              res.render('verify', {o_msg:'Unexpected error: Data not saved. Please contact creator.'});
                            else {
                              console.log('saved to db successfully');
                              console.log(summonerNameRegion +' ' + REGION + ' ' + summonerID + ' ' + daysTillDecay + ' ' + EMAIL);

                              var delete_link="http://www.loldecay.com/delete/" + (pl._id).toString();
                              console.log(delete_link);

                              var html =
                              "<h4>This is an automated message.</h4>" +
                              "<p>Click <a href=" + delete_link + ">here</a> to unsubscribe from further notifications.</p>" +
                              "<br><p>Account name: " + summonerNameRegion + "</p>" +
                              "<p>Days until decay: " + daysTillDecay + "</p>" +
                              "<br><p>You will be reminded when you are within five days of decay.</p>";


                              transporter.sendMail({
                                to: EMAIL,
                                subject:'LoLDecay Alerts enabled',
                                html: html
                              })


                              res.render('verify', {o_msg:message, m1:summonerNameRegion, m2:EMAIL, success:true});
                            }
                          });


                        break; //break of makerequest url3 -1 case

                        case 404:
                          message = 'No solo queue games found. Result not stored.';
                          res.render('verify', {o_msg:message});
                          break;

                        default:
                          message = '[3] Error ' + code + ' : Result not stored.'
                          res.render('verify', {o_msg:message});
                      } //end of switch statement for url3
                    });
                  }

                break; //break statement for url2 switch statement

                case 404:
                  message = 'Summoner not ranked. Result not stored.';
                  res.render('verify', {o_msg:message});
                  break;

                default:
                  message = '[2] Error ' + code + ' : Result not stored.'
                  res.render('verify', {o_msg:message});
              } //end switch statement for url2 code
            }); //end of makeRequest for url2


          } //end of else statement for checking for recently-changed names

          break; //break statement for url1 switch statement

        case 404:
          message = 'Could not find summoner. Result not stored.';
          res.render('verify', {o_msg:message});
          break;

        default:
          message = '[1] Error ' + code + ' : Result not stored.'
          res.render('verify', {o_msg:message})

      } //end switch statement for url1 code
    }); //end makeRequest for url1
  } //end special characters check


})

app.get('/about',function (req, res) {
  res.render('about');
})

app.get('/delete/:obj_id', function(req,res) {
  var query = {'_id' : req.params.obj_id};

  Player.remove(query, function(err,result) {
    if (err)
      console.log("error deleting a player");
    else {
      console.log('player deleted');
      res.render('delete');
    }
  });
})

function decayCheck(id, region, callback){
  //any input that goes in here will be a valid ranked account

  //first have to check the current ranking (for example, if master dropped into diamond)

  var URL1 = 'https://' + region + '.api.pvp.net/api/lol/' + region + '/v' + leagueVersion + '/league/by-summoner/' + id + '/entry?api_key=' + API_KEY;
  //console.log(URL1);

  makeRequest(URL1, function(code, resp){
    //console.log(code);
    //console.log(resp);

    switch(code) {
      case -1:
        var summonerTier = resp[id]['0']['tier'];
        var URL2 = 'https://' + region + '.api.pvp.net/api/lol/' + region + '/v' + matchListVersion + '/matchlist/by-summoner/' + id + '?rankedQueues=RANKED_SOLO_5x5&beginIndex=0&endIndex=1&api_key=' + API_KEY;
        //console.log(URL2);
        makeRequest(URL2, function(code, resp) {
          switch (code) {
            case -1:
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
              if (daysTillDecay < 0) daysTillDecay = 0;

              callback(-1,daysTillDecay)
              break;
            default:
              console.log('fatal error. no idea what happened but we\'re not going to return anything.');
              callback(99);
          } //end of switch for url2
        });
        break;
      default:
        console.log('fatal error. no idea what happened but we\'re not going to return anything.');
        callback(99);
    } // end of switch for first makerequest


  });

  var URL2 = 'https://' + region + '.api.pvp.net/api/lol/' + region + '/v' + matchListVersion + '/matchlist/by-summoner/' + id + '?rankedQueues=RANKED_SOLO_5x5&beginIndex=0&endIndex=1&api_key=' + API_KEY;
  makeRequest(URL2, function(code, resp) {


  });
}

var job = new CronJob('00 00 0 * * *', function() {
  console.log('Running daily job -- ');

  Player.find(function(err,match) {
    if(err)
      console.log('fatal error. nothing will happen.');
    else {
      var i = 0;
      while (match[i] !== undefined) {

        (function(x) {
          var accID = match[x]['summoner_id'];
          var accRegion = match[x]['account_region'];

          decayCheck(accID, accRegion, function(code,res){
            //console.log(code);
            switch(code) {
              case -1:
                //console.log(match[x]['account_name'] + ' == ' + match[x]['days_left']);
                //match[x]['days_left'] = 99;
                Player.findOne({'summoner_id': accID}, function(err,match){
                  if (code == -1) {
                    match.days_left = res;

                    match.save(function (err) {
                      if(err)
                        console.log('could not save new decay time for existing account');
                      else {
                        console.log('decay time updated for account : ' + match.account_name + '. New: ' + match.days_left);
                        var delete_link="http://www.loldecay.com/delete/" + (match._id).toString();
                        var html;

                        if (match.days_left <= 5 && match.days_left > 0) {
                          html =
                              "<h4>This is an automated message.</h4>" +
                              "<p>Click <a href=" + delete_link + ">here</a> to unsubscribe from further notifications.</p>" +
                              "<br><p>Account name: " + match.account_name + " has " + match.days_left + " days left until decay - Go play a game!</p>";
                          transporter.sendMail({
                            to: match.email,
                            subject:'LolAlert - Account decaying soon!',
                            html: html
                          });
                        }
                        if (match.days_left == 0) {
                          html =
                              "<h4>This is an automated message.</h4>" +
                              "<p>Click <a href=" + delete_link + ">here</a> to unsubscribe from further notifications.</p>" +
                              "<br><p>Account name: " + match.account_name + " is already decaying! Go play a game!</p>";
                              transporter.sendMail({
                                to: match.email,
                                subject:'LolAlert - Account decaying now!',
                                html: html
                              });

                        }
                
                        msg = 'This is an automated message.\nAccount: ' + match.account_name + '\nDays until decay: ' + match.days_left;
                        transporter.sendMail({
                          to: 'roland.zeng@gmail.com',
                          subject:'Daily roll call',
                          text: msg
                        });

                      }
                    });
                  }
                  else {
                    console.log('error in decaytimer function. response code: ' + code);
                  }

                });

                break;
              default:
                console.log('something bad happened. we shouldn\'t be here');
            }
          });
        })(i);
        i++;
      }

    }
  });

  }, function() {
    console.log('cron job stopped');
  },
  true,
  'America/Los_Angeles'
);



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
