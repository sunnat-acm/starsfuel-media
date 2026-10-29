(function(){ 
 // ---- fake clock ----
 var now=1000,seq=1,timers=[],rafs=[],nextFrame=1000+1000/60;
 window.__vt=0;
 window.setTimeout=function(fn,d){var id=seq++;timers.push({id:id,at:now+(+d||0),fn:fn,iv:0});return id};
 window.setInterval=function(fn,d){var id=seq++;d=Math.max(+d||0,1);timers.push({id:id,at:now+d,fn:fn,iv:d});return id};
 window.clearTimeout=window.clearInterval=function(id){timers=timers.filter(function(t){return t.id!==id})};
 window.requestAnimationFrame=function(fn){var id=seq++;rafs.push({id:id,fn:fn});return id};
 window.cancelAnimationFrame=function(id){rafs=rafs.filter(function(r){return r.id!==id})};
 Date.now=function(){return 1.7e12+now};
 performance.now=function(){return now};
 window.__tick=function(ms){
  var target=now+ms;
  for(;;){
   var nt=null;for(var i=0;i<timers.length;i++){if(nt===null||timers[i].at<nt.at)nt=timers[i]}
   var nf=nextFrame, nxt=Infinity;
   if(nt&&nt.at<nxt)nxt=nt.at; if(rafs.length&&nf<nxt)nxt=nf;
   if(nxt>target||nxt===Infinity){now=target;while(nextFrame<=now)nextFrame+=1000/60;break}
   now=Math.max(now,nxt);
   if(nt&&nt.at<=now&&(!rafs.length||nt.at<=nf)){
     if(nt.iv){nt.at+=nt.iv}else{timers=timers.filter(function(t){return t!==nt})}
     try{nt.fn()}catch(e){console.error(e)}
   } else {
     var cb=rafs;rafs=[];nextFrame+=1000/60;cb.forEach(function(r){try{r.fn(now)}catch(e){console.error(e)}});
   }
  }
  window.__vt+=ms;
  // sync CSS animations to virtual time
  var M=window.__am||(window.__am=new WeakMap());
  document.getAnimations().forEach(function(a){
    if(!M.has(a)){M.set(a,window.__vt-ms)}
    a.pause();
    try{a.currentTime=window.__vt-M.get(a)}catch(e){}
  });
 };
 // ---- telegram stub ----
 var user={id:7012345678,first_name:'Aziz',username:'aziz_demo',language_code:'uz'};
 window.Telegram={WebApp:{initData:'demo',initDataUnsafe:{user:user},themeParams:{bg_color:'#1E1E1E',secondary_bg_color:'#161616',text_color:'#FFFFFF',hint_color:'#8E8E93',button_color:'#8AAC62',button_text_color:'#FFFFFF',section_bg_color:'#232323',link_color:'#8AAC62'},colorScheme:'dark',
  ready:function(){},expand:function(){},disableVerticalSwipes:function(){},onEvent:function(){},offEvent:function(){},showAlert:function(m){window.__alerts=(window.__alerts||[]).concat(m)},openLink:function(){},openTelegramLink:function(){},setBackgroundColor:function(){},setHeaderColor:function(){},safeAreaInset:{top:0},HapticFeedback:{impactOccurred:function(){},notificationOccurred:function(){}}}};
})();
