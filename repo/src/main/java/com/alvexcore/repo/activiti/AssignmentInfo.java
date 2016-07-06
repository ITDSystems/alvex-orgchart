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

import java.io.Serializable;

import org.alfresco.service.cmr.repository.datatype.DefaultTypeConverter;
import org.alfresco.service.cmr.repository.datatype.TypeConverter;

public class AssignmentInfo implements Serializable {
	private static final long serialVersionUID = -6401453929018856733L;
	public final static int REASON_ASSIGNED_DIRECTLY = 0;
	public final static int REASON_ASSIGNED_BY_DEFAULT_DELEGATION = 1;
	public final static int REASON_ASSIGNED_BY_ROLE_DELEGATION = 2;
	public final static int REASON_ASSIGNED_BY_ROLE = 3;
	public final static int REASON_ASSIGNED_BY_ERROR_HANDLING = 4;
	private static final String ASSIGNMENTS_SEPARATOR = ";";
	private static final String ASSIGNMENT_FIELDS_SEPARATOR = "|";

	private String user;
	private int reason;
	private String roleInstanceId;
	private int index;
	private AssignmentInfo previousAssignment = null;

	public String getUser() {
		return user;
	}

	public void setUser(String user) {
		this.user = user;
	}

	public int getReason() {
		return reason;
	}

	public void setReason(int reason) {
		this.reason = reason;
	}

	public String getRoleInstanceId() {
		return roleInstanceId;
	}

	public void setRoleInstanceId(String roleInstanceId) {
		this.roleInstanceId = roleInstanceId;
	}

	public int getIndex() {
		return index;
	}

	public void setIndex(int index) {
		this.index = index;
	}

	public AssignmentInfo getPreviousAssignment() {
		return previousAssignment;
	}

	public void setPreviousAssignment(AssignmentInfo previousAssignment) {
		this.previousAssignment = previousAssignment;
	}

	public String toHumanReadableString() {
		String result = "";
		if (previousAssignment != null)
			result = previousAssignment.toHumanReadableString() + ASSIGNMENTS_SEPARATOR;
		result += user + ASSIGNMENT_FIELDS_SEPARATOR + Integer.toString(reason)
				+ ASSIGNMENT_FIELDS_SEPARATOR + (roleInstanceId == null ? "" : roleInstanceId)
				+ ASSIGNMENT_FIELDS_SEPARATOR + Integer.toString(index);
		return result;
	}
	
	public int getDepth() {
		return 1+(previousAssignment == null ? 0 : previousAssignment.getDepth());
	}

	static {
		DefaultTypeConverter.INSTANCE.addConverter(AssignmentInfo.class,
				String.class,
				new TypeConverter.Converter<AssignmentInfo, String>() {
					public String convert(AssignmentInfo source) {
						return source.toHumanReadableString();
					}

				});
	}
}
