/**
 * Copyright © 2012 ITD Systems
 *
 * This file is part of Alvex
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package com.alvexcore.repo.activiti;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.activiti.engine.delegate.DelegateExecution;
import org.activiti.engine.delegate.DelegateTask;
import org.activiti.engine.delegate.ExecutionListener;
import org.activiti.engine.delegate.TaskListener;
import org.alfresco.error.AlfrescoRuntimeException;
import org.alfresco.model.ContentModel;
import org.alfresco.repo.security.authentication.AuthenticationUtil;
import org.alfresco.repo.security.authentication.AuthenticationUtil.RunAsWork;
import org.alfresco.repo.workflow.activiti.ActivitiScriptNode;

import com.alvexcore.repo.orgchart.OrgchartDelegation;
import com.alvexcore.repo.orgchart.OrgchartPerson;
import com.alvexcore.repo.orgchart.OrgchartService;
import com.alvexcore.repo.orgchart.OrgchartUnit;
import com.alvexcore.repo.orgchart.RoleDefinition;
import com.alvexcore.repo.orgchart.RoleInstance;
import com.alvexcore.repo.workflow.activiti.AlvexActivitiListener;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

class ResolveAssignmentWork implements RunAsWork<AssignmentInfo> {

	private OrgchartService orgchartService;
	private String assignment;
	private AssignmentInfo previousAssignment;
	private String currentOrgchartUnitId;

	public ResolveAssignmentWork(OrgchartService orgchartService,
			String assignment, AssignmentInfo previousAssignment,
			String currentOrgchartUnitId) {
		this.orgchartService = orgchartService;
		this.assignment = assignment;
		this.previousAssignment = previousAssignment;
		this.currentOrgchartUnitId = currentOrgchartUnitId;
	}

	private void resolveDefaultDelegation(OrgchartPerson person,
			AssignmentInfo assignmentInfo) {
		OrgchartDelegation delegation = orgchartService
				.getDefaultDelegationForPerson(person);
		if (delegation == null)
			throw new AlfrescoRuntimeException(
					"OOO is set, but default delegation cannot be found.");
		assignmentInfo
				.setReason(AssignmentInfo.REASON_ASSIGNED_BY_DEFAULT_DELEGATION);
		assignmentInfo.setUser(delegation.getTarget().getName());
	}

	private void resolveRoleDelegation(OrgchartPerson person,
			AssignmentInfo assignmentInfo) {
		RoleInstance roleInstance = orgchartService
				.getRoleInstanceById(assignmentInfo.getPreviousAssignment()
						.getRoleInstanceId());
		OrgchartDelegation delegation = orgchartService.getDelegation(
				roleInstance, person);
		if (delegation == null) {
			resolveDefaultDelegation(person, assignmentInfo);
		} else {
			assignmentInfo.setRoleInstanceId(roleInstance.getId());
			assignmentInfo
					.setReason(AssignmentInfo.REASON_ASSIGNED_BY_ROLE_DELEGATION);
			assignmentInfo.setUser(delegation.getTarget().getName());
		}
	}

	@Override
	public AssignmentInfo doWork() throws Exception {
		AssignmentInfo assignmentInfo = new AssignmentInfo();
		assignmentInfo.setPreviousAssignment(previousAssignment);
		Pattern pattern = Pattern.compile("([^:]+)::(.+)\\[([0-9]+)\\]");
		Matcher matcher = pattern.matcher(assignment);

		if (!matcher.matches()) {
			// assignment is username, try to find delegation if OOO
			OrgchartPerson person = orgchartService.getPerson(assignment);
			if (orgchartService.isOutOfOffice(person)) {
				// checking for role in previous assignment
				if (previousAssignment != null) {
					switch (previousAssignment.getReason()) {
					case AssignmentInfo.REASON_ASSIGNED_BY_ROLE: {
						resolveRoleDelegation(person, assignmentInfo);
						break;
					}
					case AssignmentInfo.REASON_ASSIGNED_BY_ROLE_DELEGATION: {
						resolveRoleDelegation(person, assignmentInfo);
						break;
					}
					case AssignmentInfo.REASON_ASSIGNED_BY_DEFAULT_DELEGATION: {
						resolveDefaultDelegation(person, assignmentInfo);
						break;
					}
					case AssignmentInfo.REASON_ASSIGNED_BY_ERROR_HANDLING: {
						resolveDefaultDelegation(person, assignmentInfo);
						break;
					}
					}
				} else {
					resolveDefaultDelegation(person, assignmentInfo);
				}
			} else {
				assignmentInfo
						.setReason(AssignmentInfo.REASON_ASSIGNED_DIRECTLY);
				assignmentInfo.setUser(assignment);
			}
		} else {
			String role = matcher.group(2);
			int index = new Integer(matcher.group(3));
			String unitPath = matcher.group(1);
			pattern = Pattern.compile("\\{(-{0,1}[0-9]+)\\}");
			matcher = pattern.matcher(unitPath);
			OrgchartUnit unit = null;
			if (matcher.matches()) {
				// it's relative path
				int idx = Integer.parseInt(matcher.group(1));
				if (idx > 0)
					throw new AlfrescoRuntimeException(
							"Orgchart unit index cannot be positive");
				if (currentOrgchartUnitId == null)
					throw new AlfrescoRuntimeException(
							"Current orgchart unit must be specified if using relative paths");
				try {
					unit = orgchartService.getUnitById(currentOrgchartUnitId);
				} catch (Exception e) {
					throw new AlfrescoRuntimeException(
							"Current orgchart unit id is invalid");
				}
				while (idx < 0) {
					unit = orgchartService.getParentUnit(unit);
					if (unit == null)
						break;
					idx++;
				}
			} else {
				// it's absolute path
				unit = orgchartService.resolveUnit(unitPath);
			}
			if (unit == null)
				throw new AlfrescoRuntimeException("Unit does not exist");
			RoleDefinition roleDefinition = orgchartService.getRole(role);
			if (roleDefinition == null)
				throw new AlfrescoRuntimeException("Role definition not found");
			RoleInstance roleInstance = orgchartService
					.getRoleForUnitRecursively(unit, roleDefinition);
			if (roleInstance == null)
				throw new AlfrescoRuntimeException("Role instance not found");
			List<OrgchartPerson> assignees = orgchartService
					.getRoleAssignees(roleInstance);
			if (assignees.size() <= index)
				throw new AlfrescoRuntimeException(
						"Role member index out of bounds");
			assignmentInfo.setUser(assignees.get(index).getName());
			assignmentInfo.setReason(AssignmentInfo.REASON_ASSIGNED_BY_ROLE);
			assignmentInfo.setIndex(index);
			assignmentInfo.setRoleInstanceId(roleInstance.getId());
		}

		return assignmentInfo;
	}
}

class ResolveUnitForPersonWork implements RunAsWork<String> {

	private String username;
	private OrgchartService orgchartService;

	public ResolveUnitForPersonWork(OrgchartService orgchartService,
			String username) {
		this.username = username;
		this.orgchartService = orgchartService;
	}

	@Override
	public String doWork() throws Exception {
		OrgchartPerson person = orgchartService.getPerson(username);
		List<OrgchartUnit> units = orgchartService.getUnitsForPerson(person);
		if (units.size() < 1)
			return null;
			// We do not throw exception here since it block completely users
			// who are not in org chart - see ALV-479
			//throw new AlfrescoRuntimeException("You are not in org chart");
		// TODO: most probably, we should return the most high level unit, if there are more than one
		return units.get(0).getId();
	}

}

public class OrgchartDelegationsManager extends AlvexActivitiListener implements
		TaskListener, ExecutionListener {

	private static final String VARIABLE_DELEGATION_HISTORY = "delegationHistory";
	private static final String VARIABLE_ORGCHART_CURRENT_UNIT = "orgchartCurrentUnit";
	private static final String VARIABLE_INITIATOR = "initiator";
	private static Log logger = LogFactory.getLog(OrgchartDelegationsManager.class);
	protected OrgchartService orgchartService;
	protected int maxDelegationDepth;

	protected AssignmentInfo resolveAssignment(String assignment,
			AssignmentInfo previousAssignment, String currentOrgchartUnitId) {
		return AuthenticationUtil.runAsSystem(new ResolveAssignmentWork(
				orgchartService, assignment, previousAssignment,
				currentOrgchartUnitId));
	}

	protected String resolveUnitForPerson(String username) {
		return AuthenticationUtil.runAsSystem(new ResolveUnitForPersonWork(
				orgchartService, username));
	}

	@Override
	public void notify(DelegateTask delegateTask) {
		String assignee = delegateTask.getAssignee();
		// Handling for "Release to Pool"
		if(assignee == null)
			return;
		if (delegateTask.getEventName().equals(EVENTNAME_ASSIGNMENT)) {
			AssignmentInfo previousAssignment = (AssignmentInfo) delegateTask
					.getVariableLocal(VARIABLE_DELEGATION_HISTORY);
			
			// WA for infinite loop
			if( previousAssignment != null )
			{
				String previousAssignee = previousAssignment.getUser();
				if( assignee.equals(previousAssignee) )
					return;
			}
			
			String currentOrgchartUnitId = (String) delegateTask
					.getVariable(VARIABLE_ORGCHART_CURRENT_UNIT);
			try
			{
				AssignmentInfo assignmentInfo = resolveAssignment(assignee,
						previousAssignment, currentOrgchartUnitId);
				if (assignmentInfo.getDepth() > maxDelegationDepth)
					throw new AlfrescoRuntimeException(
							"Max delegation depth reached. Current delegation is "
									+ assignmentInfo.toHumanReadableString());
				String newAssignee = assignmentInfo.getUser();
				
				// 1. AssignmentInfo should contain OLD assignee.
				// Otherwise WA above will skip handling on the next notify() caused by changed assignee 
				// (since current assignee WILL match the assignee from saved AssignmentInfo).
				// It's really bad since it causes delegation check to be skipped.
				// 
				// 2. VARIABLE_DELEGATION_HISTORY should be set before actual assignee change, 
				// since delegateTask.setAssignee() triggers notify() immediately 
				// and we need previousAssignment to be in place for it.
				assignmentInfo.setUser(assignee);
				delegateTask.setVariableLocal(VARIABLE_DELEGATION_HISTORY,
						assignmentInfo);
				
				delegateTask.setAssignee(newAssignee);
			} catch (Exception e) {
				String issue = e.getMessage();
				logger.error("Issue with assignment resolve happened: " + issue + "." 
						+ " Assigning to admin");
				AssignmentInfo assignmentInfo = new AssignmentInfo();
				assignmentInfo.setReason(AssignmentInfo.REASON_ASSIGNED_BY_ERROR_HANDLING);
				assignmentInfo.setUser("admin");
				delegateTask.setVariableLocal(VARIABLE_DELEGATION_HISTORY, assignmentInfo);
				delegateTask.setAssignee(assignmentInfo.getUser());
				// TODO: add "business logging" here
			}
		} else if (delegateTask.getEventName().equals(EVENTNAME_COMPLETE)) {
			String unitId = resolveUnitForPerson(assignee);
			delegateTask.setVariable(VARIABLE_ORGCHART_CURRENT_UNIT, unitId);
		}
	}

	public void setOrgchartService(OrgchartService orgchartService) {
		this.orgchartService = orgchartService;
	}

	public void setMaxDelegationDepth(int maxDelegationDepth) {
		this.maxDelegationDepth = maxDelegationDepth;
	}

	@Override
	public void notify(DelegateExecution execution) throws Exception {
		ActivitiScriptNode initiatorNode = (ActivitiScriptNode) execution
				.getVariable(VARIABLE_INITIATOR);
		String initiator = (String) initiatorNode.getProperties().get(
				ContentModel.PROP_USERNAME.toString());
		String unitId = resolveUnitForPerson(initiator);
		execution.setVariable(VARIABLE_ORGCHART_CURRENT_UNIT, unitId);
	}
}
