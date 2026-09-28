import { XYContainer, Line, Axis } from "@unovis/ts"; new XYContainer(document.body,{components:[new Line({x:d=>d.x,y:d=>d.y})],xAxis:new Axis(),yAxis:new Axis()},[]);
