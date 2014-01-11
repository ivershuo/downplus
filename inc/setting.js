(function(ns){
	var storage = chrome.storage.sync;

	var Setting = ({
		set : function(k, v, cb){
			if(!k){ return;}

			var self = this,
				setting = {};
			setting[k] = v;
			storage.set(setting, function(){
				self.fire('update', {
					key : k
				});
				cb && cb();
			});
		},
		get : function(k){
			return k ? this.data[k] : this.data;
		},
		remove : function(k, cb){
			if(!k){ return;}

			var self = this;
			storage.remove(k, function(){
				self.fire('remove', {
					key : k
				});
				cb && cb();
			});
		},
		clear : function(cb){
			if(!k){ return;}

			var self = this;
			storage.remove(k, function(){
				self.fire('clear');
				cb && cb();
			});
		},
		listenChange : function(){
			var self = this;
			
			chrome.storage.onChanged.addListener(function(changes, area){
				self.sync2Attr();
				for(var key in changes){
					var newValue = changes[key].newValue;
					if(area !== 'local'){
						self[typeof newValue !== 'undefined' ? 'set' : 'remove'](key, newValue);
					}
					self.fire('change', {
						key      : key,
						value    : newValue,
						oldValue : changes[key].oldValue,
						area     : area
					});
				}

			});
		},
		sync2Attr : function(){
			var self = this;
			this.data = JSON.parse(localStorage.getItem('settingdata') || '{}');
			storage.get(null, function(data){
				self.data = data;
				localStorage.setItem('settingdata', JSON.stringify(data));
			});
		},
		init : function(){
			createEvents(this);
			this.listenChange();
			this.sync2Attr();

			return this;
		}
	}).init();

	ns.Setting = Setting;
})(this);