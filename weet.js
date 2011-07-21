if(typeof importScript != "undefined") {
  importScript("global/require.ds");
  requireJoose();
  requireQ();
  require_();
}

Class('Weet', {
  does: Joose.Singleton,
  classMethods: {
    /**
     * @param selector The path to subscribe to
     * @param fn The callback to execute on weet changes
     * @returns the subscription id
     */
    subscribe: function(selector, fn) {
      return this.getInstance().subscribe(selector, fn);
    },
    /**
     * @param id The subscription id to unsubscribe
     */
    unsubscribe: function(id) {
      this.getInstance().unsubscribe(id);
    },
    /**
     * @param selector The path to return
     * @returns the object stored at the given selector
     */
    get: function(selector) {
      return this.getInstance().get(selector);
    },
    /**
     * @param selector The selector to set a new value for
     * @param value The value to set
     * @returns the set value
     */
    set: function(selector, value) {
      return this.getInstance().set(selector, value);
    },
    /**
     * @param selector The selector to set the new value for
     * @param value The value to set
     * @returns the weet hash
     */
    setHash: function(selector, value) {
      return this.getInstance().setHash(selector, value);
    },
    /**
     * @param selector The selector to set the new value for
     * @param obj The value to set
     * @returns the weet hash with leading hash
     */
    setHref: function(selector, obj) {
      return this.getInstance().setHref(selector, obj);
    },
    /**
     * @returns the current weet object
     */
    obj: function() {
      return this.merge({}, this.getInstance().weet);
    },
    /**
     * @param obj The object to merge into the weet state
     */
    extend: function(obj) {
      this.getInstance().extend(obj);
    },
    /**
     * @param selector The selector to extend
     * @param value The value to set
     * @returns the extended weet state
     */
    createHash: function(selector, value) {
      return this.getInstance().createHash(selector, value);
    },
    /**
     * @param obj The object to extend the state with
     * @returns the extended weet state as string
     */
    extendHash: function(obj) {
      return this.getInstance().extendHash(obj);
    },
    /**
     * @param obj The object to extend the state with
     * @returns the extended weet state as string with prefixed hash
     */
    extendHref: function(obj) {
      return this.getInstance().extendHref(obj);
    },
    /**
     * @param obj The object to extend the state with
     * @returns the extended weet state as object
     */
    extendObj: function(obj) {
      return this.getInstance().extendObj(obj);
    },
    /**
     * @param obj The new weet state to set
     */
    overwriteHash: function(obj) {
      this.getInstance().overwriteHash(obj);
    },
    /**
     * Clears the current state
     */
    clearHash: function() {
      this.getInstance().clearHash();
    },
    deReference: function(name, base) {
      var split = name.split('.');
      var result = _(split).select(function(c) {
        base = !base || base[c];
        return typeof(base) != 'undefined';
      });
      return { found: result.length == split.length, value: base };
    },
    objectify: function(selector, value) {
      var split = selector.split('.');
      var last = split.pop();
      var base = {};
      _(split).reduce(function(tmp, c) {
        return tmp[c] = {};
      }, base)[last] = value;
      return base;
    },
    parse: function(str) {
      if (str == '#' || str.length == 0) {
        return {};
      }
      str = str.slice(1);
      
      try {
        return JSON.parse(this.filter(Q.decode(str)));
      } catch (e) {
        return null;
      }
    },
    filter: function(str) {
      return str;
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
              value: _.isArray(modification) ? modification : m
            };
            self.differences(o, m, _([path, k]).compact().join('.'), ret);
          } else {
            ret[_([path,k]).compact().join('.')] = {
              action: 'added',
              value: _.isArray(modification) ? modification : m
            };
          }
        } else if (JSON.stringify(m) != JSON.stringify(o)) {
          if(typeof m == 'object') {
            ret[_([path, k]).compact().join('.')] = {
              action: 'modified',
              value: _.isArray(modification) ? modification : m
            };
            self.differences(o, m, _([path,k]).compact().join('.'), ret);
          } else if (JSON.stringify(m) != JSON.stringify(o)) {
            ret[_([path,k]).compact().join('.')] = {
              action: 'modified',
              value: _.isArray(modification) ? modification : m
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
        this.weet = this.meta.c.parse(window.location.hash);
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
      window.location.hash = this.setHash(selector, value);
      return value;
    },
    setHash: function(selector, value) {
      var location = this.meta.c.merge({}, this.weet);
      this.meta.c.overwrite(location, selector.split('.'), value);
      return Q.encode(JSON.stringify(location));
    },
    setHref: function(selector, obj) {
       return '#' + this.setHash(selector, obj);
     },
    extend: function(obj) {
      var location = this.meta.c.merge({}, this.weet, obj);
      window.location.hash = Q.encode(JSON.stringify(location));
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
