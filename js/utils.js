/*
=========================================================
 AMIT AI
 utils.js
 Common helper functions
=========================================================
*/

(function () {

const Utils = {

  // -----------------------------
  // Short selector
  // -----------------------------
  $(selector){
    return document.querySelector(selector);
  },

  $all(selector){
    return document.querySelectorAll(selector);
  },

  // -----------------------------
  // Create random id
  // -----------------------------
  uid(){
    return "id_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2,8);
  },

  // -----------------------------
  // HTML Escape
  // -----------------------------
  escape(text){

    if(text === null || text === undefined)
      return "";

    const div = document.createElement("div");
    div.textContent = text;

    return div.innerHTML;
  },

  // -----------------------------
  // Copy text
  // -----------------------------
  async copy(text){

    try{

      await navigator.clipboard.writeText(text);

      return true;

    }catch(e){

      console.error(e);

      return false;

    }

  },

  // -----------------------------
  // Local Storage
  // -----------------------------
  save(key,value){

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  },

  load(key,def=null){

    try{

      const x = localStorage.getItem(key);

      if(!x) return def;

      return JSON.parse(x);

    }catch(e){

      return def;

    }

  },

  remove(key){

    localStorage.removeItem(key);

  },

  // -----------------------------
  // Delay
  // -----------------------------
  wait(ms){

    return new Promise(resolve=>{

      setTimeout(resolve,ms);

    });

  },

  // -----------------------------
  // Scroll
  // -----------------------------
  scrollBottom(){

    const chat=$("#chat-area");

    if(chat){

      chat.scrollTop=chat.scrollHeight;

    }

  },

  // -----------------------------
  // Auto textarea
  // -----------------------------
  autoGrow(el){

    el.style.height="auto";

    el.style.height=
      Math.min(el.scrollHeight,140)+"px";

  },

  // -----------------------------
  // Toast
  // -----------------------------
  toast(msg){

    let t=document.createElement("div");

    t.textContent=msg;

    t.style.position="fixed";
    t.style.bottom="25px";
    t.style.left="50%";
    t.style.transform="translateX(-50%)";

    t.style.background="#111";
    t.style.color="#fff";

    t.style.padding="10px 18px";

    t.style.borderRadius="10px";

    t.style.fontSize="14px";

    t.style.zIndex="99999";

    document.body.appendChild(t);

    setTimeout(()=>{

      t.remove();

    },1800);

  }

};

window.Utils=Utils;

})();