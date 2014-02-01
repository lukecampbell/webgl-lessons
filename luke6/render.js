var gl;
var shaderProgram;
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();
var crateTextures = Array();
var square;
var xRot = 0;
var xSpeed = 0;

var yRot = 0;
var ySpeed = 0;

var z = -5.0;

var filter = 0;

var currentlyPressedKeys = {};
var lastTime = 0;



function Shape(vertices, textureCoords, indexes) {
  this.points = vertices.length / 3;
  this.vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  this.vertexSize = 3;

  this.textureCoords = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoords);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
  this.textureSize = 2;

  this.indexes = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexes);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), gl.STATIC_DRAW);
  this.indexSize = 1;
  this.indexCount = indexes.length;

  this.position = mat4.create();
  mat4.identity(this.position);
};

Shape.prototype.draw = function(shaders) {
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  gl.vertexAttribPointer(shaders.vPos, this.vertexSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoords);
  gl.vertexAttribPointer(shaders.vTex, this.textureSize, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, crateTextures[filter]);
  gl.uniform1i(shaderProgram.uSampler, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexes);

  var tmp = mvMatrix;
  mvMatrix = this.position;
  setMatrixUniforms();
  mvMatrix = tmp;
  gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
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
  shaderProgram.vTex = gl.getAttribLocation(shaderProgram, "aTextureCoord");
  gl.enableVertexAttribArray(shaderProgram.vTex);

  shaderProgram.pMat = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMat = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.uSampler = gl.getUniformLocation(shaderProgram, "uSampler");
};

function handleLoadedTexture(textures) {
  // Gotta glip the y-axis for the GIFs we're loading 
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Texture 0
  // Mag filter and Min filter are set to nearest
  gl.bindTexture(gl.TEXTURE_2D, textures[0]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[0].image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  // Texture 1
  // Set to linear
  gl.bindTexture(gl.TEXTURE_2D, textures[1]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[1].image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // Texture 2
  // Mag is set to linear and min is set to linear mipmap nearest
  gl.bindTexture(gl.TEXTURE_2D, textures[2]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textures[2].image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null); // end of textures

};

function initTexture() {
  console.log("Intiializing Texture");
  var crateImage = new Image();
  for(var i=0; i<3; i++) {
    var texture = gl.createTexture();
    texture.image = crateImage;
    crateTextures.push(texture);
  }

  crateImage.onload = function() {
    console.log("Hanlding texture");
    handleLoadedTexture(crateTextures);
  };

  crateImage.src = "crate.gif";
};




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

function handleKeyDown(event) {
  currentlyPressedKeys[event.keyCode] = true;
  if(String.fromCharCode(event.keyCode) == "F") {
    filter += 1;
    if(filter >= 3) {
      filter = 0;
    }
  }
};

function handleKeyUp(event) {
  currentlyPressedKeys[event.keyCode] = false;
};

function handleKeys() {
  if(currentlyPressedKeys[33]) {
    // page up
    z -= 0.05;
  }
  if(currentlyPressedKeys[34]) {
    // page down
    z += 0.05;
  }
  if(currentlyPressedKeys[37]) {
    // left
    ySpeed -= 1;
  }
  if(currentlyPressedKeys[39]) {
    // right
    ySpeed += 1;
  }
  if(currentlyPressedKeys[38]) {
    // up 
    xSpeed -= 1;
  }
  if(currentlyPressedKeys[40]) {
    // down
    xSpeed += 1;
  }
};


function initBuffers() {

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
  ];

  var textureCoords = [
    // Front face
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,

    // Back face
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,
    0.0, 0.0,

    // Top face
    0.0, 1.0,
    0.0, 0.0,
    1.0, 0.0, 
    1.0, 1.0,

    // Bottom face
    1.0, 1.0, 
    0.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,

    // Right face
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0,
    0.0, 0.0,

    // Left face
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0
  ];

  var cubeVertexIndexes = [
    0, 1, 2, 
    0, 2, 3, // Front face
    4, 5, 6,
    4, 6, 7, // Back face
    8, 9, 10,
    8, 10, 11, // Top face
    12, 13, 14,
    12, 14, 15, // Bottom face
    16, 17, 18,
    16, 18, 19, // Right face
    20, 21, 22, 
    20, 22, 23 // Left face
  ];
    


  square = new Shape(vertices, textureCoords, cubeVertexIndexes);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  square.reset();
  square.translate([0.0, 0.0, z]);
  square.rotate(degToRad(xRot), [1, 0, 0]);
  square.rotate(degToRad(yRot), [0, 1, 0]);

  square.draw(shaderProgram);
}

function tick() {
  requestAnimFrame(tick);
  handleKeys();
  drawScene();
  animate();
}

function renderScene() {
  var canvas = $('#canvas')[0];
  initGL(canvas);
  initShaders();
  initBuffers();
  initTexture();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  tick();
}

function animate() {
  var timeNow = new Date().getTime();
  if(lastTime != 0) {
    var elapsed = timeNow - lastTime;

    xRot += (xSpeed * elapsed) / 1000.0;
    yRot += (ySpeed * elapsed) / 1000.0;
  }
  lastTime = timeNow;
}

