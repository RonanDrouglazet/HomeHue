var express = require("express");
var http = require("http");

var homehue = express();

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
            res.write(response);
            res.send();
        });
    }
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
 * Start to listen
 */
homehue.listen(process.env.PORT || 8080);
