(function(){
	try{
		model.roleInsts = [];
		var user = orgchart.getPerson( url.templateArgs['userName'] );
		var delegations =  user.getSourceDelegations();
		for each ( unit in user.getUnits() )
		{
			var unitName = unit.getDisplayName();
			for each ( ri in user.getRoles( unit ) )
			{
				var curDelegation = null;
				for each ( delegation in delegations )
				{
					if (delegation.getRole() != null)
					{
						if( ri.getNode().toString().equals( 
									delegation.getRole().getNode().toString() 
								) )
						{
							curDelegation = delegation;
							break;
						}
					}
				}
				if( curDelegation == null )
					model.roleInsts.push( { 'unit':  unitName,
								'role': ri.getDefinition().getDisplayName(),
								'riNodeRef': ri.getNode().toString(),
								'delegationUserName': '',
								'delegationNodeRef': ''
							} );
				else
					model.roleInsts.push( { 'unit':  unitName,
								'role': ri.getDefinition().getDisplayName(),
								'riNodeRef': ri.getNode().toString(),
								'delegationUserName': curDelegation.getTarget().getUserName(),
								'delegationNodeRef': curDelegation.getTarget().getNode().toString()
							} );
			}
		}
		model.isOOO = user.getOutOfOffice().toString();
		model.defaultDelegation = {};
		var delegation = user.getDefaultDelegation();
		if ( delegation == null ) {
			model.defaultDelegation.userName = '';
			model.defaultDelegation.nodeRef = '';
		} else {
			model.defaultDelegation.userName = delegation.getTarget().getUserName();
			model.defaultDelegation.nodeRef = delegation.getTarget().getNode().toString();
		}
		status.code = 200;
	}
	catch (e) {
		status.code = 500;
		status.message = e.message;
		model.message = e.message;
	}
})();