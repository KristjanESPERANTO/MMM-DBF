/* global Module */

/* Magic Mirror
 * Module: MMM-DBF
 *
 * By Marc Helpenstein <helpi9007@gmail.com>
 * MIT Licensed.
 */

Module.register("MMM-DBF", {
    defaults: {
        updateInterval: 60000, // 1 minute
        retryDelay: 30000, // 30 seconds
        station: "Düsseldorf Hbf",
        platform: '',
        via: '',
        showApp: false,
        showArrivalTime: false,
        showRealTime: true,
        onlyArrivalTime: false,
        numberOfResults: 10,
        withoutDestination: ["test"],
        height:"600px",
		width:"400px",
    },

    requiresVersion: "2.1.0",
    
    /**
     * @description Helper function to generate API url
     * 
     * @returns {String} url
     */
    gennerateUrl: function() {
        let base_url = "https://dbf.finalrewind.org/";
        base_url+= this.config.station + "?platforms=" + this.config.platform + "&via=" + this.config.via +"&hide_opts=1";
        if (this.config.showArrivalTime) {
            base_url+="&detailed=1";
        }
        if (this.config.showRealTime) {
            base_url+="&show_realtime=1";
        }
        if (this.config.onlyArrivalTime) {
            base_url+= "&admode=dep";
        }else {
            base_url+= "&admode=dep";
        }
        return base_url;
    },

    /**
     * @description Calls updateIterval
     */
    start: function () {
        let self = this;
        let dataRequest = null;
        let dataNotification = null;

        //Flag for check if module is loaded
        this.loaded = false;
        // Schedule update timer.
        this.getData();
        console.log(this.gennerateUrl());
        //setInterval(function () {
        //    self.updateDom();
        //}, this.config.updateInterval);
    },

    /**
     * @description Gets data from dbf.finalrewind.org
     */
    getData: function () {
        let self = this;

        let urlApi = this.gennerateUrl()+"&mode=json&version=3";
        let retry = true;

        let dataRequest = new XMLHttpRequest();
        dataRequest.open("GET", urlApi, true);
        dataRequest.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    self.processData(JSON.parse(this.response));
                } else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    Log.error(self.name, this.status);
                    retry = false;
                } else {
                    Log.error(self.name, "Could not load data.");
                }
                if (retry) {
                    self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                }
            }
        };
        dataRequest.send();
    },

    /**
     * @description Schedule next update.
     * @param {int} delay - Milliseconds before next update.
     */
    scheduleUpdate: function (delay) {
        let self = this;
        console.log("scheduleUpdate");
        let nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }
        setTimeout(function () {
            self.getData();
        }, nextLoad);
        if (!this.config.showApp) {
            this.updateDom();
        }
    },

    /**
     * @description Create App Frame
     * 
     * @returns {HTMLIframeElement}
     */
    getDom: function () {
        console.log("DOM Update");
        if (this.config.showApp) {
            let iframe = document.createElement("IFRAME");
            iframe.style = "border:0";
            iframe.width = this.config.width;
            iframe.height = this.config.height;
            iframe.src =  this.gennerateUrl();
            return iframe;
        }
        let tableWrapper = document.createElement("table");
        tableWrapper.className = "small mmm-dbf-table";
        if (this.dataRequest) {
            let departures = this.dataRequest["departures"]
            console.log(departures.length);
            console.log(departures[0]);
            let tableHead= this.createTableHeader(departures);
            tableWrapper.appendChild(tableHead);   
            //let usableResults = self.removeResultsFromThePast(apiResult.raw);
            this.createTableContent(departures, tableWrapper); 
        }
        return tableWrapper;
    },

    checkDelayExist: function(departures){
        for (let index = 0; index < this.config.numberOfResults; index++) {
            console.log(departures[index]["delayDeparture"]);
            if (departures[index]["delayDeparture"]) {
                return true;
            }
        }
        return false;
    },

    /**
     * @description Creates the header for the Table
     */
    createTableHeader: function (departures) {
        let tableHead = document.createElement("tr");
        tableHead.className = 'border-bottom';

        let tableHeadValues = [
            this.translate("LINE"),
            this.translate('TRACK'),
            this.translate('DESTINATION'),
            this.translate('DEPARTURE')
        ];

        
        if(this.checkDelayExist(departures)){
            let delayClockIcon = '<i class="fa fa-clock-o"></i>';
            tableHeadValues.push(delayClockIcon);
        }

        for (let thCounter = 0; thCounter < tableHeadValues.length; thCounter++) {
            let tableHeadSetup = document.createElement("th");
            tableHeadSetup.innerHTML = tableHeadValues[thCounter];
            tableHead.appendChild(tableHeadSetup);
        }
        return tableHead;
    },

    /**
     * @param usableResults
     * @param tableWrapper
     * @returns {HTMLTableRowElement}
     */
    createTableContent: function (departures, tableWrapper) {
        let self = this;
        for (let index = 0; index < self.config.numberOfResults; index++) {

            let obj = departures[index];
            console.log(obj);
            // check destination
            if(self.config.withoutDestination.length > 0){
                let found = false;
                for (let index = 0; index < self.config.withoutDestination.length; index++) {
                    if (obj['destination'] === self.config.withoutDestination[index]) {
                        found = true;
                    }
                }
                if (found == true) {
                    // increasing numberOfResults
                    self.config.numberOfResults += 1;
                    continue;
                }
            }
            let trWrapper = document.createElement("tr");
            trWrapper.className = 'tr';
            /*
            let remainingTime = self.calculateRemainingMinutes(obj.sched_date, obj.sched_time);
            let timeValue;
            switch (self.config.displayTimeOption) {
                case 'time+countdown':
                    timeValue = obj.sched_time + " (" + remainingTime + ")";
                    break;
                case 'time':
                    timeValue = obj.sched_time;
                    break;
                default:
                    timeValue = remainingTime;
            }

            let adjustedLine = self.stripLongLineNames(obj);
            */

            let tdValues = [
                obj.train,
                obj.platform,
                obj.destination,
            ];

            if (obj.scheduledDeparture === null) {
                tdValues.push(obj.scheduledArrival);
            }else {
                tdValues.push(obj.scheduledDeparture);
            }
            
            if(this.checkDelayExist(departures)){
                if(obj.delayDeparture > 0){
                    let delay = ' +' + obj.delayDeparture;
                    tdValues.push(delay);
                }
            }

            for (let c = 0; c < tdValues.length; c++) {
                let tdWrapper = document.createElement("td");

                tdWrapper.innerHTML = tdValues[c];

                if (c === 4) {
                    tdWrapper.className = 'delay';
                }

                trWrapper.appendChild(tdWrapper);
            }
            tableWrapper.appendChild(trWrapper);
        }
    },

    /**
     * @description Define required styles.
     * @returns {[string,string]}
     */
    getStyles: function () {
        return ["MMM-DBF.css", "font-awesome.css"];
    },

    /**
     * @description Load translations files
     * @returns {{en: string, de: string}}
     */
    getTranslations: function () {
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        };
    },
    /**
     * @description Update data and send notification to node_helper
     * @param {*} data 
     */
    processData: function (data) {
        this.dataRequest = data;

        if (this.loaded === false) {
            this.updateDom(this.config.animationSpeed);
        }
        this.loaded = true;

        // the data if load
        // send notification to helper
        console.log("ProcessData");
        this.sendSocketNotification("MMM-DBF-NOTIFICATION_TEST", "data");
    },
    
    /**
     * @description Handle notification
     * @param {*} notification 
     * @param {*} payload 
     */
    socketNotificationReceived: function (notification, payload) {
        if (notification === "MMM-DBF-NOTIFICATION_TEST") {
            // set dataNotification
            this.dataNotification = payload;
            console.log(payload);
            //this.updateDom();
        }
    },
});
