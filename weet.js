if(typeof importScript != "undefined") {
  importScript("global/require.ds");
  requireJoose();
  requireQ();
  require_();
}

Class('Weet', {
  does: Joose.Singleton,
  classMethods: {
      subscribe: function(selector, fn) {
        return this.getInstance().subscribe(selector, fn) 
      },
      unsubscribe: function(id) {
        this.getInstance().unsubscribe(id)
      },
      set: function(selector, value) {
        this.getInstance().set(selector, value) 
      },
      get: function(selector) {
        return this.getInstance().get(selector) 
      },
      extend: function(obj) {
        this.getInstance().extend(obj)
      },
      createHash: function(selector, value) {
        return this.getInstance().createHash(selector, value) 
      },
      extendHash: function(obj) {
        return this.getInstance().extendHash(obj) 
      },
      deReference: function(name, base) {
        var split = name.split('.')
        var result = _(split).select(function(c) {
          base = !base || base[c]
          return typeof(base) != 'undefined'
        })
        return { found: result.length == split.length, value: base }
      }
      return target;
    },
    overwrite: function(obj, keys, value) {
      var key = keys.shift();
      if (keys.length) {
        obj[key] = this.overwrite(typeof obj[key] == "object" ? obj[key] : {}, keys, value);
        return obj;
      } else {
        if (value === null) {
          delete obj[key];
        } else {
          obj[key] = value;
        }
      }
      return obj;
    },
    differences: function(origin, modification, path, ret) {
      var self = this;
      if (!ret) { ret = {}; }
      if (!path) { path = ''; }
      modification && _(modification).each(function(v, k, o, m, tmp) {
        o = (origin && origin[k]) || null;
        m = modification[k];
        if (!o) {
          if (typeof m == 'object') {
            ret[_([path, k]).compact().join('.')] = {
              action: 'added',
              value: m
            };
            self.differences(o, m, _([path, k]).compact().join('.'), ret);
          } else {
            ret[_([path,k]).compact().join('.')] = {
              action: 'added',
              value: m
            };
          }
        } else if (JSON.stringify(m) != JSON.stringify(o)) {
          if(typeof m == 'object') {
            ret[_([path, k]).compact().join('.')] = {
              action: 'modified',
              value: m
            };
            self.differences(o, m, _([path,k]).compact().join('.'), ret);
          } else if (JSON.stringify(m) != JSON.stringify(o)) {
            ret[_([path,k]).compact().join('.')] = {
              action: 'modified',
              value: m
            };
          }
        } else {
        }
      });
      origin && _(origin).each(function(v, k, o, m) {
        o = origin[k];
        m = (modification && modification[k]) || null;
        if (!m) {
          if (typeof o == 'object') {
            ret[_([path,k]).compact().join('.')] = {
              action: 'deleted',
              value: null
            };
            self.differences(o, m, _([path,k]).compact().join('.'), ret);
          } else {
            ret[_([path,k]).compact().join('.')] = {
              action: 'deleted',
              value: null
            };
          }
        }
      });
      return ret;
    }
  },
  methods: {
    initialize: function() {
      this.weet = {};
      this.subscriptions = {};
      this.subscription_id = 0;
      if (typeof window != "undefined") {
        this.observe();
        if(window.location.hash.length > 1) {
          $(window).trigger('hashchange');
        }
      }
    },
    observe: function() {
      var self = this;
      $(window).hashchange(function() { // depends on jquery.ba-hashchange.js
        self.notify();
      });
    },
    notify: function() {
      var self = this;
      var fn_stack = [];
      var location = this.meta.c.parse(window.location.hash);
      if (location) {
        var diffs = this.meta.c.differences(this.weet, location);
        _(diffs).each(function(v, k) {
          self.subscriptions[k] && _(self.subscriptions[k]).each(function(funcs) {
            fn_stack.push({
              action: v.action,
              value: v.value,
              funcs: funcs
            });
          });
        });
        this.weet = location;
        _(fn_stack).each(function(fn) {
          if(typeof fn.funcs == 'function') {
            fn.funcs(fn.value, fn.action);
          } else {
            fn.funcs[fn.action](fn.value);
          }
        });
      }
    },
    subscribe: function(selector, fn) {
      if (!this.subscriptions[selector]) {
        this.subscriptions[selector] = {};
      }
      this.subscriptions[selector][this.subscription_id++] = fn;
      var val = this.meta.c.deReference(selector, this.weet);
      if(val.found) {
        if(typeof fn == 'function') {
          fn(val.value, 'initialized');
        } else {
          fn.modified(val.value);
        }
      }
      return this.subscription_id-1;
    },
    unsubscribe: function(id) {
      _(this.subscriptions).each(function(funcs, selector) {
        if (funcs[id]) {
          delete funcs[id];
        }
      });
    },
    get: function(selector) {
      var ret = this.meta.c.merge({}, this.weet);
      var split = selector.split('.');
      for (var i = 0; i < split.length; i++) {
        if (!ret) break;
        ret = ret[split[i]];
      }
      return ret;
    },
    set: function(selector, value) {
      var location = this.meta.c.merge({}, this.weet);
      this.meta.c.overwrite(location, selector.split('.'), value);
      window.location.hash = Q.encode(JSON.stringify(location));
      return value;
    },
    get: function(selector) {
      var ref = Weet.deReference(selector, this.weet)
      return ref.found ? ref.value : null
    },
    createHash: function(selector, value) {
      return this.extendHash(this.objectify(selector, value))
    },
    extendHash: function(obj) {
      return Q.encode(JSON.stringify(this.extendObj(obj)));
    },
    createHash: function(selector, value) {
      return this.extendHash(this.meta.c.objectify(selector, value));
    },
    extendHref: function(obj) {
      return '#' + this.extendHash(obj);
    },
    extendObj: function(obj) {
      return this.meta.c.merge({}, this.weet, obj);
    },
    overwriteHash: function(obj) {
      window.location.hash = Q.encode(JSON.stringify(obj));
    },
    clearHash: function() {
      window.location.hash = Q.encode(JSON.stringify({}));
    }
  }
});
