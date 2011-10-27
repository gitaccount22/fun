window.fun = {}
;(function() {
	
	var doc = document
	
	var _unique = 0
	fun.name = function(readable) { return '_' + (readable || '') + '_' + (_unique++) }
	
	// var namePromise = getPromise()
	// namePromise(function(name){ alert('hello '+name) })
	// namePromise(function(name){ alert('hello '+name) })
	// namePromise.fulfill('world') // alerts "hello world" twice
	// alert('hello '+namePromise.fulfillment[0]) // alerts "hello world" once
	function getPromise() {
		var waiters = []
		var promise = function(onFulfilled) {
			if (promise.fulfillment) { onFulFilled.apply(this, promise.fulfillment) }
			else { waiters.push(onFulfilled) }
		}
		promise.fulfill = function() {
			promise.fulfillment = arguments
			for (var i=0; i < waiters.length; i++) {
				waiters[i].apply(promise.fulfillment)
			}
			delete waiters
		}
		return promise
	}

/* Hooks
 *******/
	var _hooks = {},
		_hookCallbacks = {}
	fun.setHook = function(name, dom) { _hooks[name] = dom }
	fun.getHook = function(name) { return _hooks[name] }
	fun.hook = function(name, parentName, opts) {
		if (_hooks[name]) { return name }
		opts = opts || {}
		var parent = _hooks[parentName],
			hook = _hooks[name] = doc.createElement(opts.tagName || 'fun')
		
		for (var key in opts.attrs) { fun.attr(name, key, opts.attrs[key]) }
		
		if (_hookCallbacks[name]) {
			for (var i=0, callback; callback = _hookCallbacks[name][i]; i++) {
				callback(hook)
			}
		}
		
		if (!parent.childNodes.length || !opts.prepend) { parent.appendChild(hook) }
		else { parent.insertBefore(hook, parent.childNodes[0]) }
		
		return name
	}
	fun.destroyHook = function(hookName) {
		if (!_hooks[hookName]) { return }
		_hooks[hookName].innerHTML = ''
	}
	fun.withHook = function(hookName, callback) {
		if (_hooks[hookName]) { return callback(_hooks[hookName]) }
		else if (_hookCallbacks[hookName]) { _hookCallbacks[hookName].push(callback) }
		else { _hookCallbacks[hookName] = [callback] }
	}

/* Values
 ********/
	var values = {},
		types = {}
	fun.declare = function(id, type, value) {
		values[id] = value
		types[id] = type
	}
	fun.mutate = function(op, uniqueID, args) {
		fin._mutate(op.toLowerCase(), id, propName, args)
	}
	fun.set = function(uniqueID, val) {
		
	}
	fun.get = function(uniqueID) {
		
	}
	fun.observe = function(id, callback) {
		callback({ value:values[id] })
	}
	fun.splitListMutation = function(callback, mutation) {
		var args = mutation.args
		for (var i=0, arg; arg = args[i]; i++) {
			callback(arg, mutation.op)
		}
	}
	
/* DOM
 *****/
	fun.attr = function(name, key, value) {
		var match
		if (match = key.match(/^style\.(\w+)$/)) {
			fun.style(name, match[1], value)
		} else {
			_hooks[name].setAttribute(key, value)
		}
	}
	
	// fun.style(hook, 'color', '#fff') or fun.style(hook, { color:'#fff', width:100 })
	fun.style = function(name, key, value) {
		if (typeof key == 'object') {
			for (var styleKey in key) { fun.style(name, styleKey, key[styleKey]) }
		} else {
			if (typeof value == 'number') { value = value + 'px' }
			if (key == 'float') { key = 'cssFloat' }
			_hooks[name].style[key] = value
		}
	}
	
	fun.on = function(element, eventName, handler) {
		if (element.addEventListener) {
			element.addEventListener(eventName, handler, false)
		} else if (element.attachEvent){
			element.attachEvent("on"+eventName, handler)
		}
	}
	
	fun.text = function(name, text) {
		_hooks[name].appendChild(document.createTextNode(text))
	}
	
	fun.reflectInput = function(hookName, itemID, property, dataType) {
		var input = _hooks[hookName]
		fun.observe('BYTES', itemID, property, function(mutation) {
			input.value = mutation.value
		})
		fun.on(input, "keypress", function(e) {
			var oldValue = input.value
			setTimeout(function() {
				var value = input.value
				if (dataType == 'number') {
					if (!value) {
						value = input.value = 0
					} else if (value.match(/\d+/)) {
						value = parseInt(value, 10)
					} else {
						input.value = oldValue
						return
					}
				}
				input.value = value
				if (value == fun.cachedValue(itemID, property)) { return }
				fun.mutate("set", itemID, property, [value])
			}, 0)
		})
	}

/* DOM events
 ************/
	fun.cancel = function(e) {
		e.cancelBubble = true;
		if(e.stopPropagation) e.stopPropagation();
		if(e.preventDefault) e.preventDefault();
	}
	
	fun.isNumberKeyPress = function(e) {
		return 48 <= e.charCode && e.charCode <= 57
	}
	
/* Utility functions
 *******************/
	// wait until each item in items has received a mutation before calling callback;
	//  then call callback each time there is a mutation
	fun.dependOn = function(items, callback) {
		if (items.length == 0) { return callback() }
		var seen = {},
			waitingOn = 0
		
		var onMutation = function(mutation) {
			if (waitingOn && !seen[mutation.id+':'+mutation.property]) {
				seen[mutation.id+':'+mutation.property] = true
				waitingOn--
			}
			if (!waitingOn) { callback() }
		}
		
		for (var i=0, item; item = items[i]; i++) {
			// If the same item property is passed in twice, only mark it as being waited on once
			if (typeof seen[item.id+':'+item.property] != 'undefined') { continue }
			seen[item.id+':'+item.property] = false
			waitingOn++
			fun.observe('BYTES', item.id, item.property, onMutation)
		}
	}
	
	fun.waitForPromises = function(promises, callback) {
		var waitingFor = promises.length + 1
		function tryNow() {
			if (!--waitingFor) { callback() }
		}
		for (var i=0; i<promises.length; i++) {
			promises[i](tryNow)
		}
		tryNow()
	}
})()