import "bootswatch/dist/darkly/bootstrap.min.css";
// import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import 'bootstrap';
import Konva from 'konva';
import {TabulatorFull as Tabulator} from 'tabulator-tables';
// import "tabulator-tables/dist/css/tabulator.min.css";
import "tabulator-tables/dist/css/tabulator_bootstrap5.min.css";
import { loadSavedJSON, checkTableForGroupID, saveLoadReportLayerChildren, exportCSV, prepWorldFile, writeWorldFile } from './saveload.js';


const konvaDiv = document.querySelector('#konvatest');
const rect = konvaDiv.getBoundingClientRect();
const width = rect.width;
const height = window.innerHeight * 0.65;

Konva.dragButtons = [2];

// first we need Konva core things: stage and layer
const stage = new Konva.Stage({
  container: 'konvatest',
  width: width,
  height: height,
});

stage.container().tabIndex = 1;

let stageFocused = false;
stage.container().addEventListener('focus', () => {
	stageFocused = true;
});
stage.container().addEventListener('blur', () => {
	stageFocused = false;
})

const layer = new Konva.Layer();
stage.add(layer);

// ** Load Background image
let backgroundImagePath = "";
document.getElementById('file_input').addEventListener('change', function (e) {
	const file = e.target.files[0];
	if (!file) return;
  
	// 1. Convert the file object into a usable local URL object
	backgroundImagePath = file.name;
	const localFileUrl = URL.createObjectURL(file);
  
	// 2. Load the file into a native Image instance
	const imgObj = new Image();
	imgObj.src = localFileUrl;
  
	imgObj.onload = function () {
	  // 3. Create the Konva shape once loaded
	  const userUploadedImage = new Konva.Image({
		x: 0,
		y: 0,
		image: imgObj,
		// width: imgObj.width * 0.5, // Scaling down
		// height: imgObj.height * 0.5,
		width: imgObj.width,
		height: imgObj.height,
		listening: false,
	  });
  
	  layer.add(userUploadedImage);
	  userUploadedImage.moveToBottom();
	  layer.batchDraw();
	  prepWorldFile(userUploadedImage);
	  
	  // 4. Free up memory by revoking the object URL
	  URL.revokeObjectURL(localFileUrl);

	  zoomToImage(userUploadedImage);

		userUploadedImage.cache();
		userUploadedImage.filters([Konva.Filters.Contrast]);
		userUploadedImage.contrast(0);

	  	const sliderLabel = document.createElement('label');
		sliderLabel.classList.add("ms-3", "me-3");
		sliderLabel.htmlFor = 'contrast_slider';
		sliderLabel.textContent = 'Contrast: ';

		const slider = document.createElement('input');
		slider.type = 'range';
		slider.min = '-100';
		slider.max = '100';
		slider.value = userUploadedImage.contrast();
		slider.id = 'contrast_slider';

		// slider.style.position = 'absolute';
		// slider.style.top = '20px';
		// slider.style.left = '20px';

		slider.addEventListener('input', (e) => {
			const value = parseInt(e.target.value);
			userUploadedImage.contrast(value);
		});

		const nameTextInput = document.createElement('input');
		nameTextInput.type = 'text';
		nameTextInput.classList.add("form-control", "w-auto");
		nameTextInput.id = 'nameTextInput';
		nameTextInput.placeholder = "File Name";

		const imageLoadDiv = document.getElementById("load_image");
		imageLoadDiv.appendChild(nameTextInput);
		imageLoadDiv.appendChild(sliderLabel);
		imageLoadDiv.appendChild(slider);
	};
});

function zoomToImage(sentImage) {
	// 1. Get the sizes of both the stage and the image
	const stageWidth = stage.width();
	const stageHeight = stage.height();
	
	// Use getClientRect to account for image rotation, scaling, or offsets
	const imageRect = sentImage.getClientRect();
  
	// 2. Calculate the ideal scale (choosing the smaller ratio to fit the whole image)
	const scaleX = stageWidth / imageRect.width;
	const scaleY = stageHeight / imageRect.height;
	const newScale = Math.min(scaleX, scaleY);
  
	// 3. Calculate the new position to center the image
	const newX = (stageWidth - imageRect.width * newScale) / 2 - imageRect.x * newScale;
	const newY = (stageHeight - imageRect.height * newScale) / 2 - imageRect.y * newScale;
  
	// 4. Apply the transformations to the stage
	stage.scale({ x: newScale, y: newScale });
	stage.position({ x: newX, y: newY });
	
	// 5. Redraw the stage
	stage.batchDraw();
  }
  

// ** Zoom and pan to cursor
const scaleBy = 1.01;
stage.on('wheel', (e) => {
	// stop default scrolling
	e.evt.preventDefault();

	const oldScale = stage.scaleX();
	const pointer = stage.getPointerPosition();

	const mousePointTo = {
		x: (pointer.x - stage.x()) / oldScale,
		y: (pointer.y - stage.y()) / oldScale,
	};

	// how to scale? Zoom in? Or zoom out?
	let direction = e.evt.deltaY > 0 ? -1 : 1;

	// when we zoom on trackpad, e.evt.ctrlKey is true
	// in that case lets revert direction
	if (e.evt.ctrlKey) {
		direction = -direction;
	}

	const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

	stage.scale({ x: newScale, y: newScale });

	const newPos = {
		x: pointer.x - mousePointTo.x * newScale,
		y: pointer.y - mousePointTo.y * newScale,
	};
	stage.position(newPos);
});

// ** Drawing
// // create tool select
// const select = document.createElement('select');
// select.innerHTML = `
//   <option value="brush">Brush</option>
//   <option value="eraser">Eraser</option>
// `;
// document.body.appendChild(select);

// select.addEventListener('change', function () {
// 	mode = select.value;
// });

let isPaint = false;
let mode = 'brush';
let lastLine;

var namecounter = 0;

stage.on('mousedown touchstart', function (e) {
	if (e.evt.button === 2)
	{
		stage.draggable(true);
	}
	else if (e.evt.button === 0)
	{
		isPaint = true;
		const pos = stage.getRelativePointerPosition();
		lastLine = new Konva.Line({
			stroke: '#df4b26',
			strokeWidth: 10,
			globalCompositeOperation:
			mode === 'brush' ? 'source-over' : 'destination-out',
			// round cap for smoother lines
			lineCap: 'round',
			lineJoin: 'round',
			// add point twice, so we have some drawings even on a simple click
			points: [pos.x, pos.y, pos.x, pos.y],
			name: 'line',
			id: "line_" + namecounter.toString(),
		});
		layer.add(lastLine);
	}
});

stage.on('mouseup touchend', function (e) {
	if (e.evt.button === 2)
	{
		stage.draggable(false);
	}
	else if (e.evt.button === 0)
	{
		if (isPaint)
		{
			namecounter++;
		}
		isPaint = false;
	}
});

stage.on('contextmenu', (e) => {
	e.evt.preventDefault();
});

// and core function - drawing
stage.on('mousemove touchmove', function (e) {
	if (!isPaint) {
		return;
	}

	// prevent scrolling on touch devices
	e.evt.preventDefault();

	const pos = stage.getRelativePointerPosition();
	const newPoints = lastLine.points().concat([pos.x, pos.y]);
	lastLine.points(newPoints);
});

// ** Grouping lines
function pointsToAbsoluteString(sentPoints, sentLine) {
	const absPoints = [];
	for (let i = 0; i < sentPoints.length; i+= 2) {
		const localCoord = { x: sentPoints[i], y: sentPoints[i + 1] };
		const absCoord = sentLine.point(localCoord);
		absPoints.push(absCoord.x, absCoord.y);
	}
	const absString = absPoints.join(",");
	return absString;
}

const groupButton = document.getElementById("groupbutton");
groupButton.addEventListener("click", setupNewLineGroup);
const groupIDInput = document.getElementById("groupidinput");
const groupIDSubmit = document.getElementById("submitgroupid");
groupIDSubmit.addEventListener("click", createLineGroup);

function setupNewLineGroup () {
	groupIDInput.hidden = false;
	groupIDSubmit.hidden = false;
}

let selectedLines = [];
function createLineGroup () {
	selectedLines.splice(0, selectedLines.length, ...tr.nodes());
	const newLineGroup = new Konva.Group({
		id: groupIDInput.value,
		name: "Group"
	});
	for (let i = 0; i < selectedLines.length; i++) {
		newLineGroup.add(selectedLines[i]);
	}
	layer.add(newLineGroup);
	tr.nodes([]);
	selectedLines = [];
	layer.batchDraw();
	addCheckbox(newLineGroup.id(), newLineGroup.id());
	addNewRow(newLineGroup.id());
	groupButton.hidden = true;
	groupIDInput.hidden = true;
	groupIDSubmit.hidden = true;
	lineInfo.innerHTML = "No selection...";
}

export function addCheckbox(labelText, value) {
	const container = document.getElementById('groupsVis');
  
	const label = document.createElement('label');
	label.id = value;
	label.style.display = 'block';
  
	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.value = value;
	checkbox.name = 'group-checkbox';
	checkbox.defaultChecked = true;
	checkbox.addEventListener('change', function () {
		if (this.checked) 
		{
			toggleGroupVisibility (checkbox.value, true);
		}
		else
		{
			toggleGroupVisibility (checkbox.value, false);
		}
	});
  
	label.appendChild(checkbox);
	label.appendChild(document.createTextNode(' ' + labelText));
  
	container.appendChild(label);
} 

function toggleGroupVisibility (sentID, sentState)
{
	const tempGroup = stage.findOne('#' + sentID);
	if (tempGroup)
	{
		if (sentState == true)
		{
			tempGroup.show();
			layer.batchDraw();
		}
		else
		{
			tempGroup.hide();
			layer.batchDraw();
		}
	}
}

// ** Delete selected lines
document.addEventListener('keydown', function(event) 
{
	if (event.key === 'Delete' || event.key === 'Backspace')
	{
		if (stageFocused)
		{
			selectedLines.splice(0, selectedLines.length, ...tr.nodes());
			console.log("Delete pressed - tr.nodes.length = " + tr.nodes.length + " selectedLines.length = " + selectedLines.length);
			if (selectedLines.length > 0)
			{
				for (const line of selectedLines)
				{
					line.destroy();
				}
				tr.nodes([]);
				selectedLines = [];
				cleanupEmptyGroups();
				layer.batchDraw();
			}
		}
	}
});

function cleanupEmptyGroups ()
{
	const currentGroups = layer.find('Group');
	for (const group of currentGroups)
	{
		if (group.getChildren().length === 0)
		{
			const emptyGroupID = group.id();
			group.destroy();
			layer.batchDraw();
			const tempCheckbox = document.getElementById(emptyGroupID);
			if (tempCheckbox)
			{
				tempCheckbox.remove();
			}
			var matchingRow = checkTableForGroupID(table.getRows(), emptyGroupID);
			if (matchingRow != null)
			{
				matchingRow.delete();
			}
		}
	}
}


// ** Line selection
const lineInfo = document.getElementById('lineinfo');
lineInfo.innerHTML = "No selection...";

// create transformer
const tr = new Konva.Transformer();
layer.add(tr);

// clicks should select/deselect shapes
stage.on('click tap', function (e) {
	// if click on empty area - remove all selections
	if (e.target === stage) {
		tr.nodes([]);
		lineInfo.innerHTML = "No selection...";
		groupButton.hidden = true;
		groupIDInput.hidden = true;
		groupIDSubmit.hidden = true;
		return;
	}

	// do nothing if clicked NOT on our line
	if (!e.target.hasName('line')) {
		lineInfo.innerHTML = "No selection...";
		groupButton.hidden = true;
		groupIDInput.hidden = true;
		groupIDSubmit.hidden = true;
		return;
	}
	else {
		lineInfo.innerHTML = e.target.name();
		const isInGroup = e.target.getParent() && e.target.getParent().getClassName() === "Group";
		if (isInGroup) {
			lineInfo.innerHTML = e.target.name() + " is part of Glyph: " + e.target.getParent().id();
			groupButton.hidden = true;
			groupIDInput.hidden = true;
			groupIDSubmit.hidden = true;
		}
		else {
			lineInfo.innerHTML = e.target.name() + " is not part of a Glyph.";
			groupButton.hidden = false;
			groupIDInput.hidden = true;
			groupIDSubmit.hidden = true;
		}
	}

	// do we pressed shift or ctrl?
	const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
	const isSelected = tr.nodes().indexOf(e.target) >= 0;

	if (!metaPressed && !isSelected) {
		// if no key pressed and the node is not selected
		// select just one
		tr.nodes([e.target]);
		console.log("tr.nodes.length = " + tr.nodeType.length);
	} else if (metaPressed && isSelected) {
		// if we pressed keys and node was selected
		// we need to remove it from selection:
		const nodes = tr.nodes().slice(); // use slice to have new copy of array
		// remove node from array
		nodes.splice(nodes.indexOf(e.target), 1);
		tr.nodes(nodes);
	} else if (metaPressed && !isSelected) {
		// add the node into selection
		const nodes = tr.nodes().concat([e.target]);
		tr.nodes(nodes);
	}
});

// ** Data table
// const blankData = Array(1).fill({});
const tableHeight = () => Math.floor(window.innerHeight * 0.25);
var table = new Tabulator("#infotable", {
    // data: blankData,
	layout: "fitData",
	height: tableHeight(),
    columns: [
		{ title: "Locality", field: "locality", editor: "input" },
		{ title: "Boulder ID", field: "boulder_no", editor: "input" },
		{ title: "Panel ID", field: "panel", editor: "input" },
        { title: "Petroglyph ID", field: "petro_no", editor: "input" },
		{ title: "Other Glyph ID", field: "orig_no", editor: "input" },
        { title: "Motif Code", field: "code", editor: "input" },
        { title: "Technique", field: "technique", editor: "input" },
        { title: "Intensity", field: "intensity", editor: "input" },
		{ title: "Rock Incorporation", field: "rock_incrp", editor: "input" },
		{ title: "Superimposition", field: "superimp", editor: "input" },
		{ title: "Varnish Rank", field: "v_rank", editor: "input" },
		{ title: "Condition", field: "condition", editor: "input" },
		{ title: "Varnish Class", field: "v_class", editor: "input" },
		{ title: "Repecking", field: "repecking", editor: "input" },
		{ title: "Repk V Rank", field: "repk_v_rnk", editor: "input" },
		{ title: "Repk V Class", field: "repk_v_cls", editor: "input" },
		{ title: "Record Date", field: "date", editor: "input" },
		{ title: "Recorder", field: "recorder", editor: "input" },
		{ title: "Data By", field: "data_by", editor: "input" },
		{ title: "Comments", field: "comments", editor: "input" },
		{ title: "Image Name", field: "image_name", editor: "input" }
    ],
	addRowPos: "bottom"
});

async function addNewRow (glyphID) {
	// table.addRow();
	const newRow = await table.addRow();
	newRow.update({ petro_no: glyphID, image_name: backgroundImagePath });
}

// const newRowButton = document.getElementById("newrow");
// newRowButton.addEventListener("click", addNewRow);

const exportCSVButton = document.getElementById("reportcsv");
exportCSVButton.addEventListener("click", () => exportCSV(table));

const writeWorldButton = document.getElementById("reportworldfile");
writeWorldButton.addEventListener("click", () => writeWorldFile(backgroundImagePath));

// ** Save prep
const reportChildrenButton = document.getElementById("reportchildren");
reportChildrenButton.addEventListener("click", () => saveLoadReportLayerChildren(layer, table));

// ** Load
const fileInput = document.getElementById('jsonFileInput');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  
  if (!file) {
    return;
  }

	const nameTextInput = document.getElementById('nameTextInput');
	if (nameTextInput)
	{
		const rawName = file.name;
		const strippedName = rawName.split('.')[0];
		nameTextInput.value = strippedName;
	}

  const reader = new FileReader();

  // Triggered when the file finishes reading
  reader.onload = (e) => {
    try {
      const fileContent = e.target.result; // String contents of the file
      const parsedObject = JSON.parse(fileContent); // Parse JSON text
      
      console.log('Parsed JSON Object:', parsedObject);
      // Do something with your parsed object here (e.g., update state or UI)
	  loadSavedJSON(parsedObject, layer, table);
    } catch (error) {
      console.error('Invalid JSON file format:', error);
    }
  };

//   // Read the uploaded file as text
  reader.readAsText(file);
});



