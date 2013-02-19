var WhiteListModel = Backbone.Model.extend({
	
	idAttribute: "id",
	
	initialize: function () { },
	
	urlRoot: "api/whitelist"
	
});

var WhiteListCollection = Backbone.Collection.extend({
	initialize: function() {
		//this.fetch();
	},
	
    getByClientId: function(clientId) {
		var clients = this.where({clientId: clientId});
		if (clients.length == 1) {
			return clients[0];
		} else {
			return null;
		}
    },
	
	model: WhiteListModel,
	url: "api/whitelist"
	
});

var WhiteListListView = Backbone.View.extend({
	tagName: 'span',
	
	initialize:function () {
		//this.model.bind("reset", this.render, this);
	},

	events:{
        "click .refresh-table":"refreshTable"
	},
	
	render:function (eventName) {
		$(this.el).html($('#tmpl-whitelist-table').html());
		
		_.each(this.model.models, function (whiteList) {
			
			// look up client
			var client = app.clientList.getByClientId(whiteList.get('clientId'));
			
			// if there's no client ID, this is an error!
			if (client != null) {
				$('#whitelist-table', this.el).append(new WhiteListView({model: whiteList, client: client}).render().el);
			}
			
		}, this);

		this.togglePlaceholder();
		
		return this;
	},

	togglePlaceholder:function() {
		if (this.model.length > 0) {
			$('#whitelist-table', this.el).show();
			$('#whitelist-table-empty', this.el).hide();
		} else {
			$('#whitelist-table', this.el).hide();
			$('#whitelist-table-empty', this.el).show();
		}
	},
	
    refreshTable:function() {
    	var _self = this;
    	this.model.fetch({
    		success: function() {
    			_self.render();
    		}
    	});
    }
});

var WhiteListView = Backbone.View.extend({
	tagName: 'tr',
	
	initialize:function() {
		if (!this.template) {
			this.template = _.template($('#tmpl-whitelist').html());
		}
		
        if (!this.scopeTemplate) {
        	this.scopeTemplate = _.template($('#tmpl-scope-list').html());
        }

		this.model.bind('change', this.render, this);
	},
	
	render:function(eventName) {
		
		var json = {whiteList: this.model.toJSON(), client: this.options.client.toJSON()};
		
		this.$el.html(this.template(json));

        $('.scope-list', this.el).html(this.scopeTemplate({scopes: this.model.get('allowedScopes'), systemScopes: app.systemScopeList}));
        
		this.$('.dynamically-registered').tooltip({title: 'This client was dynamically registered'});

        return this;
	},
	
	events:{
		'click .btn-edit': 'editWhitelist',
		'click .btn-delete': 'deleteWhitelist'
	},
	
	editWhitelist:function() {
		app.navigate('admin/whitelist/' + this.model.id, {trigger: true});
	},
	
	deleteWhitelist:function() {
		
		if (confirm("Are you sure you want to delete this whitelist entry?")) {
			var self = this;
			
            this.model.destroy({
                success:function () {
                    self.$el.fadeTo("fast", 0.00, function () { //fade
                        $(this).slideUp("fast", function () { //slide up
                            $(this).remove(); //then remove from the DOM
                            // check the placeholder in case it's empty now
                            app.whiteListListView.togglePlaceholder();
                        });
                    });
                }
            });
            
            app.whiteListListView.delegateEvents();
		}
		
		return false;
	},
	
	close:function() {
		$(this.el).unbind();
		$(this.el).empty();
	}
});

var WhiteListFormView = Backbone.View.extend({
	tagName: 'span',
	
	initialize:function () {
		if (!this.template) {
			this.template = _.template($('#tmpl-whitelist-form').html());
		}
		
		this.scopeCollection = new Backbone.Collection();
	},

	events:{
		'click .btn-save':'saveWhiteList',
		'click .btn-cancel':'cancelWhiteList',
		
	},
	
	saveWhiteList:function (event) {
		$('.control-group').removeClass('error');
		
		// process allowed scopes
        var allowedScopes = this.scopeCollection.pluck("item");
		
        if (this.model.get('id') == null) {
			this.model.set({clientId:$('#clientId input').val()});
        }
        
		var valid = this.model.set({
			allowedScopes: allowedScopes
		});
		
        if (valid) {
            var _self = this;
            this.model.save({}, {
                success:function () {
                    app.whiteListList.add(_self.model);
                    app.navigate('admin/whitelists', {trigger:true});
                },
                error:function (model,resp) {
                    console.error("Oops! The object didn't save correctly.",resp);
                }
            });
        }

        return false;
		
	},
	
	cancelWhiteList:function(event) {
		app.navigate('admin/whitelists', {trigger:true});
	},
	
	render:function (eventName) {
		
		var json = {whiteList: this.model.toJSON(), client: this.options.client.toJSON()};
		
		this.$el.html(this.template(json));
		
		
        var _self = this;
        // build and bind scopes
        _.each(this.model.get("allowedScopes"), function (scope) {
            _self.scopeCollection.add(new Backbone.Model({item:scope}));
        });

        $("#scope .controls",this.el).html(new ListWidgetView({
        	placeholder: 'new scope here', 
        	autocomplete: this.options.client.scope, 
        	collection: this.scopeCollection}).render().el);
		
		
		return this;

	}

});
