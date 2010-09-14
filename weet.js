Class('Weet', {
  does: Joose.Singleton,
  classMethods: {
    subscribe: function(selector, fn) {
      return this.getInstance().subscribe(selector, fn);
    },
    unsubscribe: function(id) {
      this.getInstance().unsubscribe(id);
    },
    get: function(selector) {
      return this.getInstance().get(selector);
    },
    set: function(selector, value) {
      this.getInstance().set(selector, value);
    },
    obj: function() {
      return this.merge({}, this.getInstance().weet);
    },
    extend: function(obj) {
      this.getInstance().extend(obj);
    },
    createHash: function(selector, value) {
      return this.getInstance().createHash(selector, value);
    },
    extendHash: function(obj) {
      return this.getInstance().extendHash(obj);
    },
    overwriteHash: function(obj) {
      this.getInstance().overwriteHash(obj);
    },
    clearHash: function() {
      this.getInstance().clearHash();
    },
    deReference: function(name, base) {
      var split = name.split('.');
      var result = _(split).select(function(c) {
        base = !base || base[c];
        return typeof(base) != 'undefined';
      })
      return { found: result.length == split.length, value: base }
    },
    objectify: function(selector, value) {
      var split = selector.split('.');
      var last = split.pop();
      var base = {};
      _(split).reduce(base, function(tmp, c) {
        return tmp[c] = {};
      })[last] = value;
      return base;
    },
    parse: function(str) {
      str = str.replace(/^\#\!/, "#");
      if (str == '#' || str.length == 0) {
        return {};
      }
      try {
        return JSON.parse(Q.decode(str.slice(1)));
      } catch (e) {
        return null;
      }
    },
    merge: function(target) {
      for (var i = 1, len = arguments.length; i < len; i++) {
        var val = arguments[i];
        var copy = JSON.parse(JSON.stringify(val));
        for (var j in copy) {
          if (copy[j] === null) {
            delete target[j];
          } else if (typeof target[j] == 'object') {
            this.merge(target[j], copy[j]);
          } else {
            target[j] = copy[j];
          }
        }
      }
      return target;
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
      var self = this
      $(window).hashchange(function() { // depends on jquery.ba-hashchange.js
        self.notify()
      })
    },
    notify: function() {
      var self = this;
      var fn_stack = [];
      var location = this.meta.c.parse(window.location.hash);
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
    },
    subscribe: function(selector, fn) {
      if (!this.subscriptions[selector]) {
        this.subscriptions[selector] = {};
      }
      this.subscriptions[selector][this.subscription_id++] = fn;
      var val = this.meta.c.deReference(selector, this.weet);
      if(val.found) {
        if(typeof fn == 'function') {
          fn(val.value, 'modified');
        } else {
          fn.modified(val.value);
        }
      }
      return this.subscription_id-1;
    },
    unsubscribe: function(id) {
      _(this.subscriptions).each(function(funcs, selector) {
        if (funcs[id]) {
          delete funcs[id]
        }
      })
    },
    get: function(selector) {
      var ret = this.meta.c.merge({}, this.weet);
      var split = selector.split('.');
      for (var i in split) {
        ret = ret[split[i]];
      }
      return ret;
    },
    set: function(selector, value) {
      this.extend(this.meta.c.objectify(selector, value));
    },
    createHash: function(selector, value) {
      return this.extendHash(this.meta.c.objectify(selector, value))
    },
    extendHash: function(obj) {
      return Q.encode(JSON.stringify(this.meta.c.merge({}, this.weet, obj)))
    },
    overwriteHash: function(obj) {
      window.location.hash = Q.encode("!"+JSON.stringify(obj));
    },
    clearHash: function() {
      window.location.hash = Q.encode("!"+JSON.stringify({}));
    },
    extend: function(obj) {
      var location = this.meta.c.merge({}, this.weet, obj);
      window.location.hash = Q.encode("!"+JSON.stringify(location));
    }
  }
})
