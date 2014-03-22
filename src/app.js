(function(){

    var HomeHue = function() {
        this.hueIp = "http://192.168.1.12/";
        this.hueUser = "newdeveloper";
        this.template = {};
        this.box = {};

        this.HUE_CONST = {
            API: "api/",
            LIGHTS: "/lights/",
            STATE: "state/"
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
                box: document.getElementsByClassName("HHbox")[0],
                boxName: null
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
                var box = this.box[hue[lightId].name] = new Box(hue[lightId].name, this.template);
                box.append(document.body);
            }
        }
    };

    HomeHue.prototype.get = function(callback, light) {
        var url;

        //if light, get the status of one light in particular
        if (light) {
            url = this.hueIp + this.HUE_CONST.API + this.hueUser + this.HUE_CONST.LIGHTS + light + this.HUE_CONST.STATE;
        } else {
        //else get all lights names
            url = this.hueIp + this.HUE_CONST.API + this.hueUser + this.HUE_CONST.LIGHTS;
        }

        jQuery.get(url, null, callback.bind(this));
    };

    HomeHue.prototype.checkRequired = function() {
        if (!jQuery || !jQuery.get) {
            this.log("HomeHue Error: checkRequired --> jQuery not present");
            return false;
        }

        return true;
    };

    HomeHue.prototype.log = function() {
        if (window.console && window.console.log) {
            window.console.log.apply(window.console, arguments);
        }
    };

    var Box = function(name, template) {
        if (!name || !template) {
            this.log("Box Error: constructor --> name or template not present");
            return;
        }

        this.wrapper = template.box.cloneNode(true);
        this.boxName = this.wrapper.getElementsByClassName("HHboxName")[0].firstChild;

        this.setName(name);
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
        return this.boxName.innerHTML;
    };

    Box.prototype.setName = function(name) {
        this.boxName.innerHTML = name;
    };

    var app = new HomeHue();
    app.init();

})();
