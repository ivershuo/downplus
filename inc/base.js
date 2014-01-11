(function(ns){
var mix = function(des, src, map){
	map = map || function(d, s, i){
		//这里要加一个des[i]，是因为要照顾一些不可枚举的属性
		if(!(des[i] || (i in des))){
			return s;
		}
		return d;
	}
	if(map === true){	//override
		map = function(d,s){
			return s;
		}
	}

	for (i in src) {
		des[i] = map(des[i], src[i], i, des, src);
		if(des[i] === undefined) delete des[i];	//如果返回undefined，尝试删掉这个属性
	}
	return des;
};

var encodeURIJson = function (json){
    var s = [];
    for( var p in json ){
        if(json[p]==null) continue;
        if(json[p] instanceof Array) {
            for (var i=0;i<json[p].length;i++) s.push( encodeURIComponent(p) + '=' + encodeURIComponent(json[p][i]));
        } else {
            s.push( encodeURIComponent(p) + '=' + encodeURIComponent(json[p]));
        }
    }
    return s.join('&');
};

var trim =  function(s) {
        return s.replace(/^[\s\uFEFF\xa0\u3000]+|[\uFEFF\xa0\u3000\s]+$/g, "");
};

var when = (function(){
	function Promise(){
		this._resolves = [];
		this._readyState = Promise.PENDING;
		this._data = null;
	}

	mix(Promise.prototype, {
		then: function(onFulfilled, onRejected){
			var deferred = new Defer(),
				self = this;

			function fulfill(data){
				var ret, readyState = self._readyState;

				if(readyState === Promise.FULFILLED){
					ret = onFulfilled ? onFulfilled(data) : data;
				}else if(readyState === Promise.REJECTED){
					ret = onRejected ? onRejected(data) : data;
				}

				if(Promise.isPromise(ret)){
					//如果是Promise，往下传递
					ret.then(function(data){
						deferred.resolve(data);
					}, function(data){
						deferred.reject(data);
					});
				}else{
					//不是Promise，处理返回值
					if(readyState !== Promise.REJECTED || onRejected){
						//没有异常或者已经处理了异常，返回值当作正常值处理
						deferred.resolve(ret);
					}else{
						//丢给后续的Promise处理
						deferred.reject(ret);
					}
				}
				return ret;
			}

			if(this._readyState === Promise.PENDING){
				this._resolves.push(fulfill);
			}else{
				setTimeout(function(){
					fulfill(self._data);
				});
			}

			return deferred.promise;
		},
		otherwise: function(onRejected){
			return this.then(undefined, onRejected);
		}
	});

	mix(Promise, {
		PENDING   : 0,
		FULFILLED : 1,
		REJECTED  : 2,
		isPromise: function(obj){
			return obj != null && typeof obj['then'] == 'function';
		}
	});

	function _resolve(promise, data, state){
		var state = state || Promise.FULFILLED;

		if(promise._readyState != Promise.PENDING){
			return;
		}
		
		promise._readyState = state;
		promise._data = data;

		for(var i = 0; i < promise._resolves.length; i++){
			var handler = promise._resolves[i];
			setTimeout(function(){
				handler(data);
			});		
		}
	}

	function Defer(){
		this.promise = new Promise();
	}

	mix(Defer.prototype,{
		resolve: function(data){
			return _resolve(this.promise, data, Promise.FULFILLED);
		},
		reject: function(reason){
			return _resolve(this.promise, reason, Promise.REJECTED);
		}
	});

	return {
		defer: function(){
			return new Defer();
		},
		isPromise: function(promiseOrValue){
			return Promise.isPromise(promiseOrValue);
		},
		all: function(promises){
			var deferred = qboot.when.defer();

			var n = 0, result = [];

			for(var i = 0; i < promises.length; i++){
				promises[i].then(function(ret){
					result.push(ret);
					n++;

					if(n >= promises.length){
						deferred.resolve(result);
					}
				});
			}

			return deferred.promise;
		},
		any: function(promises){
			var deferred = qboot.when.defer();

			for(var i = 0; i < promises.length; i++){
				promises[i].then(function(ret){
					deferred.resolve(ret);
				});
			}

			return deferred.promise;
		},
		join: function(){
			return qboot.when.all(arguments);
		}
	};
})();

var step = function(queue){
	var defer = when.defer(),
		self  = this,
		dArgv = [].slice.call(arguments, 1),
		f;

	function x(){
		if(queue.length){
			var _f = queue.shift(),
				argv = [].slice.call(arguments).concat(dArgv);
			if(typeof argv[0] === 'undefined'){
				argv.shift();
			}
			f = _f.apply(self, argv);
		}

		if(when.isPromise(f)) {
			f.then(queue.length ? x : (function(data){
				defer.resolve(data);
			})).otherwise(function(err){
				defer.reject(err);
			});
		} else {
			queue.length ? x(f) : defer.resolve(f);
		}
	}
	x.call(this);
	return defer.promise;
};

var get = function(url, params){
	var defer = when.defer();
	var url = url + '?' + encodeURIJson(params);

	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (xhr.readyState == 4) {
			if(xhr.status != 200){
				defer.reject();
				return;
			}

			var m = trim(xhr.responseText).match(/^\w+\((.*)\)/);
			if(!m){
				defer.reject();
			} else {
				var argvStr = m[1];
				if(/^\{/.test(argvStr)){
					try{
						defer.resolve(JSON.parse(argvStr));
					}catch(e){
						defer.reject();
					}
				} else {
					var argv = argvStr.split(',');
					argv = argv.map(function(i){ return trim(i).replace(/\'|\"/g, '')});
					defer.resolve(argv);
				}				
			}
		}
	}
	xhr.open("GET", url, true);
	xhr.send();

	return defer.promise;
};

var createEvents = function(obj){
	var events = {};
	mix(obj, {
		on: function(evtType, handler){
			events[evtType] = events[evtType] || [];
			events[evtType].push(handler);
		},
		fire: function(evtType, args){
			args = args || {};
			mix(args, {
				type: evtType,
				target: obj,
				preventDefault: function(){
					args.returnValue = false;
				}
			});
			var handlers = events[evtType] || [];
			for(var i = 0; i < handlers.length; i++){
				handlers[i](args);
			}
			return args.returnValue !== false
		}
	});
	return obj;
}

ns.base = {
	mix           : mix,
	when          : when,
	trim          : trim,
	step          : step,
	encodeURIJson : encodeURIJson,
	$get          : get,
	createEvents  : createEvents,
	L             : chrome.i18n.getMessage
};
mix(ns, ns.base);
})(this);