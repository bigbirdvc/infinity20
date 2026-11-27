// Tiny WebGL2 toy renderer: primitives -> lit, outlined, orthographic 3/4 view.
(function () {
  const V = {
    sub: (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]], add: (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
    mul: (a, s) => [a[0]*s, a[1]*s, a[2]*s], dot: (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross: (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
    norm: a => { const l = Math.hypot(...a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; },
  };
  // A transform is {s:[sx,sy,sz], r:[rx,ry,rz] (radians, applied X then Y then Z), t:[x,y,z]}; y is up.
  function rot(p, r) {
    let [x, y, z] = p; const [a, b, c] = r || [0, 0, 0];
    if (a) { const C = Math.cos(a), S = Math.sin(a); [y, z] = [y*C - z*S, y*S + z*C]; }
    if (b) { const C = Math.cos(b), S = Math.sin(b); [x, z] = [x*C + z*S, -x*S + z*C]; }
    if (c) { const C = Math.cos(c), S = Math.sin(c); [x, y] = [x*C - y*S, x*S + y*C]; }
    return [x, y, z];
  }
  function place(mesh, o = {}) {
    const s = o.s || [1, 1, 1], t = o.t || [0, 0, 0];
    const P = [], N = [];
    for (let i = 0; i < mesh.p.length; i++) {
      P.push(V.add(rot([mesh.p[i][0]*s[0], mesh.p[i][1]*s[1], mesh.p[i][2]*s[2]], o.r), t));
      N.push(V.norm(rot([mesh.n[i][0]/s[0], mesh.n[i][1]/s[1], mesh.n[i][2]/s[2]], o.r)));
    }
    return { p: P, n: N };
  }
  // ---- primitives (unit size, centred at origin unless noted) ----
  function sphere(seg = 28, ring = 18) {
    const p = [], n = [];
    const at = (i, j) => { const th = i / seg * Math.PI * 2, ph = j / ring * Math.PI; return [Math.sin(ph)*Math.cos(th), Math.cos(ph), Math.sin(ph)*Math.sin(th)]; };
    for (let j = 0; j < ring; j++) for (let i = 0; i < seg; i++) {
      const a = at(i, j), b = at(i+1, j), c = at(i+1, j+1), d = at(i, j+1);
      for (const q of [a, c, b, a, d, c]) { p.push(q); n.push(q); }
    }
    return { p, n };
  }
  // cylinder from y=0 to y=1, radius 1 (r1 bottom, r0 top for cones), smooth sides, capped
  function cylinder(seg = 28, r0 = 1, r1 = 1, caps = true) {
    const p = [], n = [], slope = (r1 - r0);
    for (let i = 0; i < seg; i++) {
      const a = i / seg * Math.PI * 2, b = (i+1) / seg * Math.PI * 2;
      const A = [Math.cos(a), 0, Math.sin(a)], B = [Math.cos(b), 0, Math.sin(b)];
      const na = V.norm([A[0], slope, A[2]]), nb = V.norm([B[0], slope, B[2]]);
      const a0 = [A[0]*r1, 0, A[2]*r1], b0 = [B[0]*r1, 0, B[2]*r1], a1 = [A[0]*r0, 1, A[2]*r0], b1 = [B[0]*r0, 1, B[2]*r0];
      for (const [q, m] of [[a0, na], [b1, nb], [b0, nb], [a0, na], [a1, na], [b1, nb]]) { p.push(q); n.push(m); }
      if (caps) {
        if (r0 > 0) for (const q of [[0,1,0], a1, b1]) { p.push(q); n.push([0,1,0]); }
        if (r1 > 0) for (const q of [[0,0,0], b0, a0]) { p.push(q); n.push([0,-1,0]); }
      }
    }
    return { p, n };
  }
  function box() { // unit cube centred, with bevel-free faces
    const p = [], n = [];
    const F = [[[1,0,0],[0,1,0],[0,0,1]], [[-1,0,0],[0,1,0],[0,0,-1]], [[0,1,0],[0,0,1],[1,0,0]], [[0,-1,0],[0,0,-1],[1,0,0]], [[0,0,1],[1,0,0],[0,1,0]], [[0,0,-1],[-1,0,0],[0,1,0]]];
    for (const [nn, u, v] of F) {
      const c = V.mul(nn, .5), q = (a, b) => V.add(c, V.add(V.mul(u, a*.5), V.mul(v, b*.5)));
      for (const x of [q(-1,-1), q(1,1), q(1,-1), q(-1,-1), q(-1,1), q(1,1)]) { p.push(x); n.push(nn); }
    }
    // fix winding irrelevant (no culling for fill)
    return { p, n };
  }
  // triangular prism (roof): ridge along x, base width 1 (z), height 1 (y), length 1 (x), base at y=0
  function prism() {
    const p = [], n = [], L = [-.5, .5];
    const tri = [[0, 1, 0], [0, 0, .5], [0, 0, -.5]];
    const sl = V.norm([0, .5, 1]), sr = V.norm([0, .5, -1]);
    const quad = (a, b, c, d, m) => { for (const x of [a, b, c, a, c, d]) { p.push(x); n.push(m); } };
    quad([L[0],1,0], [L[1],1,0], [L[1],0,.5], [L[0],0,.5], sl);
    quad([L[0],1,0], [L[0],0,-.5], [L[1],0,-.5], [L[1],1,0], sr);
    for (const [x, m] of [[L[0], [-1,0,0]], [L[1], [1,0,0]]]) for (const q of tri) { p.push([x, q[1], q[2]]); n.push(m); }
    quad([L[0],0,.5], [L[1],0,.5], [L[1],0,-.5], [L[0],0,-.5], [0,-1,0]);
    return { p, n };
  }
  const hex = h => { const v = parseInt(h.slice(1), 16); return [(v>>16&255)/255, (v>>8&255)/255, (v&255)/255]; };

  // ---- renderer ----
  const VS = `#version 300 es
  in vec3 P; in vec3 N; uniform mat4 M; uniform float inflate; out vec3 vN; out vec3 vW;
  void main(){ vec3 p = P + N*inflate; vN = N; vW = p; gl_Position = M*vec4(p,1.0); }`;
  const FS = `#version 300 es
  precision highp float; in vec3 vN; in vec3 vW; uniform vec3 C; uniform int mode; uniform vec3 eye; uniform float gloss; out vec4 o;
  void main(){
    if(mode==1){ o=vec4(C,1.0); return; }
    vec3 n = normalize(vN), L = normalize(vec3(-0.55,0.85,0.35));
    float d = max(dot(n,L),0.0);
    float band = d*0.8 + 0.2*max(dot(n,normalize(vec3(0.6,0.5,0.6))),0.0);              // soft toon step
    vec3 sky = vec3(1.0,0.96,0.88), ground = vec3(0.62,0.46,0.42);
    vec3 amb = mix(ground, sky, n.y*0.5+0.5)*0.42;
    vec3 col = C*(amb + band*vec3(1.0,0.93,0.82)*0.66);
    vec3 V = normalize(eye), H = normalize(L+V);
    col += vec3(1.0)*pow(max(dot(n,H),0.0), 24.0)*gloss*0.35;           // lacquer
    float rim = pow(1.0-max(dot(n,V),0.0), 3.0);
    col += vec3(1.0,0.95,0.85)*rim*0.12;
    col *= mix(0.86, 1.0, clamp(vW.y*2.5+0.5, 0.0, 1.0));           // grounded: darker near the floor
    o = vec4(col,1.0);
  }`;
  function render(canvas, parts, opt = {}) {
    const W = canvas.width, gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: true });
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    // camera: orthographic, yaw 45°, pitch ~38°
    const yaw = opt.yaw ?? Math.PI / 4, pitch = opt.pitch ?? 0.62;
    const eye = [Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch)];
    const f = V.mul(eye, -1), r = V.norm(V.cross(f, [0,1,0])), u = V.cross(r, f);
    // fit bounds
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const pt of parts) for (const q of pt.mesh.p) { const a = V.dot(q, r), b = V.dot(q, u), c = V.dot(q, eye); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); z0 = Math.min(z0, c); z1 = Math.max(z1, c); }
    const span = Math.max(x1 - x0, y1 - y0) / 0.9, cx = (x0 + x1) / 2, cy = y0 + span * 0.47 - 0.015 * span;
    const sx = 2 / span, sz = 1 / (z1 - z0 + 1);
    const M = new Float32Array([r[0]*sx, u[0]*sx, -eye[0]*sz, 0, r[1]*sx, u[1]*sx, -eye[1]*sz, 0, r[2]*sx, u[2]*sx, -eye[2]*sz, 0, -cx*sx, -cy*sx, 0, 1]);
    gl.viewport(0, 0, W, W); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.uniformMatrix4fv(gl.getUniformLocation(pr, 'M'), false, M);
    gl.uniform3fv(gl.getUniformLocation(pr, 'eye'), eye);
    const uC = gl.getUniformLocation(pr, 'C'), uMode = gl.getUniformLocation(pr, 'mode'), uInf = gl.getUniformLocation(pr, 'inflate'), uG = gl.getUniformLocation(pr, 'gloss');
    const bufs = parts.map(pt => {
      const P = new Float32Array(pt.mesh.p.flat()), Nn = new Float32Array(pt.mesh.n.flat());
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      for (const [name, data] of [['P', P], ['N', Nn]]) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0); }
      return { vao, count: P.length / 3, pt };
    });
    const outlineW = span * 0.011;
    // outline: inflated back faces
    gl.enable(gl.CULL_FACE);
    for (const b of bufs) { if (b.pt.noOutline) continue; gl.bindVertexArray(b.vao); gl.uniform1i(uMode, 1); gl.uniform3fv(uC, hex(opt.outline || '#3a2214')); gl.uniform1f(uInf, outlineW); gl.cullFace(gl.FRONT); gl.frontFace(gl.CCW); gl.disable(gl.CULL_FACE); gl.depthMask(true); gl.drawArrays(gl.TRIANGLES, 0, b.count); }
    gl.clear(gl.DEPTH_BUFFER_BIT);
    // draw outlines again but only behind: simplest is outline pass then fill pass with depth test against fills only
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    // pass 1: outlines (inflated, pushed back)
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(4, 4);
    for (const b of bufs) { if (b.pt.noOutline) continue; gl.bindVertexArray(b.vao); gl.uniform1i(uMode, 1); gl.uniform3fv(uC, hex(opt.outline || '#3a2214')); gl.uniform1f(uInf, outlineW); gl.drawArrays(gl.TRIANGLES, 0, b.count); }
    gl.disable(gl.POLYGON_OFFSET_FILL); gl.clear(gl.DEPTH_BUFFER_BIT);
    // pass 2: fills
    for (const b of bufs) { gl.bindVertexArray(b.vao); gl.uniform1i(uMode, 0); gl.uniform3fv(uC, hex(b.pt.col)); gl.uniform1f(uInf, 0); gl.uniform1f(uG, b.pt.gloss ?? 0.35); gl.drawArrays(gl.TRIANGLES, 0, b.count); }
  }
  window.T3 = { sphere, cylinder, box, prism, place, render, V };
})();
