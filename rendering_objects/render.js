var gl;
var shaderProgram;
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

var triangle;
var square;


function Shape(vertices, colors) {
  this.points = vertices.length / 3;
  this.vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  this.vertex_size = 3;

  this.colors = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.colors);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  this.color_size = 4;

  this.position = mat4.create();
  mat4.identity(this.position);
};

Shape.prototype.addIndexBuffer = function(indexes) {
  this.indexes = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexes);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), gl.STATIC_DRAW);
  this.index_size = 1;
  this.index_count = indexes.length;
};

Shape.prototype.draw = function(shaders) {
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  gl.vertexAttribPointer(shaders.vPos, this.vertex_size, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.colors);
  gl.vertexAttribPointer(shaders.vColor, this.color_size, gl.FLOAT, false, 0, 0);

  var tmp = mvMatrix;
  mvMatrix = this.position;
  setMatrixUniforms();
  mvMatrix = tmp;
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.points);
};

Shape.prototype.draw_wire = function(shaders) {
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  gl.vertexAttribPointer(shaders.vPos, this.vertex_size, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.colors);
  gl.vertexAttribPointer(shaders.vColor, this.color_size, gl.FLOAT, false, 0, 0);


  var tmp = mvMatrix;
  mvMatrix = this.position;
  setMatrixUniforms();
  mvMatrix = tmp;
  gl.drawArrays(gl.LINE_LOOP, 0, this.points);
};

Shape.prototype.draw_elements = function(shaders) {
  if(this.indexes == null) {
    throw "Must specify indexes";
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  gl.vertexAttribPointer(shaders.vPos, this.vertex_size, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.colors);
  gl.vertexAttribPointer(shaders.vColor, this.color_size, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexes);


  var tmp = mvMatrix;
  mvMatrix = this.position;
  setMatrixUniforms();
  mvMatrix = tmp;
  gl.drawElements(gl.TRIANGLES, this.index_count, gl.UNSIGNED_SHORT, 0);
};


Shape.prototype.translate = function(vec) {
  mat4.translate(this.position, vec);
};

Shape.prototype.rotate = function(theta, vec) {
  mat4.rotate(this.position, theta, vec);
};

Shape.prototype.reset = function() {
  mat4.identity(this.position);
};


function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch(e) {
  }

  if(!gl) {
    alert("Could not initialize WebGL.");
  }
}

function getShader(gl, id) {
  var shaderSource;
  $.ajax({
    url: $(id).attr('src'),
    success: function(response) { shaderSource = response },
    async: false
  });

  var shader;

  // Compile the correct shader type
  switch($(id).attr('type')) {
    case "x-shader/x-vertex":
      shader = gl.createShader(gl.VERTEX_SHADER);
      break;
    case "x-shader/x-fragment":
      shader = gl.createShader(gl.FRAGMENT_SHADER);
      break;
    default:
      throw "Invalid shader format";
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    throw "Shader compile errors";
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
    throw "Could not initialize shaders";
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vPos = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vPos);

  shaderProgram.vColor = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vColor);

  shaderProgram.pMat = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMat = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if(mvMatrixStack.length == 0) {
    throw "invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMat, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMat, false, mvMatrix);
}

function degToRad(degrees ) {
  return Math.PI * degrees / 180;
}

function pyramidColor(x, y, z) {
  var blue = (x+z+2) / 4.0;
  var red = 1 - blue;
  var green = 0.0;
  var alpha = 1.0;
  var retval = [red, green, blue, alpha];
  return retval;
}


function initBuffers() {

  // Pyramid vertices
  var vertices = [
    // bottom face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0, // ends in front right
     // front face
     0.0,  1.0, 0.0, // top
    -1.0, -1.0, 1.0,
     // left face
     0.0,  1.0,  0.0, // top
    -1.0, -1.0, -1.0,
     // rear face
     0.0,  1.0,  0.0, // top
     1.0, -1.0, -1.0, // rear right
     // right face
     0.0,  1.0, 0.0, // top
     1.0, -1.0, 1.0
  ]
  var colors = [];
  for(var i=0; i < (vertices.length / 3); i++) {
      colors = colors.concat(pyramidColor(vertices[i*3], vertices[i*3+1], vertices[i*3+2]));
  }
  
  triangle = new Shape(vertices, colors);
  triangle.translate([-1.3, 0.0, -7.0]);

  // Cube
  vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ]

  colors = [
    [1.0, 0.0, 0.0, 1.0], // Front face
    [1.0, 1.0, 0.0, 1.0], // Back face
    [0.0, 1.0, 0.0, 1.0], // Top face
    [1.0, 0.5, 0.5, 1.0], // Bottom face
    [1.0, 0.0, 1.0, 1.0], // Right face
    [0.0, 0.0, 1.0, 1.0]  // Left face
  ];

  var unpackedColors = [];
  for(var i in colors) {
    var color = colors[i];
    for(var j=0; j < 4; j++) {
      unpackedColors = unpackedColors.concat(color); 
    }
  }

  var cubeVertexIndices = [
    0, 1, 2,
    0, 2, 3, // Front Face
    4, 5, 6,
    4, 6, 7, // Back Face
    8, 9, 10,
    8, 10, 11, // Top Face
    12, 13, 14,
    12, 14, 15, // Bottom Face
    16, 17, 18, 
    16, 18, 19, // Right Face
    20, 21, 22,
    20, 22, 23 // Left Face
  ];
  square = new Shape(vertices, unpackedColors);
  square.addIndexBuffer(cubeVertexIndices);
  square.translate([1.7, 0.0, -7.0]);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  triangle.rotate(degToRad(0.45), [1, 0, 0]);
  triangle.draw(shaderProgram);

  square.rotate(degToRad(0.25), [1, 0, 0]);
  square.rotate(degToRad(0.25), [0, 1, 0]);
  square.draw_elements(shaderProgram);
}

function tick() {
  requestAnimFrame(tick);
  drawScene();
}

function renderScene() {
  var canvas = $('#canvas')[0];
  initGL(canvas);
  initShaders();
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  tick();
}

