(function(ns){
	var Thunder = function(conf){
		mix(this, mix({
			domain          : 'http://dynamic.cloud.vip.xunlei.com',
			loginUrl        : 'http://i.xunlei.com/login.html',
			downWidthWebUrl : 'http://lixian.vip.xunlei.com/lixian_login.html?furl=%furl%',
			loginPanelSize : {
				width  : 400,
				height : 460
			},
			loginPanelTimeoit : 60000
		}, conf, true));

		this.interface = this.interface || this.domain + '/interface/';
		this.Tasks = {};

		createEvents(this);
		this._loginUiListen();
		this._evtListen();
	}

	function DownTask(id){
		createEvents(this);
		this.id = id;
	};

	mix(Thunder.prototype, {
		setUid : function(uid){
			this.uid = uid;
		},
		getUid : function(){
			var defer = when.defer(),
				self  = this;
			chrome.cookies.get({
				url  : self.domain,
				name : 'userid'
			}, function(d){
				if(d && d.value){
					defer.resolve(d.value);
				} else {
					defer.reject('尚未登录');
				}
			});
			return defer.promise;
		},
		login : function(){
			var defer = when.defer(),
				self = this;
			this.getUid().then(function(uid){
				self.setUid(uid);
				defer.resolve();
			}).otherwise(function(){
				if(!self.wid){
					self._t = self._t || {};
					chrome.windows.create({
						url    : self.loginUrl,
						type   : 'panel',
						width  : self.loginPanelSize.width,
						height : self.loginPanelSize.height,
					}, function(w){
						var wid = w.id;
						self._t[wid] = setTimeout(function(){
							chrome.windows.remove(wid, function(){
								defer.reject('登录超时');
							});
						}, self.loginPanelTimeoit);
						self.wid = wid;
					});
				} else {
					chrome.windows.update(self.wid, {
						focused : true
					});
				}

				self.on('loginPanelClose', function(e){
					self.getUid().then(function(uid){
						self.setUid(uid);
						defer.resolve();
					}).otherwise(function(){
						defer.reject('登录错误');
					});
				});
			});			
			return defer.promise;
		},
		_loginUiListen : function(){
			var self = this;
			chrome.windows.onRemoved.addListener(function(wid){
				if(wid == self.wid){
					clearTimeout(self._t[self.wid]);
					delete self.wid;
					self.fire('loginPanelClose');
				}				
			});
			chrome.cookies.onChanged.addListener(function(cookieData){
				var cookie = cookieData.cookie;
				if(cookie.name == 'userid' && cookie.value && cookie.domain == '.xunlei.com') {
					self.setUid(cookie.value);
					self.wid && chrome.windows.remove(self.wid);
				}
			});
		},
		_evtListen : function(){
			var self = this;
			this.on('confirmError', function(data){
				chrome.tabs.create({
					url : self.downWidthWebUrl.replace('%furl%', encodeURIComponent(data.fileUrl))
				});
			});
		},
		step : function(){
			return step.apply(this, arguments);
		},
		queryCid : function(url){
			var defer = when.defer();
			$get(this.interface + 'task_check', {
				url       : url,
				interfrom : 'task',
				random    : +new Date + Math.random(),
				tcache    : +new Date
			}).then(function(data){
				defer.resolve(data);
			}).otherwise(function(err){
				defer.reject('提交下载任务失败');
			});
			return defer.promise;
		},
		down2Thunder : function(data, url, downId){
			var defer = when.defer();
			var cid             = data[0],
				gcid            = data[1],
				file_size       = data[2],
				avail_space     = data[3],
				tname           = data[4],
				goldbean_need   = data[5],
				silverbean_need = data[6],
				is_full         = data[7],
				random          = data[8],
				type            = data[9],
				rtcode          = data[10];

			var task = this.Tasks[downId];
			task.fire('notice', {
				message : '正下载到迅雷离线...'
			});
			task.tname = tname;

			if(tname && cid && gcid && file_size){
				$get(this.interface + 'task_commit', {
					callback   : 'ret_task',
					uid        : this.uid,
					cid        : cid,
					gcid       : gcid,
					size       : file_size,
					goldbean   : goldbean_need,
					silverbean : silverbean_need,
					t          : tname,
					url        : url,
					type       : 0,
					o_page     : 'history',
					o_taskid   : 0,
					class_id   : 0,
					interfrom  : 'task',
					time       : new Date,
					noCacheIE  : +new Date
				}).then(function(data){
					if(data[0] == -12 && data[1] == -12){
						defer.reject('下载失败，好像是要输验证码，请直接打开迅雷输验证码下载吧');
					} else {
						task.tid = data[1];
						defer.resolve(data);
					}					
				}).otherwise(function(err){
					defer.reject('下载到迅雷失败');
				});
			} else {
				defer.reject('下载失败到迅雷失败');
			}
			
			return defer.promise;
		},
		getDownUrl : function(d, url, downId){
			var self = this,
				defer = when.defer(),
				flag  = false;
			$get(this.interface + 'showtask_unfresh', {
				callback  : 'jsonp',
				t         : new Date,
				type_id   : 4,
				page      : 1,
				tasknum   : 1,
				p         : 1,
				interfrom : 'task'
			}).then(function(data){
				var tasks = data.info.tasks;
				while(tasks.length){
					var task = tasks.shift();
					if(task.id == d[1]){
						defer.resolve([task.lixian_url, task.id]);
						flag = true;
					}
				}
				!flag && defer.reject('下载任务失败，请确定迅雷离线离线里任务存在');
				delete self.Tasks[downId];
			}).otherwise(function(err){
				defer.reject('获取迅雷下载链接失败');
				delete self.Tasks[downId];
			});
			return defer.promise;
		},
		deleteTask : function(taskid){
			var defer = when.defer();
			var url = this.interface + 'task_delete?' + encodeURIJson({
				callback : 'jsonp' + +new Date,
				type     : 0,
				t        : new Date
			});
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function(){
				if (xhr.readyState == 4) {
					if(xhr.status != 200){
						defer.reject();
						return;
					}
					defer.resolve();
				}
			};
			xhr.open('POST', url, true);
			xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			xhr.send(encodeURIJson({
				taskids   : taskid,
				databases : 0,
				interfrom : 'task'
			}));
			return defer.promise;
		},
		down : function(url, downId){
			var downId = downId || 'downfile_' + (+new Date);
			this.Tasks[downId] = new DownTask(downId);

			return this.step([
				this.login,
				this.queryCid,
				this.down2Thunder,
				this.getDownUrl
			], url, downId, this);
		},
		delete : function(taskid){
			return this.step([
				this.login,
				this.deleteTask
			], taskid);
		}
	});

	ns.Thunder = Thunder;
})(this);