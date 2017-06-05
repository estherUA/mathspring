/**
 * Created by rezecib on 4/10/2017.
 */

//TODO(rezecib): luxury; remove style from problemFormat when it holds a default value

var TEMPLATES, FONTS, COLORS, PROBLEMFORMAT; //these get populated by editProblemFormat.jsp
var BLOCK_ID = {
    statement: "ProblemStatement",
    figure: "ProblemFigure",
    hints: "HintContainer",
    hintfigure: "HintFigure",
    answers: "Answers"
};
var LAYOUT_BLOCKS = {
    statement: ["S", "#0A0"],
    figure: ["F", "#A00"],
    hints: ["H", "#44C"],
    hintfigure: ["HF", "#A0A"],
    answers: ["A", "#0AA"],
    columns: ["| |", "#AAA"]
};
//Stores the current problem format as a javascript object
var _problemFormat;
//Stores whether the current layout has been edited
// so we can warn the author if they are about to wipe it
var _layoutEdited;
//Stores the button that is selected when a template has been edited,
// which is also the button that can be selected to open an empty template
var _editedTemplateButton;
//Stores the currently selected template button,
// this lets us re-enable it when another one is select
var _selectedTemplateButton;

function setEdited() {
    _layoutEdited = true;
    if(_selectedTemplateButton != _editedTemplateButton) {
        setTemplateButtonOnClick(_selectedTemplateButton, true);
        addClass(_editedTemplateButton, "selected");
        setTemplateButtonOnClick(_editedTemplateButton, false);
        _selectedTemplateButton = _editedTemplateButton;
    }
}

//elt: element; to which a class will be added
//className: string; the class to add
function addClass(elt, className) {
    var classes = elt.className.split(" ");
    if(classes.indexOf(className) == -1) {
        classes.push(className);
        elt.className = classes.join(" ");
    }
}

//elt: element; from which a class will be removed
//className: string; the class to remove
function removeClass(elt, className) {
    var classes = elt.className.split(" ");
    var index = classes.indexOf(className);
    if(index != -1) {
        classes.splice(index, 1); //remove className
        elt.className = classes.join(" ");
    }
}

//problemFormat: object; containing layout parameters
//blocks: array; containing the vertical sequence of blocks (including column pair objects)
//container: element; to which the blocks will be added
//colClass: string; className for the column ("columnL" or "columnR")
//width: number; the percentage width the column is allowed (0-100)
//height: number; how many blocks high this column's pair needs to be
//ids: boolean; whether to assign ids to the blocks
//placeholder_height: number; the height of a block, or false if no placeholders
//sample_text: boolean; whether to add sample text (currently unused because it looks awful)
function buildProblemColumn(problemFormat, blocks, container, colClass,
                            width, height, ids, placeholder_height, sample_text) {
    var column = document.createElement("div");
    column.className = colClass;
    column.style.width = width + "%";
    if(placeholder_height) column.style.height = height*placeholder_height + "%";
    container.appendChild(column);
    buildProblemBlocks(problemFormat, blocks, column, ids, placeholder_height, sample_text);
}

//problemFormat: object; containing layout parameters
//blocks: array; containing the vertical sequence of blocks (including column pair objects)
//container: element; to which the blocks will be added
//ids: boolean; whether to assign ids to the blocks
//placeholders: boolean; whether to add placeholder background images and heights to blocks
//sample_text: boolean; whether to add sample text (this also disables placeholder images)
function buildProblemBlocks(problemFormat, blocks, container, ids, placeholders, sample_text) {
    var placeholder_height = false;
    if(placeholders) {
        var max_vertical_blocks = blocks.length;
        for(var b = 0; b < blocks.length; b++) {
            if(typeof blocks[b] === "object") {
                max_vertical_blocks += blocks[b].height - 1;
            }
        }
        placeholder_height = 100/max_vertical_blocks;
    }
    //Go through the vertical pieces one by one
    for(var b = 0; b < blocks.length; b++) {
        var block = blocks[b];
        if(typeof block === "string") { //This is a basic block
            var id = BLOCK_ID[block.toLowerCase()];
            var block_div = null;
            if(ids) {
                block_div = document.getElementById(id);
            }
            block_div = block_div || document.createElement("div");
            block_div.className = "problem-block";
            //Set its id so we can fill its contents later
            if(ids) block_div.id = id;
            //Set extra style defined in problemFormat, if there is any
            if(problemFormat[block]) {
                for(var style_prop in problemFormat[block]) {
                    block_div.style[style_prop] = problemFormat[block][style_prop];
                }
            }
            //The block below would make it lay out as if it were full-sized,
            // but it made the text too small to really see...
            // if(sample_text) {
            // var font_size = parseInt(block_div.style.fontSize || "16px");
            // block_div.style.fontSize = (font_size/3) + "px";
            // }
            if(placeholders) {
                block_div.style.height = placeholder_height + "%";
                if(!sample_text) {
                    //These images make seeing the text very hard
                    block_div.style.backgroundImage = "url('images/QuickAuthPlaceholder-" + id + ".png')";
                    block_div.style.backgroundSize = "100% 100%";
                }
            }
            if(sample_text) {
                block_div.innerHTML = block + " ipsum<br/>dolor sit amet";
                block_div.style.overflow = "hidden";
            }
            container.appendChild(block_div);
        } else { //This is a pair of columns
            buildProblemColumn(problemFormat, block.right, container, "columnR",
                100-block.width, block.height, ids, placeholder_height, sample_text);
            buildProblemColumn(problemFormat, block.left, container, "columnL",
                block.width, block.height, ids, placeholder_height, sample_text);
            //Add a clear element at the bottom to force everything afterwards to be below the columns
            var clear = document.createElement("div");
            clear.className = "clear";
            container.appendChild(clear);
        }
    }
}

//container: element; to which the blocks will be added
//json: string; contains the problemFormat specification
//ids: boolean; whether to assign ids to the blocks
//placeholders: boolean; whether to add placeholder background images and heights to blocks
//sample_text: boolean; whether to add sample text
function buildProblem(container, json, ids, placeholders, sample_text) {
    var problemFormat = jsonToProblemFormat(json);

    //Pass it to a helper function that can go through a list and add one by one
    // this lets us reuse the code for doing each column as well (with a recursive call)
    buildProblemBlocks(problemFormat, problemFormat.order, container, ids, placeholders, sample_text);
}

//This is for converting style objects to style strings and vice-versa
var _fake_div = document.createElement("div");

//problemFormat: object; containing the hierarchical properties
//return: string; json containing the flattened properties
function problemFormatToJson(problemFormat) {
    var storage_format = {}; //store the conversion results in a separate object
    //Convert style objects to strings for storage
    for(var key in problemFormat) {
        if(key != "order") { //order requires special handling below
            var style = problemFormat[key];
            _fake_div.setAttribute("style", ""); //clear the div's style
            for(var style_prop in style) {
                _fake_div.style[style_prop] = style[style_prop];
            }
            style = _fake_div.getAttribute("style");
            if(style != "") { //don't waste space on empty styles
                storage_format[key] = style;
            }
        }
    }

    storage_format.order = problemFormatOrderToJsonOrder(problemFormat.order);
    var json = JSON.stringify(storage_format);
    return json;
}

//Recursive helper that allows nested columns to be parsed
//order: array; contains a list of blocks names and column objects
function problemFormatOrderToJsonOrder(order) {
    var order_strings = [];
    for(var b = 0; b < order.length; b++) {
        if(typeof order[b] === "string") {
            //this is a basic block, just put it in the list
            order_strings.push(order[b]);
        } else {
            //this is a column object, process it into [width leftcol, rightcol] form
            var cols = order[b];
            var lcol = cols.width + "%" + (cols.left.length > 0 ? " " : "");
            lcol += problemFormatOrderToJsonOrder(cols.left);
            var rcol = problemFormatOrderToJsonOrder(cols.right);
            order_strings.push("[" + lcol + ", " + rcol + "]");
        }
    }
    return order_strings.join(" ");
}

//json: string; containing the problemFormat json
//      object; in some cases JSON.parse has already been run on it
//return: object; with the properties from the json
function jsonToProblemFormat(json) {
    //Convert most of it it JSON
    var problemFormat = json;
    if(typeof json === "string") problemFormat = JSON.parse(json);

    //Convert style strings to objects so each style attribute can be manipulated separately
    for(var key in problemFormat) {
        if(key != "order") { //order requires special handling below
            _fake_div.setAttribute("style", problemFormat[key]);
            var style = {};
            for (var i = 0; i < _fake_div.style.length; i++) {
                var name = _fake_div.style[i];
                style[name] = _fake_div.style.getPropertyValue(name);
            }
            problemFormat[key] = style;
        }
    }

    //Now convert the "order" field to an inner Javascript object
    problemFormat.order = jsonOrderToProblemFormatOrder(problemFormat.order, 0)[0];

    return problemFormat;
}

//Recursive helper function for parsing the order string into an object
//order: string; the order parameter in the stored json representation of problemFormat
//i: integer; position in the order string that we are currently parsing
//return: [blocks, i, column]; an array with the following:
//	blocks: array; list of blocks and column objects
//	i: integer; current position in the order string
//	column: string; whether we finished a left or a right column
function jsonOrderToProblemFormatOrder(order, i) {
    var blocks = [];
    var block_start = i;
    while(i < order.length) {
        if(order[i].match(/\s/)) { //whitespace, so we've completed a block
            addBlockString(order, blocks, block_start, i);
            block_start = i+1;
        } else if(order[i] == "[") { //the start of a column object
            var result = jsonOrderColumnToProblemFormatOrderColumn(order, i+1);
            blocks.push(result[0]);
            i = result[1];
            block_start = i+1;
        } else if(order[i] == ",") { //we were in a left column that ended, return
            addBlockString(order, blocks, block_start, i);
            return [blocks, i, "left"];
        } else if(order[i] == "]") { //we were in a right column that ended, return
            addBlockString(order, blocks, block_start, i);
            return [blocks, i, "right"];
        }
        ++i;
    }
    addBlockString(order, blocks, block_start, i);
    return [blocks, i, ""];
}

//This is only used by above, but to prevent copy-pasting code
function addBlockString(order, blocks, start, end) {
    if(start < end) { //don't add zero-length blocks, which could occur e.g. with multiple spaces
        blocks.push(order.slice(start, end));
    }
}

//Another part of the recursive helper above that builds the column objects
//order: string; the order parameter in the stored json representation of problemFormat
//i: integer; the position in the order string that we are currently parsing
//return: [object, integer]; an array with the column object and the current position
function jsonOrderColumnToProblemFormatOrderColumn(order, i) {
    var columns = {};
    var width_start = i;
    while(i < order.length) {
        if(order[i] == "]") { //the columns have ended here
            return [columns, i];
        } else if(order[i] == "%") { //we reached the end of the width
            columns.width = parseInt(order.slice(width_start, i));
            width_start = null; //set it to null so we know we've already gotten it
        } else if(width_start == null) {
            var result = jsonOrderToProblemFormatOrder(order, i);
            columns[result[2]] = result[0];
            i = result[1];
            if(result[2] == "right") {
                //we've done both columns, return to normal block assembly
                columns.height = Math.max(columns.left.length, columns.right.length);
                return [columns, i];
            }
        }
        ++i;
    }
    console.log("problemFormat order error: columns started but didn't finish");
}

//Intended use: removeFromProblemFormatOrder(_problemFormat.order, block)
//blocks: array; contains blocks and column objects
//block: string; name of the block we're removing
//return: boolean; whether a block was removed by this particular call
function removeFromProblemFormatOrder(blocks, block) {
    for(var b = 0; b < blocks.length; b++) {
        if(blocks[b] == block) { //we found our block, cut it out
            blocks.splice(b, 1);
            return true;
        } else if(typeof blocks[b] === "object") {
            //we found some columns, explore both sides
            var removed = false;
            removed = removed || removeFromProblemFormatOrder(blocks[b].left, block);
            removed = removed || removeFromProblemFormatOrder(blocks[b].right, block);
            if(removed && blocks[b].left.length == 0 && blocks[b].right.length == 0) {
                //we removed a block from these columns, and left them both empty
                //so we should also remove these columns
                blocks.splice(b, 1);
                return true;
            }
        }
    }
    return false;
}

//Intended use: insertIntoProblemFormatOrder(_problemFormat.order, block, before_element)
//blocks: array; contains blocks and column objects
//block: string; name of the block we're removing
//path: array; the path of indices to follow in blocks
function insertIntoProblemFormatOrder(blocks, block, path) {
    //Follow the path down to the next-to-last block
    for(var p = 0; p < path.length-1; p++) {
        blocks = blocks[path[p]];
    }
    //Insert the new block into the parent, before the target block
    blocks.splice(path[path.length-1], 0, block);
}

//Finds the path of indices through _problemFormat.order that leads to the object corresponding to
// the layout element target. Intended usage:
//    var path = [];
//    findLayoutTargetPath(path, document.getElementById("LayoutEditor"), target);
//path: array; should be empty at the start, will be filled with the path to target
//current: element; the node we are searching in
//target: element; the layout element we want to find the path to
function findLayoutTargetPath(path, current, target) {
    var p = 0; //this stores the index in the actual _problemFormat.order
    for(var i = 0; i < current.children.length; i++) {
        var child = current.children[i];
        if(child.className.includes("layout-columns")) {
            //this is columns, check both
            if(findLayoutTargetPath(path, child.children[0], target)) {
                path.unshift("left");
                path.unshift(p);
                return true;
            }
            if(findLayoutTargetPath(path, child.children[1], target)) {
                path.unshift("right");
                path.unshift(p);
                return true;
            }
            p++;
        } else {
            //this is a layout-block
            if(child == target) { //we found what we were looking for, return!
                path.unshift(p);
                return true;
            }
            if(!child.className.includes("layout-block-space")) {
                p++; //only increment for actual blocks
            }
        }
    }
}

//json: string; containing the problemFormat json; by default, problemFormatToJson(_problemFormat)
function updateProblemPreview(json) {
    if(!json) json = problemFormatToJson(_problemFormat);
    //Set the copyable problemFormat text from our current problemFormat model
    var outputField = document.getElementById("ProblemFormatOutput");
    outputField.value = json;
    //Update the problem preview to reflect the current model
    var layout_container = document.getElementById("ProblemContainerLayout");
    layout_container.innerHTML = "";
    buildProblem(layout_container, json, false, true, false);
    var text_container = document.getElementById("ProblemContainerText");
    text_container.innerHTML = "";
    buildProblem(text_container, json, false, true, true);
}

var _styleEditorBlock;
var _styleEditorFormatObject;
var _styleEditorFormatColumns;
var _styleEditorFormatColumn;
//block: element; the layout-block that was clicked on
function setBlockForStyleEditing(block) {
    if(_styleEditorBlock) { //clear the previous selection
        removeClass(_styleEditorBlock, "selected");
        _styleEditorFormatObject = null;
        _styleEditorFormatColumns = null;
        _styleEditorFormatColumn = null;
    }
    _styleEditorBlock = block;
    if(block) {
        var path = [];
        findLayoutTargetPath(path, document.getElementById("LayoutEditor"), block);
        _styleEditorFormatObject = _problemFormat.order
        for(var p = 0; p < path.length; p++) {
            _styleEditorFormatObject = _styleEditorFormatObject[path[p]];
            if(typeof _styleEditorFormatObject == "object" && _styleEditorFormatObject.width) {
                _styleEditorFormatColumns = _styleEditorFormatObject;
                _styleEditorFormatColumn = path[p+1]; //should be "left" or "right"
            }
        }
        if(!_problemFormat[_styleEditorFormatObject]) { //if we haven't yet defined style for this
            _problemFormat[_styleEditorFormatObject] = {};
        }
        _styleEditorFormatObject = _problemFormat[_styleEditorFormatObject];
        addClass(block, "selected");
    }
    rebuildStyleEditor();
}

function onBlockStyleChanged(style, value) {
    setEdited();
    if(_styleEditorFormatColumn && style == "column_width") {
        //This requires special handling, because we actually want to change
        // the width of the containing column, and adjust the adjacent column to match
        value = parseInt(value); //convert from "67%" to 67
        if(_styleEditorFormatColumn == "right") {
            value = 100 - value; //convert to left-column width
        }
        _styleEditorFormatColumns.width = value;
    } else {
        _styleEditorFormatObject[style] = value;
    }
    updateProblemPreview();
}

//message: string; the message to put on the label
function buildLabel(message) {
    var label = document.createElement("div");
    label.className = "label";
    label.innerHTML = message;
    return label;
}

function rebuildStyleEditor() {
    var editor = document.getElementById("BlockEditor");
    editor.innerHTML = "";
    if(!_styleEditorBlock) return;
    editor.appendChild(buildLabel("Font:"));
    var current_font = _styleEditorFormatObject.fontFamily || FONTS[0];
    var font_selector = buildSelector(FONTS, current_font,
        function(value) { onBlockStyleChanged("fontFamily", value); });
    font_selector.style.fontSize = "10px";
    editor.appendChild(font_selector);
    editor.appendChild(buildLabel("Font Size (px):"));
    var current_font_size = parseInt(_styleEditorFormatObject.fontSize) || 16;
    editor.appendChild(buildSliderField(8, 48, 1, current_font_size,
        function(value) { onBlockStyleChanged("fontSize", value + "px"); }));
    editor.appendChild(buildLabel("Font Color:"));
    var current_font_color = _styleEditorFormatObject.color || COLORS[0];
    editor.appendChild(buildSelector(COLORS, current_font_color,
        function(value) { onBlockStyleChanged("color", value); }));
    editor.appendChild(buildFontWeightStyleToggles());
    var current_block_spacing = parseInt(_styleEditorFormatObject.borderWidth) || 5;
    editor.appendChild(buildLabel("Block spacing (px):"));
    editor.appendChild(buildSliderField(0, 50, 1, current_block_spacing,
        function(value) { onBlockStyleChanged("borderWidth", value + "px"); }));
    if(_styleEditorFormatColumns) {
        var column_width = _styleEditorFormatColumns.width;
        if(_styleEditorFormatColumn == "right") column_width = 100 - column_width;
        editor.appendChild(buildLabel("Column width (%):"));
        editor.appendChild(buildSliderField(0, 100, 1, current_width,
            function(value) { onBlockStyleChanged("column_width", value + "%"); }));
    }
    if(_styleEditorBlock.dataset.blockname.match(/figure/i)) {
        var current_width = _styleEditorFormatObject.width || 100;
        editor.appendChild(buildLabel("Figure width (%):"));
        editor.appendChild(buildSliderField(0, 100, 1, current_width,
            function(value) { onBlockStyleChanged("width", value + "%"); }));
    }
}

//options: array; holds each option for the selector (e.g. each font option)
//current_value: string; holds the current value for the selector (it should match an option!)
//callback: function; called with the new selection
function buildSelector(options, current_value, callback) {
    var selector = document.createElement("select");
    for(var i = 0; i < options.length; i++) {
        var opt = document.createElement("option");
        opt.innerHTML = options[i];
        opt.value = options[i];
        selector.appendChild(opt);
        if(opt == current_value) selector.selectedIndex = i;
    }
    selector.addEventListener("change", function() {
        callback(selector.options[selector.selectedIndex].value);
    });
    return selector;
}


//min: number; the minimum value for the slider
//max: number; the maximum value for the slider
//step: number; the minimum step size between values
//current_value: number; the current value for the slider
//callback: function; called with the new value
function buildSliderField(min, max, step, current_value, callback) {
    var slider_container = document.createElement("div");
    slider_container.className = "row-container";
    var slider = document.createElement("input");
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.type = "range";
    slider.value = current_value;
    slider_container.appendChild(slider);
    var field = document.createElement("input");
    field.type = "text";
    field.style.width = "30px";
    field.style.flex = "0 0 auto";
    field.value = current_value;
    slider_container.appendChild(field);
    slider.addEventListener("input", function() {
        field.value = slider.value;
        callback(slider.value);
    });
    field.addEventListener("input", function() {
        //unlike the slider, we need to sanitize the input
        var value = parseInt(field.value);
        if(isNaN(value)) { // it wasn't a number, reset it to the last known number
            field.value = slider.value;
            return;
        }
        value = Math.max(Math.min(value, max), min); //constrain it to the range
        field.value = value;
        slider.value = value;
        callback(value);
    });
    return slider_container;
}

function buildFontWeightStyleToggles() {
    var box_container = document.createElement("div");
    box_container.className = "row-container";
    buildCheckbox(box_container, "Bold:", "fontWeight", "bold", "normal");
    buildCheckbox(box_container, "Italic:", "fontStyle", "italic", "normal");
    return box_container;
}

//container: element; the label and checkbox container are added to this
//label_text: string; the text for the label
//style_key: string; the style property this checkbox sets
//style_value: string; the style value this checkbox sets when checked
//style_default: string; the style value this checkbox sets when not checked
function buildCheckbox(container, label_text, style_key, style_value, style_default) {
    var label = buildLabel(label_text);
    label.style.flex = "0 0 auto";
    container.appendChild(label);
    var box_container = document.createElement("div");
    var box = document.createElement("input");
    box.type = "checkbox";
    box.style.marginTop = "20px";
    box.style.width = "16px";
    box.style.height = "16px";
    box_container.appendChild(box);
    box.onclick = function() {
        onBlockStyleChanged(style_key, box.checked ? style_value : style_default);
    };
    container.appendChild(box_container);
}

//Sets the active problem format in all parts of the editor to the provided string
//json: string; the problemFormat to use
function setProblemFormatJson(json) {
    _problemFormat = jsonToProblemFormat(json);
    updateProblemPreview(json);
    rebuildLayoutEditor();
    setBlockForStyleEditing(null);
}

var _dragged;
function handleDragStart(e) {
    _dragged = e.target;
}

function handleDragOver(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    addClass(e.srcElement, "dragover");
}

function handleDragOut(e) {
    removeClass(e.srcElement, "dragover");
}

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    removeClass(e.srcElement, "dragover");
    var dragparent = _dragged.parentNode;
    var changed = false;
    if(e.target.parentNode.id == "BlockSelector") {
        //The block was dragged into the top selection area, we should delete it
        if(dragparent.id != "BlockSelector") { //but not if they were dragging a selection block...
            changed = true;
            removeFromProblemFormatOrder(_problemFormat.order, _dragged.dataset.blockname);
            //Free up the selection block corresponding to this one
            var selection_block = document.getElementById("SelectionBlock-" + _dragged.dataset.blockname);
            removeClass(selection_block, "disabled");
            selection_block.draggable = true;
            //And delete the dragged block
            dragparent.removeChild(_dragged);
        }
    } else if(_dragged != e.target && _dragged.nextElementSibling != e.target) {
        //the above condition should filter out "moves" that don't actually rearrange anything
        var should_remove = true;
        var block_to_insert = _dragged.dataset.blockname;
        if(_dragged.dataset.blockname == "columns") {
            e.target.parentNode.insertBefore(buildLayoutBlockSpace(), e.target);
            block_to_insert = {width:50,left:[],right:[]}
            _dragged = buildLayoutColumns(block_to_insert);
            should_remove = false;
        } else if(dragparent.id == "BlockSelector") {
            addClass(_dragged, "disabled");
            _dragged.draggable = false;
            _dragged = buildLayoutBlock(_dragged.dataset.blockname);
            should_remove = false;
        }
        if(should_remove) {
            removeFromProblemFormatOrder(_problemFormat.order, block_to_insert);
            dragparent.removeChild(_dragged);
        }
        var path = [];
        findLayoutTargetPath(path, document.getElementById("LayoutEditor"), e.target);
        insertIntoProblemFormatOrder(_problemFormat.order, block_to_insert, path);
        e.target.parentNode.insertBefore(_dragged, e.target);
        changed = true;
    }
    while(dragparent.className == "layout-column"
    && dragparent.parentNode.children[0].children.length == 1
    && dragparent.parentNode.children[1].children.length == 1) {
        //while this is true, we've just emptied out a pair of columns; delete them
        var columns = dragparent.parentNode;
        dragparent = columns.parentNode; //set it to the element containing the columns
        //columns also have a spacer before them; remove that first
        dragparent.removeChild(columns.previousElementSibling);
        dragparent.removeChild(columns);
    }
    if(changed) {
        setEdited();
        updateProblemPreview();
    }
    _dragged = null;
}

function addLayoutDragEvents(block) {
    block.addEventListener("dragstart", handleDragStart, false);
    block.addEventListener("dragover", handleDragOver, false);
    block.addEventListener("dragleave", handleDragOut, false);
    block.addEventListener("drop", handleDrop, false);
}

function buildLayoutColumn(blocks) {
    var layout_column = document.createElement("div");
    layout_column.className = "layout-column";
    layout_column.draggable = false;
    buildLayoutBlocks(layout_column, blocks);
    return layout_column;
}

function buildLayoutColumns(block) {
    var layout_columns = document.createElement("div");
    layout_columns.className = "layout-columns";
    layout_columns.draggable = false;
    layout_columns.appendChild(buildLayoutColumn(block.left));
    layout_columns.appendChild(buildLayoutColumn(block.right));
    return layout_columns;
}

function buildLayoutBlockSpace() {
    var layout_block_space = document.createElement("div");
    layout_block_space.className = "layout-block layout-block-space";
    addLayoutDragEvents(layout_block_space);
    layout_block_space.draggable = false;
    return layout_block_space;
}

function buildLayoutBlock(blockname) {
    var layout_block = document.createElement("div");
    layout_block.className = "layout-block selectable";
    var layout_block_contents = LAYOUT_BLOCKS[blockname];
    layout_block.innerHTML = layout_block_contents[0];
    layout_block.style.backgroundColor = layout_block_contents[1];
    layout_block.draggable = true;
    layout_block.dataset.blockname = blockname;
    addLayoutDragEvents(layout_block);
    layout_block.onclick = function() { setBlockForStyleEditing(layout_block); }
    return layout_block;
}

function buildLayoutBlocks(container, blocks) {
    for(var b = 0; b < blocks.length; b++) {
        var block = blocks[b];
        if(typeof block === "string") { //This is a normal block
            var layout_block = buildLayoutBlock(block);
            var selection_block = document.getElementById("SelectionBlock-" + layout_block.dataset.blockname);
            addClass(selection_block, "disabled");
            selection_block.draggable = false;
            container.appendChild(layout_block);
        } else { //This is a set of columns
            //Add an empty space for placing blocks above these columns
            container.appendChild(buildLayoutBlockSpace());
            //Build a container for the columns
            var layout_columns = buildLayoutColumns(block);
            container.appendChild(layout_columns);
        }
    }
    //So you can add blocks at the bottom of this column
    container.appendChild(buildLayoutBlockSpace());
}

function rebuildLayoutEditor() {
    var editor = document.getElementById("LayoutEditor");
    editor.innerHTML = ""; //clear the existing layout
    editor.draggable = false;
    for(var block in LAYOUT_BLOCKS) {
        var selection_block = document.getElementById("SelectionBlock-" + block);
        removeClass(selection_block, "disabled");
        selection_block.draggable = true;
    }
    buildLayoutBlocks(editor, _problemFormat.order);
}

function buildTemplateEditor() {
    stringifyObjectArray(TEMPLATES);
    var template_selector = document.getElementById("TemplateSelector");
    //Add a miniature button-version of each template to the template selector
    var zoom = 375/(600 * (TEMPLATES.length + 1)); //scales template buttons to fit in the space
    for(var i = 0; i < TEMPLATES.length; i++) {
        var template_button = buildTemplateButton(TEMPLATES[i]);
        template_button.style.zoom = zoom;
        template_selector.appendChild(template_button);
    }
    var block_selector = document.getElementById("BlockSelector");
    for(var block in LAYOUT_BLOCKS) {
        var selection_block = buildLayoutBlock(block);
        selection_block.id = "SelectionBlock-" + block;
        selection_block.dataset.blockname = block;
        block_selector.appendChild(selection_block);
    }
    template_selector.appendChild(buildEditedTemplateButton(zoom));
    if(PROBLEM_FORMAT != null) setProblemFormatJson(JSON.stringify(PROBLEM_FORMAT));
}

function buildEditedTemplateButton(zoom) {
    _editedTemplateButton = buildTemplateButton('{"order":""}');
    _editedTemplateButton.style.backgroundColor = "#8ED8E0";
    _editedTemplateButton.style.zoom = zoom;
    _editedTemplateButton.style.lineHeight = "600px";
    _editedTemplateButton.style.fontSize = "600px";
    _editedTemplateButton.style.fontWeight = "bolder";
    _editedTemplateButton.style.textAlign = "center"
    _editedTemplateButton.innerHTML = "+";
    setTemplateButtonOnClick(_editedTemplateButton, true);
    _editedTemplateButton.onclick();
    return _editedTemplateButton;
}

//template_json: string; json for the base template (to be stored in the button's data)
function buildTemplateButton(template_json) {
    var btn = document.createElement("div");
    btn.className = "template-button selectable";
    btn.dataset.templateJson = template_json;
    buildProblem(btn, template_json, false, true, false);
    setTemplateButtonOnClick(btn, true);
    return btn;
}

//btn: element; button to be configured
//enabled: boolean; whether to enable or disable
function setTemplateButtonOnClick(btn, enabled) {
    if(enabled) {
        btn.onclick = function() {
            if(_layoutEdited && !confirm("You're about to clear any layout changes you've made. Are you sure you want to do this?")) {
                return;
            }
            _layoutEdited = false;
            setProblemFormatJson(btn.dataset.templateJson);
            setTemplateButtonOnClick(btn, false);
            if(_selectedTemplateButton) {
                setTemplateButtonOnClick(_selectedTemplateButton, true);
            }
            _selectedTemplateButton = btn;
        };
        removeClass(btn, "disabled");
    } else {
        addClass(btn, "disabled");
        btn.onclick = null;
    }
}

function stringifyObjectArray(arr) {
    for(var i = 0; i < arr.length; i++) {
        arr[i] = JSON.stringify(arr[i]);
    }
}