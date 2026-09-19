import Konva from "konva";
import { addCheckbox } from './index.js';
// import { clean } from "gh-pages";

function formatName () {
  const userFilename = document.getElementById('nameTextInput').value;
  const cleanedFilename = userFilename
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");
  return cleanedFilename;
}

export function saveLoadReportLayerChildren (sentLayer, sentTable) {
  console.log("Children Report:");

  let geoJsonObject = {
    type: "FeatureCollection",
    features: []
  }
  const layerChildren = sentLayer.getChildren();
  const tableRows = sentTable.getRows();
  layerChildren.forEach(node => {
    console.log(node);
    if (node.name() == "Group")
    {
      console.log ("Found a group!");
      var matchingRow = checkTableForGroupID(tableRows, node.id());
      if (matchingRow != null){
        var matchingRowData = matchingRow.getData();
        console.log("Found match! ID = " + matchingRowData.petro_no);

        let tempMultilinestring = {
          type: "Feature",
          geometry: {
            type: "MultiLineString",
            coordinates: []
          },
          properties: {

          }
        }

        const nodeChildren = node.getChildren();
        nodeChildren.forEach(child => {
          let childPoints = structuredClone(child.points());
          let pointsArray = [];
          for (let i = 0; i < childPoints.length; i += 2) {
            // const pointsSubArray = [childPoints[i+1], childPoints[i]];
            // const pointsSubArray = [childPoints[i], childPoints[i + 1]];
            const pointsSubArray = [childPoints[i], childPoints[i + 1] * -1.0];
            pointsArray.push(pointsSubArray);
          }
          tempMultilinestring.geometry.coordinates.push(pointsArray);

          Object.assign(tempMultilinestring.properties, {
              locality: matchingRowData.locality,
              boulder_no: matchingRowData.boulder_no,
              panel: matchingRowData.panel,
              petro_no: matchingRowData.petro_no,
              orig_no: matchingRowData.orig_no,
              code: matchingRowData.code,
              technique: matchingRowData.technique,
              intensity: matchingRowData.intensity,
              rock_incrp: matchingRowData.rock_incrp,
              superimp: matchingRowData.superimp,
              v_rank: matchingRowData.v_rank,
              condition: matchingRowData.condition,
              v_class: matchingRowData.v_class,
              repecking: matchingRowData.repecking,
              repk_v_rnk: matchingRowData.repk_v_rnk,
              repk_v_cls: matchingRowData.repk_v_cls,
              date: matchingRowData.date,
              recorder: matchingRowData.recorder,
              data_by: matchingRowData.data_by,
              comments: matchingRowData.comments,
              image_name: matchingRowData.image_name
          });
        });

        geoJsonObject.features.push(tempMultilinestring);
      }
    }
  });
  
  // const geoString = JSON.stringify(geoJsonObject, null, 2);
  // console.log(geoString);

  const nameComplete = formatName() + ".geojson";
  downloadGeoJSON(geoJsonObject, nameComplete);
}

export function checkTableForGroupID(sentRows, sentID) {
  var foundRow = null;
  sentRows.forEach(function(row) {
    var rowData = row.getData();
    var glyphID = rowData.petro_no;
    if (glyphID == sentID) {
      // foundRow = rowData;
      foundRow = row;
    }
  });
  return foundRow;
}

function checkCell (sentCellValue)
{
  console.log(sentCellValue);
  if (sentCellValue == null || sentCellValue == undefined)
  {
    return "";
  }
  else 
  {
    return sentCellValue;
  }
}

function addMultilinestring (sentGroup) {
  geoJsonObject.features.push({sentGroup});
}
  
//Saving in the Browser
function downloadGeoJSON(geoJsonObject, filename = "data.geojson") {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJsonObject));
  const downloadAnchor = document.createElement('a');
  
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", filename);
  document.body.appendChild(downloadAnchor);
  
  downloadAnchor.click();
  downloadAnchor.remove();
}  

export function exportCSV (sentTable)
{
  const completeName = formatName() + ".csv";
  sentTable.download("csv", completeName);
}

let xImgCoord = 0.0;
let yImgCoord = 0.0;
export function prepWorldFile (sentImage)
{
  xImgCoord = sentImage.x();
  yImgCoord = sentImage.y();  
}

export function writeWorldFile (sentImageFilename)
{
  const worldfileName = sentImageFilename + "w";

  // const xPixelMapUnits = 0.5;
  const xPixelMapUnits = 1.0;
  const yImgRotation = 0.0;
  const xImgRotation = 0.0;
  // const yPixelMapUnits = -0.5;
  const yPixelMapUnits = -1.0;

  const worldfileContents = xPixelMapUnits.toString() + "\n" + yImgRotation.toString() + "\n" + xImgRotation.toString() + "\n" + yPixelMapUnits.toString() + "\n" + xImgCoord.toString() + "\n" + yImgCoord.toString();

  const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(worldfileContents);
  const downloadAnchor = document.createElement('a');
  
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", worldfileName);
  document.body.appendChild(downloadAnchor);
  
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function loadSavedJSON (sentJSON, sentLayer, sentTable)
{
  const groupArray = sentJSON.features;
  for (const group of groupArray)
  {
    console.log(group);
    const tempGroup = new Konva.Group({
      id: group.properties.petro_no,
      name: "Group"
    });
    let lineCounter = 0;
    for (const coordArray of group.geometry.coordinates)
    {
      const tempCoords = [];
      for (const coordPair of coordArray)
      {
        // console.log(coordPair);
        // tempCoords.push(coordPair[1]);
        // tempCoords.push(coordPair[0]);
        // tempCoords.push(coordPair[0]);
        // tempCoords.push(coordPair[1]);
        tempCoords.push(coordPair[0]);
        tempCoords.push(coordPair[1] * -1.0);
      }
      const tempLine = new Konva.Line({
        stroke: '#df4b26',
        strokeWidth: 10,
        lineCap: 'round',
        lineJoin: 'round',
        points: tempCoords,
        name: 'line',
        id: lineCounter.toString(),
      });
      sentLayer.add(tempLine);
      tempGroup.add(tempLine);
      lineCounter += 1;
    }
    sentLayer.add(tempGroup);
    addCheckbox(tempGroup.id(), tempGroup.id());
    const groupTableInfo = group.properties;
    sentTable.addData(groupTableInfo);
  }
}