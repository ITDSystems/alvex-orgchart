<import resource="classpath:alfresco/web-extension/site-webscripts/com/alvexcore/js/alvex-config.lib.js">

var uiConfig = Alvex.configs.getConfig('orgchart', 'orgchart-view.default');
var syncConfig = Alvex.configs.getConfig('orgchart', 'orgchart-sync.default');

// should this be done automatically in some library call?
model.config = {
	defaultRoleName: uiConfig.props['alvexoc:defaultRoleName'] ? uiConfig.props['alvexoc:defaultRoleName'] : '',
	viewType: uiConfig.props['alvexoc:viewType'],
	showUnitsRecursively: uiConfig.props['alvexoc:showUnitsRecursively'],
	syncSource: syncConfig.props['alvexoc:syncSource']
};
