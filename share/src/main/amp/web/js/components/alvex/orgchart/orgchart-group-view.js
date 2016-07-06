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

(function() {
    var Dom = YAHOO.util.Dom,
        Event = YAHOO.util.Event,
        DDM = YAHOO.util.DragDropMgr,
        DDTarget = YAHOO.util.DDTarget,
        KeyListener = YAHOO.util.KeyListener;
    var $html = Alfresco.util.encodeHTML;

    Alvex.OrgchartGroupViewer = function(htmlId)
    {
        Alvex.OrgchartGroupViewer.superclass.constructor.call(this, "OrgchartGroupViewer", htmlId);
        YAHOO.Bubbling.on("formContentReady", this.onFormContentReady, this);
        YAHOO.Bubbling.on("formContainerDestroyed", this.onFormDestroyed, this);
        return this;
    };

    YAHOO.extend(Alvex.OrgchartGroupViewer, Alfresco.component.Base, {
        options: {
            disabled: false,
            // If this form field is mandatory
            mandatory: false,
            // If control allows to pick multiple assignees (has effect in 'picker' mode only)
            multipleSelectMode: false,
            // Selected group
            selectedGroup: null,
            // Role instances created for selected group
            selectedGroupRoles: [],
            // Initial assignees list (in 'picker' mode)
            assignees: [],
            // Assignees added at current stage (in 'picker' mode)
            assignees_added: [],
            // Assignees removed at current stage (in 'picker' mode)
            assignees_removed: [],
            // Org chart tree control
            tree: null,
            // Datatable in UI
            usersDataTable: null,
            // Datasource for datatable
            usersDataSource: null,
            // Data store for datatable as JS array
            DataStore: [],
            // Orgchart
            orgchart: null,
            // JIT object
            st: null,
            // JIT canvas height
            jitHeight: 300,
            initialized: false,
            // Org chart sync source
            syncSource: 'none',
            // Maps nodes from TreeView to org chart units
            treeNodesMap: {},
            // Orgchart branch we are working with
            curBranch: 'default',
            // All orgchart branches
            branches: [],
            //Show people by roles or by name
            pickerView: "roles"
        },

        onFormDestroyed: function()
        {
            YAHOO.Bubbling.unsubscribe("formContentReady", this.onFormContentReady, this);
            YAHOO.Bubbling.unsubscribe("formContainerDestroyed", this.onFormDestroyed, this);
        },

        onFormContentReady: function()
        {
            if(!this.options.initialized) {
                this.options.initialized = true;
                this.init();
            }
        },

        onReady: function OrgchartGroupViewer_onReady()
        {
            if(!this.options.initialized) {
                this.options.initialized = true;
                this.init();
            }
        },

        init: function()
        {
            this.options.controlId = this.id + '-cntrl';
            this.options.pickerId = this.id + '-cntrl-picker';
            this.options.userRolesDialogId = this.id + "-cntrl-user-roles-dialog";
            this.options.unitRolesDialogId = this.id + "-cntrl-unit-roles-dialog";

            this.initGroupPicker();

        },

        activateWaitMessage: function()
        {
            this.loading = true;
            YAHOO.lang.later(1000, this, function()
            {
                if (this.loading)
                {
                    if (!this.widgets.waitMessage)
                    {
                        this.widgets.waitMessage = Alfresco.util.PopupManager.displayMessage(
                            {
                                text: this.msg("alvex.orgchart.waitingForLoad"),
                                spanClass: "wait",
                                displayTime: 0
                            });
                    }
                    else if (!this.widgets.waitMessage.cfg.getProperty("visible"))
                    {
                        this.widgets.waitMessage.show();
                    }
                }
            }, [] );
        },

        hideWaitMessage: function()
        {
            this.loading = false;
            if( this.widgets.waitMessage )
                this.widgets.waitMessage.hide();
        },

        initGroupPicker: function()
        {
            // Get existing assignees (if any)

            var cur_assignees_refs = [];
            if( Dom.get(this.id).value && Dom.get(this.id).value != '')
                cur_assignees_refs = Dom.get(this.id).value.split(',');

            // Prepare req to get names from nodeRefs
            var req = {};
            req['items'] = cur_assignees_refs;
            req['itemValueType'] = 'nodeRef';

            Alfresco.util.Ajax.jsonRequest({
                url: Alfresco.constants.PROXY_URI + "api/alvex/picker/users/byrefs",
                method: Alfresco.util.Ajax.POST,
                dataObj: req,
                successCallback:
                {
                    fn: function (resp)
                    {
                        // Remember current assignees details
                        this.options.assignees = resp.json.data.people;
                        // And show them in HTML
                        for (m in this.options.assignees) {
                            Dom.get(this.id + "-cntrl-currentValueDisplay").innerHTML
                                += '<div><img src="/share/res/components/images/filetypes/generic-group-16.png" '
                                + 'width="16" alt="" title="' + this.options.assignees[m].name + '"> '
                                + '<a href="/share/page/user/' + this.options.assignees[m].userName + '/profile">'
                                + this.options.assignees[m].name + '</a> </div>';
                        }
                    },
                    scope:this
                }
            });

            // Create button if control is enabled


                // Create picker button
                this.widgets.orgchartPickerButton =  new YAHOO.widget.Button(
                    this.id + "-cntrl-orgchart-picker-button",
                    { onclick: { fn: this.showTreePicker, obj: null, scope: this } }
                );

                this.activateWaitMessage();

                // Get orgchart data from server - groups only, without users to reduce load time
                var me = this;
                // Get orgchart branches
                Alfresco.util.Ajax.jsonRequest({
                    url: Alfresco.constants.PROXY_URI + "api/alvex/orgchart/branches",
                    method: Alfresco.util.Ajax.GET,
                    dataObj: null,
                    successCallback:
                    {
                        fn: function (resp)
                        {
                            if(resp.json.branches.length == 0)
                            {
                                me.hideWaitMessage();
                                me.createPickerDialog();
                                me.updateUI();
                                return;
                            }
                            // Get default branch
                            Alfresco.util.Ajax.jsonRequest({
                                url: Alfresco.constants.PROXY_URI
                                + "api/alvex/orgchart/tree/default",
                                method: Alfresco.util.Ajax.GET,
                                dataObj: null,
                                successCallback:
                                {
                                    fn: function (resp)
                                    {
                                        me.hideWaitMessage();
                                        me.options.orgchart = resp.json.data[0];
                                        me.createGroupsArray();
                                        me.createPickerDialog();
                                        me.updateUI();
                                    }
                                },
                                failureCallback:
                                {
                                    fn: function (resp)
                                    {
                                        me.hideWaitMessage();
                                        if (resp.serverResponse.statusText) {
                                            Alfresco.util.PopupManager.displayMessage({
                                                text: resp.serverResponse.statusText });
                                        }
                                    },
                                },
                                scope:me
                            });
                        },
                        scope:this
                    },
                    failureCallback:
                    {
                        fn: function (resp)
                        {
                            me.hideWaitMessage();
                            if (resp.serverResponse.statusText)
                                Alfresco.util.PopupManager.displayMessage({ text: resp.serverResponse.statusText });
                        },
                        scope:this
                    }
                });

        },

        togglePeopleView: function OrgchartViewerDialog_togglePeopleView(event) {
            this.options.pickerView = 'people';
            if(this.options.selectedGroup != null)
                this.fillPeopleTable(this.options.selectedGroup.id);
        },

        toggleRolesView: function OrgchartViewerDialog_toggleRolesView(event) {
            this.options.pickerView = 'roles';
            if(this.options.selectedGroup != null)
                this.fillRolesTable(this.options.selectedGroup.id);
        },

        getRemoveButtonHTML: function OrgchartGroupViewerDialog_getRemoveButtonHTML(person) {
            return '<span class="remove-item" id="' + person.nodeRef
                + '"><img src="/share/res/components/images/remove-icon-16.png" width="16"/></span>';
        },

        updateUI: function() {
            // Final assignees list with all adds and removes
            var merged = this.getCurrentAssigneesList();

            // Update selected users in UI in popup dialog
            var fieldId = this.options.pickerId + "-selected-users";
            Dom.get(fieldId).innerHTML = '';
            for (m in merged) {
                Dom.get(fieldId).innerHTML
                    += '<div><img src="/share/res/components/images/filetypes/generic-group-16.png" '
                    + 'width="16" alt="" title="' + merged[m].name + '"> ' + merged[m].name + ' '
                    + this.getRemoveButtonHTML(merged[m]) + '</div>';
                YAHOO.util.Event.onAvailable(merged[m].nodeRef, this.attachRemoveClickListener, merged[m], this);
            }

            // Update datatable. We need it to enable/disable 'add' button in single select mode.
            this.options.usersDataTable.getDataSource().sendRequest('',
                { success: this.options.usersDataTable.onDataReturnInitializeTable, scope: this.options.usersDataTable }
            );
        },

        attachRemoveClickListener: function OrgchartGroupViewerDialog_attachRemoveClickListener(person)
        {
            YAHOO.util.Event.on(person.nodeRef, 'click', this.removeGroup, person, this);
        },

        // Build final list by merging all adds and removes
        getCurrentAssigneesList: function()
        {
            var merged = this.options.assignees.concat(this.options.assignees_added);
            for (r in this.options.assignees_removed)
                for (m in merged)
                    if( this.usersEqual(merged[m], this.options.assignees_removed[r]) )
                        merged.splice(m,1);
            return merged;
        },

        createPickerDialog: function()
        {
            var me = this;

            this.widgets.ok = new YAHOO.widget.Button(this.options.controlId + "-ok",
                { onclick: { fn: this.onOk, obj: null, scope: this } });
            this.widgets.cancel = new YAHOO.widget.Button(this.options.controlId + "-cancel",
                { onclick: { fn: this.onCancel, obj: null, scope: this } });

            this.widgets.dialog = Alfresco.util.createYUIPanel(this.options.pickerId,
                {
                    width: "974px"
                });
            this.widgets.dialog.hideEvent.subscribe(this.onCancel, null, this);

            // Register listeners for people/roles switchers
            YAHOO.util.Event.on(this.options.pickerId + "-view-people", 'click', this.togglePeopleView, null, this);
            YAHOO.util.Event.on(this.options.pickerId + "-view-roles", 'click', this.toggleRolesView, null, this);

            // Setup search button
            this.widgets.searchButton = new YAHOO.widget.Button(this.options.pickerId + "-searchButton");
            this.widgets.searchButton.on("click", this.onSearch, this.widgets.searchButton, this);
            
            // Register the "enter" event on the search text field
            var zinput = Dom.get(this.options.pickerId + "-searchText");
            new YAHOO.util.KeyListener(zinput,
                {
                    keys: 13
                },
                {
                    fn: me.onSearch,
                    scope: this,
                    correctScope: true
                }, "keydown").enable();

            // Create orgchart tree in the dialog
            this.fillPickerDialog();

            // Init datatable to show current orgchart unit
            this.initUsersTable();

            Dom.addClass(this.options.pickerId, "object-finder");
        },
        
        onSearch: function () {
            if (typeof this.options.GroupsArray == "undefined") {
                this.createGroupsArray()
            }
            var arr = this.options.GroupsArray;
            var searchTerm = Dom.get(this.options.pickerId + "-searchText").value.toLowerCase();

            //Clearing current list of users/groups
            this.options.DataStore.length = 0;

            for (var i = 0; i < arr.length; i++) {
                if (arr[i].name.indexOf(searchTerm) !== -1) {
                    this.options.DataStore.push({
                        name: arr[i].name,
                        userName: arr[i].name,
                        nodeRef: arr[i].nodeRef,
                        role: "Search results",
                        isGroup: true
                    });
                }
            }

            //forcing userDataTable to pick up current userList
            this.options.usersDataTable.getDataSource().sendRequest('',
                { success: this.options.usersDataTable.onDataReturnInitializeTable, scope: this.options.usersDataTable }
            );
        },
        

        onOk: function(e, p_obj)
        {
            // Close dialog
            this.widgets.escapeListener.disable();
            this.widgets.dialog.hide();
            this.widgets.orgchartPickerButton.set("disabled", false);
            if (e) {
                Event.preventDefault(e);
            }
            // Update parent form
            this.updateFormFields();
            if(this.options.mandatory)
                YAHOO.Bubbling.fire("mandatoryControlValueUpdated", this);
        },

        onCancel: function(e, p_obj)
        {
            this.widgets.escapeListener.disable();
            this.widgets.dialog.hide();
            if( this.widgets.orgchartPickerButton )
                this.widgets.orgchartPickerButton.set("disabled", false);
            if (e) {
                Event.preventDefault(e);
            }
        },

        updateFormFields: function OrgchartGroupViewerDialog_updateFormFields()
        {
            // Just element
            var el;
            // Final assignees list with all adds and removes
            var merged = this.getCurrentAssigneesList();

            // Update selected users in UI in main form
            el = Dom.get(this.options.controlId + "-currentValueDisplay");
            el.innerHTML = '';
            for (m in merged) {
                el.innerHTML += '<div><img src="/share/res/components/images/filetypes/generic-group-16.png" '
                    + 'width="16" alt="" title="' + merged[m].name + '"> ' + merged[m].name + ' </div>';
            }

            // Update current users nodeRefs - required for mandatory field check
            el = Dom.get(this.id);
            el.value = '';
            for (m in merged) {
                el.value += ( m < merged.length-1 ? merged[m].nodeRef + ',' : merged[m].nodeRef );
            }

            // Update added fields in main form to be submitted
            el = Dom.get(this.options.controlId + "-added");
            el.value = '';
            for (m in this.options.assignees_added) {
                el.value += ( m < this.options.assignees_added.length-1
                    ? this.options.assignees_added[m].nodeRef + ',' : this.options.assignees_added[m].nodeRef );
            }

            // Update removed fields in main form to be submitted
            el = Dom.get(this.options.controlId + "-removed");
            el.value = '';
            for (m in this.options.assignees_removed) {
                el.value += (m < this.options.assignees_removed.length-1
                    ? this.options.assignees_removed[m].nodeRef+',' : this.options.assignees_removed[m].nodeRef);
            }
        },

        showTreePicker: function OrgchartGroupViewerDialog_showTreePicker(e, p_obj)
        {
            if( ! this.widgets.dialog )
                return;

            // Enable esc listener
            if (!this.widgets.escapeListener)
            {
                this.widgets.escapeListener = new KeyListener(this.options.pickerId,
                    {
                        keys: KeyListener.KEY.ESCAPE
                    },
                    {
                        fn: function(eventName, keyEvent)
                        {
                            this.onCancel();
                            Event.stopEvent(keyEvent[1]);
                        },
                        scope: this,
                        correctScope: true
                    });
            }
            this.widgets.escapeListener.enable();

            // Disable picker button to prevent double dialog call
            this.widgets.orgchartPickerButton.set("disabled", true);

            // Show the dialog
            this.widgets.dialog.show();

            Event.preventDefault(e);

            this.showMyUnit();
        },

        showMyUnit: function()
        {
            // Expand the tree to show the unit current user belongs to
            Alfresco.util.Ajax.request(
                {
                    url: Alfresco.constants.PROXY_URI + "api/alvex/orgchart/user/"
                    + encodeURIComponent(Alfresco.constants.USERNAME) + "/roles",
                    successCallback:
                    {
                        fn: this.autoExpandTree,
                        scope: this
                    },
                    failureMessage: "Can not get roles for current user"
                });
        },

        autoExpandTree: function(resp)
        {
            var nodes = resp.json.data;
            if( nodes.length == 0 )
                return;
            // Traverse all nodes up to the tree root
            var traverse = [];
            for( var i in nodes )
            {
                traverse[i] = [];
                var node = this.options.tree.getNodeByProperty('labelElId', nodes[i].unitId);
                while( node.depth >= 0 ) {
                    traverse[i].push(node);
                    node = node.parent;
                }
            }
            // Find common anchestor
            var targetIndex = 0;
            for( var i = 1; i < traverse.length; i++ )
            {
                var found = false;
                while( !found && targetIndex < traverse[0].length )
                {
                        for( var k = 0; k < traverse[i].length; k++ )
                        {
                        if( traverse[0][targetIndex].labelElId == traverse[i][k].labelElId )
                        {
                            found = true;
                            break;
                        }
                    }
                    if( !found )
                        targetIndex++;
                }
            }
            //Highlight and expand common anchestor
            var targetNode = ( targetIndex < traverse[0].length ? traverse[0][targetIndex] : traverse[0][traverse[0].length] );
            if( targetNode ) {
                targetNode.highlight();
                var parent = targetNode;
                while( parent.depth > 0 ) {
                    parent.expand();
                    parent = parent.parent;
                }
            }
            // Emulate click - fill user table automatically
            this.treeViewClicked(targetNode);
        },

        // Fill tree view group selector with orgchart data
        fillPickerDialog: function OrgchartGroupViewerDialog_fillPickerDialog()
        {
            if( this.options.orgchart === null)
                return;

            this.options.tree = new YAHOO.widget.TreeView(this.options.pickerId + "-groups");
            this.options.tree.singleNodeHighlight = true;
            this.options.tree.subscribe("clickEvent",this.options.tree.onEventToggleHighlight);
            this.options.insituEditors = [];

            var rootNode = this.insertTreeLabel(this.options.tree.getRoot(), this.options.orgchart);
            //if(this.options.orgchart)
            //	for(c in this.options.orgchart.children) {
            //		var node = this.insertTreeLabel(this.options.tree.getRoot(), this.options.orgchart.children[c]);
            //		node.expand();
            //	}
            rootNode.expand();

            this.options.tree.subscribe("labelClick", this.treeViewClicked, null, this);
            this.options.tree.subscribe("expandComplete", this.onExpandComplete, this, true);
            this.options.tree.draw();
            this.onExpandComplete(null);
            this.showMyUnit();
        },

        onExpandComplete: function DLT_onExpandComplete(oNode)
        {
            for (var i in this.options.insituEditors)
                Alfresco.util.createInsituEditor(
                    this.options.insituEditors[i].context,
                    this.options.insituEditors[i].params,
                    this.options.insituEditors[i].callback
                );
        },

        insertTreeLabel: function OrgchartGroupViewerDialog_insertTreeLabel(curRoot, newNode)
        {
            var me = this;
            var curElem = new YAHOO.widget.TextNode(newNode.displayName, curRoot, false);
            curElem.labelElId = newNode.id;
            new DDList("ygtv" + curElem.index);
            new DDTarget(curElem.labelElId);
            this.options.treeNodesMap["ygtv" + curElem.index] = curElem.labelElId;
            this.options.insituEditors.push(
                {
                    context: newNode.id,
                    params: {
                        showDelay: 300,
                        hideDelay: 300,
                        type: "orgchartUnit",
                        syncSource: this.options.syncSource,
                        unitID: newNode.id,
                        unitName: newNode.displayName,
                        curElem: curElem,
                        orgchartPicker: me,
                        unit: newNode
                    },
                    callback: null
                }
            );

            for(var c in newNode.children)
                this.insertTreeLabel(curElem, newNode.children[c]);
            return curElem;
        },

        treeViewClicked: function OrgchartGroupViewerDialog_treeViewClicked(node)
        {
            this.options.selectedGroup = node;
            this.options.selectedGroup.id = node.labelElId;
            if( this.options.pickerView == 'roles' )
                this.fillRolesTable(this.options.selectedGroup.id);
            else
                this.fillPeopleTable(this.options.selectedGroup.id);
        },

        getGroupByIndex: function (index) {
            if (typeof this.options.GroupsArray == "undefined") {
                this.createGroupsArray()
            } else {
                return this.options.GroupsArray[index - 1]
            }
            return this.options.GroupsArray[index - 1]
        },

        //FIXME!
        createGroupsArray: function () {
            var array = [];
            var crtGrps = function (obj) {
                array.push({
                    name: obj["displayName"],
                    nodeRef: obj["groupRef"]
                });
                var childrenarr = obj["children"];
                for (var i = 0; i < childrenarr.length; i++) crtGrps(childrenarr[i]);
            };
            crtGrps(this.options.orgchart);
            this.options.GroupsArray = array;
        },

        initUsersTable: function OrgchartGroupViewerDialog_initUsersTable()
        {
            var me = this;

            // Hook action events
            var fnActionHandler = function fnActionHandler(layer, args)
            {
                var owner = YAHOO.Bubbling.getOwnerByTagName(args[1].anchor, "div");
                if (owner !== null)
                {
                    if (typeof me[owner.className] == "function")
                    {
                        args[1].stop = true;
                        var asset = me.options.usersDataTable.getRecord(args[1].target.offsetParent).getData();
                        me[owner.className].call(me, asset, owner);
                    }
                }
                return true;
            };
            YAHOO.Bubbling.addDefaultAction(this.id + "-action-link", fnActionHandler, true);

            var actionsWidth = 52;

            var myColumnDefs = [
                {key:'icon', sortable:false, width:32, formatter: this.formatIconField},
                {key:'name', sortable:false, minWidth: 10000, formatter: this.formatNameField},
                {key:'action', sortable:false, width:actionsWidth, formatter: this.formatActionsField}
            ];

            // We use this simple dataSource because we are not sure about our requirements
            // For instance, orgchart browsing and user search are provided by different APIs
            // We are not sure about urls and resp schema of APIs we may need
            // So we have an option to fill js array locally after ajax request to any url
            this.options.usersDataSource = new YAHOO.util.DataSource(this.options.DataStore);
            this.options.usersDataSource.responseType = YAHOO.util.DataSource.TYPE_JSARRAY;
            this.options.usersDataSource.responseSchema = {
                fields: ["name", "userName", "nodeRef", "roleDisplayName", "isGroup"]
            };

            this.options.usersDataSource.doBeforeParseData = function f(oRequest, oFullResponse) {
                // Remove duplicates that happen when we list users by name
                //		and have one user in multiple roles
                var response = [];
                var dup;
                for( var i in oFullResponse )
                {
                   dup = false;
                    for( var j in response )
                        if( (response[j].userName == oFullResponse[i].userName)
                            && (response[j].roleName == oFullResponse[i].roleName) )
                            dup = true;
                    if(!dup)
                        response.push(oFullResponse[i]);
                }
                return response;
            };

            this.options.usersDataTable = new YAHOO.widget.GroupedDataTable(this.options.pickerId + "-group-members",
                myColumnDefs, this.options.usersDataSource,
                {
                    groupBy: "roleDisplayName",
                    MSG_EMPTY: this.msg("alvex.orgchart.no_people_in_group"),
                    renderLoopSize: 100
                } );
            this.options.usersDataTable.orgchart = this;

            this.options.usersDataTable.subscribe("rowMouseoverEvent", this.onUserHighlightRow, this, true);
            this.options.usersDataTable.subscribe("rowMouseoutEvent", this.onUserUnhighlightRow, this, true);

            if(this.options.selectedGroup != null)
                this.fillRolesTable(this.options.selectedGroup.id);
        },

        fillPeopleTable: function OrgchartViewerDialog_fillPeopleTable(node_id)
        {
            Dom.addClass( this.options.pickerId + "-view-people", "badge-highlight" );
            Dom.removeClass( this.options.pickerId + "-view-roles", "badge-highlight" );
            this.fillTable(node_id, false);
        },

        fillRolesTable: function OrgchartViewerDialog_fillRolesTable(node_id)
        {
            Dom.removeClass( this.options.pickerId + "-view-people", "badge-highlight" );
            Dom.addClass( this.options.pickerId + "-view-roles", "badge-highlight" );
            this.fillTable(node_id, true);
        },

        fillTable: function(node_id, showRoles)
        {
            // if there is no node - just reload the table
            if( node_id == null || node_id =='' )
                return;

            // clear data for display
            this.options.DataStore.length = 0;

            var url = YAHOO.lang.substitute(
                "{proxy}/api/alvex/orgchart/units/{unit}",
                {
                    proxy: Alfresco.constants.PROXY_URI,
                    unit: node_id
                }
            );

            Alfresco.util.Ajax.jsonRequest({
                url: url,
                method: Alfresco.util.Ajax.GET,
                dataObj: null,
                successCallback:
                {
                    fn: function (resp)
                    {
                        var people;
                        // If we show roles - just do it
                        if(showRoles) {
                            people = resp.json.data.people;
                            // If we do not need roles - remove them and de-duplicate users
                        } else {
                            people = [];
                            var tmp = {};
                            for( var p in resp.json.data.people )
                                tmp[resp.json.data.people[p].userName] = resp.json.data.people[p];
                            for( var t in tmp ) {
                                tmp[t].roleDisplayName = 'members';
                                people.push(tmp[t]);
                            }
                        }
                        for( var p in people )
                            if( people[p].roleDisplayName == 'members')
                                people[p].roleDisplayName = this.options.defaultRoleName;

                        // Sort by name only for 'by name' view
                        // For view 'by role' sorting is performed server-side
                        if( !showRoles )
                            this.sortPeople(people);

                        for( var p in people )
                        {
                            this.options.DataStore.push( people[p]
                                /*{
                                 name: people[p].name,
                                 userName: people[p].userName,
                                 nodeRef: people[p].nodeRef,
                                 role: people[p].role
                                 }*/);
                        }

                        this.options.usersDataTable.getDataSource().sendRequest('',
                            { success: this.options.usersDataTable.onDataReturnInitializeTable, scope: this.options.usersDataTable }
                        );
                    },
                    scope:this
                }
            });
        },

        sortPeople: function OrgchartViewerDialog_toggleRolesView(people)
        {
            people.sort( function(a,b){
                var roleA=a.roleDisplayName.toLowerCase();
                var roleB=b.roleDisplayName.toLowerCase();
                var nameA;
                if( (a.lastName != undefined) && (a.firstName != undefined ) )
                    nameA = a.lastName.toLowerCase() + ' ' + a.firstName.toLowerCase();
                else
                    nameA = a.name.toLowerCase();
                var nameB;
                if( (b.lastName != undefined) && (b.firstName != undefined ) )
                    nameB = b.lastName.toLowerCase() + ' ' + b.firstName.toLowerCase();
                else
                    nameB = b.name.toLowerCase();
                if (roleA < roleB)
                    return -1;
                if (roleA > roleB)
                    return 1;
                if (nameA < nameB)
                    return -1;
                if (nameA > nameB)
                    return 1;
                return 0;
            } );
        },

        formatActionsField: function (elLiner, oRecord, oColumn, oData)
        {
            var id = this.orgchart.id;
            var user = oRecord.getData();
            var html = '<div id="' + id + '-actions-' + oRecord.getId() + '" class="action hidden">';
            //FIXME this is hack to show groups after Search
            if (user.isGroup) {
                html += '<div class="' + 'addGroup' + '"><a rel="add" href="" '
                    + 'class="orgchart-action-link ' + id + '-action-link"'
                    + 'title="' + this.orgchart.msg("alvex.orgchart.button.add") +'">'
                    + '<span>' + this.orgchart.msg("alvex.orgchart.button.add") + '</span></a></div>';
            } else {

                html += '<div class="' + 'showUserInfo' + '"><a rel="view" href="" '
                    + 'class="orgchart-action-link ' + id + '-action-link"'
                    + 'title="' + this.orgchart.msg("alvex.orgchart.button.view") + '">'
                    + '<span>' + this.orgchart.msg("alvex.orgchart.button.view") + '</span></a></div>';
            }
            html += '</div>';

            elLiner.innerHTML = html;
        },

        formatIconField: function (elLiner, oRecord, oColumn, oData)
        {
            var id = this.orgchart.id;
            var html = '';
            var user = oRecord.getData();

            //FIXME this is hack to show groups after Search
            if (user.isGroup) {
                html += '<div class="' + 'addGroupTitle' + '"><a rel="add" href="" '
                    + 'class="orgchart-action-link ' + id + '-action-link"'
                    + 'title="' + this.orgchart.msg("alvex.orgchart.button.add") +'"><img'
                    + ' src="/share/res/components/images/filetypes/generic-group-32.png"'
                    + ' width="32"/></a></div>';
            } else {
                html += '<div class="' + 'showUserInfoTitle' + '"><a rel="view" href="" '
                    + 'class="orgchart-action-link ' + id + '-action-link"'
                    + 'title="' + this.orgchart.msg("alvex.orgchart.button.view") + '"><img'
                    + ' src="/share/res/components/images/filetypes/generic-user-32.png"'
                    + ' width="32"/></a></div>';
            }

            elLiner.innerHTML = html;
        },

        formatNameField: function (elLiner, oRecord, oColumn, oData)
        {
            var id = this.orgchart.id;
            var user = oRecord.getData();
            var html = '';
            
            if (user.isGroup) {
                html = '<div class="' + 'addGroupTitle' + '">'
                    + '<h4 class="name"><a rel="add" href="" '
                    + 'class="orgchart-action-link ' + id + '-action-link"'
                    + 'title="' + this.orgchart.msg("alvex.orgchart.button.view") + '">'
                    + '<span>' + user.name + '</span></a></h4></div>';
            } else {
                html = '<div class="' + 'showUserInfoTitle' + '">'
                    + '<h4 class="name"><a rel="view" href="" '
                    + 'class="orgchart-action-link ' + id + '-action-link"'
                    + 'title="' + this.orgchart.msg("alvex.orgchart.button.view") + '">'
                    + '<span>' + user.name + '</span></a></h4></div>';
            }
            elLiner.innerHTML = html;
        },

        showUserInfoTitle: function(person)
        {
            this.showUserInfo(person);
        },

        showUserInfo: function OrgchartGroupViewerDialog_showUserInfo(person)
        {
            var url = Alfresco.constants.PROXY_URI + "api/people/" + person.userName;

            Alfresco.util.Ajax.jsonRequest({
                url: url,
                method: Alfresco.util.Ajax.GET,
                dataObj: null,
                successCallback:
                {
                    fn: function (resp)
                    {
                        var profile = resp.json;
                        // fill html fields
                        Dom.get(this.options.pickerId + '-person-img').src
                            = Alfresco.constants.PROXY_URI + 'slingshot/profile/avatar/' + profile.userName;
                        Dom.get(this.options.pickerId + '-person-name').innerHTML = $html(profile.firstName + " " + profile.lastName);
                        Dom.get(this.options.pickerId + '-person-title').innerHTML = $html(profile.jobtitle);
                        Dom.get(this.options.pickerId + '-person-company').innerHTML = $html(profile.organization);
                        Dom.get(this.options.pickerId + '-person-telephone').innerHTML = $html(profile.telephone);
                        Dom.get(this.options.pickerId + '-person-mobile').innerHTML = $html(profile.mobile);
                        Dom.get(this.options.pickerId + '-person-email').innerHTML = $html(profile.email);
                        Dom.get(this.options.pickerId + '-person-skype').innerHTML = $html(profile.skype);
                        Dom.get(this.options.pickerId + '-person-im').innerHTML = $html(profile.instantmsg);
                        // Dom.get(this.options.pickerId + '-person-loc').innerHTML = $html(profile.location);
                        Dom.get(this.options.pickerId + '-person-bio').innerHTML = $html(profile.persondescription);
                        Dom.get(this.options.pickerId + '-person-links').innerHTML
                            = '<a target="_blank" href="/share/page/user/' + profile.userName + '/profile">'
                            + this.msg("alvex.orgchart.view_profile") + '</a>';
                        // show field
                        Dom.removeClass( Dom.get(this.options.pickerId + '-person-info'), "person-hidden" );
                    },
                    scope:this
                }
            });
        },

        onUserHighlightRow: function DataGrid_onEventHighlightRow(oArgs)
        {
            var elActions = Dom.get(this.id + "-actions-" + oArgs.target.id);
            Dom.removeClass(elActions, "hidden");
        },

        onUserUnhighlightRow: function DataGrid_onEventUnhighlightRow(oArgs)
        {
            var elActions = Dom.get(this.id + "-actions-" + (oArgs.target.id));
            Dom.addClass(elActions, "hidden");
        },

        usersEqual: function OrgchartGroupViewerDialog_usersEqual(user1, user2)
        {
            return user1.nodeRef === user2.nodeRef;
        },

        groupInArray: function OrgchartGroupViewerDialog_groupInArray(array, user)
        {
            var i = array.length;
            while (i--)
                if ( this.usersEqual(array[i], user) )
                    return i;
            return -1;
        },

        addGroupTitle: function (group) {
            this.addGroup(group);
        },

        // Add person to assignees
        addGroup: function OrgchartPickerDialog_addGroup(group)
        {
            // If group is not in current list and not in added list - add it to added list
            if( (this.groupInArray(this.options.assignees, group) == -1)
                && (this.groupInArray(this.options.assignees_added, group) == -1) )
                this.options.assignees_added.push(group);

            // If group is in removed list - remove it from removed
            if( (this.groupInArray(this.options.assignees_removed, group) != -1) )
                this.options.assignees_removed.splice( this.groupInArray(this.options.assignees_removed, group), 1 );

            // Update UI
            this.updateUI();
        },

        removeGroup: function OrgchartPickerDialog_removeGroup(event, group) {
            // If group is in current list and not in removed list - add it to removed list
            if ((this.groupInArray(this.options.assignees, group) != -1)
                && (this.groupInArray(this.options.assignees_removed, group) == -1))
                this.options.assignees_removed.push(group);

            // If group is in added list - remove it from added list
            if (this.groupInArray(this.options.assignees_added, group) != -1)
                this.options.assignees_added.splice(this.groupInArray(this.options.assignees_added, group), 1);

            // Update UI
            this.updateUI();
        }
    });

    /**
     * Alfresco.widget.InsituEditor.orgchartUnit constructor.
     *
     * @param p_params {Object} Instance configuration parameters
     * @return {Alfresco.widget.InsituEditor.textBox} The new textBox editor instance
     * @constructor
     */
    Alfresco.widget.InsituEditor.orgchartUnit = function(p_params)
    {
        // We do not call superclass because we really do not need all that form-related stuff

        this.params = YAHOO.lang.merge({}, p_params);

        // Create icons instances
        this.openIcon = new Alfresco.widget.InsituEditorOrgchartOpen(this, p_params);

        return this;
    };

    YAHOO.extend(Alfresco.widget.InsituEditor.orgchartUnit, Alfresco.widget.InsituEditor.textBox,
        {
            doShow: function InsituEditor_textBox_doShow()
            {
                if (this.contextStyle === null)
                    this.contextStyle = Dom.getStyle(this.params.context, "display");
                Dom.setStyle(this.params.context, "display", "none");
                Dom.setStyle(this.editForm, "display", "inline");
            },

            doHide: function InsituEditor_textBox_doHide(restoreUI)
            {
                if (restoreUI)
                {
                    Dom.setStyle(this.editForm, "display", "none");
                    Dom.setStyle(this.params.context, "display", this.contextStyle);
                }
            },

            _generateMarkup: function InsituEditor_textBox__generateMarkup()
            {
                return;
            }
        });

    Alfresco.widget.InsituEditorOrgchartOpen = function(p_editor, p_params)
    {
        this.editor = p_editor;
        this.params = YAHOO.lang.merge({}, p_params);
        this.disabled = p_params.disabled;
        this.curElem = p_params.curElem;

        this.editIcon = document.createElement("span");
        this.editIcon.title = Alfresco.util.encodeHTML(p_params.orgchartPicker.msg("alvex.orgchart.unit_members"));
        Dom.addClass(this.editIcon, "insitu-addgroup-orgchart");

        this.params.context.appendChild(this.editIcon, this.params.context);
        Event.on(this.params.context, "mouseover", this.onContextMouseOver, this);
        Event.on(this.params.context, "mouseout", this.onContextMouseOut, this);
        Event.on(this.editIcon, "mouseover", this.onContextMouseOver, this);
        Event.on(this.editIcon, "mouseout", this.onContextMouseOut, this);
    };

    YAHOO.extend(Alfresco.widget.InsituEditorOrgchartOpen, Alfresco.widget.InsituEditorIcon,
        {
            onIconClick: function InsituEditorOrgchartOpen_onIconClick(e, obj)
            {
                var index = obj.curElem.index;
                if (!(index == null)) {
                    var group = obj.params.orgchartPicker.getGroupByIndex(index);
                    obj.params.orgchartPicker.addGroup(group);
                }
                Event.stopEvent(e);
            }
        });


})();