(function(){

    /**
     * Class HomeHue
     * Main app
     */

    var HomeHue = function() {
        this.template = {};
        this.box = {};
        this.timerAppCallback = [];
        this.timerAppInterval = 0;
        this.sleepInterval = 0;

        this.HUE_CONST = {
            LIGHTS: "/allLight",
            STATE: "/light/"
        };
    };

    HomeHue.prototype.init = function() {
        if (!this.checkRequired()) {
            throw "Error: required (jQuery) are not present";
        }

        this.getTemplate();
        this.getHue();

        this.timerAppCallback.push(this.getHue.bind(this));
        this.timerAppInterval = setInterval(this.timerApp.bind(this), 1000);
    };

    HomeHue.prototype.getTemplate = function() {
        try{
            this.template = {
                box: document.getElementsByClassName("HHBox")[0],
                boxOnOff: null,
                boxGoSleep: null,
                boxWakeUp: null
            };

            this.template.box.parentNode.removeChild(this.template.box);
        } catch (e) {
            this.log("HomeHue Error: getTemplate -->", e);
        }
    };

    HomeHue.prototype.getHue = function() {
        this.get(function(data) {
            this.domUpdateHue(JSON.parse(data));
        });
    };

    HomeHue.prototype.domUpdateHue = function(hue) {
        function returnState(box, data) {
            var d = JSON.parse(data);
            box.setOnOff(d.state.on);
        }

        for (var lightId in hue) {
            if (hue.hasOwnProperty(lightId) && !this.box[hue[lightId].name]) {
                var box = this.box[hue[lightId].name] = new Box(hue[lightId].name, lightId, this);
                box.append(document.body);
            }

            this.get(returnState.bind(this, this.box[hue[lightId].name]), lightId);
        }
    };

    HomeHue.prototype.setHueOnOff = function() {
        this.app.set(this.setOnOff.bind(this, !this.getOnOff()), this.id, {
            "on": !this.getOnOff()
        });
    };

    HomeHue.prototype.sleepLight = function() {
        //var time = 180000;
        var time = 90000;
        function createInterval(data) {
            var bri = JSON.parse(data).state.bri;
            var step = time / bri;

            this.sleepInterval = setInterval(function(){
                bri--;
                this.app.set(function() {}, this.id, {"bri": bri});
                if (bri === 0) {
                    this.app.setHueOnOff.bind(this)();
                    clearInterval(this.sleepInterval);
                }
            }.bind(this), step);
        }

        this.app.get(createInterval.bind(this), this.id);
    };

    HomeHue.prototype.get = function(callback, light) {
        var url;

        //if light, get the status of one light in particular
        if (light) {
            url = this.HUE_CONST.STATE + light;
        } else {
        //else get all lights names
            url = this.HUE_CONST.LIGHTS;
        }

        $.get(url, null, callback.bind(this));
    };

    HomeHue.prototype.set = function(callback, light, data) {
        var url = this.HUE_CONST.STATE + light;
        $.get(url, "data=" + JSON.stringify(data), callback.bind(this));
    };

    HomeHue.prototype.checkRequired = function() {
        if (!$ || !window.XMLHttpRequest) {
            this.log("HomeHue Error: checkRequired --> $ not present");
            return false;
        }

        return true;
    };

    HomeHue.prototype.log = function() {
        if (window.console && window.console.log) {
            window.console.log.apply(window.console, arguments);
        }
    };

    HomeHue.prototype.timerApp = function() {
        for (var i in this.timerAppCallback) {
            if (this.timerAppCallback.hasOwnProperty(i)) {
                this.timerAppCallback[i]();
            }
        }
    };

    /**
     * Class Box
     * Light container with control button
     */

    var Box = function(name, id, app) {
        if (!name || !app || !id) {
            console.log("Box Error: constructor --> name, app or id are not present");
            return;
        }

        this.app = app;
        this.id = id;
        this.wrapper = app.template.box.cloneNode(true);
        this.boxOnOff = this.wrapper.getElementsByClassName("HHBoxOnOff")[0];
        this.boxGoSleep = this.wrapper.getElementsByClassName("HHBoxGoSleep")[0];

        this.init(name);
    };

    Box.prototype.init = function(name) {
        this.setName(name);
        $(this.boxOnOff).on("click", this.app.setHueOnOff.bind(this));
        $(this.boxGoSleep).on("click", this.app.sleepLight.bind(this));
    };

    Box.prototype.append = function(parent) {
        if (parent && parent.appendChild) {
            parent.appendChild(this.wrapper);
        } else {
            this.app.log("Box Error: append --> Box.parent not present");
        }
    };

    Box.prototype.remove = function() {
        if (this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        } else {
            this.app.log("Box Error: remove --> Box.parentNode not present");
        }
    };

    Box.prototype.getName = function() {
        return this.boxOnOff.firstChild.innerHTML;
    };

    Box.prototype.setName = function(name) {
        this.boxOnOff.firstChild.innerHTML = name.toUpperCase();
    };

    Box.prototype.setOnOff = function(on) {
        if (!on && this.boxOnOff.className.indexOf("success") !== -1) {
            this.boxOnOff.className = this.boxOnOff.className.replace("success", "danger");
        } else if (on && this.boxOnOff.className.indexOf("danger") !== -1) {
            this.boxOnOff.className = this.boxOnOff.className.replace("danger", "success");
        }
    };

    Box.prototype.getOnOff = function() {
        if (this.boxOnOff.className.indexOf("success") !== -1) {
            return true;
        } else {
            return false;
        }
    };

    var app = new HomeHue();
    app.init();

})();
