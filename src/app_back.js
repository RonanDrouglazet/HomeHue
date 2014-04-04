var express = require("express");
var http = require("http");
var fs = require("fs");

var homehue = express();
var timerObject = {};
var userConf = null;
var hue = {
    SLEEP: "sleep",
    SLEEP_INC: -1,
    SLEEP_END: 0,
    WAKEUP: "wakeup",
    WAKEUP_INC: 1,
    WAKEUP_END: 255,
    STATE: "/state"
};


/*
 * GET state of server / check User.conf
 */
homehue.get("/state", function(req, res) {
    //always check user conf first
    readUserConf(function(data) {
        res.write(JSON.stringify({
            "state": data ? "ok" : "noUserConf"
        }));

        res.send();
    }, true);
})

/*
 * GET / SET user info on User.conf
 */
.get("/userInfo", function(req, res) {
    if (req.query.hue_ip) {
        fs.writeFile("User.conf", JSON.stringify(req.query), function (err) {
            if (err) {
                res.send(404);
                throw err;
            }
            res.send();
        });
    } else {
        readUserConf(function(data) {
            res.write(JSON.stringify(data));
            res.send();
        });
    }
})

/*
 * GET all light status
 */
.get("/allLight", function(req, res) {
    //always check user conf first
    readUserConf(function(data) {
        createHueLightRequest("GET", null, "", function(response) {
            res.write(response);
            res.send();
        });
    });
})

/*
 * GET / SET one light state
 */
.get("/light/:id", function(req, res) {
    //always check user conf first
    readUserConf(function(data) {
        if (req.query.data) {
            createHueLightRequest("PUT", req.params.id + hue.STATE, req.query.data, function(response) {
                res.write(response);
                res.send();
            });
        } else {
            createHueLightRequest("GET", req.params.id, "", function(response) {
                if (timerObject[req.params.id] && timerObject[req.params.id].sleepInterval) {
                    response = JSON.parse(response);
                    response.timer = {
                        "bri": timerObject[req.params.id].bri,
                        "actual": timerObject[req.params.id].actual,
                        "type": timerObject[req.params.id].type
                    };
                    response = JSON.stringify(response);
                }
                res.write(response);
                res.send();
            });
        }
    });
})

/*
 * toggle sleep / wakeup timer on one light
 */
.get("/timer/:type/:id", function(req, res) {
    //always check user conf first
    readUserConf(function(data) {
        if (req.params.type === hue.SLEEP || req.params.type === hue.WAKEUP) {
            //if not exist, create it
            if (!timerObject[req.params.id]) {
                timerObject[req.params.id] = {
                    time: (req.params.type === hue.SLEEP) ? parseInt(userConf.duration_sleep) : parseInt(userConf.duration_wakeup)
                };
            } else {
                timerObject[req.params.id].time = (req.params.type === hue.SLEEP) ? parseInt(userConf.duration_sleep) : parseInt(userConf.duration_wakeup);
            }

            //if already running, stop it
            if (timerObject[req.params.id].sleepInterval) {
                clearInterval(timerObject[req.params.id].sleepInterval);
                timerObject[req.params.id].sleepInterval = null;

                //if the current timer type are different from this new type, launch a new timer
                if (timerObject[req.params.id].type !== req.params.type) {
                    createTimer(req.params.type, req.params.id, timerObject[req.params.id]);
                }
            } else {
            //else, create a sleep / wakeup timer
                createTimer(req.params.type, req.params.id, timerObject[req.params.id]);
            }
        }

        res.send();
    });
})

/*
 * STATIC and 404
 */
.use(express.static(__dirname + "/../views"))
.use(express.static(__dirname + "/../"))
.use(function(req, res, next){
    res.setHeader("Content-Type", "text/plain");
    res.send(404, "Page Introuvable");
});

/*
 * Read user configuration
 */

function readUserConf(callback, force) {
    if (!userConf || force) {
        fs.exists("User.conf", function(exists) {
            if (exists) {
                fs.readFile("User.conf", function (err, data) {
                    if (err) {
                        throw err;
                    }

                    userConf =  JSON.parse(data);

                    if (callback) {
                        callback(userConf);
                    }
                });
            } else {
                callback(null);
            }
        });
    } else if (callback) {
        callback(userConf);
    }
}

/*
 * Create hue request with success callback
 */
function createHueLightRequest (method, path, body, success) {
    if (userConf) {
        var options = {
          hostname: userConf.hue_ip,
          path: "/api/" + userConf.user_name + "/lights/" + (path ? path : ""),
          method: method
        };

        var req = http.request(options, function(res) {
            var data = "";
            res.on("data", function (chunk) {
                data += chunk;
            })
            .on("end", function() {
                if (success) {
                    success(data);
                }
            });
        });

        req.on("error", function(e) {
            console.log("Error: " + e.message);
        });

        req.write(body);
        req.end();
    }
}

/*
 * Create hue timer for sleep or wakeup operation
 */
function createTimer(type, lightId, timerObject) {
    //first, get current bri state
    createHueLightRequest("GET", lightId, "", function (data) {
        var inc = (type === hue.SLEEP) ? hue.SLEEP_INC : hue.WAKEUP_INC; //increment, -1 for sleep and +1 for wakeup
        var end = (type === hue.SLEEP) ? hue.SLEEP_END : hue.WAKEUP_END; //end of timer, bri = 0 for sleep and 255 for wakeup
        var d = JSON.parse(data); //get an object from string data

        timerObject.actual = timerObject.bri = d.state.bri; //keep original bri
        timerObject.step = (type === hue.SLEEP) ? (timerObject.time / timerObject.bri) : (timerObject.time / (hue.WAKEUP_END - timerObject.actual)); //get how much timer step we need for operation (sleep or wakeup)
        timerObject.type = type; //keep timer current type

        //generally, when you use wakeup, light is off
        if (type === hue.WAKEUP && !d.state.on) {
            createHueLightRequest("PUT", lightId + hue.STATE, JSON.stringify({"on": true}), null);
        }

        //begin timer interval for operation (sleep or wakeup)
        timerObject.sleepInterval = setInterval(function(){

            timerObject.actual = timerObject.actual + inc; //update actual value of bri with inc
            createHueLightRequest("PUT", lightId + hue.STATE, JSON.stringify({"bri": timerObject.actual}), null); //put actual value on HUE

            //when operation is finished
            if (timerObject.actual === end) {
                //if it"s a sleep operation, turn off the light
                if (type === hue.SLEEP) {
                    createHueLightRequest("PUT", lightId + hue.STATE, JSON.stringify({"on": false}), null);
                }

                clearInterval(timerObject.sleepInterval);
                timerObject.sleepInterval = null;
            }
        }, timerObject.step);
    });
}

/*
 * Start to listen
 */
homehue.listen(process.env.PORT || 8080);
