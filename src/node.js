var express = require("express");
var http = require("http");

var homehue = express();

homehue.get("/", function(req, res) {
    res.sendfile("views/index.html");
})
.get("/dist/*", function(req, res) {
    res.sendfile("." + req.url);
})
.get("/allLight", function(req, res) {
    //console.log("GET --> /allLight");
    createHueLightRequest("GET", null, "", function(response) {
        res.write(response);
        res.send();
    });
})
.get("/light/:id", function(req, res) {
    //console.log("SET --> /light/" + req.params.id);
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
.use(function(req, res, next){
    console.log(req.url);
    res.setHeader("Content-Type", "text/plain");
    res.send(404, "Page Introuvable");
});

function createHueLightRequest (method, path, body, success) {
    var options = {
      hostname: '192.168.1.12',
      path: '/api/homehueappjs/lights/' + (path ? path : ""),
      method: method
    };

    var req = http.request(options, function(res) {
        var data = "";
        res.on('data', function (chunk) {
            //console.log('RESPONSE DATA --> ' + chunk);
            data += chunk;
        })
        .on('end', function() {
            //console.log('RESPONSE COMPLETE --> ' + data);
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

homehue.listen(process.env.PORT || 8080);
