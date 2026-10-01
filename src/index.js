import "bootswatch/dist/darkly/bootstrap.min.css";
import './style.css';
import { Modal } from 'bootstrap'; 
import Konva from 'konva';
import {TabulatorFull as Tabulator} from 'tabulator-tables';
import "tabulator-tables/dist/css/tabulator_bootstrap5.min.css";
import { loadSavedJSON, checkTableForGroupID, saveLoadReportLayerChildren, exportCSV, prepWorldFile, writeWorldFile } from './saveload.js';


const konvaDiv = document.querySelector('#konvatest');
const rect = konvaDiv.getBoundingClientRect();
const width = rect.width;
const height = window.innerHeight * 0.65;

Konva.hitOnDragEnabled = true;
Konva.dragButtons = [2];

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

// ** Load Background image - adapted from example code by google AI
let userUploadedImage = new Konva.Image({
	x: 0,
	y: 0,
	width: 256,
	height: 256,
	listening: false,
	name: "BGImage",
});
layer.add(userUploadedImage);
let bgImageLoaded = false;
let backgroundImagePath = "";
export let scaleFactor = 1.0;

document.getElementById("image_upload_item").addEventListener('click', function (e) {
	e.preventDefault();
	document.getElementById("file_input").click();
});

document.getElementById('file_input').addEventListener('change', function (e) {
	const file = e.target.files[0];
	if (!file) return;

	if (saveFileLoaded)
	{
		loadImageScaleLines(true);
	}

	scaleFactor = 1.0;

	// 1. Convert the file object into a usable local URL object
	backgroundImagePath = file.name;
	const localFileUrl = URL.createObjectURL(file);

	// 2. Load the file into a native Image instance
	const imgObj = new Image();
	imgObj.src = localFileUrl;

	imgObj.onload = function () {

		// 3. Create the Konva shape once loaded
		const originalWidth = imgObj.width;
		const originalHeight = imgObj.height;
		if (originalWidth > originalHeight)
		{
			if (originalWidth > 3072)
			{
				scaleFactor = 3072 / originalWidth;
			}
		}
		else
		{
			if (originalHeight > 3072)
			{
				scaleFactor = 3072 / originalHeight;
			}
		}

		userUploadedImage.image(imgObj);
		userUploadedImage.width(originalWidth * scaleFactor);
		userUploadedImage.height(originalHeight * scaleFactor);

		//Reset stage position and zoom (necessary to center and zoom to image extents after load)
		stage.scale({ x: 1.0, y: 1.0 });
		stage.position({ x: 0.0, y: 0.0 });

		userUploadedImage.moveToBottom();
		layer.batchDraw();
		prepWorldFile(userUploadedImage);

		loadImageCheckFile();
		
		// 4. Free up memory by revoking the object URL
		setTimeout(() => URL.revokeObjectURL(localFileUrl), 10000);

		zoomToImage(userUploadedImage);

		userUploadedImage.cache();
		userUploadedImage.filters([Konva.Filters.Brightness, Konva.Filters.Contrast]);
		userUploadedImage.brightness(1.0);
		userUploadedImage.contrast(0);

		if (!bgImageLoaded)
		{	
			const sliderBLabel = document.createElement('label');
			sliderBLabel.classList.add("ms-3", "me-3");
			sliderBLabel.htmlFor = 'brightness_slider';
			sliderBLabel.textContent = 'Brightness: ';

			const sliderB = document.createElement('input');
			sliderB.type = 'range';
			sliderB.min = '0';
			sliderB.max = '2';
			sliderB.value = userUploadedImage.brightness();
			sliderB.step = '0.1';
			sliderB.id = 'brightness_slider';

			sliderB.addEventListener('input', (e) => {
				const value = parseFloat(e.target.value);
				userUploadedImage.brightness(value);
			});
			
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

			slider.addEventListener('input', (e) => {
				const value = parseInt(e.target.value);
				userUploadedImage.contrast(value);
			});

			const nameTextInput = document.createElement('input');
			nameTextInput.type = 'text';
			nameTextInput.classList.add("form-control", "w-auto");
			nameTextInput.id = 'nameTextInput';
			nameTextInput.placeholder = "File Name";

			const imageLoadDiv = document.getElementById("navbarColor01");
			imageLoadDiv.appendChild(nameTextInput);
			imageLoadDiv.appendChild(sliderBLabel);
			imageLoadDiv.appendChild(sliderB);
			imageLoadDiv.appendChild(sliderLabel);
			imageLoadDiv.appendChild(slider);

			bgImageLoaded = true;
			if (saveFileLoaded)
			{
				nameTextInput.value = loadFileNameHolder;
			}
		}
		document.getElementById("contrast_slider").value = userUploadedImage.contrast();
	};
});

// ** Zoom to image extents after image load (code via google AI)
function zoomToImage(sentImage) 
{
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
  
	stage.scale({ x: newScale, y: newScale });
	stage.position({ x: newX, y: newY });
	
	stage.batchDraw();
}
  
// Touch pan and zoom (two fingers) - from Konva's touch pan & pinch zoom example
function getDistance(p1, p2) {
	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getCenter(p1, p2) {
	return {
	  x: (p1.x + p2.x) / 2,
	  y: (p1.y + p2.y) / 2,
	};
}

let lastCenter = null;
let lastDist = 0;
let dragStopped = false;

stage.on('touchmove', function (e) {
  e.evt.preventDefault();
  const touch1 = e.evt.touches[0];
  const touch2 = e.evt.touches[1];

  // we need to restore dragging, if it was cancelled by multi-touch
  if (touch1 && !touch2 && !stage.isDragging() && dragStopped) {
    stage.startDrag();
    dragStopped = false;
  }

  if (touch1 && touch2) {
    // if the stage was under Konva's drag&drop
    // we need to stop it, and implement our own pan logic with two pointers
    if (stage.isDragging()) {
      dragStopped = true;
      stage.stopDrag();
    }

    const rect = stage.container().getBoundingClientRect();

    const p1 = {
      x: touch1.clientX - rect.left,
      y: touch1.clientY - rect.top,
    };
    const p2 = {
      x: touch2.clientX - rect.left,
      y: touch2.clientY - rect.top,
    };

    if (!lastCenter) {
      lastCenter = getCenter(p1, p2);
      return;
    }
    const newCenter = getCenter(p1, p2);

    const dist = getDistance(p1, p2);

    if (!lastDist) {
      lastDist = dist;
    }

    // local coordinates of center point
    const pointTo = {
      x: (newCenter.x - stage.x()) / stage.scaleX(),
      y: (newCenter.y - stage.y()) / stage.scaleX(),
    };

    const scale = stage.scaleX() * (dist / lastDist);

    stage.scaleX(scale);
    stage.scaleY(scale);

    // calculate new position of the stage
    const dx = newCenter.x - lastCenter.x;
    const dy = newCenter.y - lastCenter.y;

    const newPos = {
      x: newCenter.x - pointTo.x * scale + dx,
      y: newCenter.y - pointTo.y * scale + dy,
    };

    stage.position(newPos);

    lastDist = dist;
    lastCenter = newCenter;
  }
});

stage.on('touchend', function () {
  lastDist = 0;
  lastCenter = null;
});

// ** Zoom and pan to cursor (mouse) - from Konva's pan and zoom example
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

// ** Drawing - from Konva's mouse drawing tutorial adapted to include mouse AND touch

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

let namecounter = 0;
export const setNameCounter = (sentCount) => {
	namecounter = sentCount;
}

stage.on('mousedown touchstart', function (e) {
	if (!selectionModeActive)
	{
		if (e.evt.button === 2)
		{
			stage.draggable(true);
		}
		else if (e.evt.button === 0 || e.evt.touches.length === 1)
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
			lastLine.setAttr("originalColor", '#df4b26');
			lastLine.setAttr("Glyph","");
			layer.add(lastLine);
		}
	}
});

stage.on('mouseup touchend', function (e) {
	if (!selectionModeActive)
	{
		if (e.evt.button === 2)
		{
			stage.draggable(false);
		}
		else if (e.evt.button === 0 || e.evt.touches.length === 1)
		{
			if (isPaint)
			{
				if (lastLine.points().length == 4)
				{
					lastLine.destroy();
				}
				else
				{
					if (undoFlag)
					{
						undoFlag = false;
					}
					else
					{
						undoStack.push( {command: "drawLine", lineName: [lastLine.id()] });
						redoStack = [];
						cleanupUndoRedoStacks();
					}
					namecounter++;
				}
			}
			isPaint = false;
		}
	}
});

stage.on('contextmenu', (e) => {
	e.evt.preventDefault();
});

// and core function - drawing
stage.on('mousemove touchmove', function (e) {
	if (!selectionModeActive)
	{
		if (!isPaint) {
			return;
		}

		// prevent scrolling on touch devices
		e.evt.preventDefault();

		if (e.evt.button === 0 || e.evt.touches.length === 1)
		{
			const pos = stage.getRelativePointerPosition();
			const newPoints = lastLine.points().concat([pos.x, pos.y]);
			lastLine.points(newPoints);
		}
	}
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
	let groupExists = false;
	const currentGroups = layer.find('Group');
	for (const group of currentGroups)
	{
		if (group.id() == groupIDInput.value)
		{
			// console.log("Glyph " + groupIDInput.value + " already exists. Adding selected to that group.");
			groupExists = true;
			for (let i = 0; i < selectedLines.length; i++) {
				selectedLines[i].stroke(selectedLines[i].getAttr("originalColor"));
				selectedLines[i].remove();
				group.add(selectedLines[i]);
				selectedLines[i].setAttr("Glyph", groupIDInput.value);
			}
		}
	}

	if (!groupExists)
	{
		const newLineGroup = new Konva.Group({
			id: groupIDInput.value,
			name: "Group"
		});
		for (let i = 0; i < selectedLines.length; i++) {
			selectedLines[i].stroke(selectedLines[i].getAttr("originalColor"));
			newLineGroup.add(selectedLines[i]);
			selectedLines[i].setAttr("Glyph", groupIDInput.value);
		}
		layer.add(newLineGroup);
		addCheckbox(newLineGroup.id(), newLineGroup.id());
		addNewRow(newLineGroup.id());
	}

	tr.nodes([]);
	selectedLines = [];
	cleanupEmptyGroups({ command: "None" });
	layer.batchDraw();
	
	deleteSelectionButton.hidden = true;
	groupButton.hidden = true;
	groupIDInput.hidden = true;
	groupIDSubmit.hidden = true;
	lineInfo.innerHTML = "No selection...";
}

function cleanupEmptyGroups (sentUndoRedoObj)
{
	let deletedRows = [];
	const currentGroups = layer.find('Group');
	for (const group of currentGroups)
	{
		if (group.getChildren().length === 0)
		{
			const emptyGroupID = group.id();
			group.destroy();
			layer.batchDraw();
			const tempCheckbox = document.getElementById("cb-" + emptyGroupID);
			if (tempCheckbox)
			{
				tempCheckbox.remove();
			}
			
			var matchingRow = checkTableForGroupID(table.getRows(), emptyGroupID);
			if (matchingRow != null)
			{
				deletedRows.push(matchingRow.getData());
				matchingRow.delete();
			}
		}
	}
	if (deletedRows.length > 0)
	{
		if (sentUndoRedoObj.command != "None")
		{
			sentUndoRedoObj.glyphData = deletedRows;
			// console.log("sentUndoRedoObj.glyphData[0] = " + JSON.stringify(sentUndoRedoObj.glyphData[0]));
		}
	}
}

export function addCheckbox (labelText, value)
{
	const container = document.getElementById('groupsVis');

	const checkbuttonDiv = document.createElement('div');
	checkbuttonDiv.classList.add("checkbuttoncontainer", "d-flex", "align-items-center");
	checkbuttonDiv.id = "cb-" + value;

	const checkbuttonCheck = document.createElement('input');
	checkbuttonCheck.type = 'checkbox';
	checkbuttonCheck.value = value;
	checkbuttonCheck.name = 'group-checkbox';
	checkbuttonCheck.defaultChecked = true;
	checkbuttonCheck.classList.add("form-check-input", "m-1");
	checkbuttonCheck.addEventListener('change', function () {
		if (this.checked) 
		{
			toggleGroupVisibility (checkbuttonCheck.value, true);
		}
		else
		{
			toggleGroupVisibility (checkbuttonCheck.value, false);
		}
	});

	const checkbuttonButton = document.createElement('input');
	checkbuttonButton.type = 'checkbox';
	checkbuttonButton.value = value;
	checkbuttonButton.name = 'glyph-select';
	checkbuttonButton.id = value;
	checkbuttonButton.defaultChecked = false;
	checkbuttonButton.classList.add("btn-check");
	checkbuttonButton.addEventListener('change', function () {
		console.log("Layer Label clicked: " + checkbuttonButton.value);
		if (this.checked) 
		{
			selectGroup (checkbuttonButton.value, true);
		}
		else
		{
			selectGroup (checkbuttonButton.value, false);
		}
	});

	const checkbuttonButtonLabel = document.createElement('label');
	checkbuttonButtonLabel.classList.add("btn", "m-1", "d-inline-flex", "flex-grow-1", "text-start", "custom-toggle");
	checkbuttonButtonLabel.htmlFor = value;
	checkbuttonButtonLabel.id = value;
	checkbuttonButtonLabel.textContent = labelText;

	checkbuttonDiv.appendChild(checkbuttonCheck);
	checkbuttonDiv.appendChild(checkbuttonButton);
	checkbuttonDiv.appendChild(checkbuttonButtonLabel);

	container.appendChild(checkbuttonDiv);
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

const selectedGlyphColor = "#00b38f";
function selectGroup (sentID, sentState)
{
	const tempGroup = stage.findOne('#' + sentID);
	if (tempGroup)
	{
		const groupLines = tempGroup.find("Line");
		if (sentState == true)
		{
			if (groupLines.length > 0)
			{
				for (let i = 0; i < groupLines.length; i++) {
					groupLines[i].stroke(selectedGlyphColor);
				}
			}
			layer.batchDraw();
		}
		else
		{
			if (groupLines.length > 0)
			{
				for (let i = 0; i < groupLines.length; i++) {
					groupLines[i].stroke(groupLines[i].getAttr("originalColor"));
				}
			}
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
			deleteLines();
		}
	}
});

function deleteLines ()
{
	selectedLines.splice(0, selectedLines.length, ...tr.nodes());
	// console.log("Delete pressed - tr.nodes.length = " + tr.nodes.length + " selectedLines.length = " + selectedLines.length);
	if (selectedLines.length > 0)
	{
		let tempDeleteObj = { command: "deleteLine", lineObjs: [] };
		for (const line of selectedLines)
		{
			const tempLineObj = line.clone();
			tempLineObj.stroke(tempLineObj.getAttr("originalColor"));
			// *** TODO: Figure out how to record the Group this line was part of, IF it was part of a Group
			tempLineObj.remove();
			tempDeleteObj.lineObjs.push(tempLineObj);

			line.destroy();
		}
		// redoStack = [];
		if (undoFlag)
		{
			redoStack.push(tempDeleteObj);
			undoFlag = false;
			cleanupUndoRedoStacks();
		}
		else
		{
			undoStack.push(tempDeleteObj);
			cleanupUndoRedoStacks();
		}
		tr.nodes([]);
		selectedLines = [];
		cleanupEmptyGroups(tempDeleteObj);
		layer.batchDraw();

		deleteSelectionButton.hidden = true;
		groupButton.hidden = true;
		groupIDInput.hidden = true;
		groupIDSubmit.hidden = true;
	}
}


// ** Undo Redo lines
let undoFlag = false;
let undoRedoMax = 10;
let undoStack = [];
let redoStack = [];

const undoButton = document.getElementById("undoButton");
undoButton.addEventListener("click", undoLastCommand);
undoButton.hidden = true;

const redoButton = document.getElementById("redoButton");
redoButton.addEventListener("click", redoLastCommand);
redoButton.hidden = true;

function undoLastCommand ()
{
	if (undoStack.length > 0)
	{
		undoFlag = true;
		const lastCommand = undoStack.pop();
		if (lastCommand.command == "drawLine")
		{
			// console.log("last line name: " + lastCommand.lineName[0]);
			undoAddLine(lastCommand.lineName);
		}
		else if (lastCommand.command == "deleteLine")
		{
			undoDeleteLine(lastCommand);
		}
	}
}

function redoLastCommand ()
{
	if (redoStack.length > 0)
	{
		const lastCommand = redoStack.pop();
		if (lastCommand.command == "drawLine")
		{
			undoAddLine(lastCommand.lineName);
		}
		else if (lastCommand.command == "deleteLine")
		{
			undoDeleteLine(lastCommand);
		}
	}
}

function undoAddLine (sentLineIDs)
{
	tr.nodes([]);
	let tempNodeArray = [];
	for (let i = 0; i < sentLineIDs.length; i++) 
	{
		const tempLineNode = stage.findOne("#" + sentLineIDs[i]);
		if (tempLineNode)
		{
			tempNodeArray.push(tempLineNode);
		}
	}
	tr.nodes(tempNodeArray);
	deleteLines();
}

function undoDeleteLine (sentCommand)
{
	if ("glyphData" in sentCommand)
	{
		// console.log("sentCommand.glyphData.length = " + sentCommand.glyphData.length.toString());
		for (let i = 0; i < sentCommand.glyphData.length; i++) {
			// console.log("dataRow = " + JSON.stringify(sentCommand.glyphData[i]));
			const restoredLineGroup = new Konva.Group({
				id: sentCommand.glyphData[i].petro_no,
				name: "Group"
			});
			layer.add(restoredLineGroup);
			addCheckbox(restoredLineGroup.id(), restoredLineGroup.id());
			// console.log("Restored Glpyh ID: " + restoredLineGroup.id());

			table.addRow(sentCommand.glyphData[i]);
			// console.log("Restored dataRow: " + sentCommand.glyphData[i].petro_no);
		}
	}

	const currentGroups = layer.find('Group');
	let tempLineIDArray = [];
	for (let i = 0; i < sentCommand.lineObjs.length; i++) {
		let groupExists = false;
		tempLineIDArray.push(sentCommand.lineObjs[i].id());
		layer.add(sentCommand.lineObjs[i]);
		
		if (sentCommand.lineObjs[i].getAttr("Glyph") != "")
		{
			if (currentGroups.length > 0){
				for (const group of currentGroups)
				{
					if (group.id() == sentCommand.lineObjs[i].getAttr("Glyph"))
					{
						// console.log("Glyph " + sentCommand.lineObjs[i].getAttr("Glyph") + " exists. Adding restored line to that group.");
						groupExists = true;
						sentCommand.lineObjs[i].stroke(sentCommand.lineObjs[i].getAttr("originalColor"));
						group.add(sentCommand.lineObjs[i]);
					}
				}

				if (!groupExists)
				{
					// console.log("Restored line glyph does not exist. Restoring line as part of no glyph.");
					sentCommand.lineObjs[i].setAttr("Glyph","");
				}
			}
			else
			{
				// console.log("No groups in project. Restoring line with no glyph.");
				sentCommand.lineObjs[i].setAttr("Glyph","");
			}
		}
	}
	layer.batchDraw();
	if (undoFlag)
	{
		redoStack.push({ command: "drawLine", lineName: tempLineIDArray });
		undoFlag = false;
	}
	else
	{
		undoStack.push({ command: "drawLine", lineName: tempLineIDArray });
	}
	cleanupUndoRedoStacks();
}

function cleanupUndoRedoStacks ()
{
	if (undoStack.length > 0)
	{
		// console.log("undoStack.length = " + undoStack.length.toString());
		undoStack.forEach(element => {
			if (element.command == "drawLine")
			{
				// console.log("undoStack - command: " + element.command + " lineName: " + element.lineName[0]);
			}
			else if (element.command == "deleteLine")
			{
				// console.log("undoStack - command: " + element.command);
			}
		});
	}
	if (undoStack.length > undoRedoMax)
	{
		const numberToRemove = undoStack.length - undoRedoMax;
		const removedItems = undoStack.splice(0, numberToRemove);
		for (let i = 0; i < removedItems.length; i++) {
			if (removedItems[i].command == "deleteLine")
			{
				for (let j = 0; j < removedItems[i].lineObjs.length; j++) {
					removedItems[i].lineObjs[j].destroy();
				}
			}
		}
	}

	if (undoStack.length == 0)
	{
		undoButton.hidden = true;
	}
	else if (undoStack.length > 0)
	{
		undoButton.hidden = false;
	}
	if (redoStack.length == 0)
	{
		redoButton.hidden = true;
	}
	else if (redoStack.length > 0)
	{
		redoButton.hidden = false;
	}
}


// ** Line selection - from Konva's selection demo
const selectionColor = '#f5cc27';
let selectionModeActive = false;
const deleteSelectionButton = document.getElementById("deleteSelectedButton");
deleteSelectionButton.addEventListener("click", deleteLines);
const lineInfo = document.getElementById('lineinfo');
lineInfo.innerHTML = "No selection...";

const selectionModeToggle = document.getElementById('selectionModeToggle');
selectionModeToggle.addEventListener('change', (event) => {
	if (event.target.checked)
	{
		selectionModeActive = true;
	}
	else
	{
		selectionModeActive = false;
		deleteSelectionButton.hidden = true;
		groupButton.hidden = true;
		groupIDInput.hidden = true;
		groupIDSubmit.hidden = true;
	}
});

// create transformer
const tr = new Konva.Transformer();
layer.add(tr);

//Selection by rectangle
let selectionRectangle = new Konva.Rect({
  fill: 'rgba(0,0,255,0.5)',
  visible: false,
});
layer.add(selectionRectangle);

let x1, y1, x2, y2;
stage.on('mousedown touchstart', (e) => {
	if (selectionModeActive)
	{
		// do nothing if we mousedown on any shape
		if (e.target !== stage) {
			return;
		}
		x1 = stage.getRelativePointerPosition().x;
		y1 = stage.getRelativePointerPosition().y;
		x2 = stage.getRelativePointerPosition().x;
		y2 = stage.getRelativePointerPosition().y;

		selectionRectangle.setAttrs({
			x: x1,
			y: y1,
			width: 0,
			height: 0,
			visible: true,
		});
	}
});

stage.on('mousemove touchmove', () => {
	if (selectionModeActive)
	{
		// do nothing if we didn't start selection
		if (!selectionRectangle.visible()) {
			return;
		}
		x2 = stage.getRelativePointerPosition().x;
		y2 = stage.getRelativePointerPosition().y;

		selectionRectangle.setAttrs({
			x: Math.min(x1, x2),
			y: Math.min(y1, y2),
			width: Math.abs(x2 - x1),
			height: Math.abs(y2 - y1),
		});
	}
});

stage.on('mouseup touchend', () => {
	if (selectionModeActive)
	{
		// do nothing if we didn't start selection
		if (!selectionRectangle.visible()) {
			return;
		}
		// update visibility in timeout, so we can check it in click event
		setTimeout(() => {
			selectionRectangle.visible(false);
		});

		var shapes = stage.find('.line');
		var box = selectionRectangle.getClientRect();
		var newSelected = [];
		for (let i = 0; i < shapes.length; i++) {
			if (Konva.Util.haveIntersection(box, shapes[i].getClientRect()))
			{
				if (shapes[i].isVisible())
				{
					newSelected.push(shapes[i]);
				}
			}
		}
		const tempNodes = tr.nodes();
		tempNodes.forEach(line => {
			line.stroke(line.getAttr("originalColor"));
		});
		newSelected.forEach(line => {
			line.stroke(selectionColor);
		});
		tr.nodes(newSelected);
		if (newSelected.length == 0)
		{
			lineInfo.innerHTML = "No selection...";
			deleteSelectionButton.hidden = true;
			groupButton.hidden = true;
			groupIDInput.hidden = true;
			groupIDSubmit.hidden = true;
		}
		else if (newSelected.length == 1)
		{
			const isInGroup = newSelected[0].getParent() && newSelected[0].getParent().getClassName() === "Group";
			if (isInGroup) {
				lineInfo.innerHTML = newSelected[0].name() + " is part of Glyph: " + newSelected[0].getParent().id();
				deleteSelectionButton.hidden = false;
				groupButton.textContent = "Create OR Move to Glyph";
				groupButton.hidden = false;
				groupIDInput.hidden = true;
				groupIDSubmit.textContent = "Create/Transfer";
				groupIDSubmit.hidden = true;
			}
			else {
				lineInfo.innerHTML = newSelected[0].name() + " is not part of a Glyph.";
				deleteSelectionButton.hidden = false;
				groupButton.textContent = "Create OR Add to Glyph";
				groupButton.hidden = false;
				groupIDInput.hidden = true;
				groupIDSubmit.textContent = "Create/Add";
				groupIDSubmit.hidden = true;
			}
		}
		else if (newSelected.length > 1)
		{
			lineInfo.innerHTML = "Multiple lines selected.";
			deleteSelectionButton.hidden = false;
			groupButton.textContent = "Create OR Move to Glyph";
			groupButton.hidden = false;
			groupIDInput.hidden = true;
			groupIDSubmit.textContent = "Create/Transfer";
		}
	}
});

//Selection by direct click - clicks should select/deselect shapes
stage.on('click tap', function (e) {
	// if we are selecting with rect, do nothing
	if (selectionRectangle.visible() && selectionRectangle.width() > 0 && selectionRectangle.height() > 0) {
		return;
	}

	// if click on empty area - remove all selections
	if (e.target === stage) {
		const tempNodes = tr.nodes();
		tempNodes.forEach(line => {
			line.stroke(line.getAttr("originalColor"));
		});
		tr.nodes([]);
		lineInfo.innerHTML = "No selection...";
		deleteSelectionButton.hidden = true;
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
			deleteSelectionButton.hidden = false;
			groupButton.textContent = "Create OR Move to Glyph";
			groupButton.hidden = false;
			groupIDInput.hidden = true;
			groupIDSubmit.textContent = "Create/Transfer";
			groupIDSubmit.hidden = true;
		}
		else {
			lineInfo.innerHTML = e.target.name() + " is not part of a Glyph.";
			deleteSelectionButton.hidden = false;
			groupButton.textContent = "Create OR Add to Glyph";
			groupButton.hidden = false;
			groupIDInput.hidden = true;
			groupIDSubmit.textContent = "Create/Add";
			groupIDSubmit.hidden = true;
		}
	}

	// have we pressed shift or ctrl?
	const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
	const isSelected = tr.nodes().indexOf(e.target) >= 0;

	if (!metaPressed && !isSelected) {
		// if no key pressed and the node is not selected
		// select just one
		const tempNodes = tr.nodes();
		tempNodes.forEach(line => {
			line.stroke(line.getAttr("originalColor"));
		});
		tr.nodes([e.target]);
		// console.log("Direct select: tr.nodes.length = " + tr.nodeType.length);
	} else if (metaPressed && isSelected) {
		// if we pressed keys and node was selected
		// we need to remove it from selection:
		const nodes = tr.nodes().slice(); // use slice to have new copy of array
		// remove node from array
		e.target.stroke(e.target.getAttr("originalColor"));
		nodes.splice(nodes.indexOf(e.target), 1);
		tr.nodes(nodes);
		if (tr.nodes().length == 0)
		{
			lineInfo.innerHTML = "No selection...";
			deleteSelectionButton.hidden = true;
		}
		else if (tr.nodes().length == 1)
		{
			const tempObj = tr.nodes();
			const isInGroup = tempObj[0].getParent() && tempObj[0].getParent().getClassName() === "Group";
			if (isInGroup) {
				lineInfo.innerHTML = tempObj[0].name() + " is part of Glyph: " + tempObj[0].getParent().id();
				deleteSelectionButton.hidden = false;
				groupButton.textContent = "Create OR Move to Glyph";
				groupButton.hidden = false;
				groupIDInput.hidden = true;
				groupIDSubmit.textContent = "Create/Transfer";
				groupIDSubmit.hidden = true;
			}
			else {
				lineInfo.innerHTML = tempObj[0].name() + " is not part of a Glyph.";
				deleteSelectionButton.hidden = false;
				groupButton.textContent = "Create OR Add to Glyph";
				groupButton.hidden = false;
				groupIDInput.hidden = true;
				groupIDSubmit.textContent = "Create/Add";
				groupIDSubmit.hidden = true;
			}
		}
		else if (tr.nodes().length > 1)
		{
			lineInfo.innerHTML = "Multiple lines selected.";
			deleteSelectionButton.hidden = false;
			groupButton.textContent = "Create OR Move to Glyph";
			groupButton.hidden = false;
			groupIDInput.hidden = true;
			groupIDSubmit.textContent = "Create/Transfer";
		}
	} else if (metaPressed && !isSelected) {
		// add the node into selection
		const nodes = tr.nodes().concat([e.target]);
		tr.nodes(nodes);
		lineInfo.innerHTML = "Multiple lines selected.";
		deleteSelectionButton.hidden = false;
		groupButton.textContent = "Create OR Move to Glyph";
		groupButton.hidden = false;
		groupIDInput.hidden = true;
		groupIDSubmit.textContent = "Create/Transfer";
	}
	const tempNodes = tr.nodes();
	tempNodes.forEach(line => {
		line.stroke(selectionColor);
	});
});

// ** Data table
const tableHeight = () => Math.floor(window.innerHeight * 0.25);
var table = new Tabulator("#infotable", {
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


// ** Exporting various formats
document.getElementById("export_csv_item").addEventListener('click', function (e) {
	e.preventDefault();
	exportCSV(table);
});

document.getElementById("export_worldfile_item").addEventListener('click', function (e) {
	e.preventDefault();
	writeWorldFile(backgroundImagePath);
});


// ** Save prep
document.getElementById("save_file_item").addEventListener('click', function (e) {
	e.preventDefault();
	saveCheckFileName();
	// saveLoadReportLayerChildren(layer, table);
});


// ** Load
let saveFileLoaded = false;
let imageNameInSaveFile = "";
export const getImageNameInSaveFile = () => imageNameInSaveFile;
export const setImageNameInSaveFile = (sentName) => {
    imageNameInSaveFile = sentName;
};
let loadFileNameHolder = "";

document.getElementById("save_upload_item").addEventListener('click', function (e) {
	e.preventDefault();
	document.getElementById("jsonFileInput").click();
});
const fileInput = document.getElementById('jsonFileInput');

fileInput.addEventListener('change', (event) => {
	const file = event.target.files[0];
	
	if (!file) {
		return;
	}

	const rawName = file.name;
	const strippedName = rawName.split('.')[0];
	loadFileNameHolder = strippedName;
	const nameTextInput = document.getElementById('nameTextInput');
	if (nameTextInput)
	{
		nameTextInput.value = strippedName;
	}

	const reader = new FileReader();

	// This bit comes from google AI
	// Triggered when the file finishes reading
	reader.onload = (e) => {
		try {
			const fileContent = e.target.result; // String contents of the file
			const parsedObject = JSON.parse(fileContent); // Parse JSON text
			
			loadSavedJSON(parsedObject, layer, table);

			saveFileLoaded = true;
			loadFileCheckImage();
		} 
		catch (error) {
			console.error('Invalid JSON file format:', error);
		}
	};

	// Read the uploaded file as text
	reader.readAsText(file);
});


// ** Checking app state when loading and saving images and files
const appModalDiv = document.getElementById("appModal");
const appModal = new Modal(appModalDiv);
// const appModal = bootstrap.Modal.getInstance(appModalDiv);
const appModalTitle = appModalDiv.querySelector("#appModalTitle");
const appModalBody = appModalDiv.querySelector("#appModalBody");
// const appModalFooter = appModalDiv.querySelector("#appModalFooter");

function saveCheckFileName ()
{
	const scrubbedFilenameText = nameTextInput.value.replace(/\s+/g, '');
	if (scrubbedFilenameText == "")
	{
		//Show modal warning there is no file name
		appModalTitle.textContent = "Missing File Name";
		appModalBody.textContent = "Give this tracing project a name before saving it."
		appModal.show();
	}
	else
	{
		saveLoadReportLayerChildren(layer, table);
	}
}

function loadImageCheckFile ()
{
	if (saveFileLoaded)
	{
		if (backgroundImagePath == imageNameInSaveFile)
		{
			//Scale the existing geometry to match the scaleFactor of the newly-uploaded image
			loadImageScaleLines(false);
		}
		else
		{
			//Show modal saying the loaded image file name does not match the name of the image in the loaded geojson file
			appModalTitle.textContent = "Image Mismatch";
			appModalBody.textContent = "The image associated with this tracing and the image currently loaded in this project do not match."
			appModal.show();
		}
	}
}

function loadFileCheckImage ()
{
	if (bgImageLoaded)
	{
		if (backgroundImagePath != imageNameInSaveFile)
		{
			//Show modal saying the loaded image file name does not match the name of the image in the loaded geojson file
			appModalTitle.textContent = "Image Mismatch";
			appModalBody.textContent = "The image associated with this tracing and the image currently loaded in this project do not match."
			appModal.show();
		}
	}
	else if (!bgImageLoaded)
	{
		lineInfo.innerHTML = "Name of image in loaded tracing: " + imageNameInSaveFile;
		//Show modal saying "You should load the image named in the loaded save file."
		appModalTitle.textContent = "Missing Image";
		appModalBody.textContent = "Load the image associated with this tracing.  Its name is: " + imageNameInSaveFile + ".";
		appModal.show();
	}

}

function loadImageScaleLines (shouldDivide)
{
	//Find all of the Line nodes, scale their points arrays by the newly-loaded image scaleFactor
	const allLines = stage.find(".line");
	if (allLines.length > 0)
	{
		for (let i = 0; i < allLines.length; i++) {
			let tempPoints = [];
			for (let j = 0; j < allLines[i].points().length; j++) {
				let tempCoord = 0.0;
				if (shouldDivide)
				{
					tempCoord = allLines[i].points()[j] / scaleFactor;
				}
				else
				{
					tempCoord = allLines[i].points()[j] * scaleFactor;
				}
				tempPoints.push(tempCoord);
			}
			allLines[i].points(tempPoints);
		}
	}
	layer.batchDraw();
}



