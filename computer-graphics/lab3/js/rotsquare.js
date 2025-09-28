"use strict";

var canvas;
var gl;

var theta = 0.0;
var thetaLoc;
var translationLoc;
var scaleLoc;
var autoRotation =1;
var translation = [0,0];
var scale =0.5;
var isAutoUpdatingSlider = false;
var anmiationId =null;
function initRotSquare(){
	canvas = document.getElementById( "rot-canvas" );
	gl = canvas.getContext("webgl2");
	if( !gl ){
		alert( "WebGL isn't available" );
	}

	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

	var program = initShaders( gl, "rot-v-shader", "rot-f-shader" );
	gl.useProgram( program );

	var vertices = new Float32Array([
		 0,  1,  0,
		-1,  0,  0,
		 // 1,  0,  0,
		 0, -1,  0
	]);

	var bufferId = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
	gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW );

	var vPosition = gl.getAttribLocation( program, "vPosition" );
	gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vPosition );

	thetaLoc = gl.getUniformLocation( program, "theta" );
	translationLoc = gl.getUniformLocation( program, "translation");
	scaleLoc = gl.getUniformLocation( program, "scale");

	setupEvents();

	renderSquare();
}

function setupEvents(){
	var rotSlider = document.getElementById("rot-slider");
	rotSlider.addEventListener("input",function (){
		if(autoRotation === -1){
			 autoRotation =1;
			 updateAutoButtonText();
		}
		renderSquare()
	});

	var rotx = document.getElementById("rot-x");
	var roty = document.getElementById("rot-y");

	rotx.addEventListener("input",function (){
		translation[0] = parseFloat(rotx.value) || 0;
		renderSquare();
	})
	roty.addEventListener("input",function (){
		translation[1] = parseFloat(roty.value) || 0;
		renderSquare();
	})

	var rotsize = document.getElementById("rot-size");
	rotsize.addEventListener("input",function (){
		scale =0.1 + (rotsize.value/10)*0.9;
		renderSquare();

	})

	var autoButton = document.getElementById("rot-auto");
	autoButton.addEventListener("click",toggleAuRotation);

	updateAutoButtonText();
}

function toggleAuRotation(){
	autoRotation *= -1;
	updateAutoButtonText();

	if(autoRotation === -1){
		if(!anmiationId){
			anmiationId = requestAnimationFrame(renderSquare);
		}
	}else {
		if(anmiationId){
			cancelAnimationFrame(anmiationId);
			anmiationId = null;
		}
	}
	renderSquare();
}

function updateAutoButtonText(){
	var autoButton = document.getElementById("rot-auto");
	autoButton.innerHTML = (autoRotation === -1) ? "停止旋转" : "自动旋转";
}
function renderSquare(){

	gl.clear( gl.COLOR_BUFFER_BIT );
	
	// set uniform values
	if(autoRotation ===-1){
		theta += 0.05;
		if( theta > 2 * Math.PI )
		theta -= (2 * Math.PI);

		document.getElementById("rot-slider").value = (theta * 180 / Math.PI) % 360;
	}else {
		var rotSlider = document.getElementById("rot-slider");
	    theta = parseFloat(rotSlider.value) * Math.PI / 180;
	}

	
	gl.uniform1f( thetaLoc, theta );
	gl.uniform2fv( translationLoc, translation );
	gl.uniform1f( scaleLoc, scale );

	gl.drawArrays( gl.TRIANGLE_STRIP, 0, 3 );

	if(autoRotation ===-1){
		anmiationId = requestAnimationFrame(renderSquare);
	}

	// update and render
	// window.requestAnimFrame( renderSquare );
}