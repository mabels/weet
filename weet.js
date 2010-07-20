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
      obj: function() {
        return this.getInstance().weet
      },
      deReference: function(name, base) {
        var split = name.split('.')
        var result = _(split).select(function(c) {
          base = !base || base[c]
          return typeof(base) != 'undefined'
        })
        return { found: result.length == split.length, value: base }
      }
  },
  methods: {
    initialize: function() {
      this.subscriptions = {}
      this.subscription_id = 0
      this.weet = {}
      if (window.location.hash.length > 1) {
        this.extend(JSON.parse(Q.decode(window.location.hash.slice(1))))
      }
    },

    subscribe: function(selector, fn) {
      if (!this.subscriptions[selector]) {
        this.subscriptions[selector] = {}
      }
      this.subscriptions[selector][this.subscription_id++] = fn
      var val = Weet.deReference(selector, this.weet)
      val.found && fn(val.value)
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
      var split = selector.split('.')
      var last = split.pop()
      var base = {}
      _(split).reduce(base, function(tmp, c) {
        var o = {}
        tmp[c] = o
        return o
      })[last] = value
      this.extend(base)
      window.location.hash = Q.encode(JSON.stringify(this.weet))
    },
    extend: function(obj) {
      var call_later = [] 
      _(this.subscriptions).each(function(funcs, selector) {
        var ref = Weet.deReference(selector, obj)
        ref.found && call_later.push({reference: ref, funcs: funcs})
      })
      this.weet = jQuery.extend(true, this.weet, obj)
      _(call_later).each(function(i) { _(i.funcs).chain().values().each(function(fn) { fn(i.reference.value) }) })

    }
  }
})

