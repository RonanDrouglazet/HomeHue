(function(){

    /**
     * Class HomeHue
     * Main app
     */

    var HomeHue = function() {
        this.template = {};
        this.box = {};
        this.timerAppInterval = null;
        this.sleepInterval = null;

        this.HUE_CONST = {
            LIGHTS: "/allLight",
            STATE: "/light/:id",
            SLEEP: "/sleep/:id"
        };
    };

    HomeHue.prototype.init = function() {
        if (!this.checkRequired()) {
            throw "Error: required (jQuery) are not present";
        }

        this.getTemplate();
        this.getHue();

        this.timerAppInterval = setInterval(this.getHue.bind(this), 1000);
    };

    HomeHue.prototype.getTemplate = function() {
        try{
            this.template = {
                box: document.getElementsByClassName("HHBox")[0]
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
            box.setSlider(d.state.bri);

            var sleepProgress = d.sleepTimer ? (d.sleepTimer.actual * 100) / d.sleepTimer.bri : 0;
            box.setSleepProgress(sleepProgress);
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
        var url = this.app.HUE_CONST.SLEEP.replace(":id", this.id);
        $.get(url + "?" + Date.now(), null, null);
    };

    HomeHue.prototype.get = function(callback, light) {
        var url;

        //if light, get the status of one light in particular
        if (light) {
            url = this.HUE_CONST.STATE.replace(":id", light);
        } else {
        //else get all lights names
            url = this.HUE_CONST.LIGHTS;
        }

        $.get(url + "?" + Date.now(), null, callback ? callback.bind(this) : null);
    };

    HomeHue.prototype.set = function(callback, light, data) {
        var url = this.HUE_CONST.STATE.replace(":id", light);
        $.get(url + "?" + Date.now(), "data=" + JSON.stringify(data), callback ? callback.bind(this) : null);
    };

    HomeHue.prototype.checkRequired = function() {
        if (!$) {
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
            console.log("Box Error: constructor --> name, app or id are not present");
            return;
        }

        this.app = app;
        this.id = id;
        this.wrapper = app.template.box.cloneNode(true);
        this.boxOnOff = this.wrapper.getElementsByClassName("HHBoxOnOff")[0];
        this.boxGoSleep = this.wrapper.getElementsByClassName("HHBoxGoSleep")[0];
        this.boxGoSleepProgress = null;
        this.slider = this.wrapper.getElementsByTagName("input")[0];
        this.isSliding = false;
        this.intervalDraging = null;

        this.init(name);
    };

    Box.prototype.init = function(name) {
        this.setName(name);
        $(this.boxOnOff).on("click", this.app.setHueOnOff.bind(this));
        $(this.boxGoSleep).on("click", this.app.sleepLight.bind(this));
    };

    Box.prototype.append = function(parent) {
        parent.appendChild(this.wrapper);

        //init slider on append and not on init because off tootip bug placement if slider ar not in the DOM
        $(this.slider).slider();
        $(this.slider).slider().on("slideStart", this.beginSlide.bind(this));
        $(this.slider).slider().on("slideStop", this.endSlide.bind(this));
    };

    Box.prototype.beginSlide = function() {
        //prevent external setSlider call impossible to not disturb draging (when refreshing status for example)
        this.isSliding = true;
        //prevent from too many app call with a classic updating method on slide event
        this.intervalDraging = setInterval(function() {
            this.app.set(null, this.id, {"bri": this.getSlider()});
        }.bind(this), 500);
    };

    Box.prototype.endSlide = function() {
        this.isSliding = false;
        clearInterval(this.intervalDraging);
        this.intervalDraging = null;
        this.app.set(null, this.id, {"bri": this.getSlider()});
    };

    Box.prototype.remove = function() {
        this.wrapper.parentNode.removeChild(this.wrapper);
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

    Box.prototype.setSleepProgress = function(progress) {
        if (!this.boxGoSleepProgress) {
            this.boxGoSleepProgress = this.wrapper.getElementsByClassName("progress-bar")[0];
        }

        $(this.boxGoSleepProgress).css('width', progress+'%').attr('aria-valuenow', progress);

        if (parseInt(progress) === 0) {
            this.boxGoSleepProgress.parentNode.style.opacity = "0";
            $(this.boxGoSleepProgress).css('width', '100%');
        } else {
            this.boxGoSleepProgress.parentNode.style.opacity = "1";
        }
    };

    Box.prototype.getSleepProgress = function() {
        return parseInt(this.boxGoSleepProgress.style.with);
    };

    Box.prototype.setSlider = function(value) {
        if (!this.isSliding) {
            $(this.slider).slider('setValue', value);
        }
    };

    Box.prototype.getSlider = function() {
        return $(this.slider).slider('getValue');
    };

    var app = new HomeHue();
    app.init();

})();
