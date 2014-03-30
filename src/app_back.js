var express = require("express");
var http = require("http");

var homehue = express();
var timerObject = {};
var hue = {
    SLEEP: "sleep",
    WAKEUP: "wakeup",
    STATE: "/state"
};

/*
 * GET all light status
 */
homehue.get("/allLight", function(req, res) {
    createHueLightRequest("GET", null, "", function(response) {
        res.write(response);
        res.send();
    });
})

/*
 * GET / SET one light state
 */
.get("/light/:id", function(req, res) {
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
})

/*
 * toggle sleep / wakeup timer on one light
 */
.get("/timer/:type/:id", function(req, res) {
    if (req.params.type === hue.SLEEP || req.params.type === hue.WAKEUP) {
        //if not exist, create it
        if (!timerObject[req.params.id]) {
            timerObject[req.params.id] = {
                time: 90000
            };
        }

        //if already running, stop it
        if (timerObject[req.params.id].sleepInterval) {
            clearInterval(timerObject[req.params.id].sleepInterval);
            timerObject[req.params.id].sleepInterval = null;

            //if the current timer type are different from this type
            if (timerObject[req.params.id].type !== req.params.type) {
                createTimer(req.params.type, req.params.id, timerObject[req.params.id]);
            }
        } else {
        //else, create sleep timer
            createTimer(req.params.type, req.params.id, timerObject[req.params.id]);
        }
    }

    res.send();
})

/*
 * STATIC and 404
 */
.use(express.static(__dirname + '/../views'))
.use(express.static(__dirname + '/../'))
.use(function(req, res, next){
    res.setHeader("Content-Type", "text/plain");
    res.send(404, "Page Introuvable");
});

/*
 * Create hue request with success callback
 */
function createHueLightRequest (method, path, body, success) {
    var options = {
      hostname: '192.168.1.12',
      path: '/api/homehueappjs/lights/' + (path ? path : ""),
      method: method
    };

    var req = http.request(options, function(res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk;
        })
        .on('end', function() {
            if (success) {
                success(data);
            }
        });
    });

    req.on('error', function(e) {
        console.log("Error: " + e.message);
    });

    req.write(body);
    req.end();
}

/*
 * Create hue timer for sleep or wakeup operation
 */
function createTimer(type, lightId, timerObject) {
    //first, get current bri state
    createHueLightRequest("GET", lightId, "", function (data) {
        var inc = (type === hue.SLEEP) ? -1 : 1; //increment, -1 for sleep and +1 for wakeup
        var end = (type === hue.SLEEP) ? 0 : 255; //end of timer, bri = 0 for sleep and 255 for wakeup
        var d = JSON.parse(data); //get an object from string data

        timerObject.actual = timerObject.bri = d.state.bri; //keep original bri
        timerObject.step = (type === hue.SLEEP) ? (timerObject.time / timerObject.bri) : (timerObject.time / (255 - timerObject.actual)); //get how much timer step we need for operation (sleep or wakeup)
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
                console.log("END");
                //if it's a sleep operation, turn off the light
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
