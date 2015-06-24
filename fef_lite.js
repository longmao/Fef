// Fef_lite.js (a lite clean Frond-end Framework)
// A thought based on BackboneJS

/*========================================================================
#   FileName: Fef_lite.js(a lite clean Frond-end Framework)
        Desc: A thought based on BackboneJS
#     Author: Vincent
#      Email: unclelongmao@gmail.com
#   HomePage: http://longmao.github.io
# LastChange: 2015-06-17 11:30:23
========================================================================*/

(function(factory) {
    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    var root = (typeof self == 'object' && self.self == self && self) ||
        (typeof global == 'object' && global.global == global && global);

    // Set up Fef appropriately for the environment. Start with AMD.
    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
            // Export global even in AMD case in case this script is loaded with
            // others that may still expect a global Fef.
            root.Fef = factory(root, exports, _, $);
        });

        // Next for Node.js or CommonJS. jQuery may not be needed as a module.
    } else {
        root.Fef = factory(root, {}, root._, (root.jQuery || root.$));
    }
}(function(root, Fef, _, $) {
    Fef.$ = $;
    Fef.VERSION = "V0.1";
    var instances= [],
        globalConfig = {}
    /**
     * Creates a new version of a function whose this-value is bound to a specific
     * object.
     * @param {Function} method The function to bind.
     * @param {Object} thisValue The this-value to set for the function.
     * @returns {Function} A bound version of the function.
     * @private
     */

    function bind(method, thisValue) {
        return function() {
            return method.apply(thisValue, arguments);
        };
    }

    /**
     * Signals that an error has occurred. If in development mode, an error
     * is thrown. If in production mode, an event is fired.
     * @param {Error} [exception] The exception object to use.
     * @returns {void}
     * @private
     */
    function error(exception) {

        if (globalConfig.debug) {
            throw exception;
        } else {
            $.noop();
        }
    }

    // Fef.View are almost more convention than they are actual code.

    // Creating a Fef.View creates its initial element outside of the DOM,
    // if an existing element is not provided...
    var View = Fef.View = function(options) {
        this.cid = _.uniqueId('view');
        globalConfig = _.pick(options || {}, configOptions)
        _.extend(this, _.pick(options || {}, viewOptions));
        this._ensureElement();
        _.extend(this,this.setViewAttr && this.setViewAttr() || {});
        this.initialize.apply(this, arguments);
        instances.push({
            id:this.cid,
            view:this
        })

    };

    // Cached regex to split keys for `delegate`.
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;

    // List of view options to be merged as properties.
    var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
    var configOptions = ["debug"]

    // Set up all inheritable **Fef.View** properties and methods.
    _.extend(View.prototype, {

        // The default `tagName` of a View's element is `"div"`.
        tagName: 'div',

        // jQuery delegate for element lookup, scoped to DOM elements within the
        // current view. This should be preferred to global lookups where possible.
        $: function(selector) {
            return this.$el.find(selector);
        },

        // Initialize is an empty function by default. Override it with your own
        // initialization logic.
        initialize: function() {},

        // **render** is the core function that your view should override, in order
        // to populate its element (`this.el`), with the appropriate HTML. The
        // convention is for **render** to always return `this`.
        render: function() {
            return this;
        },

        //
        renderPartial:function (selector,html){
            this.$el.find(selector).html(html);
        },
        renderView:function(html){
            this.$el.html(html);
        },
        // Remove this view by taking the element out of the DOM, and removing any
        // applicable Fef.Events listeners.
        remove: function() {
            this._removeElement();
            return this;
        },

        // Remove this view's element from the document and all event listeners
        // attached to it. Exposed for subclasses using an alternative DOM
        // manipulation API.
        _removeElement: function() {
            this.$el.remove();
        },

        // Change the view's element (`this.el` property) and re-delegate the
        // view's events on the new element.
        setElement: function(element) {
            this.undelegateEvents();
            this._setElement(element);
            this.delegateEvents();
            return this;
        },

        // Creates the `this.el` and `this.$el` references for this view using the
        // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
        // context or an element. Subclasses can override this to utilize an
        // alternative DOM manipulation API and are only required to set the
        // `this.el` property.
        _setElement: function(el) {
            this.$el = el instanceof Fef.$ ? el : Fef.$(el);
            this.el = this.$el[0];
        },

        // Set callbacks, where `this.events` is a hash of
        //
        // *{"event selector": "callback"}*
        //
        //     {
        //       'mousedown .title':  'edit',
        //       'click .button':     'save',
        //       'click .open':       function(e) { ... }
        //     }
        //
        // pairs. Callbacks will be bound to the view, with `this` set properly.
        // Uses event delegation for efficiency.
        // Omitting the selector binds the event to `this.el`.
        delegateEvents: function(events) {
            events || (events = _.result(this, 'events'));
            if (!events) return this;
            this.undelegateEvents();
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method)) method = this[method];
                if (!method) continue;
                var match = key.match(delegateEventSplitter);
                this.delegate(match[1], match[2], _.bind(method, this));
            }
            return this;
        },

        // Add a single event listener to the view's element (or a child element
        // using `selector`). This only works for delegate-able events: not `focus`,
        // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
        delegate: function(eventName, selector, listener) {
            this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
        },

        // Clears all callbacks previously bound to the view by `delegateEvents`.
        // You usually don't need to use this, but may wish to if you have multiple
        // Fef views attached to the same DOM element.
        undelegateEvents: function() {
            if (this.$el) this.$el.off('.delegateEvents' + this.cid);
            return this;
        },

        // A finer-grained `undelegateEvents` for removing a single delegated event.
        // `selector` and `listener` are both optional.
        undelegate: function(eventName, selector, listener) {
            this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
        },

        // Produces a DOM element to be assigned to your view. Exposed for
        // subclasses using an alternative DOM manipulation API.
        _createElement: function(tagName) {
            return document.createElement(tagName);
        },

        // Ensure that the View has a DOM element to render into.
        // If `this.el` is a string, pass it through `$()`, take the first
        // matching element, and re-assign it to `el`. Otherwise, create
        // an element from the `id`, `className` and `tagName` properties.
        _ensureElement: function() {
            if (!this.el) {
                var attrs = _.extend({}, _.result(this, 'attributes'));
                if (this.id) attrs.id = _.result(this, 'id');
                if (this.className) attrs['class'] = _.result(this, 'className');
                this.setElement(this._createElement(_.result(this, 'tagName')));
                this._setAttributes(attrs);
            } else {
                this.setElement(_.result(this, 'el'));
            }
        },

        // Set attributes from a hash on this view's element.  Exposed for
        // subclasses using an alternative DOM manipulation API.
        _setAttributes: function(attributes) {
            this.$el.attr(attributes);
        }
    });


    var Context = Fef.Context = {}
    //a idea form t3 framework(http://t3js.org/),handle the communication between multiple views.
    _.extend(Context, {
        _handlers:{},
        on:function(type, handler){
                var handlers = this._handlers[type],
                    i,
                    len;

                if (typeof handlers === 'undefined') {
                    handlers = this._handlers[type] = [];
                }

                for (i = 0, len = handlers.length; i < len; i++) {
                    if (handlers[i] === handler) {
                        // prevent duplicate handlers
                        return;
                    }
                }

                handlers.push(handler);
        },
        off:function(type, handler) {

                var handlers = this._handlers[type],
                    i,
                    len;

                if (handlers instanceof Array) {
                    for (i = 0, len = handlers.length; i < len; i++) {
                        if (handlers[i] === handler) {
                            handlers.splice(i, 1);
                            break;
                        }
                    }
                }
        },
        fire:function(type, data){
            var handlers,
                i,
                len,
                event = {
                    type: type,
                    data: data
                };

            // if there are handlers for the event, call them in order
            handlers = this._handlers[event.type];
            if (handlers instanceof Array) {
                // @NOTE: do a concat() here to create a copy of the handlers array,
                // so that if another handler is removed of the same type, it doesn't
                // interfere with the handlers array during this loop
                handlers = handlers.concat();
                for (i = 0, len = handlers.length; i < len; i++) {
                    handlers[i].call(this, event.data);
                }
            }
        },
        broadcast:function(name, data){
                // also fire an event so non-T3 code can listen for the message
                var i,
                    j,
                    id,
                    instanceData,
                    messageHandlers,
                    processMessageHandler= function(_name){
                        if (_.indexOf(instanceData.messages || [], _name) !== -1) {
                            messageHandlers.push(bind(instanceData.onmessage, instanceData));
                        }
                        for (i = 0; i < messageHandlers.length; i++) {
                            messageHandlers[i](_name, data);
                        }
                     };

                for (j = 0; j < instances.length; j++) {
                    var instance = instances[j]
                    if (instance.hasOwnProperty("id")) {
                        messageHandlers = [];
                        instanceData = instance["view"];

                        // Module message handler is called first
                        if(_.isArray(name)){
                            _.each(name,function(_each){
                                processMessageHandler(_each)
                            })
                        }else{
                            processMessageHandler(name)
                        }

                    }

                }
                this.fire('message', {
                    message: name,
                    messageData: data
                });
        }
    })


    var service = Fef.Service = {}

    _.extend(service, {
        services:{},
        //Registers a new service
        add:function(serviceName,creator, options){
            
            if (typeof this.services[serviceName] !== 'undefined') {
                error(new Error('Service ' + serviceName + ' has already been added.'));
                return;
            }
            options = options || {};
            this.services[serviceName] = {
                creator: _.extend(this,creator),
                instance: null
            };
        },
        get:function(serviceName){
            var serviceData = this.services[serviceName];

            if (serviceData) {


                if (!serviceData.instance) {
                    serviceData.instance = serviceData.creator;
                }
                if (serviceData.creator.initialize){
                    serviceData.creator.initialize.call()
                }
                return serviceData.instance;
            }

            return null;
        },
        setAttribute:function(name, value){
            var that = this;
            if(typeof name === "object"){
                _.map(name,function(value, key){
                  that[key] = value;  
                })
            }else{
                that[name] = value;
            }
        },
        getAttribute:function(name){
            return this[name]
        }
    })
    // Helpers
    // -------

    // Helper function to correctly set up the prototype chain for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var extend = function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() {
                return parent.apply(this, arguments);
            };
        }

        // Add static properties to the constructor function, if supplied.
        _.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent` constructor function.
        var Surrogate = function() {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) _.extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    };
    // Set up inheritance for the model, collection, router, view and history.
    View.extend = extend;
    return Fef;

}))
