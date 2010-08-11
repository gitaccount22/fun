var q = exports.q = function(obj) {
	return JSON.stringify(obj)
}

var join = exports.join = function(args, glue) {
	return Array.prototype.join.call(args, glue || '')
}

exports.getFinCached = function(reference) {
	var type = reference.type,
		name = reference.value
	
	if (type == 'LOCAL_REFERENCE') {
		return 'fin.getLocalCachedMutation('+q(name)+').value'
	} else if (type == 'GLOBAL_REFERENCE') {
		return 'fin.getGlobalCachedMutation('+q(name)+').value'
	} else if (type == 'NUMBER') {
		return reference.value
	} else {
		throw { error: 'Unknown reference type for getFinCached', reference: reference }
	}
}

exports.CodeGenerator = Class(function() {
	
	this.init = function() {
		this._code = ''
		this._indent = ['']
		this._variables = {}
	}
	
	this.code = function(code) { return this._add(join(arguments)) }
	
	this.log = function() {
		var args = Array.prototype.slice.call(arguments, 0)
		return this._add('window.console&&console.log('+join(args.map(JSON.stringify),',')+')') }
	
	this.closureStart = function() {
		return this._add(';(function(' + join(arguments, ',') + '){', 1);
	}
	this.closureEnd = function() {
		this._indent.length -= 1
		return this._add('})(' + join(arguments, ',') + ');')
	}

	this.functionStart = function(name) { return this._add('function ' + name + '(){', 1) }
	this.functionEnd = function() {
		this._indent.length -= 1
		return this._add('}')
	}
	this.callFunction = function(name) {
		var args = Array.prototype.slice.call(arguments, 1)
		return this._add(name + '(' + args.join(', ') + ')')
	}
	
	this.assign = function(name, value) {
		this._add((this._variables[name] || name.match(/[\[\.]/) ? '' : 'var ') + name + ' = ' + value)
		this._variables[name] = true
		return this
	}
	
	this.returnIfEqual = function(var1, var2) {
		return this._add ('if ('+var1+' == '+var2+') { return; }')
	}
	
	this.ifElse = function(condExpr, ifCode, elseCode) {
		return this
			._add('if ('+condExpr+') {', 1)
			._add(ifCode, -1)
			._add('} else {', 1)
			._add(elseCode, -1)
			._add('}')
	}
	
	this.observe = function(reference, callbackCode) {
		var type = reference.type,
			name = reference.value
		
		switch(type) {
			case 'LOCAL_REFERENCE':
			case 'GLOBAL_REFERENCE':
				return this._add('fun.observe('+q(type)+', '+q(name)+', '+callbackCode+')')
			case 'NUMBER':
				return this
			default:
				throw { error: 'Unknown reference type for CodeGenerator#observe', reference: reference, callbackCode: callbackCode }
		}
	}
	
	this.reflectInput = function(hook, reference) {
		this.callFunction('fun.reflectInput', q(hook), q(reference.type), q(reference.value))
	}
	
	this.toString = function() { return this._code }
	
	this._add = function(code, deltaIndent) {
		this._code += this._indent.join("\t") + code + "\n"
		if (deltaIndent) { this._indent.length += deltaIndent }
		return this
	}
})

function Class (parent, proto) {
	if(!proto) { proto = parent }
	proto.prototype = parent.prototype
	
	var cls = function() { if(this.init) { this.init.apply(this, arguments) }}
	cls.prototype = new proto(function(context, method, args) {
		var target = parent
		while(target = target.prototype) {
			if(target[method]) {
				return target[method].apply(context, args || [])
			}
		}
		throw new Error('supr: parent method ' + method + ' does not exist')
	})
	
	// Sometimes you want a method that renders UI to only execute once if it's called 
	// multiple times within a short time period. Delayed methods do just that
	cls.prototype.createDelayedMethod = function(methodName, fn) {
		// "this" is the class
		this[methodName] = function() {
			// now "this" is the instance. Each instance gets its own function
			var executionTimeout
			this[methodName] = bind(this, function() {
				clearTimeout(executionTimeout)
				executionTimeout = setTimeout(bind(fn, 'apply', this, arguments), 10)
			})
			this[methodName].apply(this, arguments)
		}
	}
	
	cls.prototype.constructor = cls
	return cls
}