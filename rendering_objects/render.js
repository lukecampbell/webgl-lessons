var gl;
var shaderProgram;
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();
var neheTexture;

var triangle;
var square;


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
  gl.bindTexture(gl.TEXTURE_2D, neheTexture);
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

function handleLoadedTexture(texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);
};

function initTexture() {
  console.log("Intiializing Texture");
  neheTexture = gl.createTexture();
  neheTexture.image = new Image();
  neheTexture.image.onload = function () {
    handleLoadedTexture(neheTexture);
  };
  neheTexture.image.src = 'cube.png';
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

function pyramidColor(x, y, z) {
  var blue = (x+z+2) / 4.0;
  var red = 1 - blue;
  var green = 0.0;
  var alpha = 1.0;
  var retval = [red, green, blue, alpha];
  return retval;
}


function initBuffers() {

  // Cube
  vertices = [
 1.000000, -1.000000, -1.000000,
 1.000000, -1.000000,  1.000000,
-1.000000, -1.000000,  1.000000,
-1.000000, -1.000000, -1.000000,
 1.000000,  1.000000, -0.999999,
 0.999999,  1.000000,  1.000001,
-1.000000,  1.000000,  1.000000,
-1.000000,  1.000000, -1.000000
  ];

  var textureCoords = [

  ];

  var cubeVertexIndexes = [
    1, 2, 4,
    5, 8, 6,
    1, 5, 2,
    2, 6, 3,
    3, 7, 4,
    5, 1, 8,
    2, 3, 4,
    8, 7, 6,
    5, 6, 2,
    6, 7, 3,
    7, 8, 4,
    1, 4, 8
  ];
    


  square = new Shape(vertices, textureCoords, cubeVertexIndexes);
  square.translate([0, 0, -7]);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  //square.rotate(degToRad(0.25), [1, 0, 0]);
  square.rotate(degToRad(0.25), [0, 1, 0]);
  square.draw(shaderProgram);
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
  initTexture();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  tick();
}

