
var gl;
var shaderProgram;
// model-view Matrix
var mvMatrix;
// projection Matrix
var pMatrix;

// Triangle vertex pos buffer
var triangleVertexPositionBuffer;
// Sqauare vertex pos buffer
var squareVertexPositionBuffer;

// Triangle vertex color buffer
var triangleVertexColorBuffer;
// Square vertex color buffer
var squareVertexColorBuffer;

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch(e) {
    }
      if(!gl) {
        alert("Could not initialize webgl");
    }
}


function renderScene() {

  var canvas = $('#canvas')[0];
  initGL(canvas);
  initShaders();
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  drawScene();
}

function getShader(gl, id) {
  var shaderSrc;
  $.ajax({
    url: $(id).attr('src'),
    success: function(result) { shaderSrc = result; },
    async: false
  });

  var shader;

  switch($(id).attr('type')) {
    case "x-shader/x-fragment":
      shader = gl.createShader(gl.FRAGMENT_SHADER);
      break;
    case "x-shader/x-vertex":
      shader = gl.createShader(gl.VERTEX_SHADER);
      break;
  }

  gl.shaderSource(shader, shaderSrc);
  gl.compileShader(shader);

  if(! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  var vertexShader = getShader(gl, "#vertexshader");
  var fragmentShader = getShader(gl, "#fragmentshader");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialize shaders");
  }

  gl.useProgram(shaderProgram);



  /* vertex shader */ 
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);


  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

  mvMatrix = mat4.create();
  pMatrix = mat4.create();

}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function initBuffers() {
  triangleVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
  var vertices = [
     0.0,  1.0, 0.0,
    -1.0, -1.0, 0.0,
     1.0, -1.0, 0.0
  ];


  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  triangleVertexPositionBuffer.itemSize = 3;
  triangleVertexPositionBuffer.numItems = 3;
  
  var colors = [
    //r,   g,   b,   a
    1.0, 0.0, 0.0, 1.0, // Red
    0.0, 1.0, 0.0, 1.0, // Green
    0.0, 0.0, 1.0, 1.0  // Blue
  ];

  triangleVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  triangleVertexColorBuffer.itemSize = 4;
  triangleVertexColorBuffer.numItems = 3;


  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  vertices = [
     1.0,  1.0, 0.0,
    -1.0,  1.0, 0.0,
     1.0, -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = 4;

  colors = [];
  for(var i=0; i< 4; i++) {
    colors = colors.concat([0.5, 0.5, 1.0, 1.0]);
  }

  squareVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  squareVertexColorBuffer.itemSize = 4;
  squareVertexColorBuffer.numItems = 4;

}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  /* Pass our objects to the vertex shader */

  /* Set the origin */
  mat4.identity(mvMatrix);
  /* Move x-1.5 and z - 7.0 */
  mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);

  /* VS's aVertexPosition -> triangleVertexPositionBuffer */
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  /* VS's aVertexColor -> triangleVertexColor */
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  /* Set our model-view matrix and the projection-matrix */
  setMatrixUniforms();

  /* Draw */
  gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);

  /* Reset the model-view matrix */
  mat4.identity(mvMatrix);
  /* x+1.5, z-7 */
  mat4.translate(mvMatrix, [1.5, 0.0, -7.0]);

  /* VS's aVertexPosition -> squareVertexPositionBuffer */
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  /* VS's aVertexColor -> squareVertexColorBuffer */
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  /* Rotate and project */
  setMatrixUniforms();

  /* Draw */
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);

}



