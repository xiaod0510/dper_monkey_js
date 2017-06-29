// ==UserScript==
// @name         shopAutoRef
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://a.dper.com/shops
// @grant        none
// @version      2.7
// @updateURL    https://raw.githubusercontent.com/xiaod0510/dper_monkey_js/master/shop.v2.js
// @require      http://code.jquery.com/jquery-2.1.4.min.js
// ==/UserScript==

(function () {
    'use strict';
    if(location.href.indexOf("cpublic")<0){
        return;
    }
    var dbg=true;
    function logger(msg){
        if(dbg!==undefined&&dbg){
            console.log("\t\t\t\t\t\t\t\t\t\t\t\t\t\t"+msg);
            document.title=msg;
        }
    }
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
        };
        this.start=function(){
            $(".stShopInfo").remove();
            this.startTime=new Date();
            this.stoped=false;
            this.run();
            //通过setInterval实现事件循环
            var self=this;
            self.interval=setInterval(function(){
                self.run();
            },self.loopunit);
            logger("loop started");
        };
        this.stop=function(){
            this.stoped=true;
            this.eventQueue=[];
            clearInterval(this.interval);
            logger("loop stopped");
        };
        this.reg=function(event){
            event.$pass=event.limit;
            this.eventQueue.push(event);
            logger("loop event add :"+event.desc);
        };
        return this;
    };

    //ui初始化
    var initEvent={
        loop:1,
        limit:20,
        desc:"init UI",
        cb:function(event) {
            try {
                loop.reg(researchEvent.build());
            } catch (e) {
                alert(e);
            }
        }
    };
    //刷新事件
    var researchEvent={
        desc:"重新搜索...",
        cb:function(event) {
            if (!sUI.conf.stStart){
                this.loop=0;
                return;
            }
            if(this.loop<=1){
                loop.reg(delayEvent.build());
            }

            $("body > div:nth-child(6) > div > div.container___37ruD > div:nth-child(4) > div").find("div[class^=container]").each(function(n,d){if($("span:contains(冻结中)",d).length!=0){$(d).hide();}});
            sUI.stTimes.value=this.loop;
            //获取店铺Id
            var shops = findShopId();
            //校验是否有新店铺
            if (oldShops.length == 0) {
                oldShops = shops;
            } else if (oldShops[0] != shops[0]) {
                logger("找到新店铺");
                //sUI.stStart.click();
                oldShops = shops;
                sUI.notify();
                if(sUI.conf.stImport){
                    for(var i=0;i!=shops.length;i++){
                        if(shops[i]==oldShops[0]){
                            break;
                        }
                        loop.reg(importEvent.build(1,1,[shops[i]]));
                    }
                }
                return;
            }
            logger(this.desc+sUI.stTimes.value);
            $("button:contains('查询')").click();

        },
        build:function(){
            var e=$.extend({},this);
            e.loop=parseInt(sUI.conf.stTimes);
            e.limit=parseInt(sUI.conf.stLimit/loop.loopunit);
            return e;
        }
    };
    /**
     * 自动导入
     * @type {{cb: cb}}
     */
    var importEvent={
        loop:1,
        limit:1,
        desc:"自动导入",
        cb:function(){
            var shopId=this.args[0];
            var baseSelector="span[data-reactid*="+shopId+"]";
            var shopName=$(baseSelector).first();
            if(shopName.length==0){
                return;
            }
            $(baseSelector+":contains('导入')").click();
            logger("自动导入:"+shopName+","+shopId);
            sUI.shopInfo(shopId,shopName.text());
            //.0.1.3.0.0:$6093015.0.1.4.0.$import
        },
        build:function(loop,limit,args){
            var e=$.extend({},this);
            e.loop=loop;
            e.limit=limit;
            e.args=[oldShops[0]];
            return e;
        }
    };
    var delayEvent={
        loop:1,
        limit:1,
        desc:"延时",
        cb:function(){
            sUI.stDelay.value=this.loop;
            logger("倒计"+this.loop+"秒");
            if(this.loop<=1){
                logger("延时结束:"+this.start+"---"+new Date());
                sUI.stTimes.value=sUI.conf.stTimes;
                sUI.stDelay.value=sUI.conf.stDelay;
                loop.reg(researchEvent.build());
            }

        },
        build:function(sec){
            var e=$.extend({},this);
            sec=sec||parseInt(sUI.conf.stDelay);
            e.limit=1000/loop.loopunit;
            e.loop=parseInt(sec);
            e.start=new Date();
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
        var shops = [];
        var spanShopLb = $("span:contains('导入')","body > div:nth-child(6) > div > div.container___37ruD > div:nth-child(4)");
        spanShopLb.each(function(n,d){
            var reactid=$(this).attr("data-reactid");
            if(reactid==null){
                return;
            }
            var mch=/\$(\d+)\./.exec(reactid);
            if(mch==null||mch.length!=2){
                return;
            }
            shops.push(mch[1]);
        });
        return shops;
    }

    //mock error
    (function(){
        Promise.$$reject=Promise.reject;
        Promise.reject=function(){
            if(arguments.length==1&&arguments[0].message=="您访问过于频繁，请稍后访问！"){
                loop.stop();
                loop.reg(delayEvent.build(60*3));
                loop.start();
            }
            setTimeout(function(){
                $("div:contains(您访问过于频繁，请稍后访问！)").last().prev().click();
            },2500);
            return Promise.$$reject.call(this,arguments[0]);
        };
    })();

    var settingHtml="\
<div id='stPanel' style='position: fixed;top:40px;right:20px;z-index:10000;'>\
<audio id='stMusic'></audio>\
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
<td>刷新间隔(毫秒)</td>\
<td><input id='stLimit' type='text' value='500'></td>\
</tr>\
<tr>\
<td>刷新次数</td>\
<td><input id='stTimes' type='text' value='130'></td>\
</tr>\
<tr>\
<td>刷新延时(秒)</td>\
<td><input id='stDelay' type='text' value='900'></td>\
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
            var container=$("<div>").append(settingHtml).appendTo(document.body);
            this.stStart=$("#stStart").get(0);
            this.stBtn=$("#stBtn").get(0);
            this.stMusic=$("#stMusic").get(0);
            this.stLimit=$("#stLimit").get(0);
            this.stTimes=$("#stTimes").get(0);
            this.stImport=$("#stImport").get(0);
            this.stMusicUrl=$("#stMusicUrl").get(0);
            this.stDelay=$("#stDelay").get(0);

            this.conf={
                stLimit:this.stLimit.value,
                stTimes:this.stTimes.value,
                stDelay:this.stDelay.value,
                stImport:(this.stImport.checked=="checked"||this.stImport.checked==true),
                stMusicUrl:this.stMusicUrl.value
            };
            this.stMusic.src=this.conf.stMusicUrl;

            this.stBtn.onclick=function(){
                self.toggle();
            };
            this.stStart.onclick=function(){
                self.conf.stStart=this.checked;
                if (this.checked) {
                    loop.reg(researchEvent.build());
                    loop.start();
                }else{
                    loop.stop();
                }
                self.toggle();
            };
            this.stDelay.onchange=function(){
                self.conf.stDelay=this.value;
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
                self.stMusic.src=this.value;
            };
            this.shopInfo=function(id,name){
                $("#stPanel").append("<div class='stShopInfo'>"+id+" : "+name+"</div>");
            };
            console.dir("conf:"+JSON.stringify(this.conf));
        };
        this.toggle=function(){
            var stTable=$("#stTable").get(0);
            if(stTable.style.display==="block"){
                stTable.style.display="none";
            }else{
                stTable.style.display="block";
            }
        };
        this.notify=function(){
            self.stMusic.play();
        };
        return this;
    };

    // Your code here...
    var sUI = new SettingUI();
    sUI.init();
    var loop=new EventLoop(50);
    loop.reg(initEvent);
    loop.start();

})();
