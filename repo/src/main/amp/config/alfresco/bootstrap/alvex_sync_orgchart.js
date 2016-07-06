function syncUsers( adUnit, ocUnit )
{
	var adUsers = adUnit.getChildUsers();
	var ocUsers = ocUnit.getMembers();

	for each( adu in adUsers )
	{
		var existing = null;
		for each( ocu in ocUsers )
		{
			//if (logger.isLoggingEnabled())
			//	logger.log( adu.userName + " " + ocu.getUserName() );
			if( ocu.getUserName().equals( adu.userName ) ) {
				existing = ocu;
				break;
			}
		}
		if( existing == null )
		{
			if (logger.isLoggingEnabled())
				logger.log( "Adding user " + adu.userName + " to unit " + ocUnit.displayName );
			ocUnit.addMember( people.getPerson( adu.userName ) );
		}
	}

	for each( ocu in ocUsers )
	{
		var existing = null;
		for each( adu in adUsers )
		{
			if( ocu.getUserName().equals( adu.userName ) )
			{
				existing = adu;
				break;
			}
		}
		if( existing == null ) {
			if (logger.isLoggingEnabled())
				logger.log( "Deleting user " + ocu.getUserName() + " from unit " + ocUnit.displayName );
			ocUnit.deleteMember( people.getPerson( ocu.getUserName() ) );
		}
	}

	return 0;
}

function syncTree( adUnit, ocUnit )
{
	syncUsers( adUnit, ocUnit );

	var adSubUnits = adUnit.getChildGroups();
	var ocSubUnits = ocUnit.children;
	var adPairs = [];

	for each( adsu in adSubUnits )
	{
		var existing = null;
		for each( ocsu in ocSubUnits )
		{
			//if (logger.isLoggingEnabled())
			//	logger.log( adsu.getShortName() + " " + ocsu.name );
			if( ocsu.name.equals( adsu.getShortName() ) ) {
				existing = ocsu;
				adPairs.push( ocsu );
				break;
			}
		}
		if( existing == null ) {
			if (logger.isLoggingEnabled())
				logger.log( "Unit not found in OC: " + adsu.getShortName() + ". Syncing." );
			var newOCU = ocUnit.syncUnit( adsu.getShortName() );
			adPairs.push( newOCU );
		} else if( ! adsu.getDisplayName().equals( existing.displayName ) ) {
			if (logger.isLoggingEnabled())
				logger.log( "Unit in OC differs from AD: " + adsu.getShortName() + ". Updating." );
			existing.update( adsu.getDisplayName(), existing.weight );
		}
	}

	for each( ocsu in ocSubUnits )
	{
		var existing = null;
		for each( adsu in adSubUnits )
			if( ocsu.name.equals( adsu.getShortName() ) )
				existing = adsu;
		if( existing == null ) {
			if (logger.isLoggingEnabled())
				logger.log( "OC unit not found in AD: " + ocsu.name + ". Deleting." );
			orgchart.dropUnit( ocsu.id );
		}
	}

	for( var i in adSubUnits )
		syncTree( adSubUnits[i], adPairs[i] );

	return 0;
}

function syncOrgChart(adRootGroup)
{
	var oc = orgchart.getBranch( "default" );
	if (logger.isLoggingEnabled())
		logger.log( "Org chart sync started" );
	syncTree(adRootGroup, oc);
	if (logger.isLoggingEnabled())
		logger.log( "Org chart sync done" );
}

syncOrgChart(adRootGroup);
