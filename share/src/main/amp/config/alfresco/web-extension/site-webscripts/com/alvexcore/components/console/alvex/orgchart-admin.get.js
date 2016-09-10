var Alvex = Alvex || {};
Alvex.configs = Alvex.configs || {};

Alvex.configs.getConfig = function (ext, config) {
    return eval('(' + remote.connect('alfresco').get('/api/alvex/config/' + ext + '/'+ config) + ')');
};

var uiConfig = Alvex.configs.getConfig('orgchart', 'orgchart-view.default');
var syncConfig = Alvex.configs.getConfig('orgchart', 'orgchart-sync.default');

model.config = {
    defaultRoleName: uiConfig.props['alvexoc:defaultRoleName'] ? uiConfig.props['alvexoc:defaultRoleName'] : '',
    uiConfigNodeRef: uiConfig.nodeRef,
    syncConfigNodeRef: syncConfig.nodeRef,
    syncSource: syncConfig.props['alvexoc:syncSource']
}

var conn = remote.connect("alfresco");
/*
//TODO fix this api or make another one similar
var resp = eval('(' + conn.get("/api/alvex/server") + ')');

model.alvexVersion = resp.version;
model.alvexEdition = resp.edition;
model.alvexCodename = resp.codename;

*/

model.alvexVersion = "dev";
model.alvexEdition = "dev";
model.alvexCodename = "dev";
