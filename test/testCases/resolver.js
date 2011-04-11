var std = require('std'),
	a = require('../astMocks'),
	resolver = require('../../lib/resolver')

test("resolves a declared alias to a local item property", [
		a.declaration('name', a.static("Marcus")),
		a.alias("name", "Marcus")],
	a.property(-1, ["__local_$2"], "Marcus"))

test("resolved empty XML", a.xml('div', [], []), a.xml('div', [], []))

/* UTIL */
function test(name, unresolvedAST, expectedAST1, expectedAST2 /* ... */) {
	var expectedAST = std.slice(arguments, 2)
	module.exports['test '+name] = function(assert) {
		var resolvedAST = resolve(unresolvedAST)
		if (!std.isArray(resolvedAST)) { resolvedAST = [resolvedAST] }
		assert.deepEqual(resolvedAST, expectedAST)
		assert.done()
	}
}

function resolve(ast) {
	return resolver.resolve(ast).ast
}
