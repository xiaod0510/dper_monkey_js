// ==UserScript==
// @name         shopAutoRef
// @namespace    http://xiaod0510.github.io/
// @version      3.2
// @description  try to take over the world!
// @author       You
// @match        https://a.dper.com/shops
// @grant        GM_notification
// @updateURL    https://raw.githubusercontent.com/xiaod0510/dper_monkey_js/master/shop.v2.js
// @require      http://code.jquery.com/jquery-2.1.4.min.js
// ==/UserScript==

(function () {
    'use strict';
    if (location.href.indexOf("cpublic") < 0) {
        return;
    }
    var dbg = true;

    function logger(msg) {
        if (dbg !== undefined && dbg) {
            if (msg.indexOf('倒计') < 0)
                console.log("\t\t\t\t\t\t\t\t\t\t\t\t\t\t" + msg);
            document.title = sUI.conf.curUserName + " " + msg;
        }
    }

    //事件驱动器
    var EventLoop = function (loopunit) {
        /*
         var $e={
         cb:function(){},
         args:{},//回调函数
         loop:10,//循环总次数
         $pass:10,
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
            if (!$.isNumeric(event.$pass)) return;
            if (!$.isNumeric(event.loop)) return;
            if (!$.isNumeric(event.limit)) return;
            // if (!$.isNumeric(event.tmTicket)) return;
            // var now = new Date().getTime();
            // var tmLimit = now - event.tmTicket;

            //如果时间间隔小于loopunit 则跳过本次操作
            // if (tmLimit < this.loopunit){
            //     this.eventQueue.push(event);
            //     return;
            // }

            event.$pass -= 1;//parseInt(tmLimit / loopunit);
            // event.tmTicket = now - (tmLimit % loopunit);
            if (event.$pass <= 0) {
                event.cb.call(event);
                event.loop--;
                event.$pass = event.limit;
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
        this.eventPush = function (event) {
            // event.tmTicket = new Date().getTime();
            this.eventQueue.push(event);
        };
        this.reg = function (event) {
            event.$pass = event.limit;
            this.eventPush(event);
            logger("loop event add :" + event.desc);
        };
        return this;

    };

    //ui初始化
    var initEvent = {
        loop: 1,
        limit: 20,
        desc: "init UI",
        cb: function (event) {
            try {
                sUI.stSearchCfg.click();
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
            this.loadStatus=this.loadStatus||0;
            switch (this.loadStatus){
                case 0:
                    this.loop++;
                    var isLoading = $("div:contains('加载中...')").parent().parent().parent().parent().last();
                    isLoading.css("display","block");
                    $("button:contains('查询')").click();
                    this.loadStatus=1;
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
                    this.loadStatus=2;
                    logger("加载完成");
                    return;

            }
            logger("查找店铺信息");
            this.loadStatus=0;

            if (this.loop <= 1) {
                loop.reg(delayEvent.build());
            }
            if (new Date().getHours() == 21) {
                sUI.stStart.click();
                loop.stop();
            }

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
            console.log("assNewer:" + assNewer.text());
            if (assNewer.text().indexOf("变更为") > 0) {
                return;
            }
            importBtn.click();
            logger("自动导入:" + shopName + "," + shopId);

            $("#stPanel").append("<div class='stShopInfo'><a href='https://a.dper.com/shop/view?shopId=" + shopId + "&ist=20&sty=-1' >" + shopId + " : " + shopName + "</a></div>");

            GM_notification({
                title: "成功导入到[ " + sUI.conf.curUserName + " ]名下",
                text: "店铺名:[" + shopId + "]" + shopName + ",点击打开店铺页",
                highlight: true,
                timeout: 0,
                image: "https://a.dper.com/menus/static/img/logo.png",
                onclick: function () {
                    window.open("https://a.dper.com/shop/view?shopId=" + shopId + "&ist=20&sty=-1");
                }
            });

            sUI.notify();
            //.0.1.3.0.0:$6093015.0.1.4.0.$import
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
            if (arguments.length == 1 && arguments[0].message == "您访问过于频繁，请稍后访问！") {
                if (sUI.conf.stStart) {
                    loop.stop();
                    loop.reg(delayEvent.build(60 * 3));
                    loop.start();
                }
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

    var settingHtml = "\
<div id='stPanel' style='position: fixed;top:40px;right:20px;z-index:10000;'>\
<audio id='stMusic' autobuffer='autobuffer' autoplay='autoplay'>\
<source src='data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAABAAgAZGF0Ya4LAACAgICAgICAgICAgICAgICAgICAgICAgICAf3hxeH+AfXZ1eHx6dnR5fYGFgoOKi42aloubq6GOjI2Op7ythXJ0eYF5aV1AOFFib32HmZSHhpCalIiYi4SRkZaLfnhxaWptb21qaWBea2BRYmZTVmFgWFNXVVVhaGdbYGhZbXh1gXZ1goeIlot1k6yxtKaOkaWhq7KonKCZoaCjoKWuqqmurK6ztrO7tbTAvru/vb68vbW6vLGqsLOfm5yal5KKhoyBeHt2dXBnbmljVlJWUEBBPDw9Mi4zKRwhIBYaGRQcHBURGB0XFxwhGxocJSstMjg6PTc6PUxVV1lWV2JqaXN0coCHhIyPjpOenqWppK6xu72yxMu9us7Pw83Wy9nY29ve6OPr6uvs6ezu6ejk6erm3uPj3dbT1sjBzdDFuMHAt7m1r7W6qaCupJOTkpWPgHqAd3JrbGlnY1peX1hTUk9PTFRKR0RFQkRBRUVEQkdBPjs9Pzo6NT04Njs+PTxAPzo/Ojk6PEA5PUJAQD04PkRCREZLUk1KT1BRUVdXU1VRV1tZV1xgXltcXF9hXl9eY2VmZmlna3J0b3F3eHyBfX+JgIWJiouTlZCTmpybnqSgnqyrqrO3srK2uL2/u7jAwMLFxsfEv8XLzcrIy83JzcrP0s3M0dTP0drY1dPR1dzc19za19XX2dnU1NjU0dXPzdHQy8rMysfGxMLBvLu3ta+sraeioJ2YlI+MioeFfX55cnJsaWVjXVlbVE5RTktHRUVAPDw3NC8uLyknKSIiJiUdHiEeGx4eHRwZHB8cHiAfHh8eHSEhISMoJyMnKisrLCszNy8yOTg9QEJFRUVITVFOTlJVWltaXmNfX2ZqZ21xb3R3eHqAhoeJkZKTlZmhpJ6kqKeur6yxtLW1trW4t6+us7axrbK2tLa6ury7u7u9u7vCwb+/vr7Ev7y9v8G8vby6vru4uLq+tri8ubi5t7W4uLW5uLKxs7G0tLGwt7Wvs7avr7O0tLW4trS4uLO1trW1trm1tLm0r7Kyr66wramsqaKlp52bmpeWl5KQkImEhIB8fXh3eHJrbW5mYGNcWFhUUE1LRENDQUI9ODcxLy8vMCsqLCgoKCgpKScoKCYoKygpKyssLi0sLi0uMDIwMTIuLzQ0Njg4Njc8ODlBQ0A/RUdGSU5RUVFUV1pdXWFjZGdpbG1vcXJ2eXh6fICAgIWIio2OkJGSlJWanJqbnZ2cn6Kkp6enq62srbCysrO1uLy4uL+/vL7CwMHAvb/Cvbq9vLm5uba2t7Sysq+urqyqqaalpqShoJ+enZuamZqXlZWTkpGSkpCNjpCMioqLioiHhoeGhYSGg4GDhoKDg4GBg4GBgoGBgoOChISChISChIWDg4WEgoSEgYODgYGCgYGAgICAgX99f398fX18e3p6e3t7enp7fHx4e3x6e3x7fHx9fX59fn1+fX19fH19fnx9fn19fX18fHx7fHx6fH18fXx8fHx7fH1+fXx+f319fn19fn1+gH9+f4B/fn+AgICAgH+AgICAgIGAgICAgH9+f4B+f35+fn58e3t8e3p5eXh4d3Z1dHRzcXBvb21sbmxqaWhlZmVjYmFfX2BfXV1cXFxaWVlaWVlYV1hYV1hYWVhZWFlaWllbXFpbXV5fX15fYWJhYmNiYWJhYWJjZGVmZ2hqbG1ub3Fxc3V3dnd6e3t8e3x+f3+AgICAgoGBgoKDhISFh4aHiYqKi4uMjYyOj4+QkZKUlZWXmJmbm52enqCioqSlpqeoqaqrrK2ur7CxsrGys7O0tbW2tba3t7i3uLe4t7a3t7i3tre2tba1tLSzsrKysbCvrq2sq6qop6alo6OioJ+dnJqZmJeWlJKSkI+OjoyLioiIh4WEg4GBgH9+fXt6eXh3d3V0c3JxcG9ubWxsamppaWhnZmVlZGRjYmNiYWBhYGBfYF9fXl5fXl1dXVxdXF1dXF1cXF1cXF1dXV5dXV5fXl9eX19gYGFgYWJhYmFiY2NiY2RjZGNkZWRlZGVmZmVmZmVmZ2dmZ2hnaGhnaGloZ2hpaWhpamlqaWpqa2pra2xtbGxtbm1ubm5vcG9wcXBxcnFycnN0c3N0dXV2d3d4eHh5ent6e3x9fn5/f4CAgIGCg4SEhYaGh4iIiYqLi4uMjY2Oj5CQkZGSk5OUlJWWlpeYl5iZmZqbm5ybnJ2cnZ6en56fn6ChoKChoqGio6KjpKOko6SjpKWkpaSkpKSlpKWkpaSlpKSlpKOkpKOko6KioaKhoaCfoJ+enp2dnJybmpmZmJeXlpWUk5STkZGQj4+OjYyLioqJh4eGhYSEgoKBgIB/fn59fHt7enl5eHd3dnZ1dHRzc3JycXBxcG9vbm5tbWxrbGxraWppaWhpaGdnZ2dmZ2ZlZmVmZWRlZGVkY2RjZGNkZGRkZGRkZGRkZGRjZGRkY2RjZGNkZWRlZGVmZWZmZ2ZnZ2doaWhpaWpra2xsbW5tbm9ub29wcXFycnNzdHV1dXZ2d3d4eXl6enp7fHx9fX5+f4CAgIGAgYGCgoOEhISFhoWGhoeIh4iJiImKiYqLiouLjI2MjI2OjY6Pj46PkI+QkZCRkJGQkZGSkZKRkpGSkZGRkZKRkpKRkpGSkZKRkpGSkZKRkpGSkZCRkZCRkI+Qj5CPkI+Pjo+OjY6Njo2MjYyLjIuMi4qLioqJiomJiImIh4iHh4aHhoaFhoWFhIWEg4SDg4KDgoKBgoGAgYCBgICAgICAf4CAf39+f35/fn1+fX59fHx9fH18e3x7fHt6e3p7ent6e3p5enl6enl6eXp5eXl4eXh5eHl4eXh5eHl4eXh5eHh3eHh4d3h4d3h3d3h4d3l4eHd4d3h3eHd4d3h3eHh4eXh5eHl4eHl4eXh5enl6eXp5enl6eXp5ent6ent6e3x7fHx9fH18fX19fn1+fX5/fn9+f4B/gH+Af4CAgICAgIGAgYCBgoGCgYKCgoKDgoOEg4OEg4SFhIWEhYSFhoWGhYaHhoeHhoeGh4iHiIiHiImIiImKiYqJiYqJiouKi4qLiouKi4qLiouKi4qLiouKi4qLi4qLiouKi4qLiomJiomIiYiJiImIh4iIh4iHhoeGhYWGhYaFhIWEg4OEg4KDgoOCgYKBgIGAgICAgH+Af39+f359fn18fX19fHx8e3t6e3p7enl6eXp5enl6enl5eXh5eHh5eHl4eXh5eHl4eHd5eHd3eHl4d3h3eHd4d3h3eHh4d3h4d3h3d3h5eHl4eXh5eHl5eXp5enl6eXp7ent6e3p7e3t7fHt8e3x8fHx9fH1+fX59fn9+f35/gH+AgICAgICAgYGAgYKBgoGCgoKDgoOEg4SEhIWFhIWFhoWGhYaGhoaHhoeGh4aHhoeIh4iHiIeHiIeIh4iHiIeIiIiHiIeIh4iHiIiHiIeIh4iHiIeIh4eIh4eIh4aHh4aHhoeGh4aHhoWGhYaFhoWFhIWEhYSFhIWEhISDhIOEg4OCg4OCg4KDgYKCgYKCgYCBgIGAgYCBgICAgICAgICAf4B/f4B/gH+Af35/fn9+f35/fn1+fn19fn1+fX59fn19fX19fH18fXx9fH18fXx9fH18fXx8fHt8e3x7fHt8e3x7fHt8e3x7fHt8e3x7fHt8e3x7fHt8e3x8e3x7fHt8e3x7fHx8fXx9fH18fX5+fX59fn9+f35+f35/gH+Af4B/gICAgICAgICAgICAgYCBgIGAgIGAgYGBgoGCgYKBgoGCgYKBgoGCgoKDgoOCg4KDgoOCg4KDgoOCg4KDgoOCg4KDgoOCg4KDgoOCg4KDgoOCg4KDgoOCg4KDgoOCg4KDgoOCg4KCgoGCgYKBgoGCgYKBgoGCgYKBgoGCgYKBgoGCgYKBgoGCgYKBgoGCgYKBgoGBgYCBgIGAgYCBgIGAgYCBgIGAgYCBgIGAgYCBgIGAgYCAgICBgIGAgYCBgIGAgYCBgIGAgYCBgExJU1RCAAAASU5GT0lDUkQMAAAAMjAwOC0wOS0yMQAASUVORwMAAAAgAAABSVNGVBYAAABTb255IFNvdW5kIEZvcmdlIDguMAAA'' />\
</audio>\
<button id='stBtn' class='eg eg-sm eg-btn eg-btn-sm' style='float:right;'>?</button>\
<table style='display:none;background-color: #ee5511;float:right;' id='stTable'>\
<tr>\
<td>开始</td>\
<td><input id='stStart' type='checkbox'><lable for='stStart'>&nbsp;&nbsp;</lable></td>\
</tr>\
<tr>\
<td>自动导入</td>\
<td><input id='stImport' type='checkbox'><lable for='stImport'>&nbsp;&nbsp;</lable></td>\
</tr>\
<tr>\
<td>丽人默认搜索条件</td>\
<td><input id='stSearchCfg' type='button' value='重置'></input></td>\
</tr>\
<tr>\
<td>刷新间隔(毫秒)</td>\
<td><input id='stLimit' type='text' value='200'></td>\
</tr>\
<tr>\
<td>刷新次数</td>\
<td><input id='stTimes' type='text' value='1'></td>\
</tr>\
<tr>\
<td>刷新延时(秒)</td>\
<td><input id='stDelay' type='text' value='5'></td>\
</tr>\
</table>\
</div>\
";


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
                    delete this.conf.stStart;
                    delete this.conf.stImport;
                    var sUIcfg = JSON.stringify(this.conf);
                    localStorage.sUIcfg = sUIcfg;
                }
            };
            this.stSearchCfg.onclick = function () {
                document.getElementById("header").style.display = 'none';
                document.body.style.marginTop="-200px";
                document.body.style.marginLeft="-200px";
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
                    "pagination": {"isRequested": false, "isRequesting": false, "isEnd": false, "index": 1, "size": 2},
                    "honeycomb": {"distance": 5, "type": "cpsscore"}
                };
                var url = "https://a.dper.com/shops#/shops/cpublic?data=" + encodeURI(JSON.stringify(data));
                location.replace(url);
            };
            this.stBtn.onclick = function () {
                self.toggle();
            };
            this.stStart.onclick = function () {
                self.conf.stStart = this.checked;
                if (this.checked) {
                    loop.reg(researchEvent.build());
                    loop.start();
                    document.body.style.marginTop="-400px";
                } else {
                    loop.stop();
                    sUI.loadConf();
                    document.body.style.marginTop="-200px";
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
        this.notify = function () {
            self.stMusic.play();
        };
        return this;
    };

    var sUI = new SettingUI();
    sUI.init();
    var loop = new EventLoop(50);
    loop.reg(initEvent);
    loop.start();

})();
