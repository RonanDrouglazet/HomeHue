var express = require("express");
var http = require("http");
var fs = require("fs");

var homehue = express();

/*
 * HomeHue routing
 */
homehue.get("/state", getServerState)
.get("/serverInfo", serverInfo)
.get("/allLight", getAllLightStatus)
.get("/addToPlan/:date/:action/:lights/:once", addActionOnPlanning)
.get("/removeFromPlan/:id", removeActionOnPlanning)

.get("/transition/:type/:id", function(req, res) {
    lightTransition(req.params.type, req.params.id);
    res.send();
})

.get("/light/:id", function(req, res) {
    light(req.params.id, req.query.data, function(response) {
        res.write(response);
        res.send();
    });
})

.get("/planning", function(req, res) {
    res.write(JSON.stringify(serverConf.planning));
    res.send();
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

// ==================================================
// HomeHue app
// ==================================================

var transitions = {};
var serverConf = null;
var hue = {
    SLEEP: "sleep",
    SLEEP_INC: -1,
    SLEEP_END: 0,
    WAKEUP: "wakeup",
    WAKEUP_INC: 1,
    WAKEUP_END: 255,
    STATE: "/state",
    PLANNED_ACTION: {
        OFF: 0,
        ON: 1,
        WAKEUP: 2,
        SLEEP: 3
    }
};

// ======================================
// LIGHTS
// ======================================

/*
 * GET / SET one light state
 */
function light(id, data, done) {
    //always check user conf first
    getServerConf(function(conf) {
        if (data) {
            createHueLightRequest("PUT", id + hue.STATE, data, function(response) {
                if (done) {
                    done(response);
                }
            });
        } else {
            createHueLightRequest("GET", id, "", function(response) {
                //if we have a timer running on this light, put this information on response for front side
                if (transitions[id] && transitions[id].sleepInterval) {
                    response = JSON.parse(response);
                    response.timer = {
                        "bri": transitions[id].bri,
                        "actual": transitions[id].actual,
                        "type": transitions[id].type
                    };
                    response = JSON.stringify(response);
                }
                if (done) {
                    done(response);
                }
            });
        }
    });
}

/*
 * GET all light status
 */
function getAllLightStatus(req, res) {
    //always check user conf first
    getServerConf(function(data) {
        createHueLightRequest("GET", null, "", function(response) {
            res.write(response);
            res.send();
        });
    });
}

// ======================================
// SERVER CONF / STATUS
// ======================================

/*
 * GET / SET server info on Server.conf
 */
function serverInfo(req, res) {
    if (req.query.hue_ip) {
        for (var i in req.query) {
            serverConf[i] = req.query[i];
        }
        writeServerConf(function() {
            res.send();
        });
    } else {
        getServerConf(function(data) {
            res.write(JSON.stringify(data));
            res.send();
        });
    }
}

function writeServerConf(done) {
    fs.writeFile("Server.conf", JSON.stringify(serverConf), function(err) {
        if (done) {
            done(err);
        }
    });
}

/*
 * GET state of server / check Server.conf
 */
function getServerState(req, res) {
    //always check user conf first
    getServerConf(function(data) {
        res.write(JSON.stringify({
            "running": data ? true : false
        }));

        res.send();
    }, true);
}

/*
 * Read server configuration
 */
function getServerConf(callback, force) {
    if (!serverConf || force) {
        fs.exists("Server.conf", function(exists) {
            if (exists) {
                fs.readFile("Server.conf", function (err, data) {
                    if (err) {
                        throw err;
                    }

                    serverConf =  JSON.parse(data);

                    if (!serverConf.planning) {
                        serverConf.planning = [];
                    }

                    if (callback) {
                        callback(serverConf);
                    }
                });
            } else {
                callback(null);
            }
        });
    } else if (callback) {
        callback(serverConf);
    }
}

// ======================================
// LIGHT TRANSITION
// ======================================

/*
 * toggle sleep / wakeup timer on one light
 */
function lightTransition(type, id) {
    //always check user conf first
    getServerConf(function(data) {
        if (type === hue.SLEEP || type === hue.WAKEUP) {
            //if not exist, create it
            if (!transitions[id]) {
                transitions[id] = {
                    time: (type === hue.SLEEP) ? parseInt(serverConf.duration_sleep) : parseInt(serverConf.duration_wakeup)
                };
            } else {
                transitions[id].time = (type === hue.SLEEP) ? parseInt(serverConf.duration_sleep) : parseInt(serverConf.duration_wakeup);
            }

            //if already running, stop it
            if (transitions[id].sleepInterval) {
                clearInterval(transitions[id].sleepInterval);
                transitions[id].sleepInterval = null;

                //if the current timer type are different from this new type, launch a new timer
                if (transitions[id].type !== type) {
                    createLightTransition(type, id, transitions[id]);
                }
            } else {
            //else, create a sleep / wakeup timer
                createLightTransition(type, id, transitions[id]);
            }
        }
    });
}

/*
 * Create hue timer for sleep or wakeup operation
 */
function createLightTransition(type, lightId, transitions) {
    //first, get current bri state
    createHueLightRequest("GET", lightId, "", function (data) {
        var inc = (type === hue.SLEEP) ? hue.SLEEP_INC : hue.WAKEUP_INC; //increment, -1 for sleep and +1 for wakeup
        var end = (type === hue.SLEEP) ? hue.SLEEP_END : hue.WAKEUP_END; //end of timer, bri = 0 for sleep and 255 for wakeup
        var d = JSON.parse(data); //get an object from string data

        //generally, when you use wakeup, light is off
        if (type === hue.WAKEUP && !d.state.on) {
            createHueLightRequest("PUT", lightId + hue.STATE, JSON.stringify({"on": true}), null);
            transitions.actual = transitions.bri = 1; //we want to wake up smoothly :) if the light was on bri 250 when switch off, if we switch on they go directly to previous value
        } else {
            transitions.actual = transitions.bri = d.state.bri; //keep original bri
        }

        //get how much timer step we need for operation (sleep or wakeup)
        transitions.step = (type === hue.SLEEP) ? (transitions.time / transitions.bri) : (transitions.time / (hue.WAKEUP_END - transitions.actual));
        transitions.type = type; //keep timer current type

        //begin timer interval for operation (sleep or wakeup)
        transitions.sleepInterval = setInterval(function(){

            transitions.actual = transitions.actual + inc; //update actual value of bri with inc
            createHueLightRequest("PUT", lightId + hue.STATE, JSON.stringify({"bri": transitions.actual}), null); //put actual value on HUE

            //when operation is finished
            if (transitions.actual === end) {
                //if it"s a sleep operation, turn off the light
                if (type === hue.SLEEP) {
                    createHueLightRequest("PUT", lightId + hue.STATE, JSON.stringify({"on": false}), null);
                }

                clearInterval(transitions.sleepInterval);
                transitions.sleepInterval = null;
            }
        }, transitions.step);
    });
}

// ======================================
// PLANNING
// ======================================

function addActionOnPlanning(req, res) {
    var date = req.params.date.split("-");

    getServerConf(function(conf) {
        conf.planning.push({
            day: date[0],
            hour: parseInt(date[1]),
            minute: parseInt(date[2]),
            action: parseInt(req.params.action),
            lights: req.params.lights.split("-"),
            once: !!parseInt(req.params.once)
        });

        writeServerConf(function() {
            res.send();
        });
    });
}

function removeActionOnPlanning(req, res) {
    var index = parseInt(req.params.id);
    getServerConf(function(conf) {
        conf.planning.splice(index--, 1);
        writeServerConf();
        res.send();
    });
}

function doPlannedAction(plan, index) {
    switch (plan.action) {
        case hue.PLANNED_ACTION.ON:
        case hue.PLANNED_ACTION.OFF:
            plan.lights.forEach(function(lightId, index) {
                light(lightId, JSON.stringify({"on": !!plan.action}));
            });
        break;

        case hue.PLANNED_ACTION.WAKEUP:
        case hue.PLANNED_ACTION.SLEEP:
            plan.lights.forEach(function(lightId, index) {
                lightTransition(plan.action === hue.PLANNED_ACTION.WAKEUP ? hue.WAKEUP : hue.SLEEP, lightId);
            });
        break;
    }

    // if once, remove it from planning
    if (plan.once) {
        getServerConf(function(conf) {
            conf.planning.splice(index--, 1);
            writeServerConf();
        });
    }
}

function checkForPlannedAction() {
    var now = new Date();
    getServerConf(function(conf) {
        conf.planning.forEach(function(plan, index) {
            if (plan.day.indexOf(now.getDay().toString()) !== -1 &&
                plan.hour === now.getHours() &&
                plan.minute === now.getMinutes()) {
                doPlannedAction(plan, index);
            }
        });
    }); 
}

function initPlanning() {
    //TODO check if we have some plan to do with files

    setInterval(checkForPlannedAction, 60000);
}

initPlanning();

// ======================================
// HUE REQUEST
// ======================================

/*
 * Create hue request with success callback
 */
function createHueLightRequest (method, path, body, success) {
    getServerConf(function(conf) {
        var options = {
          hostname: conf.hue_ip,
          path: "/api/" + conf.user_name + "/lights/" + (path ? path : ""),
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
    });
}

/*
 * Start to listen
 */
homehue.listen(process.env.PORT || 8080);
