var a = require('../resolver-mocks'),
	resolver = require('../../src/resolver'),
	parser = require('../../src/parser'),
	tokenizer = require('../../src/tokenizer'),
	util = require('../../src/util'),
	slice = require('std/slice')

test("a declared alias for a string")
	.code(
		'guy = "Marcus"',
		'guy'
	)
	.expect(
		a.declaration('guy', a.literal('Marcus')),
		a.reference('guy')
	)

test("an empty div")
	.code('<div/>')
	.expect(a.xml('div'))

test("nested aliases")
	.code(
		'foo = { bar:1, cat:"cat" }',
		'foo foo.bar foo.cat'
	)
	.expect(
		a.declaration('foo', a.literal({ bar:1, cat:'cat' })),
		a.reference('foo'),
		a.reference('foo.bar'),
		a.reference('foo.cat')
	)

// test('nested values and references of references')
// 	.code(
// 		'var foo = { nested: { cat:"yay" } }')
// 		'var bar = foo.nested',
// 		'var cat = bar.cat',
// 		'var cat2 = foo.nested.cat',
// 		'foo.nested.cat bar.cat cat bar')
// 	.declarations(
// 		ref(1, a.declaration('foo', a.object({ nested:a.object({ cat:a.literal('yay') }) })))
// 	)
// 	.expressions(a.reference(), ref(1), ref(1), ref(4))
// 
// all values are typed at runtime, and can change type. there are
// 	atomics: numbers, text, bool, null
// 	collections: list, object
// 	collection references: foo.bar.cat, taw[1][4]
// 	do we want dynamic dereferencing?: foo[bar]
// an expression is
	
test('clicking a button updates the UI')
	.code(
		'foo = "bar"',
		'qwe = "cat"',
		'<div id="output">foo</div>',
		'<button id="button">"Click me"</button onClick=handler() {',
		'	foo set: "cat"',
		'	qwe set: foo',
		'}>')
	.expect(
		a.declaration('foo', a.literal('bar')),
		a.declaration('qwe', a.literal('cat')),
		a.xml('div', { id:a.literal('output') }, [ a.reference('foo') ]),
		a.xml('button', { id:a.literal('button'), onClick:a.handler([], [
			a.mutation(a.reference('foo'), 'set', [a.literal('cat')]),
			a.mutation(a.reference('qwe'), 'set', [a.reference('foo')])
		]) }, [ a.literal('Click me') ])
	)

test('variable declaration inside div')
	.code('<div>cat="cat"</div>')
	.expect(a.xml('div', [], [a.declaration('cat', a.literal('cat'))]))

test('function invocation')
	.code('fun = function() { return 1 }', 'fun()')
	.expect(a.declaration('fun', a.function([], [a.return(a.literal(1))])), a.invocation(a.reference('fun')))

test('function arguments')
	.code('fun = function(arg1, arg2) { return arg1 + arg2 }', 'fun(1, 2)')
	.expect(
		a.declaration('fun', a.function([a.argument('arg1'), a.argument('arg2')], [
			a.return(a.binaryOp(a.reference('arg1'), '+', a.reference('arg2')))
		])),
		a.invocation(a.reference('fun'), a.literal(1), a.literal(2))
	)

test('missing script tag attribute value is caught')
	.code(
		'foo = function(qwe) {',
		'	<script missing=missing>',
		'	</script>',
		'	return 1',
		'}')
	.expectError(/^Couldn't find a variable called "missing"/)

test('variable names must start with a lowercase letter')
	.code('Foo = "qwe"')
	.expectError(/^Variable names must start with/)

test('xml hash-expand attribute')
	.code('<div #{ class:"cool" } />')
	.expect(a.xml('div', [{ expand:a.literal({ 'class':'cool' }) }]))

test('import path')
	.code('import ui/lists', 'lists')
	.expect(a.reference('lists'))
	
// Boolean values
// Null values
// Handlers, Functions and Templates as expressions and being emitted
// 
// test('typed value values')
// 	.code(
// 		'Response = { error:Text, result:Text }',
// 		'Response response = { error:"foo", result:"bar" }',
// 		'response'
// 	)
// 	.expect(
// 		a.declaration('Response', a.interface({ error:a.Text, result:a.Text })),
// 		a.declaration('response', a.object({ error:a.literal('foo'), result:a.literal('bar') }), a.alias('Response')),
// 		a.alias('response')
// 	)
// 
// test('typed function declaration and invocation')
// 	.code(
// 		'Response = { error:Text, result:Text }',
// 		'Response post = function(Text path, Anything params) {',
// 		'	return { error:"foo", response:"bar" }',
// 		'}',
// 		'response = post("/test", { foo:"bar" })'
// 	)
// 	.expect(
// 		a.declaration('Response', a.interface({ error:a.Text, result:a.Text })),
// 		a.declaration('post', a.function([a.argument('path', a.Text), a.argument('params', a.Anything)], [
// 			a.return(a.object({ error:a.literal('foo'), response:a.literal('bar') }))
// 		]), a.alias('Response')),
// 		a.declaration('response', a.invocation(a.alias('post'), a.literal('/test'), a.object({ foo:a.literal('bar')})))
// 	)

// TODO test file imports

/* Util
 ******/
function test(name) {
	util.resetUniqueID()
	ref.references = {}
	var inputCode
	return {
		code: function(/* line1, line2, ... */) {
			inputCode = slice(arguments).join('\n')
			return this
		},
		expect: function() {
			runTest(null, slice(arguments))
			return this
		},
		expectError: function(expectedErrorRe) {
			runTest(expectedErrorRe, null)
			return this
		}
	}
	function runTest(expectedErrorRe, expectedAST) {
		util.resetUniqueID() // TODO the unique IDs function should probably be on the resolver
		var count = 1,
			testName = '"'+name+'" ' + (count++ == 1 ? '' : count)
		while (module.exports[testName]) {
			testName = '"'+name+'" ' + (count++)
		}
		module.exports['resolve\t'+testName+''] = function(assert) {
			try { runTest() }
			catch(e) { onError(e) }
			
			function runTest() {
				var inputAST = parser.parse(tokenizer.tokenize(inputCode)),
					opts = { dirname:__dirname, minify:false }
				resolver.resolve(inputAST, opts, function(err, resolved) {
					if (err) { return onError(err) }
					var output = resolved.expressions
					assert.deepEqual(expectedAST, output)
					assert.done()
				})
			}
			
			function onError(e) {
				if (expectedErrorRe && e.message.match(expectedErrorRe)) {
					assert.done()
				} else {
					console.log('resolver threw', e.stack)
					process.exit(0)
				}
			}
		}
	}
}

function ref(id, value) {
	var references = ref.references
	if (value) {
		if (references[id]) { throw new Error("Same test reference declared twice") }
		references[id] = value
	} else {
		if (!references[id]) { throw new Error("Referenced undeclared test reference") }
	}
	return references[id]
}
