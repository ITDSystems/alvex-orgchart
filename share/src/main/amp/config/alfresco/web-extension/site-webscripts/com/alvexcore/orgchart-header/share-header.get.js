var peopleMenu = widgetUtils.findObject(model.jsonModel, "id", "HEADER_PEOPLE");
if (peopleMenu != null) {
  peopleMenu.name = "alfresco/header/AlfMenuBarPopup";
  delete peopleMenu.config.targetUrl;
  peopleMenu.config.label = "header.menu.orgchart-group.label",
  peopleMenu.config.widgets = [
    {
       name: "alfresco/header/AlfMenuItem",
       config:
       {
         id: "HEADER_ORGCHART",
         label: "header.menu.orgchart.label",
         targetUrl: "alvex-orgchart"
       }
    },
    {
       name: "alfresco/header/AlfMenuItem",
       config:
       {
         id: "HEADER_PEOPLE",
         label: "header.menu.people-finder.label",
         targetUrl: "people-finder"
       }
    }
  ];
  var userMenu = widgetUtils.findObject(model.jsonModel, "id", "HEADER_USER_MENU");
  var userMenuOthers = widgetUtils.findObject(model.jsonModel, "id", "HEADER_USER_MENU_OTHER_GROUP");
  if ( userMenuOthers != null ) {
    var OthersMenu = JSON.parse(JSON.stringify(userMenuOthers));
    widgetUtils.deleteObjectFromArray(model.jsonModel, "id", "HEADER_USER_MENU_OTHER_GROUP");
  }
  var outOfOffice = {
         id: "HEADER_USER_MENU_OUT_OF_OFFICE_GROUP",
         name: "alfresco/menus/AlfMenuGroup",
         config:
         {
            label: "group.out_of_office.group.label",
            widgets:
            [
               {
                  id: "HEADER_USER_MENU_OUT_OF_OFFICE",
                  name: "alfresco/header/AlfMenuItem",
                  config:
                  {
                     label: "out_of_office.label",
                     iconClass: "alf-user-profile-icon",
                     targetUrl: "user/" + encodeURIComponent(user.name) + "/alvex-out-of-office"
                  }
               }
            ]
         }
       }
  userMenu.config.widgets.push(outOfOffice);
  if (OthersMenu) {
    userMenu.config.widgets.push(OthersMenu);
  }
}
