jsonp = {
	get:function(path, args, responseHandler) {
		result = { loading:true, error:null, response:null }
		<script path=path args=args responseHandler=responseHandler result=result>
			result = result.evaluate()
			var win = window,
				doc = win.document
			if (!win.__jsonpId) { win.__jsonpId = 1 }
			var id = '__jsonp_'+(win.__jsonpId++)
			win[id] = function(response) {
				var err = null
				if (responseHandler && !responseHandler.isNull()) {
					var event = fun.expressions.fromJsValue({ type:'xhr-response', error:err, response:response })
					handler.invoke([event])
				}
				if (err) {
					fun.dictSet(result, 'error', err)
				} else {
					fun.dictSet(result, 'response', response)
				}
				fun.dictSet(result, 'loading', false)
			}
			
			var script = doc.createElement('script')
			script.src = path.asString()+'&callback='+id
			doc.getElementsByTagName('head')[0].appendChild(script)
		</script>
		return result
	}
}
