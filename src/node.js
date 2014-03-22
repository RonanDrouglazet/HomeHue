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

})
.get("/light/:id", function(req, res, next) {
    console.log(req.query.data);
    createHueLightRequest("PUT", req.params.id + "/state", req.query.data);
    res.send(200);
})
.use(function(req, res, next){
    console.log(req.url);
    res.setHeader("Content-Type", "text/plain");
    res.send(404, "Page Introuvable");
});

function createHueLightRequest (method, path, body) {
    var options = {
      hostname: '192.168.1.12',
      path: '/api/homehueappjs/lights/' + (path ? path : ""),
      method: method
    };

    var req = http.request(options, function(res) {
      console.log('res: ' + res);
    });

    req.on('error', function(e) {
        console.log("Error: " + e.message);
    });

    req.write(body);
    req.end();
}

homehue.listen(process.env.PORT || 8080);
