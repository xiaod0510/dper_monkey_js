// ==UserScript==
// @name         shopAutoRef
// @namespace    http://xiaod0510.github.io/
// @version      3.4
// @description  try to take over the world!
// @author       You
// @match        https://a.dper.com/shops
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/xiaod0510/dper_monkey_js/master/shop.v2.js
// @require      http://code.jquery.com/jquery-2.1.4.min.js
// ==/UserScript==

(function () {
    'use strict';
    if (location.href.indexOf("cpublic") < 0) {
        return;
    }
    /**flag 1:console 2:title 4:notify 8:mail*/
    function logger(msg,flag,extInfo) {
        flag=flag||3;
        if(flag&1){
            console.log(msg);
        }
        if(flag&2){
            document.title = sUI.conf.curUserName + " " + msg;
        }
        if(flag&4){
            GM_notification(extInfo);
        }
        if(flag&8){
            GM_xmlhttpRequest({
                method: "POST",
                url: "http://127.0.0.1/mail.lua",
                data: msg,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                onload: function(response) {
                    logger(response.responseText,1|2|4);
                }
            });
        }
    }

    //事件驱动器
    var EventLoop = function (loopunit) {
        /*
         var $e={
         cb:function(){},
         args:{},//回调函数
         loop:10,//循环总次数
         pass:10,
         limit:10//间隔次数
         };
         */
        this.stoped = true;
        this.loopunit = loopunit || 50;//loop最小时间单元(毫秒)
        this.eventQueue = [];
        this.run = function () {
            if (this.stoped) return;
            var event = this.eventQueue.shift();
            //事件单次调用
            if (event == null) {
                return;
            }
            if (!$.isNumeric(event.pass)) return;
            if (!$.isNumeric(event.loop)) return;
            if (!$.isNumeric(event.limit)) return;

            event.pass -= 1;
            if (event.pass <= 0) {
                event.cb.call(event);
                event.loop--;
                event.pass = event.limit;
            }
            if (event.loop <= 0) {
                return;
            }
            //loop未归零,则继续将事件放入队列
            this.eventQueue.push(event);

        };
        this.start = function () {
            $(".stShopInfo").remove();
            this.startTime = new Date();
            this.stoped = false;
            //通过setInterval实现事件循环
            var self = this;
            if (self.interval == null) {
                self.interval = setInterval(function () {
                    self.run();
                }, self.loopunit);
            }
            logger("loop started");
        };
        this.stop = function () {
            this.stoped = true;
            this.eventQueue = [];
            //clearInterval(this.interval);
            logger("loop stopped");
        };
        this.reg = function (event) {
            event.pass = event.limit;
            this.eventQueue.push(event);
            logger("loop event add :" + event.desc);
        };
        return this;

    };

    //ui初始化
    var initEvent = {
        loop: 1,
        limit: 20,
        desc: "初始化UI",
        cb: function (event) {
            try {
                logger("stSerachCFG");
                sUI.stSearchCfg.click();
                sUI.ownerShop();
                loop.reg(researchEvent.build());
            } catch (e) {
                logger(e);
            }
        }
    };
    //刷新事件
    var researchEvent = {
        desc: "重新搜索...",
        cb: function () {
            if (!sUI.conf.stStart) {
                this.loop = 0;
                return;
            }
            /**时间段*/
            var now = new Date();
            var curHour = now.getHours();
            var curDay = now.getDay();
            if (curHour >= 22 || curHour <= 8 || curDay === 0) {
                logger("休息时间段");
                loop.reg(delayEvent.build());
                sUI.ownerShop();
                return;
            }
            try{
                var notOnline = sUI.stNotOnline.value;
                if(eval(notOnline)==1){
                    logger("不在线单店已满:"+notOnline);
                    loop.reg(delayEvent.build());
                    return;
                }
            }catch(e){}
            this.loadStatus = this.loadStatus || 0;
            switch (this.loadStatus) {
                case 0:
                    this.loop++;
                    var isLoading = $("div:contains('加载中...')").parent().parent().parent().parent().last();
                    isLoading.css("display", "block");
                    $("button:contains('查询')").click();
                    this.loadStatus = 1;
                    logger("点击查询按钮");
                    return;
                case 1:
                    //判断数据是否加载完毕
                    this.loop++;
                    logger("判断是否加载完成");
                    var isLoading = $("div:contains('加载中...')").parent().parent().parent().parent().last();
                    if (isLoading.css("display") != "none") {
                        logger("尚未加载成功");
                        return;
                    }
                    this.loadStatus = 2;
                    logger("加载完成");
                    return;

            }
            this.loadStatus = 0;

            if (this.loop <= 1) {
                loop.reg(delayEvent.build());
            }
            logger("查找店铺信息");

            sUI.stTimes.value = this.loop;
            //获取店铺Id
            var shops = findShopId();
            //校验是否有新店铺
            if (oldShops.length === 0) {
                oldShops = shops;
            } else {
                var minus = shops.minus(oldShops);
                if (minus.length !== 0) {
                    logger("找到新店铺");
                    if (sUI.conf.stImport) {
                        for (var i = 0; i != minus.length; i++) {
                            //直接点击导入
                            var ime = importEvent.build(1, 1, [minus[i]]);
                            ime.cb();
                        }
                    }
                    oldShops = shops;
                    loop.reg(this);
                    return;
                }
            }
            logger(this.desc + sUI.stTimes.value);

        },
        build: function () {
            var e = $.extend({}, this);
            e.loop = parseInt(sUI.conf.stTimes);
            e.limit = parseInt(sUI.conf.stLimit / loop.loopunit);
            return e;
        }
    };
    /**
     * 自动导入
     * @type {{cb: cb}}
     */
    var importEvent = {
        loop: 1,
        limit: 1,
        desc: "自动导入",
        cb: function () {
            var shopId = this.args[0];
            var baseSelector = "span[data-reactid*=" + shopId + "]";
            var shopName = $(baseSelector).first().text();
            if (shopName.length === 0) {
                shopName = "unknow";
            }
            var importBtn = $(baseSelector + ":contains('导入')");
            var $importBtn = [];
            importBtn.each(function (n, d) {
                if ($(this).text() == "导入") {
                    $importBtn = $(this);
                }
            });
            if ($importBtn.length === 0) {
                return;
            }
            var assNewer = importBtn.parent().parent().last().prev();
            if (assNewer.text().indexOf("变更为") > 0) {
                return;
            }
            importBtn.click();
            sUI.found.push({
                id: shopId,
                name: shopName
            });
        },
        build: function (loop, limit, args) {
            var e = $.extend({}, this);
            e.loop = loop;
            e.limit = limit;
            e.args = args;
            return e;
        }
    };
    var delayEvent = {
        loop: 1,
        limit: 1,
        desc: "延时",
        cb: function () {
            sUI.stDelay.value = this.loop;
            logger("倒计" + this.loop + "秒");
            if (this.loop <= 1) {
                logger("延时结束:" + this.start + "---" + new Date());
                sUI.stTimes.value = sUI.conf.stTimes;
                sUI.stDelay.value = sUI.conf.stDelay;
                loop.reg(researchEvent.build());
            }

        },
        build: function (sec) {
            var e = $.extend({}, this);
            sec = sec || parseInt(sUI.conf.stDelay);
            e.limit = 1000 / loop.loopunit;
            e.loop = parseInt(sec);
            e.start = new Date();
            logger(JSON.stringify(e));
            return e;
        }
    };
    /**
     * 获取shopId
     * @returns {Array}
     */
    var oldShops = [];

    function findShopId() {
        var shops = {};
        var spanShopLb = $("span:contains('导入')", "body > div:nth-child(6) > div > div.container___37ruD > div:nth-child(4)");
        spanShopLb.each(function (n, d) {
            var reactid = $(this).attr("data-reactid");
            if (reactid === null) {
                return;
            }
            var mch = /\$(\d+)\./.exec(reactid);
            if (mch == null || mch.length != 2) {
                return;
            }
            shops[mch[1] + ""] = 0;
        });
        var result = [];
        for (var s in shops) {
            result.push(s);
        }
        return result;
    }

    //mock error
    (function () {
        Promise.$$reject = Promise.reject;
        Promise.reject = function () {
            if (arguments.length == 1) {
                var msg = arguments[0].message;
                console.log("promise.reject:" + msg);
                if (sUI.conf.stStart && msg == "您访问过于频繁，请稍后访问！") {
                    loop.stop();
                    loop.reg(delayEvent.build(60 * 3));
                    loop.start();
                }
                try {
                    if (msg == "导入成功") {
                        var info = sUI.found.shift();
                        if (info != null) {
                            logger("自动导入:" + info.name + "," + info.id);
                            $("<div class='stShopInfo'><a href='https://a.dper.com/shop/view?shopId=" + info.id + "&ist=20&sty=-1' >" + info.id + " : " + info.name + "</a></div>")
                                .appendTo($("#stPanel"));
                            var notify={
                                title: "成功导入到[ " + sUI.conf.curUserName + " ]名下",
                                text: "店铺名:[" + info.id + "]" + info.name + ",不在线单店个数"+sUI.stNotOnline.value,
                                highlight: true,
                                timeout: 1000 * 36000,
                                image: "https://a.dper.com/menus/static/img/logo.png",
                                onclick: function () {
                                    window.open("https://a.dper.com/shop/view?shopId=" + info.id + "&ist=20&sty=-1");
                                }
                            };
                            logger(notify.title + notify.text, 1 | 2 | 4 | 8, notify);
                        }
                        sUI.stMusic.play();
                    }
                } catch (e) {
                    alert(e);
                }
                sUI.ownerShop();
            }

            setTimeout(function () {
                document.querySelector("body > div:nth-child(5) > div > div > div:nth-child(1)").click();
            }, 2500);
            return Promise.$$reject.call(this, arguments[0]);
        };
        Array.prototype.minus = function (arr) {
            var result = new Array();
            var obj = {};
            for (var i = 0; i < arr.length; i++) {
                obj[arr[i]] = 1;
            }
            for (var j = 0; j < this.length; j++) {
                if (!obj[this[j]]) {
                    obj[this[j]] = 1;
                    result.push(this[j]);
                }
            }
            return result;
        };
    })();

    var settingHtml="<div id='stPanel' style='position: fixed;top:40px;right:20px;z-index:10000;'>\n" +
        "    <audio id='stMusic' autobuffer='autobuffer' autoplay='autoplay'>\n" +
        "        <source src='data:audio/mp3;base64,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qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqCAAHUAA/A/qqTEFNRTMuOTkuNaqqqv/7EMTfAMEgGUUABMJgJAWoYFAJTKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqggAB1hTxtVMQU1FMy45OS41VVVV//sQxN0BwRgXRwAFImAUhWhUIAkWVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjk5LjVVVVX/+xDE3QDBGCtFAoBKYBUAKJQAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMTcgMDAAUagAAAgGIAo4AAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxNmDwGwXQAAAYGAMAugAAIxMVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+xDE2oHAmANGoAAAIA4AaJQAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMTZgcCYA0SgAAAwBYBoQAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxNYDwAAB/gAAACAAAD/AAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=' />\n" +
        "    </audio>\n" +
        "    <button id='stBtn' class='eg eg-sm eg-btn eg-btn-sm' style='float:right;'>?</button>\n" +
        "    <table style='display:none;background-color: #ee5511;float:right;' id='stTable'>\n" +
        "        <tr>\n" +
        "            <td>开始</td>\n" +
        "            <td><input id='stStart' type='checkbox'><lable for='stStart'>&nbsp;&nbsp;</lable></td>\n" +
        "        </tr>\n" +
        "        <tr>\n" +
        "            <td>自动导入</td>\n" +
        "            <td><input id='stImport' type='checkbox' ><lable for='stImport'>&nbsp;&nbsp;</lable></td>\n" +
        "        </tr>\n" +
        "        <tr>\n" +
        "            <td>丽人默认搜索条件</td>\n" +
        "            <td><input id='stSearchCfg' type='button' value='重置'></input></td>\n" +
        "        </tr>\n" +
        "        <tr>\n" +
        "            <td>刷新间隔(毫秒)</td>\n" +
        "            <td><input id='stLimit' type='text' value='200'></td>\n" +
        "        </tr>\n" +
        "        <tr>\n" +
        "            <td>刷新次数</td>\n" +
        "            <td><input id='stTimes' type='text' value='1'></td>\n" +
        "        </tr>\n" +
        "        <tr>\n" +
        "            <td>刷新延时(秒)</td>\n" +
        "            <td><input id='stDelay' type='text' value='5'></td>\n" +
        "        </tr>\n" +
        "        <tr>\n" +
        "            <td style=\"color:blue;\">不在线单店</td>\n" +
        "            <td><input id='stNotOnline' style=\"cursor:pointer;\" type='text' value='0/15' readonly=readonly></td>\n" +
        "        </tr>\n" +
        "    </table>\n" +
        "</div>";
    var SettingUI = function () {
        var self = this;
        this.conf = {};
        this.init = function () {
            var container = $("<div>").append(settingHtml).appendTo(document.body);
            this.stStart = $("#stStart").get(0);
            this.stBtn = $("#stBtn").get(0);
            this.stMusic = $("#stMusic").get(0);
            this.stLimit = $("#stLimit").get(0);
            this.stTimes = $("#stTimes").get(0);
            this.stImport = $("#stImport").get(0);
            this.stDelay = $("#stDelay").get(0);
            this.stSearchCfg = $("#stSearchCfg").get(0);
            this.stNotOnline = $("#stNotOnline").get(0);
            this.found = [];
            this.conf = {
                stLimit: this.stLimit.value,
                stTimes: this.stTimes.value,
                stDelay: this.stDelay.value,
                stImport: (this.stImport.checked == "checked" || this.stImport.checked === true),
                curUserName: $(".header span:contains(你好，)").prev().text()
            };
            this.loadConf = function () {
                try {
                    if (localStorage) {
                        var sUIcfg = localStorage.sUIcfg;
                        if (sUIcfg !== null) {
                            this.conf = $.extend(this.conf, JSON.parse(sUIcfg));
                            delete this.conf.stStart;
                            delete this.conf.stImport;
                            for (var key in this.conf) {
                                try {
                                    this[key].value = this.conf[key];
                                } catch (e) {
                                }
                            }
                        }
                    }
                } catch (e) {
                }
            };
            this.loadConf();
            this.storeConf = function () {
                if (localStorage) {
                    var sUIcfg = JSON.stringify(this.conf);
                    localStorage.sUIcfg = sUIcfg;
                }
            };
            this.stSearchCfg.onclick = function () {
                document.getElementById("header").style.display = 'none';
                document.body.style.marginTop = "-150px";
                document.body.style.marginLeft = "-200px";
                //default search arguments
                var data = {
                    "dynamicCondition": {"shopStatus": ["hasPhoneNo", "newshop"]},
                    "condition": {
                        "mainCategory": 2,
                        "category": [702, 47, 701, 444, 38, 39, 42, 386],
                        "mainRegion": -1,
                        "region": [],
                        "ownerType": 1,
                        "city": 2,
                        "sortBy": -1
                    },
                    "pagination": {"isRequested": false, "isRequesting": false, "isEnd": false, "index": 1, "size": 10},
                    "honeycomb": {"distance": 5, "type": "cpsscore"}
                };
                var url = "https://a.dper.com/shops#/shops/cpublic?data=" + encodeURI(JSON.stringify(data));
                location.replace(url);
            };
            this.stBtn.onclick = function () {
                self.toggle();
            };
            this.stNotOnline.onclick = function(){
                this.value="0/15";
                self.ownerShop();
            };
            this.stStart.onclick = function () {
                self.conf.stStart = this.checked;
                if (this.checked) {
                    loop.reg(researchEvent.build());
                    loop.start();
                    document.body.style.marginTop = "-400px";
                } else {
                    loop.stop();
                    sUI.loadConf();
                    document.body.style.marginTop = "-200px";
                }
                self.toggle();
            };
            this.stDelay.onchange = function () {
                self.conf.stDelay = this.value;
                self.storeConf();
            };
            this.stLimit.onchange = function () {
                self.conf.stLimit = this.value;
                self.storeConf();
            };
            this.stTimes.onchange = function () {
                self.conf.stTimes = this.value;
                self.storeConf();
            };
            this.stImport.onchange = function () {
                self.conf.stImport = (this.checked == "checked" || this.checked === true);
                self.storeConf();
            };
        };
        this.toggle = function () {
            var stTable = $("#stTable").get(0);
            if (stTable.style.display === "block") {
                stTable.style.display = "none";
            } else {
                stTable.style.display = "block";
            }
        };
        this.ownerShop=function(){
            $.ajax({
                type: "POST",
                url: "https://a.dper.com/shop/__cascade__?cascade=Shop.ownerShop",
                processData: false,
                contentType: 'application/json',
                data: '[{"type":"Shop","category":"ownerShop","as":"counts","params":{},"children":[]}]',
                success: function(r) {
                    try{
                        var n=r.data.counts.userPrivateRotateCountDTOs["0"].notOnlineSingleRotateGroupCount;
                        var nlimit=r.data.counts.userPrivateRotateCountDTOs["0"].notOnlineSingleRotateGroupCountLimit;
                        self.stNotOnline.value=(n+"/"+nlimit);
                        if(n==nlimit){
                            var notify={
                                title: "私海已满",
                                text: "[不在线单店]个数:"+n+"/"+nlimit,
                                highlight: true,
                                timeout: 1000 * 36000,
                                image: "https://a.dper.com/menus/static/img/logo.png"
                            };

                            logger(notify.title + notify.text, 1 | 2 | 4, notify);
                        }
                    }catch(e){}
                }
            });

        };
        return this;
    };

    var sUI = new SettingUI();
    sUI.init();
    var loop = new EventLoop(50);
    loop.reg(initEvent);
    loop.start();

})();
