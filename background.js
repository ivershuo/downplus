(function(){
	var downloads = chrome.downloads;

	var App = {
		engines : {},
		addEngine : function(name, engine){
			var notice = new Notice();
			engine.on('notice', function(data){
				notice.show(data.message, data.title, data.type);
			});

			this.engines[name] = engine;
		},
		down : function(fileUrl, engine, cb){
			if(typeof engine === 'function'){
				cb = engine;
				engine = null;
			}
			engine = engine || this.defultEng;
			if(typeof engine !== 'object'){
				engine = this.engines[engine];
			}
			var id = 'downfile_' + (+new Date),
				notice = new Notice(id, {
					defaultTitle : '下载提示：'
				});
			var tasks = engine.Tasks;

			engine.down(fileUrl, id).then(function(data){
				var downUrl = data[0],
					tid = data[1];
				chrome.tabs.create({url : downUrl});
				notice.clear();
				if(!!parseInt(Setting.get('autoDelete'))){
					//engine.delete(tid);
				}
				cb && cb(null, downUrl);
			}).otherwise(function(err){
				var error = (typeof err == 'string' ? err : JSON.stringify(err));
			 	notice.showError(error, (tasks[id].tname || '') + '下载出错');			 	
			 	cb && cb(error);
			});

			tasks[id].on('notice', function(data){
				notice.show(data.message, data.title, data.type);
			});

			notice.on('click', function(e){
				if(e.status == 'error'){
					engine.fire('confirmError', {
						fileUrl : fileUrl
					});
				}
			});
		},
		addcontextMenus : function(){
			var self = this;
			chrome.contextMenus.create({
				title    : L('name'),
				contexts : ['link', 'selection'],
				onclick  : function(info, tab){
					var fileUrl = info.linkUrl;
					self.down(fileUrl);
				}
			});
		},
		addOmnibox : function(){
			var self = this;
			chrome.omnibox.onInputEntered.addListener(function(url, tab){
				var set = trim(url).match(/^(\w+):(\w.*)$/);
				if(!set){
					self.down(url);
				} else {
					Setting.set(set[1], set[2]);
				}
			});
		},
		autoProxyDown : function(){
			var self = this;
			downloads.onCreated.addListener(function(download){
				var fileUrl = download.url,
					autoProxyLoad = !!parseInt(Setting.get('apd'));
				if(autoProxyLoad && !/^http:\/\/\w+\.lixian\.vip\.xunlei\.com\/download/.test(fileUrl)){			
					downloads.cancel(download.id, function(){
						self.down(fileUrl);
					});
				}
			});
		},
		setDefaultEng : function(){
			var defultEng = Setting.get('defultEng');
			this.defultEng = (defultEng && this.engines[engine]) || 'thunder';
		},
		apiListener : function(){
			var self = this;
			chrome.runtime.onMessageExternal.addListener(function(request, sender, cb){
				if(request.method === 'down'){
					self.down(request.data.url, request.data.eng);
				}
			});
		},
		run : function(){
			var self = this;

			this.setDefaultEng();
			this.addcontextMenus();
			this.addOmnibox();
			downloads && this.autoProxyDown();
			this.apiListener();

			Setting.on('update', function(data){
				if(data.key === 'defultEng'){
					self.setDefaultEng();
				}
			});
		}
	};

	var thunder = new Thunder;
	App.addEngine('thunder', thunder);

	App.run();	
})();