(function(){

    /**
     * Class HomeHue
     * Main app
     */

    var HomeHue = function() {
        this.hueIp = "http://192.168.1.12/";
        this.hueUser = "homehueappjs";
        this.template = {};
        this.box = {};

        this.HUE_CONST = {
            API: "api/",
            LIGHTS: "/lights/",
            STATE: "/state"
        };
    };

    HomeHue.prototype.init = function() {
        if (!this.checkRequired()) {
            throw "Error: required (jQuery) are not present";
        }

        this.getTemplate();
        this.getHue();
    };

    HomeHue.prototype.getTemplate = function() {
        try{
            this.template = {
                box: document.getElementsByClassName("HHBox")[0],
                boxOnOff: null
            };

            this.template.box.parentNode.removeChild(this.template.box);
        } catch (e) {
            this.log("HomeHue Error: getTemplate -->", e);
        }
    };

    HomeHue.prototype.getHue = function() {
        this.get(function(data) {
            this.log("HomeHue: getHue -->", data);
            this.domUpdateHue(data);
        });
    };

    HomeHue.prototype.domUpdateHue = function(hue) {
        for (var lightId in hue) {
            if (hue.hasOwnProperty(lightId) && !this.box[hue[lightId].name]) {
                var box = this.box[hue[lightId].name] = new Box(hue[lightId].name, lightId, this);
                box.append(document.body);
            }
        }
    };

    HomeHue.prototype.setHueOnOff = function() {
        this.app.set(this.setOnOff.bind(this, !this.getOnOff()), this.id, {
            "on": !this.getOnOff()
        });
    };

    HomeHue.prototype.get = function(callback, light) {
        var url;

        //if light, get the status of one light in particular
        if (light) {
            url = this.hueIp + this.HUE_CONST.API + this.hueUser + this.HUE_CONST.LIGHTS + light;
        } else {
        //else get all lights names
            url = this.hueIp + this.HUE_CONST.API + this.hueUser + this.HUE_CONST.LIGHTS;
        }

        $.get(url, null, callback.bind(this));
    };

    HomeHue.prototype.set = function(callback, light, data) {
        var url = "http://localhost:8080/light/" + light;
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

    /**
     * Class Box
     * Light container with control button
     */

    var Box = function(name, id, app) {
        if (!name || !app || !id) {
            this.log("Box Error: constructor --> name, app or id are not present");
            return;
        }

        this.app = app;
        this.id = id;
        this.wrapper = app.template.box.cloneNode(true);
        this.boxOnOff = this.wrapper.getElementsByClassName("HHBoxOnOff")[0];

        this.init(name);
    };

    Box.prototype.init = function(name) {
        this.setName(name);
        $(this.boxOnOff).on("click", this.app.setHueOnOff.bind(this));
    };

    Box.prototype.append = function(parent) {
        if (parent && parent.appendChild) {
            parent.appendChild(this.wrapper);
        } else {
            this.log("Box Error: append --> Box.parent not present");
        }
    };

    Box.prototype.remove = function() {
        if (this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        } else {
            this.log("Box Error: remove --> Box.parentNode not present");
        }
    };

    Box.prototype.getName = function() {
        return this.boxOnOff.firstChild.innerHTML;
    };

    Box.prototype.setName = function(name) {
        this.boxOnOff.firstChild.innerHTML = name;
    };

    Box.prototype.setOnOff = function(on) {
        if (!on && this.boxOnOff.className.indexOf("success") !== -1) {
            this.boxOnOff.className = this.boxOnOff.className.replace("success", "danger");
        } else if (this.boxOnOff.className.indexOf("danger") !== -1) {
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
