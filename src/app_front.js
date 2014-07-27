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
            SLEEP: "/transition/sleep/:id",
            WAKEUP: "/transition/wakeup/:id",
            SERVER_INFO: "/serverInfo",
            ADD_TO_PLAN: "/addToPlan/:day-:hour-:minute/:action/:lights/:once",
            UPDATE_PLANNING: "/planning"
        };
    };

    HomeHue.prototype.init = function() {
        //get server state before all
        $.get(this.HUE_CONST.SERVER_STATE + "?" + Date.now(), null, function(data) {
            var d = JSON.parse(data);

            this.getTemplate();
            this.initFormUserInfo();
            this.initPlanning();

            if (d.running) {
                //go init app
                this.getHue();
                this.timerAppInterval = setInterval(this.getHue.bind(this), 1000);
                this.getUserInfo();
            } else {
                //first time ? call a form to fill user conf
                $('.collapse').collapse(); //show form
            }
        }.bind(this));
    };

    HomeHue.prototype.getTemplate = function() {
        try{
            this.template = {
                box: $(".HHBox").get(0),
                form: {
                    inputs: $(".inputForm"),
                    buttons: $(".buttonForm"),
                    btnSave: $("#BtnTestAndSave"),
                    btnPlanning: $("#BtnPlanning"),
                    hueIp: $("#inputHueIp"),
                    userName: $("#inputUserName"),
                    sleepDuration: $("#inputSleepDuration"),
                    wakeUpDuration: $("#inputWakeUpDuration"),
                    alert: $(".alert"),
                    alertForm: $("#alertFormMissField"),
                    alertUser: $("#alertUserInfo")
                },
                planning: {
                    container: $(".HHPlanning"),
                    closeButton: $(".HHPlanning #closePlanning"),
                    addButton: $(".HHPlanning #addAction"),
                    listContainer: $(".HHPlanning .list"),
                    addContainer: $(".HHPlanning .add"),
                    actions: $(".HHPlanning .chooseAction li"),
                    lights: $(".HHPlanning .chooseLight li"),
                    days: $(".chooseDay li"),
                    hours: $(".chooseHours"),
                    minutes: $(".chooseMinutes"),
                    eachButton: $(".chooseRecurent"),
                    onceButton: $(".chooseOnce")
                }
            };

            $(".HHBox").remove();
        } catch (e) {
            this.log("HomeHue Error: getTemplate -->", e);
        }
    };

    HomeHue.prototype.initFormUserInfo = function() {
        this.template.form.inputs.tooltip({container: "body"}); //active tooltip for input form
        this.template.form.buttons.tooltip({container: "body"}); //active tooltip for button form
        this.template.form.btnSave.on("click", this.testAndSaveUserInfo.bind(this));
        this.template.form.btnPlanning.on("click", this.showPlanning.bind(this));
    };

    HomeHue.prototype.getUserInfo = function() {
        $.get(this.HUE_CONST.SERVER_INFO  + "?" + Date.now(), null, function(data) {
            var d = JSON.parse(data);
            this.template.form.hueIp.get(0).value = d.hue_ip;
            this.template.form.userName.get(0).value = d.user_name;
            this.template.form.sleepDuration.get(0).value = d.duration_sleep / 1000;
            this.template.form.wakeUpDuration.get(0).value = d.duration_wakeup / 1000;
        }.bind(this));
    };

    HomeHue.prototype.testAndSaveUserInfo = function() {
        var hue = this.template.form.hueIp.get(0).value.replace("http://", ""),
        userName = this.template.form.userName.get(0).value,
        sleepDuration = this.template.form.sleepDuration.get(0).value,
        wakeUpDuration = this.template.form.wakeUpDuration.get(0).value;
        $.ajaxSetup({ timeout: 1000 }); //set request timeout to 1000ms
        this.template.form.alert.hide();

        if (hue === "" || userName === "" || sleepDuration === "" || wakeUpDuration === "") {
            this.template.form.alertForm.show();
        } else if (isNaN(sleepDuration) || isNaN(wakeUpDuration)) {
            this.template.form.alertForm.html("sleep / wake up duration must be a number").show();
        } else {
            try {
                $.get("http://" + hue + "/api/" + userName, null, function(data) {
                    //we receive an array, so it's an error
                    if (data.length && data[0].error) {
                        this.template.form.alertUser.html(data[0].error.description).show();
                    } else {
                    //all info are ok
                        $.get(this.HUE_CONST.SERVER_INFO + "?" + Date.now(), {
                            "hue_ip": hue,
                            "user_name": userName,
                            "duration_sleep": sleepDuration * 1000,
                            "duration_wakeup": wakeUpDuration * 1000
                        }, function(){ window.location.reload(); })
                        .fail(function() {
                            this.template.form.alertUser.html("server error, please try again").show();
                        });
                    }
                }.bind(this)).fail(function() {
                //request fail, hue ip are not ok
                    this.template.form.alertUser.html("fail to contact hue at http://" + hue).show();
                }.bind(this));
            } catch (e) {
                this.template.form.alertUser.html("fail to contact hue at http://" + hue).show();
            }
        }
    };

    HomeHue.prototype.initPlanning = function() {
        var t = this.template.planning;

        // get all lights from hue and fill "add action on planning" with lights
        this.get(function(data) {
            var d = JSON.parse(data);
            for (var id in d) {
                var active = id === "1" ? "active" : "";
                $(".HHPlanning .chooseLight").append("<li class='" + active + "' id='light" + id + "'><a href='#'>" + d[id].name + "</a></li>");
            }
            t.lights = $(".HHPlanning .chooseLight li");
            t.lights.click(chooseClass);
        });
        // close planning
        t.closeButton.click(this.closePlanning.bind(this));
        // click on add action button (+)
        t.addButton.click(function() {
            t.addButton.hide();
            t.addContainer.show();
        });
        // click on action (just one)
        t.actions.click(function(e) {
            e.preventDefault();
            t.actions.removeClass("active");
            $(this).addClass("active");
        });
        // click on other option (multiple allowed)
        var chooseClass = function(e) {
            e.preventDefault();
            if ($(this).hasClass("active")) {
                $(this).removeClass("active");
            } else {
                $(this).addClass("active");
            }
        };

        t.days.click(chooseClass);
        t.onceButton.click(this.addActionToPlanning.bind(this, true));
        t.eachButton.click(this.addActionToPlanning.bind(this, false));
    };

    HomeHue.prototype.showPlanning = function() {
        $(".HHBox").hide();
        $(".navbar-toggle").click();
        this.template.planning.container.css("top", "15%");

        var now = new Date();

        this.template.planning.hours.get(0).selectedIndex = now.getHours();
        this.template.planning.minutes.get(0).selectedIndex = now.getMinutes() + 1;
        $(this.template.planning.days[now.getDay()]).addClass("active");
        this.updatePlanning();
    };

    HomeHue.prototype.addActionToPlanning = function(once) {
        var action, lights = "", days = "", actionUrl,
        hours = this.template.planning.hours.get(0).selectedIndex,
        minutes = this.template.planning.minutes.get(0).selectedIndex;

        // get action id
        this.template.planning.actions.each(function(index, obj) {
            if ($(obj).hasClass("active")) {
                action = obj.id.replace("action", "");
            }
        });

        // get lights id
        this.template.planning.lights.each(function(index, obj) {
            if ($(obj).hasClass("active")) {
                lights += obj.id.replace("light", "") + "-";
            }
        });

        // get days id
        this.template.planning.days.each(function(index, obj) {
            if ($(obj).hasClass("active")) {
                days += obj.id.replace("day", "");
            }
        });

        // create action url from params
        actionUrl = this.HUE_CONST.ADD_TO_PLAN
            .replace(":day", days)
            .replace(":hour", hours)
            .replace(":minute", minutes)
            .replace(":action", action)
            .replace(":lights", lights)
            .replace(":once", (+once))
            .replace(/-\//ig, "/");

        $.get(actionUrl + "?" + Date.now(), null, function() {
            this.updatePlanning();
        }.bind(this));

        this.template.planning.addContainer.hide();
        this.template.planning.addButton.show();
    };

    HomeHue.prototype.updatePlanning = function() {
        $.get(this.HUE_CONST.UPDATE_PLANNING + "?" + Date.now(), null, function(data) {
            if (data) {
                var d = JSON.parse(data);
                this.template.planning.listContainer.html("<h3>Once</h3><ul class='list-group once'></ul><h3>Recurent</h3><ul class='list-group recurent'></ul>");

                d.forEach(function(obj, index) {
                    var action = " " + $(this.template.planning.actions[obj.action]).children("a").html();
                    var lights = " ";
                    var days = "On ";
                    var time = (obj.hour < 10 ? "0" + obj.hour : obj.hour) + ":" + (obj.minute < 10 ? "0" + obj.minute : obj.minute);

                    obj.day.split("").forEach(function(day, index) {
                        var sep = (index === obj.day.split("").length - 1) ? "" : "-";
                        days += $(this.template.planning.days[parseInt(day)]).children("a").html() + sep;
                    }.bind(this));

                    obj.lights.forEach(function(light, index) {
                        var sep = (index === obj.lights.length - 1) ? "" : ", ";
                        lights += $("#light" + light).children("a").html() + sep;
                    }.bind(this));

                    this.template.planning.listContainer.children(obj.once ? ".once" : ".recurent").append(
                        "<li class='list-group-item'><span class='glyphicon glyphicon-remove' id='" + index + "_plan'></span> " + days + action + lights + "<span class='badge'>" + time +"</span>" + "</li>"
                    );
                }.bind(this));

                var _this = this;
                $(".glyphicon-remove").click(function() {
                    $.get("/removeFromPlan/" + parseInt(this.id) + "?" + Date.now(), null, function(data) {
                        _this.updatePlanning();
                    });
                });
            }
        }.bind(this));
    };

    HomeHue.prototype.closePlanning = function() {
        $(".HHBox").show();
        this.template.planning.container.css("top", "-100%");
        this.template.planning.addButton.show();
        this.template.planning.addContainer.hide();
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
