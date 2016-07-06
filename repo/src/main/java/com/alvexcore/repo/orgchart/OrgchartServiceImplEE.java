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
package com.alvexcore.repo.orgchart;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

import org.alfresco.service.cmr.repository.AssociationRef;
import org.alfresco.service.cmr.repository.ChildAssociationRef;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.namespace.QName;
import org.alfresco.service.namespace.RegexQNamePattern;
import org.alfresco.service.cmr.security.AuthorityType;

import com.alvexcore.repo.AlvexContentModel;

/**
 * Service to work with orgchart
 *
 */
public class OrgchartServiceImplEE extends OrgchartServiceImplCE {

	/*
	 * Orgchart delegations related operations
	 */

	/**
	 * Creates new orgchart unit based on existing group
	 * @param parent Parent orgchart unit
	 * @param groupShortName Name of the group to base unit on
	 * @return New unit
	 */
	@Override
	protected OrgchartUnit syncUnit(NodeRef parent, String groupShortName) {
		final String groupName = authorityService.getName(AuthorityType.GROUP, groupShortName);
		final String displayName = authorityService.getAuthorityDisplayName(groupName);
		final String unitName = groupShortName;
		int weight = 1;
		NodeRef node = nodeService.createNode(parent,
				AlvexContentModel.ASSOC_SUBUNIT, getSubunutAssocQName(unitName),
				AlvexContentModel.TYPE_ORGCHART_UNIT).getChildRef();
		Map<QName, Serializable> props = new HashMap<QName, Serializable>();
		props.put(AlvexContentModel.PROP_GROUP_NAME, groupName);
		props.put(AlvexContentModel.PROP_UNIT_NAME, unitName == null ? node.getId()
				: unitName);
		props.put(AlvexContentModel.PROP_UNIT_DISPLAY_NAME,
				displayName == null ? node.getId() : displayName);
		props.put(AlvexContentModel.PROP_UNIT_WEIGHT, weight);
		nodeService.setProperties(node, props);
		return new OrgchartUnit(node, unitName, displayName, groupName, weight, 
				authorityService.getAuthorityNodeRef(groupName));
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#setOutOfOffice(com.alvexcore.repo.orgchart.OrgchartPerson, boolean)
	 */
	@Override
	public void setOutOfOffice(OrgchartPerson person, boolean value) throws Exception {
		makeOrgchartMember(person);
		// We will not enable OOO without default delegation, since it causes too many issues
		if( value && getDefaultDelegationForPerson(person) == null )
			throw new Exception("Cannot enable out of office without delegation");
		nodeService.setProperty(person.getNode(),
				AlvexContentModel.PROP_OUT_OF_OFFICE, value);
	}
	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#isOutOfOffice(com.alvexcore.repo.orgchart.OrgchartPerson)
	 */
	@Override
	public boolean isOutOfOffice(OrgchartPerson person) {
		if (isOrgchartMember(person))
			return (Boolean) nodeService.getProperty(person.getNode(),
					AlvexContentModel.PROP_OUT_OF_OFFICE);
		else
			return false;
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#setDelegation(com.alvexcore.repo.orgchart.RoleInstance, com.alvexcore.repo.orgchart.OrgchartPerson, com.alvexcore.repo.orgchart.OrgchartPerson)
	 */
	@Override
	public OrgchartDelegation setDelegation(RoleInstance role,
			OrgchartPerson source, OrgchartPerson target) {
		makeOrgchartMember(source);
		makeOrgchartMember(target); // it's not necessary
		NodeRef node = getFirstChild(source.getNode(),
				AlvexContentModel.ASSOC_DELEGATION,
				getDelegationAssocQName(role, source, target));
		if (node != null)
			nodeService.deleteNode(node);
		node = nodeService.createNode(source.getNode(),
				AlvexContentModel.ASSOC_DELEGATION,
				getDelegationAssocQName(role, source, target),
				AlvexContentModel.TYPE_ORGCHART_DELEGATION).getChildRef();
		nodeService.createAssociation(node, source.getNode(),
				AlvexContentModel.ASSOC_DELEGATION_SOURCE);
		nodeService.createAssociation(node, target.getNode(),
				AlvexContentModel.ASSOC_DELEGATION_TARGET);
		if (role != null)
			nodeService.createAssociation(node, role.getNode(),
					AlvexContentModel.ASSOC_DELEGATION_ROLE);
		return new OrgchartDelegation(node, role, source, target);
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#setDefaultDelegation(com.alvexcore.repo.orgchart.OrgchartPerson, com.alvexcore.repo.orgchart.OrgchartPerson)
	 */
	@Override
	public OrgchartDelegation setDefaultDelegation(OrgchartPerson source,
			OrgchartPerson target) {
		makeOrgchartMember(source);
		makeOrgchartMember(target); // it's not necessary
		return setDelegation(null, source, target);
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#removeDelegation(com.alvexcore.repo.orgchart.OrgchartDelegation)
	 */
	@Override
	public void removeDelegation(OrgchartDelegation delegation) {
		nodeService.deleteNode(delegation.getNode());
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#getSourceDelegationsForPerson(com.alvexcore.repo.orgchart.OrgchartPerson)
	 */
	@Override
	public List<OrgchartDelegation> getSourceDelegationsForPerson(
			OrgchartPerson person) {
		List<OrgchartDelegation> result = new ArrayList<OrgchartDelegation>();
		if (!isOrgchartMember(person))
			return result;
		for (ChildAssociationRef assoc : nodeService.getChildAssocs(
				person.getNode(), AlvexContentModel.ASSOC_DELEGATION,
				RegexQNamePattern.MATCH_ALL))
			result.add(getDelegationByRef(assoc.getChildRef()));
		return result;
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#getTargetDelegationsForPerson(com.alvexcore.repo.orgchart.OrgchartPerson)
	 */
	@Override
	public List<OrgchartDelegation> getTargetDelegationsForPerson(
			OrgchartPerson person) {
		List<OrgchartDelegation> result = new ArrayList<OrgchartDelegation>();
		for (AssociationRef assoc : nodeService.getSourceAssocs(
				person.getNode(), AlvexContentModel.ASSOC_DELEGATION_TARGET))
			result.add(getDelegationByRef(assoc.getSourceRef()));
		return result;
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#getDelegationsForRole(com.alvexcore.repo.orgchart.RoleInstance)
	 */
	@Override
	public List<OrgchartDelegation> getDelegationsForRole(RoleInstance role) {
		List<OrgchartDelegation> result = new ArrayList<OrgchartDelegation>();
		for (AssociationRef assoc : nodeService.getSourceAssocs(role.getNode(),
				AlvexContentModel.ASSOC_DELEGATION_ROLE))
			result.add(getDelegationByRef(assoc.getSourceRef()));
		return result;
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#getDelegationsForUnit(com.alvexcore.repo.orgchart.OrgchartUnit)
	 */
	@Override
	public List<OrgchartDelegation> getDelegationsForUnit(OrgchartUnit unit) {
		List<OrgchartDelegation> result = new ArrayList<OrgchartDelegation>();
		for (RoleInstance role : getUnitRoles(unit))
			result.addAll(getDelegationsForRole(role));
		return result;
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#getDefaultDelegationForPerson(com.alvexcore.repo.orgchart.OrgchartPerson)
	 */
	@Override
	public OrgchartDelegation getDefaultDelegationForPerson(
			OrgchartPerson person) {
		if (!isOrgchartMember(person))
			return null;

		for (OrgchartDelegation delegation : getSourceDelegationsForPerson(person))
			if (delegation.getRole() == null)
				return delegation;
		return null;
	}

	/* (non-Javadoc)
	 * @see com.alvexcore.repo.orgchart.OrgchartServiceX#getDelegation(com.alvexcore.repo.orgchart.RoleInstance, com.alvexcore.repo.orgchart.OrgchartPerson)
	 */
	@Override
	public OrgchartDelegation getDelegation(RoleInstance role,
			OrgchartPerson source) {
		if (!isOrgchartMember(source))
			return null;
		NodeRef node = getFirstChild(source.getNode(),
				AlvexContentModel.ASSOC_DELEGATION,
				getDelegationAssocQName(role, source, null));
		return node == null ? null : getDelegationByRef(node);
	}
}
