**This extension for Alfresco is obsolete and unsupported. Use it on your own risk.**

[![Build Status](https://travis-ci.org/ITDSystems/alvex-orgchart.svg?branch=master)](https://travis-ci.org/ITDSystems/alvex-orgchart)

Alvex Orgchart
========================

Extends standard Alfresco users and groups functionality by adding complete organizational chart that is more convenient for business users than flat groups.

Features:
* Orgstructure view in Alfresco Share
* Using orgchart to select users and groups for cm:person associations on forms
* Assiging tasks by role: configure workflow to assign task to "secretary" or "accountant" without hard-coding names in the BPMN file.
* Out-of-office feature: automatically reassign tasks if person is unavailable

![Orgchart](http://alvexcore.com/images/docs/orgchart_1.png)
![Orgchart](http://alvexcore.com/images/docs/orgchart_2.png)

[Presentation from Alfresco DevCon 2012](http://www.slideshare.net/itdsystems/orgchart-for-alfresco-lightning-talk).

Compatible with Alfresco 5.1 and 5.2.

This component requires:
* [Alvex Utils](https://github.com/ITDSystems/alvex-utils)

# Using this project

Recommended way to use Alvex components is to include them as dependencies to your Maven project. Follow [this guide](https://github.com/ITDSystems/alvex#recommended-way-include-alvex-to-your-project-via-maven-configuration) to include this component to your project.

# Build from source

To build Alvex follow [this guide](https://github.com/ITDSystems/alvex#build-component-from-source).


# Quick Start

### Concepts

Some key Alvex Org Chart concepts include:

* Unit: departments, sections, offices etc. Employees are grouped into Units. You can create a Global Unit (Company) and Sub-units inside it. The number of nesting levels is not limited.
* Administrator of the Unit is a user who can modify the Unit and all subunits without being an Alfresco Administrator. For example, your human resources manager could be an Administrator.
* Supervisor of the Unit is a manager who can see tasks and workflows of the Unit's members.
* Role is a position of the person in the Org Chart Unit. The same user can have several roles in one or in different Units. Roles are defined globally for the whole company. While configuring an Org Chart Unit administrator should specify which roles can be used in this Unit. So you can define the role "Developer", "Clerk" or "Department Director" and use them for employees in different Units.

### Using Org Chart

Before using Org Chart, you have to configure it. Only system administrator can do this. Find Org Chart page in admin console to create Org Chart, roles and departments. Attach roles to departments to use roles in specific departments and add users to the orgchart. 

### Using Orgchart Pickers

Select user:
```
<field id="prefix:user">
  <control template="/orgchart-picker.ftl" />
</field>
```

Select group:
```
<field id="prefix:user">
  <control template="/orgchart-group-picker.ftl" />
</field>
```

### Using Org Chart for assigning tasks by roles

To use extended Alvex Org Chart features, add the following bean to your workflow context file:
```
<bean id="your_bean_id" parent="alvex-orgchart-delegations-manager">
  <property name="matches">
    <list>
      <value>task-assign-after-change:.*@PROCESS_ID</value>
      <value>task-done:.*@PROCESS_ID</value>
      <value>process-start@PROCESS_ID</value>
    </list>
  </property>
</bean>
```
**PROCESS_ID** is ID of your workflow.

To design a custom task to be assigned to the user with specific role, fill "Assignee" field for a task in a workflow model with **UNIT::ROLE**, where **UNIT** is a name of a unit or relative addressing for a unit, and **ROLE** is a name of a role.
Simple example for task, that will be assigned to a user with role Manager from Department 1 unit:
```
<userTask id="managerReview"
  activiti:assignee="Department One::Manager"
  activiti:formKey="alvexwf:managerReview">
```

Example for a task, that will be assigned to a user with role Manager from the unit one step up from the unit current user belongs to:
```
<userTask id="managerReview"
  activiti:assignee="{-1}::Manager"
  activiti:formKey="alvexwf:managerReview">
```

Example for a task, that will be assigned to a user with role Manager from the unit current user belongs to:
```
<userTask id="managerReview"
  activiti:assignee="{0}::Manager"
  activiti:formKey="alvexwf:managerReview">
```
  
If there is no Manager set for the current unit, then Org Chart will search up the tree to find Manager inherited from upper level.

### Using Out-of-Office feature

Setup out-of-office function to redirect your assigned tasks to your deputies while you are away. If you have several roles in the Org Chart you can select different deputies for different roles.

Open Out Of Office page. Set up your deputies and enable "Out of Office" status. When you will come back you need to disable the status to turn it off.

Out of Office will reassign new tasks to your deputies. You should manually reassign existing tasks that you didn't complete.

![Out of Office menu](http://alvexcore.com/images/docs/orgchart_3.png)
![Out of Office page](http://alvexcore.com/images/docs/orgchart_4.png)

Assigning tasks to your deputies for specific roles will work only if the task is assigned to you by the role, not by the username. If the task has been assigned to you by name then default deputy will be used.
