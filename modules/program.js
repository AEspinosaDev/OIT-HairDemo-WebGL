export function createProgram(vert, frag) {
  var gl = document.getElementById("gl-canvas").getContext("webgl2");

  var vert_src = document.getElementById(vert).text.trim();
  var frag_src = document.getElementById(frag).text.trim();

  var vert_shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vert_shader, vert_src);
  gl.compileShader(vert_shader);

  if (!gl.getShaderParameter(vert_shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vert_shader));
  }

  var frag_shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(frag_shader, frag_src);
  gl.compileShader(frag_shader);

  if (!gl.getShaderParameter(frag_shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(frag_shader));
  }

  var program = gl.createProgram();
  gl.attachShader(program, vert_shader);
  gl.attachShader(program, frag_shader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
  }

  return program;
}
