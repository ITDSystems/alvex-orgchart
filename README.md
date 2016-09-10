[![Build Status](https://travis-ci.org/ITDSystems/alvex-orgchart.svg?branch=master)](https://travis-ci.org/ITDSystems/alvex-orgchart)

Alvex Orgchart
========================

Extends standard Alfresco users and groups functionality by adding complete organizational chart that is more convenient for business users than flat groups.

Features:
* Orgstructure view in Alfresco Share
* Using orgchart to select users and groups for cm:person associations on forms
* Assiging tasks by role: configure workflow to assign task to "secretary" or "accountant" without hard-coding names in the BPMN file.
* Out-of-office feature: automatically reassign tasks if person is unavailable

![image](http://docs.alvexcore.com/en-US/Alvex/2.0.3/html/User_Guide/images/1_24.png)
![image](http://docs.alvexcore.com/en-US/Alvex/2.0.3/html/User_Guide/images/1_25.png)

[Presentation from Alfresco DevCon 2012](http://www.slideshare.net/itdsystems/orgchart-for-alfresco-lightning-talk).

Compatible with Alfresco 5.1.

# Downloads

Alvex component builds are automatically published to [nexus.itdhq.com](http://nexus.itdhq.com) by Travis CI.

# Build from source

To build Alvex follow [this guide](https://github.com/ITDSystems/alvex#build-component-from-source).

### Dependencies

This component depends on [Alvex Utils](https://github.com/ITDSystems/alvex-utils). Please install it together with Alvex Orgchart before starting your Alfresco.

# Use

### Orgchart basics and configuration in UI

[Link to the documentation](http://docs.alvexcore.com/en-US/Alvex/2.1/html/Admin_Guide/orgchart.html)

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

[Link to the documentation](http://docs.alvexcore.com/en-US/Alvex/2.1/html/Admin_Guide/ch04s02s04.html)

### Using Out-of-Office feature

[Link to the documentation](http://docs.alvexcore.com/en-US/Alvex/2.0.3/html/User_Guide/workflows_out_of_office.html)

