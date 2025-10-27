(function () {
  // ===== Config =====
  var COOKIE_NAME = 'kcr_utm';
  var COOKIE_DAYS = 90;

  // ===== Helpers =====
  function getParam(name) {
    try { return new URLSearchParams(location.search).get(name); } catch(e){ return null; }
  }
  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days*24*60*60*1000);
      expires = '; expires=' + d.toUTCString();
    }
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; Path=/; SameSite=Lax' + secure;
  }
  function getCookie(name) {
    var v = ('; ' + document.cookie).split('; ' + name + '=');
    if (v.length === 2) return decodeURIComponent(v.pop().split(';').shift());
    return null;
  }
  function parseJSONSafe(str, fallback) {
    try { return JSON.parse(str); } catch(e){ return fallback; }
  }

  // ===== 
  var utm = {
    utm_source:   getParam('utm_source'),
    utm_medium:   getParam('utm_medium'),
    utm_campaign: getParam('utm_campaign'),
    utm_content:  getParam('utm_content'),
    utm_term:     getParam('utm_term')
  };

  // ===== 
  var primaryLang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  var parts = primaryLang.split('-'); // ej: es-ES
  var locale = primaryLang.toLowerCase() || null;
  var regionGuess = (parts[1] || '').toUpperCase() || null; // “ES”, “US”, etc.
  var timezone = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;

  // ===== 
  var nowISO = new Date().toISOString();
  var existing = parseJSONSafe(getCookie(COOKIE_NAME), null);

  var payload = existing || {
    version: 1,
    first_seen: nowISO,
    visits: 0,
    first_touch: null,
    last_touch: null
  };
  payload.visits = (payload.visits || 0) + 1;
  payload.last_seen = nowISO;

  var touch = {
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    utm_content: utm.utm_content || null,
    utm_term: utm.utm_term || null,
    landing_page: location.pathname + location.search,
    referrer: document.referrer || null,
    language: locale,
    region_guess: regionGuess,
    timezone: timezone
  };

    // ===== 

  if (!payload.first_touch && (utm.utm_source || utm.utm_medium || utm.utm_campaign || utm.utm_content || utm.utm_term)) {
    payload.first_touch = touch;
  }
  // ===== 

  if (utm.utm_source || utm.utm_medium || utm.utm_campaign || utm.utm_content || utm.utm_term) {
    payload.last_touch = touch;
  } else {
    payload.last_touch = Object.assign({}, payload.last_touch || {}, {
      landing_page: touch.landing_page,
      referrer: touch.referrer,
      language: touch.language,
      region_guess: touch.region_guess,
      timezone: touch.timezone
    });
  }

  setCookie(COOKIE_NAME, JSON.stringify(payload), COOKIE_DAYS);


  function saveWithGeo(pos) {
    try {
      var p = parseJSONSafe(getCookie(COOKIE_NAME), payload) || payload;
      var coords = pos && pos.coords ? pos.coords : null;
      if (coords) {
        p.geo = {
          lat: coords.latitude,
          lon: coords.longitude,
          acc_m: (coords.accuracy || 0)
        };
        setCookie(COOKIE_NAME, JSON.stringify(p), COOKIE_DAYS);
      }
    } catch(e){}
  }
  if ('geolocation' in navigator) {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({name: 'geolocation'}).then(function (res) {
        if (res.state === 'granted') {
          navigator.geolocation.getCurrentPosition(saveWithGeo, function(){}, {timeout: 3000, enableHighAccuracy: false, maximumAge: 600000});
        }
      }).catch(function(){  });
    }
  }
})();
