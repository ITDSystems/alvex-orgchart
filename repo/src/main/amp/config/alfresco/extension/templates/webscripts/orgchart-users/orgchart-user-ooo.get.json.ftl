 <#escape x as jsonUtils.encodeJSONString(x)> 
 {
	<#if message?has_content>
	"message": "${message}",
	</#if>
	"isOOO": "${isOOO}",
	"defaultDelegation": 
	{
		"userName": "${defaultDelegation.userName}",
		"nodeRef": "${defaultDelegation.nodeRef}"
	},
 	"roleInstances":
 	[
	<#list roleInsts as ri>
		{
			"role": "${ri.role}",
			"unit": "${ri.unit}",
			"riNodeRef": "${ri.riNodeRef}",
			"delegationUserName": "${ri.delegationUserName}",
			"delegationNodeRef": "${ri.delegationNodeRef}"
		}<#if ri_has_next>,</#if>
	</#list>
 	]
 }
 </#escape>