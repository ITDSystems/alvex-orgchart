/**
 * Copyright © 2012 ITD Systems
 *
 * This file is part of Alvex
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// Ensure root object exists
if (typeof Alvex == "undefined" || !Alvex)
{
	var Alvex = {};
}
if (typeof Alvex.util == "undefined" || !Alvex.util)
{
    Alvex.util = {};
}

/*
 * Sequentially sends Ajax queries
 */
Alvex.util.processAjaxQueue = function (config)
{
    // check if there are more queries to process in queue
    if (config.queue.length == 0)
    {
        var clb = config.doneCallback;
        if (clb && clb.fn)
            (clb.fn).call(clb.scope, clb.obj);
        return;
    }
    var request = config.queue[0];
    var req =
    {
        url: request.url,
        method: request.method || Alfresco.util.Ajax.GET,
        dataObj: request.dataObj,
        config: config,
        successCallback:
        {
            fn: function (param)
            {
                // call user defined function
                var clb = param.config.config.queue[0].successCallback;
                if (clb && clb.fn)
                    (clb.fn).call(clb.scope, param, clb.obj);
                // remove request from the queue
                param.config.config.queue.splice(0,1);
                // process next request in queue
                Alvex.util.processAjaxQueue(param.config.config);
            }
        },
        failureCallback:
        {
            fn: function (param)
            {
                // call user defined function
                var clb = param.config.config.queue[0].failureCallback;
                if (clb)
                    (clb.fn).call(clb.scope, param.config.config, clb.obj);
            }
        }
    };
    if (request.requestContentType)
        req.requestContentType = request.requestContentType;
    Alfresco.util.Ajax.request(req);
};

(function()
{
	var Dom = YAHOO.util.Dom,
		Event = YAHOO.util.Event,
		KeyListener = YAHOO.util.KeyListener;
	var $html = Alfresco.util.encodeHTML;

	Alvex.OutOfOfficePreferences = function(htmlId)
	{
		Alvex.OutOfOfficePreferences.superclass.constructor.call(this, "OutOfOfficePreferences", htmlId);
		YAHOO.Bubbling.on("formContentReady", this.onFormContentReady, this);
		return this;
	};

	YAHOO.extend(Alvex.OutOfOfficePreferences, Alfresco.component.Base,
	{
		options:
		{
			initialized: false,
			isOOOActive: false,
			roleInstances: []
		},

		onFormContentReady: function()
		{
			if(!this.options.initialized) {
				this.options.initialized = true;
				this.init();
			}
		},

		onReady: function OrgchartViewer_onReady()
		{
			if(!this.options.initialized) {
				this.options.initialized = true;
				this.init();
			}
		},
		
		init: function()
		{
			var queue = [];
			
			queue.push({
				url: Alfresco.constants.PROXY_URI + "api/alvex/orgchart/user/" 
						+ encodeURIComponent(Alfresco.constants.USERNAME) + "/ooo",
				method: Alfresco.util.Ajax.GET,
				requestContentType: Alfresco.util.Ajax.JSON
			});
			
			if(queue.length > 0)
			{
				queue[queue.length-1].successCallback = 
				{
					fn: function (resp)
					{
						this.fillPage(resp.json);
					},
					scope:this
				};

				Alvex.util.processAjaxQueue({
					queue: queue
				});
			}
			this.widgets.saveButton = new YAHOO.widget.Button(this.id + "-save-btn",
				{ onclick: { fn: this.savePrefs, obj: null, scope: this } });
		},
		
		fillPage: function(data)
		{
			this.options.isOOOActive = (data.isOOO == "true");
			var isOOOActiveEl = Dom.get(this.id + '-ooo-active');
			if( this.options.isOOOActive )
				isOOOActiveEl.checked = true;
			var ddEl = Dom.get(this.id + '-default-delegation-picker');
			ddEl.value = data.defaultDelegation.nodeRef;
			
			new Alvex.OrgchartViewer( this.id + '-default-delegation-picker' ).setOptions({
				multipleSelectMode: false,
				mode: "picker"
			});
			
			this.options.roleInstances = data.roleInstances;
			
			// DataSource setup
			this.widgets.rolesDataSource = new YAHOO.util.DataSource(this.options.roleInstances ,
				{
					responseType: YAHOO.util.DataSource.TYPE_JSARRAY,
					responseSchema:
					{
						fields: ["unit","role","delegationUserName","delegationNodeRef", "riNodeRef"]
					}
				});
			
			var renderDelegation = function renderDelegation(elLiner, oRecord, oColumn, oData)
			{
				var id = this.ooo.id;
				var rId = oRecord.getId();
				var clone = Dom.get(id + "-default-delegation").cloneNode(true);
				var html = clone.innerHTML.replace(/default-delegation-picker/gi, 'delegation-picker-' + rId);
				elLiner.innerHTML = html;
			};
			
			var columnDefinitions =
				[
					{ key: "role", label: this.msg("alvex.orgchart.role"), 
								sortable: false, width: 250 },
					{ key: "unit", label: this.msg("alvex.orgchart.unit"), 
								sortable: false, width: 250 },
					{ key: "delegationNodeRef", label: this.msg("alvex.orgchart.delegation"), 
								sortable: false, width: 250, formatter: renderDelegation }
				];
				
			// DataTable definition
			this.widgets.rolesDataTable = new YAHOO.widget.DataTable(this.id + "-roles-delegations-table", 
					columnDefinitions, this.widgets.rolesDataSource,
				{
					initialLoad: true,
					initialRequest: '',
					renderLoopSize: 32,
					sortedBy:
					{
						key: "unit",
						dir: "asc"
					},
					MSG_EMPTY: this.msg("alvex.orgchart.noRolesDefined"),
					MSG_LOADING: this.msg("alvex.orgchart.loadingRoles"),
					MSG_ERROR: this.msg("alvex.orgchart.errorLoadingRoles")
				});
			this.widgets.rolesDataTable.ooo = this;
			this.widgets.rolesDataTable.subscribe("postRenderEvent", function()
			{
				var recordSet = this.widgets.rolesDataTable.getRecordSet();
				for (var i = 0, j = recordSet.getLength(); i < j; i++)
				{
					var rId = recordSet.getRecord(i).getId();
					var data = recordSet.getRecord(i).getData();
					var delEl = Dom.get(this.id + '-delegation-picker-' + rId);
					delEl.value = data.delegationNodeRef;
					new Alvex.OrgchartViewer( this.id + '-delegation-picker-' + rId ).setOptions({
						multipleSelectMode: false,
						mode: "picker"
					});
				}
			}, this, true);
		},
		
		savePrefs: function()
		{
			var queue = [];
			var req = {};
			req.data = {};
			
			var isOOOActive = Dom.get(this.id + '-ooo-active').checked;
			req.data['isOOOActive'] = isOOOActive.toString();
			
			var defaultDelegation = Dom.get(this.id + '-default-delegation-picker').value;
			req.data['defaultDelegation'] = defaultDelegation;

			var msgtext = 'Ok';

			if( isOOOActive && defaultDelegation == "" )
			{
				msgtext = this.msg("alvex.orgchart.oooTurnedOffNow");

				Dom.get(this.id + '-ooo-active').checked = false;
				isOOOActive = false;
				req.data['isOOOActive'] = isOOOActive.toString();
			}
			
			req.data['roleInstances'] = [];
			
			var recordSet = this.widgets.rolesDataTable.getRecordSet();
			for (var i = 0, j = recordSet.getLength(); i < j; i++)
			{
				var rId = recordSet.getRecord(i).getId();
				var data = recordSet.getRecord(i).getData();
				var del = Dom.get(this.id + '-delegation-picker-' + rId).value;
				var ri = { 'ri': data.riNodeRef, 'delegation': del };
				req.data['roleInstances'].push( ri );
			}
			
			queue.push({
				url: Alfresco.constants.PROXY_URI + "api/alvex/orgchart/user/" 
						+ encodeURIComponent(Alfresco.constants.USERNAME) + "/ooo",
				method: Alfresco.util.Ajax.POST,
				dataObj: req,
				requestContentType: Alfresco.util.Ajax.JSON
			});
			
			if(queue.length > 0)
			{
				queue[queue.length-1].successCallback = 
				{
					fn: function (resp)
					{
						Alfresco.util.PopupManager.displayMessage({ text: msgtext });
					},
					scope:this
				};
				
				queue[queue.length-1].failureCallback = 
				{
					fn: function (resp)
					{
						if (resp.serverResponse.statusText)
						{
							Alfresco.util.PopupManager.displayMessage({ text: resp.serverResponse.statusText });
						}
					},
					scope:this
				};
				
				Alvex.util.processAjaxQueue({
					queue: queue
				});
			}
		}
	});
})();
