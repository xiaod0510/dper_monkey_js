// ==UserScript==
// @name         shopAutoRef
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://a.dper.com/shops
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    //铃声
    var mp3Url = "http://mp3.13400.com:99/1830/171204301735531.mp3";
    //刷新间隔 
    var refreshSeconds=4;


    // Your code here...
    var searchBtn = null;
    var autoRef = null;

    function init(){
        try{
            var btns = document.getElementsByTagName("button");
            for(var i=0;i!=btns.length;i++){
                if(btns[i].innerText == "查询"){
                    searchBtn=btns[i];
                }
            }
            autoRef = document.createElement("input");
            autoRef.type='checkbox';
            autoRef.onclick=function(){
                if(this.checked){
                    autoReSearch();
                }
            };
            searchBtn.parentNode.appendChild(autoRef);

            var audio=document.createElement("audio");
            audio.id="bgMusicMp3";
            audio.autoplay="autoplay";
            document.body.appendChild(audio);
        }catch(e){
            alert(e);
        }
    }
    function findShopId(){
        var shops=[];
        var spanShopLb=document.getElementsByTagName("span");
        for(var i=0;i!=spanShopLb.length;i++){
            var sp = spanShopLb[i];
            if(sp.innerText.indexOf("shopid")>=0){
                try{
                    shops.push(sp.nextSibling.innerText);
                }catch(e){}
            }
        }
        return shops;
    }

    var oldShops=[];
    function autoReSearch(){
        if(!autoRef.checked)return;
        var shops = findShopId();
        if(oldShops.length==0){
            oldShops=shops;
        }else if(oldShops[0]!=shops[0]){
            document.getElementById("bgMusicMp3").src=(mp3Url+"?tm="+new Date().getTime());
            autoRef.click();
            oldShops=shops;
        }
        searchBtn.click();
        setTimeout(autoReSearch,refreshSeconds*(Math.random()*200+800));
    }
    setTimeout(init,5000);
})();
