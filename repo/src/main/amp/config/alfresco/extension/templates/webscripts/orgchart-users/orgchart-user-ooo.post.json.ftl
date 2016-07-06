 <#escape x as jsonUtils.encodeJSONString(x)>
 {
	<#if message?has_content>
	"message": "${message}",
	</#if>
 	"data":
 	{
		"oooStatus": "${oooStatus}",
		"rolesUpdated": "${len}"
	}
 }
 </#escape>