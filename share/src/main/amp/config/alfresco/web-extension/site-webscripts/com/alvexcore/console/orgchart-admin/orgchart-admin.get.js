<import resource="classpath:alfresco/web-extension/site-webscripts/com/alvexcore/js/alvex-config.lib.js">

var uiConfig = Alvex.configs.getConfig('orgchart', 'orgchart-view.default');
var syncConfig = Alvex.configs.getConfig('orgchart', 'orgchart-sync.default');

model.config = {
    defaultRoleName: uiConfig.props['alvexoc:defaultRoleName'] ? uiConfig.props['alvexoc:defaultRoleName'] : '',
    uiConfigNodeRef: uiConfig.nodeRef,
    syncConfigNodeRef: syncConfig.nodeRef,
    syncSource: syncConfig.props['alvexoc:syncSource']
}

var conn = remote.connect("alfresco");
var resp = eval('(' + conn.get("/api/alvex/server") + ')');

model.alvexVersion = resp.version;
model.alvexEdition = resp.edition;
model.alvexCodename = resp.codename;