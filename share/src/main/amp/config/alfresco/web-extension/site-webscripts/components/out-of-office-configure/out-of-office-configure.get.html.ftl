<#assign htmlId = args.htmlid?js_string>
<#assign fieldHtmlId = htmlId + "-default-delegation-picker">
<#assign controlId = fieldHtmlId + "-cntrl">

<#include "../../orgchart-picker-dialog.inc.ftl">

<script type="text/javascript">
	function showSpoiler(id)
	{
		var inner = document.getElementById("${htmlId}-panel-" + id);
		var button = document.getElementById("${htmlId}-button-" + id);
		if (inner.style.display == "none")
		{
			inner.style.display = "";
			button.value=" - ";
		}
		else
		{
			inner.style.display = "none";
			button.value=" + ";
		}
		YAHOO.Bubbling.fire("formVisibilityChanged");
	}
</script>

<div class="out-of-office">
	<div class="out-of-office-main">
		<div style="padding: 1em;">
			<div style="float:left; padding-right: 1em;">
				<input id="${htmlId}-ooo-active" type="checkbox" name="-">
			</div>
			<div class="label">${msg("alvex.orgchart.ooo.turn_on")}:</div>
		</div>
		<div style="padding: 1em;">
			<div class="label" style="float: left; padding-right: 5em;">${msg("alvex.orgchart.ooo.default_delegation")}:</div>

			<div id="${htmlId}-default-delegation" style="padding-left: 15em;">
				<div id="${controlId}" class="object-finder">
					<div id="${controlId}-currentValueDisplay" class="current-values object-finder-items"></div>
					<input type="hidden" id="${fieldHtmlId}" name="-" value="" />
						<input type="hidden" id="${controlId}-added" value="" />
						<input type="hidden" id="${controlId}-removed" value="" />
						<@renderOrgchartPickerDialogHTML controlId />
						<div id="${controlId}-itemGroupActions" class="show-picker">
							<input type="button" id="${controlId}-orgchart-picker-button" name="-" 
								value="${msg("alvex.orgchart.orgchart_picker_button")}"/>
						</div>
				</div>
			</div>

		</div>		
	</div>
	<div class="title set-bordered-panel-heading">
		<span><input id="${htmlId}-button-1" class="btn" type="button" onclick="showSpoiler(1);" value=" + " /></span>
		<label>${msg("alvex.orgchart.ooo.extended_configuration")}</label>
	</div>
	<div id="${htmlId}-panel-1" class="set-bordered-panel-body" style="display:none;">
		<div style="padding-bottom: 1em;">
			<div class="label">${msg("alvex.orgchart.ooo.separate_delegations_for_roles")}:</div>
			<div id="${htmlId}-roles-delegations-table"></div>
		</div>
	</div>
	<div class="out-of-office-btns">
		<div style="padding: 1em;">
			<!-- UI Config Button -->
			<div>
				<span class="yui-button yui-push-button" id="${htmlId}-save-btn">
					<span class="first-child">
						<button>${msg("alvex.orgchart.savePrefs")}</button>
					</span>
				</span>
			</div>
		</div>		
	</div>
</div>

<script type="text/javascript">//<![CDATA[
	new Alvex.OutOfOfficePreferences("${htmlId}").setOptions({
	}).setMessages(
		${messages}
	);
//]]></script>