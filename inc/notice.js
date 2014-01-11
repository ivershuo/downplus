(function(ns){
	var notifications = chrome.notifications;
	var Notice = function(ntfId, conf){
		if(typeof ntfId === 'object'){
			conf = ntfId;
			ntfId = null;
		}
		ntfId = ntfId || 'notice_' + +new Date;
		this.ntfId = ntfId;

		this.conf = mix({
			defaultTitle : '提示：'
		}, conf, true);

		createEvents(this);
		this._init();

		return ntfId;
	};
	Notice.icons = {
		'notice'  : 'data:image/gif;base64,R0lGODlhEAAQAPcAMf///wBEqoqm1R161kmEyuHr+ABmzACH7kFrt6zL5Eqt9imX7R5OqAB54P7u3wBs1Y/V/yOE2gBUup/E8HKf2hOi/1q6/A9uzRZXtf//9bLi/yat/wCZ/wBr3unv+S990ABMsxNjwanW9TN1xwB748TQ7A921Tyn9rHI7BWR7xdgvgBdw1CY2k6//wCP9ySR6WHF//fy7w9/3h1RrQBx1yZ6z//57Hug1dXu/hhyzwpCpZWp1LTL7jCF1gBYvk+w+Bma9gBPtQCD6Rlsx+H6/wB130prtQt52h9RqyWN4iqZ7QCU9yF71hhtzABKsABfxQCJ7/vv42bM/0my+iFKrZTY/7nn/xaX9Hui1/9oLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAFkALAAAAAAQABAAAAjKALMIHEiwoEEBCGYgMbLDoEAeGHw88SEBRAAGJQqikPCg44IfRSQ40ZFRoAcVNFKyyJCFyAMfThgMvDGgiE0CNjLgePBEQoCGWUa8IEG0w4UeHQ0YCIJA4BAlQqJeqQIBRkoDPmYIbHICitcFAq0USblCa5YPFlyoTZIhg4axNJ40zUJBwQYOHCLEiCHCJo0VAgQWGACjAocaDqIksFkEg4eBE5LA2EDjgokjRH3wKDhhwJQWG4CkkBFis8ECFD7kyDECy2OHsAkGBAA7',
		'success' : 'data:image/gif;base64,R0lGODlhEAAQAOYAAARsE5zgd0/AJtfsyi6wFoS1hACZALLWsmbIQx+oCwCICDmMO7/ov/r2/Pnq+gBtJjq1HIXMeqfJqu/37xaFF9Hh0XnTTCydJ2bMMw2jAKflg5Xcd0CmQRNzGVC+O+rm7EW7IgByMojYXi6gKgCFEiWjF9/v2wB9IRyUHGzGU4zFjDq1IQBmMweeAPXw9gCND4i/jiqqIBupCH7TWQB8Kf///1rFLEe8ISetC+nz3C+oJBF6GCStEUK1IbjfuIa7hjGoKB6RHXPKVgBsOpvde1TDKTqUOkKrQo/LjwiODk3AJwuNCCmlKTOvHiKqCf/3/0C5G5bbeABxNonYYQCGGxmtCD60K////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAUUAFcALAAAAAAQABAAAAe5gFeCg4SFhkhHIyMcKoaCDExCATMIHjEoPoUMQBoiGEU3EAQJS5mDTBoWGJ8gEAkRPBQTgkgpU6s2SiBOJk8DST+CHBs2IEUCIDgmNTVRLwuCIzMlMDxQysxELVQ7ghceEg4VTcs12gY03Vcclh8uT0/mLS0GUtBXKjoyVi4N8vQnHhQYFERGBg85zhkgMaTDLEE+lszLYKDiiSEADhTyQUHBixcnQjzooNHQhB8LdnRYUOCho5eDAgEAOw==',
		'error'   : 'data:image/gif;base64,R0lGODlhEAAQAOYAAP////f//+/3/+b39+bv997v7//m5tbv9/fm5t7m7/+1pf+1lPetpe+tpf+lhOalpf+ce/+ZZv+Uc/+MY/eMa/eMY/+EWu+Ec/eEWuaEc96Ec9Z7c/9zSv9zQs57e/dzSu9zUsV7e/9rQv9rOvdrSvdrQv9mM/djQvdjOvdaOv9aKe9aOv9SKf9SIf9SGfdSIe9SMd5SOv9KGfdKKc5SQu9KIeZKMd5KMf9CCP9CEPdCGeZCIf86CN5CIeY6Gf8zAL06MeYxEP8pAN4xEPcpANYxEO8pAN4pCLUxMdYpEPchANYpCK0xMc4pEO8hAMUpEOYhALUpIdYhAM4hEMUhELUhIZQpMYwpOrUhGZQhKa0ZEKUZEJwZGaUQEJwQEP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAUUAF8ALAAAAAAQABAAAAfCgF+Cg4SFhQYXMDU7NhkGhl8KMxIOExwjL0MMhQopCxKXJioyOUcNgwYzCxYcHSMqLaQ8TwiCFxISHR0ioi45PD9JG4IwDj00MSsoKCclHzJJQII7E0EHBQMBANsAHE9agj4cOgcJBALa2xxRW4I3IzkgGBUUuBIQH1ZMghksOTk4gP0QosQJliweBCEowqPhjx9EjBhpcoVLLUENpDwkEhFKlCteHhRqQGVJkiZRrGThItIQAg9IunhhEuIipJuDAgEAOw=='
	};
	Notice.ins = {};
	createEvents(Notice);

	notifications.onClicked.addListener(function(id){
		if(Notice.ins[id]){
			Notice.ins[id].onclick();
		}
	});

	mix(Notice.prototype, {
		_init : function(){
			var self = this;
			this.created = false;
			this.status  = 'hide';

			Notice.ins[this.ntfId] = this;
		},
		onclick : function(){
			this.fire('click', {
				status : this.status
			});
		},
		show : function(message, title, type){
			var self = this,
				ntfId = this.ntfId,
				created = this.created,
				icons = Notice.icons;
			if(message == 'clear'){
				created && notifications.clear(ntfId, function(){
					self.created = false;
					self.status  = 'hide';
				});
				return;
			}

			var icon = icons.notice;
			if(type == 'success'){
				icon = icons.success;
			} else if(type == 'error'){
				icon = icons.error;
			}			
			notifications[created ? 'update' : 'create'](ntfId, {
				type    : 'basic',
				iconUrl : icon,
				title   : title || self.conf.defaultTitle,
				message : message
			}, function(e){
				self.created = true;
				self.status  = type;
			});
		},
		showSuccess : function(message, title){
			return this.show(message, title, 'success');
		},
		showNotice : function(message, title){
			return this.show(message, title, 'notice');
		},
		showError : function(message, title){
			return this.show(message, title, 'error');
		},
		clear : function(){
			this.show('clear');
		}
	});
	
	ns.Notice = Notice;
})(this);