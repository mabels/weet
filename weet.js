Class('Weet', {
  does: Joose.Singleton,
  classMethods: {
    subscribe: function(selector, fn) {
      return this.getInstance().subscribe(selector, fn)
    },
    unsubscribe: function(id) {
      this.getInstance().unsubscribe(id)
    },
    get: function(selector) {
      return this.getInstance().weet[selector] || null
    },
    set: function(selector, value) {
      this.getInstance().set(selector, value)
    },
    obj: function() {
      return this.getInstance().weet
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
    },
    parse_hash: function(hash) {
      if (hash == '#' || hash.length == 0) {
        return { state: 'empty', value: {} }
      }
      try {
        return { state: 'ok', value: JSON.parse(Q.decode(hash.slice(1))) }
      } catch (e) {
        return { state: 'error', value: null }
      }
    }
  },
  methods: {
    initialize: function() {
      this.subscriptions = {}
      this.subscription_id = 0
      this.weet = {}
      if (window.location.hash.length > 1) {
        this.extend(Weet.parse_hash(window.location.hash))
      }
      this.hash_change()
    },
    hash_change: function() {
      var self = this
      if (jQuery.browser.msie && jQuery.browser.version < 8) {
        var hash = window.location.hash
        setInterval(function() {
          if (hash == window.location.hash) {
            return
          } else {
            self.extend(Weet.parse_hash(window.location.hash))
            hash = window.location.hash
          }
        }, 150)
      } else {
        $(window).bind('hashchange', function() {
          self.extend(Weet.parse_hash(window.location.hash))
        })
      }
    },
    subscribe: function(selector, fn) {
      if (!this.subscriptions[selector]) {
        this.subscriptions[selector] = {}
      }
      this.subscriptions[selector][this.subscription_id++] = fn
      var val = Weet.deReference(selector, this.weet)
      val.found && fn.modified(val.value)
      return this.subscription_id-1
    },
    unsubscribe: function(id) {
      _(this.subscriptions).each(function(funcs, selector) {
        if (funcs[id]) {
          delete funcs[id]
        }
      })
    },
    set: function(selector, value) {
      var base = this.objectify(selector, value)
      this.extend({ state: 'ok', value: base}, true)
    },
    createHash: function(selector, value) {
      return this.extendHash(this.objectify(selector, value))
    },
    extendHash: function(obj) {
      return Q.encode(JSON.stringify(jQuery.extend(true, {}, this.weet, obj)))
    },
    extend: function(obj, ignore_subscription) {
      var self = this
      if (obj.state == 'error') { return }
      var call_later = []
      var weet = Weet.parse_hash(window.location.hash)
      if (weet.state == 'error') { return }
      !ignore_subscription && _(this.subscriptions).each(function(funcs, selector) {
        var ref = Weet.deReference(selector, obj.value)
        if (ref.found) {
          call_later.push({reference: ref, funcs: funcs, action: 'modified'})
          return
        }
        var ref = Weet.deReference(selector, self.weet)
        if (ref.found) {
          call_later.push({reference: {found: true, value: null }, funcs: funcs, action: 'deleted'})
          return
        }
      })
      if ((weet.state == 'ok' || weet.state == 'empty') && obj.state == 'ok') {
        this.weet = jQuery.extend(true, weet.value, obj.value)
        weet.state = 'ok'
      }
      _(call_later).each(function(i) { _(i.funcs).chain().values().each(function(fn) { fn[i.action](i.reference.value) }) })
      weet.state == 'ok' && (window.location.hash = Q.encode(JSON.stringify(this.weet)))
    },
    objectify: function(selector, value) {
      var split = selector.split('.')
      var last = split.pop()
      var base = {}
      _(split).reduce(base, function(tmp, c) { return tmp[c] = {} })[last] = value
      return base
    }
  }
})

