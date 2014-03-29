var express = require("express");
var http = require("http");

var homehue = express();
var sleepObject = {};

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
        createHueLightRequest("PUT", req.params.id + "/state", req.query.data, function(response) {
            res.write(response);
            res.send();
        });
    } else {
        createHueLightRequest("GET", req.params.id, "", function(response) {
            if (sleepObject[req.params.id] && sleepObject[req.params.id].sleepInterval) {
                response = JSON.parse(response);
                response.sleepTimer = {
                    "bri": sleepObject[req.params.id].bri,
                    "actual": sleepObject[req.params.id].actual
                };
                response = JSON.stringify(response);
            }
            res.write(response);
            res.send();
        });
    }
})

/*
 * START / STOP sleep on one light
 */
.get("/sleep/:id", function(req, res) {
    if (!sleepObject[req.params.id]) {
    //if not exist, create it
        sleepObject[req.params.id] = {};
    }

    if (sleepObject[req.params.id].sleepInterval) {
    //if already running, stop it
        clearInterval(sleepObject[req.params.id].sleepInterval);
        sleepObject[req.params.id].sleepInterval = null;
    } else {
    //else, create sleep timer
        createSleepTimer(req.params.id, sleepObject[req.params.id]);
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

function createSleepTimer(lightId, sleepObject) {
    createHueLightRequest("GET", lightId, "", function (data) {
        sleepObject.time = 90000;
        sleepObject.bri = JSON.parse(data).state.bri;
        sleepObject.step = sleepObject.time / sleepObject.bri;
        sleepObject.actual = sleepObject.bri;

        sleepObject.sleepInterval = setInterval(function(){
            sleepObject.actual--;
            createHueLightRequest("PUT", lightId + "/state", JSON.stringify({"bri": sleepObject.actual}), null);
            if (sleepObject.actual === 0) {
                createHueLightRequest("PUT", lightId + "/state", JSON.stringify({"on": false}), null);
                clearInterval(sleepObject.sleepInterval);
                sleepObject.sleepInterval = null;
            }
        }, sleepObject.step);
    });
}

/*
 * Start to listen
 */
homehue.listen(process.env.PORT || 8080);
