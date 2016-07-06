// Get config node, create if it does not exist
var confFolder = companyhome.childrenByXPath('/sys:system/sys:alvex/alvex:data/alvex:orgchart')[0];
var conf = confFolder.childByNamePath('orgchart-sync.default');
if(conf == null)
	conf = confFolder.createNode('orgchart-sync.default','alvexoc:syncConfig','sys:children');

var syncSource = conf.properties['alvexoc:syncSource'];
var adRootGroup;
if( conf.properties['alvexoc:syncRootGroupName'] )
	adRootGroup = groups.getGroup( conf.properties['alvexoc:syncRootGroupName'] );
else
	adRootGroup = null;

// Sync if necessary
if( ( syncSource == 'AD' || syncSource == 'LDAP' ) && adRootGroup != null )
{
	var scriptFile = companyhome.childrenByXPath('/app:company_home/app:dictionary/app:scripts/cm:alvex_sync_orgchart.js')[0];
	var script = (String)(scriptFile.content);
	eval( script );
}
