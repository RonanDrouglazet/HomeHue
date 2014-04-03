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
            SERVER_STATE: "/state",
            LIGHTS: "/allLight",
            STATE: "/light/:id",
            SLEEP: "/timer/sleep/:id",
            WAKEUP: "/timer/wakeup/:id",
            SET_USER_INFO: "/setUserInfo"
        };
    };

    HomeHue.prototype.init = function() {
        //get server state before all
        $.get(this.HUE_CONST.SERVER_STATE, null, function(data) {
            var d = JSON.parse(data);
            this.getTemplate();

            switch(d.state) {
                //go init app
                case "ok":
                    this.getHue();
                    this.timerAppInterval = setInterval(this.getHue.bind(this), 1000);
                break;

                //first time ? call a form to fill user conf
                case "noUserConf":
                    this.getUserInfo();
                break;

                default:
                    //todo (maybe relaunch init 1s later ?)
                    throw "server error: " + data;
            }
        }.bind(this));
    };

    HomeHue.prototype.getUserInfo = function() {
        var wrapper = document.getElementById("userInfo");
        $(wrapper).toggle(); //show form
        $(".buttonForm").tooltip({container: "body"}); //active tooltip for button form
        $("#BtnTestAndSave").on("click", this.testAndSaveUserInfo.bind(this));
        //$("#BtnDemoMode").on("click", this.demoMode.bind(this)); TODO
    };

    HomeHue.prototype.testAndSaveUserInfo = function() {
        var hue = $("#inputHueIp").get(0).value.replace("http://", ""),
        userName = $("#inputUserName").get(0).value,
        sleepDuration = $("#inputSleepDuration").get(0).value,
        wakeUpDuration = $("#inputWakeUpDuration").get(0).value;
        $.ajaxSetup({ timeout: 1000 }); //set request timeout to 1000ms
        $(".alert").hide();

        if (hue === "" || userName === "" || sleepDuration === "" || wakeUpDuration === "") {
            $("#alertFormMissField").show();
        } else if (isNaN(sleepDuration) || isNaN(wakeUpDuration)) {
            $("#alertFormMissField").html("sleep / wake up duration must be a number").show();
        } else {
            try {
                $.get("http://" + hue + "/api/" + userName, null, function(data) {
                    //we receive an array, so it's an error
                    if (data.length && data[0].error) {
                        $("#alertUserInfo").html(data[0].error.description).show();
                    } else {
                    //all info are ok
                        $.get(this.HUE_CONST.SET_USER_INFO, {"hue_ip": hue, "user_name": userName, "duration_sleep": sleepDuration, "duration_wakeup": wakeUpDuration}, function(){ window.location.reload(); })
                        .fail(function() {
                            $("#alertUserInfo").html("server error, please try again").show();
                        });
                    }
                }.bind(this)).fail(function() {
                //request fail, hue ip are not ok
                    $("#alertUserInfo").html("fail to contact hue at " + hue).show();
                });
            } catch (e) {
                $("#alertUserInfo").html("fail to contact hue at http://" + hue).show();
            }
        }
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

            if (d.timer && d.timer.type === "sleep") {
                var sleepProgress = (d.timer.actual * 100) / d.timer.bri;
                box.setSleepProgress(sleepProgress);
                box.setWakeUpProgress(255);
            } else if (d.timer && d.timer.type === "wakeup") {
                var wakeUpProgress = (d.timer.actual * 100) / 255;
                box.setWakeUpProgress(wakeUpProgress);
                box.setSleepProgress(0);
            } else {
                box.setSleepProgress(0);
                box.setWakeUpProgress(255);
            }
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

    HomeHue.prototype.timerLight = function(typeUrl) {
        var url = typeUrl.replace(":id", this.id);
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
        this.boxGoSleepProgress = this.boxGoSleep.getElementsByClassName("progress-bar")[0];
        this.boxWakeUp = this.wrapper.getElementsByClassName("HHBoxWakeUp")[0];
        this.boxWakeUpProgress = this.boxWakeUp.getElementsByClassName("progress-bar")[0];
        this.slider = this.wrapper.getElementsByTagName("input")[0];
        this.isSliding = false;
        this.intervalDraging = null;

        this.init(name);
    };

    Box.prototype.init = function(name) {
        this.setName(name);
        $(this.boxOnOff).on("click", this.app.setHueOnOff.bind(this));
        $(this.boxGoSleep).on("click", this.app.timerLight.bind(this, this.app.HUE_CONST.SLEEP));
        $(this.boxWakeUp).on("click", this.app.timerLight.bind(this, this.app.HUE_CONST.WAKEUP));
    };

    Box.prototype.append = function(parent) {
        parent.appendChild(this.wrapper);
        setTimeout(function() { $(this.wrapper).css("opacity", "1"); }.bind(this), parseInt(this.id) * 100); //fix anoying issue with transition call too fast

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
        $(this.boxGoSleepProgress).css("width", progress + "%").attr("aria-valuenow", progress);

        if (parseInt(progress) === 0) {
            this.boxGoSleepProgress.parentNode.style.opacity = "0";
            $(this.boxGoSleepProgress).css("width", "100%");
        } else {
            this.boxGoSleepProgress.parentNode.style.opacity = "1";
        }
    };

    Box.prototype.getSleepProgress = function() {
        return parseInt(this.boxGoSleepProgress.style.with);
    };

    Box.prototype.setWakeUpProgress = function(progress) {
        $(this.boxWakeUpProgress).css("width", progress + "%").attr("aria-valuenow", progress);

        if (parseInt(progress) === 255) {
            this.boxWakeUpProgress.parentNode.style.opacity = "0";
            $(this.boxWakeUpProgress).css("width", "100%");
        } else {
            this.boxWakeUpProgress.parentNode.style.opacity = "1";
        }
    };

    Box.prototype.getWakeUpProgress = function() {
        return parseInt(this.boxWakeUpProgress.style.with);
    };

    Box.prototype.setSlider = function(value) {
        if (!this.isSliding) {
            $(this.slider).slider("setValue", value);
        }
    };

    Box.prototype.getSlider = function() {
        return $(this.slider).slider("getValue");
    };

    var app = new HomeHue();
    app.init();

})();
