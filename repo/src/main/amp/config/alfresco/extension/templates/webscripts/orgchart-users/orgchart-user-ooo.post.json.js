(function(){
	try{
		var user = orgchart.getPerson( url.templateArgs['userName'] );
		var defaultDelegationNodeRef = json.get('data').get('defaultDelegation');
		if( defaultDelegationNodeRef != '' )
			orgchart.setDelegation( people.getPerson( url.templateArgs['userName'] ),
								search.findNode( defaultDelegationNodeRef ) );
		else
			if( user.getDefaultDelegation() != null )
				user.getDefaultDelegation().remove();
		var shouldEnableOOO = ( json.get('data').get('isOOOActive') == "true");
		if( !shouldEnableOOO )
		{
			user.setOutOfOffice( shouldEnableOOO );
			model.oooStatus = "Out of office disabled";
		}
		else if( shouldEnableOOO && ( user.getDefaultDelegation() != null ) )
		{
			user.setOutOfOffice( shouldEnableOOO );
			model.oooStatus = "Out of office enabled";
		}
		else if( shouldEnableOOO && ( user.getDefaultDelegation() == null ) )
		{
			model.oooStatus = "Can not enable out of office without default delegation";
		}
		else
		{
			model.oooStatus = "Unknown state";
		}
		var roleInstancesRecv = json.get('data').get('roleInstances');
		model.len = roleInstancesRecv.length();
		
		for each ( unit in user.getUnits() )
		{
			for each ( ri in user.getRoles( unit ) )
			{
				for (var i = 0; i < roleInstancesRecv.length(); i++)
				{
					var rir = roleInstancesRecv.get(i);
					if( ri.getNode().toString().equals( rir.get('ri') ) )
					{
						if( rir.get('delegation') != '' )
						{
							orgchart.setDelegation( ri, 
										people.getPerson( url.templateArgs['userName'] ), 
										search.findNode( rir.get('delegation') ) 
							);
						} else {
							//ri.remove();
							for each ( delegation in user.getSourceDelegations() )
								if( delegation.getRole() != null )
									if( delegation.getRole().getNode().toString().equals( rir.get('ri') ) )
										delegation.remove();
						}
					}
				}
			}
		}
		
		status.code = 200;
	}
	catch (e) {
		status.code = 500;
		status.message = e.message;
		model.message = e.message;
		model.oooStatus = "Error";
	}
})();