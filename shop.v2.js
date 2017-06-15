// ==UserScript==
// @name         shopAutoRef
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://a.dper.com/shops
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var $=window.$||function(id){
        return document.getElementById(id);
    };
    //事件驱动器
    var EventLoop=function(loopunit){
        /*
         var $e={
         cb:function(){},
         args:{},//回调函数
         loop:10,//循环总次数
         $pass:10,
         limit:10//间隔次数
         };
         */
        this.eventTick=0;
        this.stoped=true;
        this.loopunit=loopunit||50;//loop最小时间单元(毫秒)
        this.eventQueue=[];
        this.run=function(){
            if(this.stoped)return;
            var event=this.eventQueue.shift();
            //事件单次调用
            if(event!=null ){
                if(event.$pass==NaN ||event.loop==NaN || event.limit==NaN){
                    return;
                }
                if(event.$pass--<=0){
                    this.eventTick++;
                    event.cb.call(event);
                    event.loop--;
                    event.$pass=event.limit;
                    //loop未归零,则继续将事件放入队列
                    if(event.loop>0){
                        this.eventQueue.push(event);
                    }
                }else{
                    this.eventQueue.push(event);
                }
            }
            //通过setTimeout实现事件循环
            var self=this;
            setTimeout(function(){
                self.run();
            }, this.loopunit);
        };
        this.start=function(){
            this.startTime=new Date();
            this.stoped=false;
            this.run();

        };
        this.stop=function(){
            this.stoped=true;
            this.eventQueue=[];
        };
        this.reg=function(event){
            event.$pass=event.limit;
            this.eventQueue.push(event);
        };
        return this;
    };

    var loopTimeUnit=50;
    var loop=new EventLoop(50);
    // Your code here...
    var searchBtn = null;
    var sUI = null;
    //ui初始化
    var initEvent={
        loop:1,
        limit:20,
        desc:"init UI",
        cb:function(event) {
            try {
                if(searchBtn==null) {
                    var btns = document.getElementsByTagName("button");
                    for (var i = 0; i != btns.length; i++) {
                        if (btns[i].innerText == "查询") {
                            searchBtn = btns[i];
                        }
                    }

                    //未找到按钮,则重试
                    if (searchBtn == null) {
                        this.loop++;
                        return;
                    }
                }
                sUI=new SettingUI();
                sUI.init();
                researchEvent.loop=parseInt(sUI.conf.stTimes);
                researchEvent.limit=parseInt(sUI.conf.stLimit/loopTimeUnit);
                loop.reg(researchEvent);
            } catch (e) {
                alert(e);
            }
        }
    };
    //刷新事件
    var researchEvent={
        desc:"重新搜索...",
        cb:function researchEvent(event) {
            if (!sUI.conf.stStart){
                this.loop=0;
                return;
            }
            //获取店铺Id
            var shops = findShopId();
            //校验是否有新店铺
            if (oldShops.length == 0) {
                oldShops = shops;
            } else if (oldShops[0] != shops[0]) {
                sUI.stStart.click();
                oldShops = shops;
                sUI.notify();
                if(sUI.conf.stImport){
                    importEvent.loop=1;
                    importEvent.limit=1;
                    importEvent.args=[oldShops[0]];
                    loop.reg(importEvent);
                }
                return;
            }
            searchBtn.click();
        }
    };
    /**
     * 自动导入
     * @type {{cb: cb}}
     */
    var importEvent={
        loop:1,
        limit:1,
        desc:"import data...",
        cb:function(){
            var shopId=this.args[0];
            var spans=document.getElementsByTagName("span");
            for(var i=0;i!=spans.length;i++){
                var sp=spans[i];
                if(sp && sp.hasAttribute("data-reactid")){
                    debugger;
                    var reactid=sp.attributes["data-reactid"].value;
                    if(reactid!=null&&reactid.indexOf("$"+shopId)>=0){
                        sp.click();
                    }
                }
            }
            //.0.1.3.0.0:$6093015.0.1.4.0.$import
        }
    };
    /**
     * 获取shopId
     * @returns {Array}
     */
    var oldShops = [];
    function findShopId() {
        var shops = [];
        var spanShopLb = document.getElementsByTagName("span");
        for (var i = 0; i != spanShopLb.length; i++) {
            var sp = spanShopLb[i];
            if (sp.innerText.toLowerCase().indexOf("shopid") >= 0) {
                try {
                    shops.push(sp.nextSibling.innerText);
                } catch (e) {
                }
            }
        }
        console.log(shops);
        return shops;
    }

    loop.reg(initEvent);
    loop.start();


    //mock error
    (function(){
        Promise.$$reject=Promise.reject;
        Promise.reject=function(){
            if(arguments.length==1&&arguments[0].message=="您访问过于频繁，请稍后访问！"){
                loop.stop();
            }
            return Promise.$$reject.call(this,arguments[0]);
        };
    })();

    var settingHtml="\
        <div id='stPanel' style='position: fixed;top:200px;right:10%;'>\
            <audio id='stMusic' autoplay='autoplay'></audio>\
            <button id='stBtn' class='eg eg-sm eg-btn eg-btn-sm' style='float:right;'>?</button>\
            <table style='display:none;background-color: #ee5511;float:right;' id='stTable'>\
                <tr>\
                    <td>开始</td>\
                    <td><input id='stStart' type='checkbox'></td>\
                </tr>\
                <tr>\
                    <td>间隔(毫秒)</td>\
                    <td><input id='stLimit' type='text' value='800'></td>\
                </tr>\
                <tr>\
                    <td>次数</td>\
                    <td><input id='stTimes' type='text' value='500'></td>\
                </tr>\
                <tr>\
                    <td>自动导入</td>\
                    <td><input id='stImport' type='checkbox'></td>\
                </tr>\
                <tr>\
                    <td>背景音乐</td>\
                    <td><input id='stMusicUrl' type='input' value='http://mp3.13400.com:99/1830/171204301735531.mp3'></td>\
                </tr>\
            </table>\
        </div>\
    ";

    var SettingUI=function(){
        var self=this;
        this.conf={};
        this.init=function(){
            document.body.innerHTML+=settingHtml;
            this.stStart=$("stStart");
            this.stBtn=$("stBtn");
            this.stMusic=$("stMusic");

            this.stLimit=$("stLimit");
            this.stTimes=$("stTimes");
            this.stImport=$("stImport");
            this.stMusicUrl=$("stMusicUrl");
            this.conf={
                stLimit:this.stLimit.value,
                stTimes:this.stTimes.value,
                stImport:(this.stImport.checked=="checked"||this.stImport.checked==true),
                stMusicUrl:this.stMusicUrl.value
            };

            this.stBtn.onclick=function(){
                self.toggle();
            };
            this.stStart.onclick=function(){
                self.conf.stStart=this.checked;
                if (this.checked) {
                    researchEvent.loop=parseInt(sUI.conf.stTimes);
                    researchEvent.limit=parseInt(sUI.conf.stLimit/loopTimeUnit);
                    loop.reg(researchEvent);
                }
                self.toggle();
            };
            this.stLimit.onchange=function(){
                self.conf.stLimit=this.value;
            };
            this.stTimes.onchange=function(){
                self.conf.stTimes=this.value;
            };
            this.stImport.onchange=function(){
                self.conf.stImport=(this.checked=="checked"||this.checked==true);
            };
            this.stMusicUrl.onchange=function(){
                self.conf.stMusicUrl=this.value;
            };
        };
        this.toggle=function(){
            var stTable=$("stTable");
            if(stTable.style.display==="block"){
                stTable.style.display="none";
            }else{
                stTable.style.display="block";
            }
        };
        this.notify=function(){
            self.stMusic.src=(self.conf.stMusicUrl + "?tm=" + new Date().getTime());
            self.stMusic.play();
        };
        return this;
    };
})();
