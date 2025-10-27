(function(){

    var ENDPOINT_URL = "https://kcr-notify.hola-623.workers.dev/?t=kcr_ok_123";
  
    var THROTTLE_MS = 3600 * 1000; // 1 hora
  
    var SESSION_FLAG = "kcr_notified_session";
  
    var LS_LAST_TS = "kcr_notified_last_ts";
  
    // ====== Utils ======
    function getCookie(name) {
      try {
        var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
        return m ? decodeURIComponent(m[1]) : null;
      } catch(e){ return null; }
    }
    function parseJSONSafe(s){ try { return JSON.parse(s); } catch(e){ return null; } }
    function now(){ return Date.now(); }
  
    // ====== Build payload (Discord-friendly via Worker) ======
    function buildPayload(p){
      var utm = (p && p.last_touch) || {};
      // Armamos un "payload neutro"; el Worker lo convertirá a embed
      return {
        type: "kcr_visit",
        ts: new Date().toISOString(),
        page: location.href,
        host: location.host,
        utm: {
          source:  utm.utm_source || null,
          medium:  utm.utm_medium || null,
          content: utm.utm_content || null,
          campaign:utm.utm_campaign || null,
          term:    utm.utm_term || null
        },
        lang: utm.language || null,
        tz: utm.timezone || null,
        ref: utm.referrer || document.referrer || null,
        visits: p.visits || 1,
        first_seen: p.first_seen || null
      };
    }
  
    function send(payload){
      try {
        var body = JSON.stringify(payload);
          fetch(ENDPOINT_URL, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: body,
            keepalive: true,
            mode: "cors",
            credentials: "omit"
          }).catch(function(){});
      } catch(e){}
    }
  
    // ====== Main ======
    try {
      var raw = getCookie('kcr_utm');
      if (!raw) return;
      var p = parseJSONSafe(raw);
      if (!p) return;
  
      var isFirstTouchNow = p.first_seen === p.last_seen && p.visits === 1;
      var hasUtm = p.last_touch && (p.last_touch.utm_source || p.last_touch.utm_medium);
  
      if (!(isFirstTouchNow && hasUtm)) return;
  
      // Throttle por sesión
      if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
      sessionStorage.setItem(SESSION_FLAG, "1");
  
      // Throttle por tiempo
      try {
        var lastTs = parseInt(localStorage.getItem(LS_LAST_TS)||"0",10);
        if (!isFinite(lastTs)) lastTs = 0;
        if (now() - lastTs < THROTTLE_MS) return;
        localStorage.setItem(LS_LAST_TS, String(now()));
      } catch(e){ /* si falla localStorage, seguimos sólo con el de sesión */ }
  
      send(buildPayload(p));
    } catch(e){}
  })();