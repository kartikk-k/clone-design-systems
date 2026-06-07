"use client";

import { useEffect, useRef } from "react";

const VERT = `attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;   // load the baked gradient texture into this sampler
uniform vec2  uTexSize;   // grid resolution in texels (set to your texture size)
uniform float uTime;      // seconds
uniform float uFlow;      // 0.35 suggested  (0 = static)
uniform float uSpeed;     // 0.30 suggested
uniform float uScale;     // 2.5 suggested
uniform float uQuality;   // 1.00 suggested  (0 = bilinear, 1 = bicubic + dither)
uniform float uNoise;      // 0.020 suggested  (0 = none, static grain)
uniform float uNoiseScale;  // 1.0 suggested  (grain size in px)
uniform float uAnimMode;    // 0 (0=none,1=organic,2=hwave,3=vwave,4=pulse,5=swirl,6=breathe,7=drift,8=liquid,9=ripple)
uniform float uHueShift;    // 0.00 hue rotation in radians
uniform vec2  uResolution;  // canvas resolution in pixels
uniform float uCropMode;    // 0 = stretch, 1 = crop (cover)

vec4 cubicWeights(float v){
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}

vec3 textureBicubic(sampler2D tex, vec2 uv, vec2 texSize){
  vec2 invSize = 1.0 / texSize;
  uv = uv * texSize - 0.5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xw = cubicWeights(f.x);
  vec4 yw = cubicWeights(f.y);
  vec4 c  = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s  = vec4(xw.xz + xw.yw, yw.xz + yw.yw);
  vec4 o  = c + vec4(xw.yw, yw.yw) / s;
  o *= invSize.xxyy;
  vec3 s0 = texture2D(tex, o.xz).rgb;
  vec3 s1 = texture2D(tex, o.yz).rgb;
  vec3 s2 = texture2D(tex, o.xw).rgb;
  vec3 s3 = texture2D(tex, o.yw).rgb;
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 hueRotate(vec3 c, float angle){
  float co = cos(angle), si = sin(angle);
  vec3 w = vec3(0.299, 0.587, 0.114);
  vec3 r = vec3(
    co + (1.0 - co) * w.x,
    (1.0 - co) * w.x * w.y - si * w.z,
    (1.0 - co) * w.x * w.z + si * w.y
  );
  vec3 g = vec3(
    (1.0 - co) * w.x * w.y + si * w.z,
    co + (1.0 - co) * w.y,
    (1.0 - co) * w.y * w.z - si * w.x
  );
  vec3 b = vec3(
    (1.0 - co) * w.x * w.z - si * w.y,
    (1.0 - co) * w.y * w.z + si * w.x,
    co + (1.0 - co) * w.z
  );
  return vec3(dot(c, r), dot(c, g), dot(c, b));
}

vec2 coverUV(vec2 uv, vec2 texSize, vec2 resolution){
  float texAspect = texSize.x / texSize.y;
  float screenAspect = resolution.x / resolution.y;
  vec2 s = vec2(1.0);
  if(screenAspect > texAspect){
    s.y = screenAspect / texAspect;
  } else {
    s.x = texAspect / screenAspect;
  }
  return (uv - 0.5) / s + 0.5;
}

// --- Animation modes ---
// Each returns a warped UV. All use uFlow as intensity, uScale as detail.

// 1: Organic flow (original) — multi-octave sinusoidal domain warp
vec2 warpOrganic(vec2 uv, float t){
  vec2 p = uv * uScale;
  vec2 d;
  d.x = sin(p.y + t) + 0.5 * cos(p.x * 1.3 - t * 0.8);
  d.y = cos(p.x + t * 0.9) + 0.5 * sin(p.y * 1.3 + t * 0.7);
  d.x += 0.35 * sin(p.y * 2.1 - t * 1.3);
  d.y += 0.35 * cos(p.x * 2.1 + t * 1.1);
  return uv + d * uFlow * 0.06;
}

// 2: Horizontal wave — wave sweeps left to right with vertical delay
vec2 warpHWave(vec2 uv, float t){
  float phase = uv.x * uScale * 2.0 + t;
  float wave = sin(phase) * 0.5 + sin(phase * 0.6 + 1.3) * 0.3;
  return uv + vec2(0.0, wave * uFlow * 0.08);
}

// 3: Vertical wave — wave sweeps top to bottom
vec2 warpVWave(vec2 uv, float t){
  float phase = uv.y * uScale * 2.0 + t;
  float wave = sin(phase) * 0.5 + sin(phase * 0.7 + 2.0) * 0.3;
  return uv + vec2(wave * uFlow * 0.08, 0.0);
}

// 4: Circular pulse — radial waves from center
vec2 warpPulse(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float wave = sin(r * uScale * 8.0 - t * 2.0) * uFlow * 0.05;
  return uv + normalize(c + 0.001) * wave;
}

// 5: Swirl — rotation that varies with distance from center
vec2 warpSwirl(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float angle = r * uScale * 3.0 * uFlow * sin(t * 0.5);
  float cs = cos(angle), sn = sin(angle);
  return vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) + 0.5;
}

// 6: Breathing — gentle uniform scale oscillation from center
vec2 warpBreathe(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float s = 1.0 + sin(t) * uFlow * 0.1;
  return c * s + 0.5;
}

// 7: Drift — slow diagonal drift with gentle wobble
vec2 warpDrift(vec2 uv, float t){
  vec2 d;
  d.x = sin(t * 0.3) * 0.7 + cos(t * 0.17) * 0.3;
  d.y = cos(t * 0.23) * 0.6 + sin(t * 0.31) * 0.4;
  return uv + d * uFlow * 0.04;
}

// 8: Liquid — turbulent multi-frequency noise-like warp
vec2 warpLiquid(vec2 uv, float t){
  vec2 p = uv * uScale;
  vec2 d;
  d.x = sin(p.y * 1.7 + t) + sin(p.x * 2.3 - t * 1.4) * 0.5
      + sin(p.y * 3.1 + t * 0.7) * 0.25;
  d.y = cos(p.x * 1.9 + t * 1.1) + cos(p.y * 2.7 - t * 0.9) * 0.5
      + cos(p.x * 3.3 + t * 1.3) * 0.25;
  return uv + d * uFlow * 0.04;
}

// 9: Ripple — concentric rings that expand outward
vec2 warpRipple(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float wave = sin(r * uScale * 12.0 - t * 3.0) * exp(-r * 2.0);
  return uv + c * wave * uFlow * 0.15;
}

vec2 warp(vec2 uv, float t){
  // animMode 0 = no animation (identity)
  if(uAnimMode < 0.5) return uv;
  if(uAnimMode < 1.5) return warpOrganic(uv, t);
  if(uAnimMode < 2.5) return warpHWave(uv, t);
  if(uAnimMode < 3.5) return warpVWave(uv, t);
  if(uAnimMode < 4.5) return warpPulse(uv, t);
  if(uAnimMode < 5.5) return warpSwirl(uv, t);
  if(uAnimMode < 6.5) return warpBreathe(uv, t);
  if(uAnimMode < 7.5) return warpDrift(uv, t);
  if(uAnimMode < 8.5) return warpLiquid(uv, t);
  return warpRipple(uv, t);
}

void main(){
  float t = uTime * uSpeed;
  vec2 baseUV = vUv;
  if(uCropMode > 0.5) baseUV = coverUV(baseUV, uTexSize, uResolution);
  vec2 uv = warp(baseUV, t);
  vec3 bilinear = texture2D(uTex, uv).rgb;
  vec3 bicubic  = textureBicubic(uTex, uv, uTexSize);
  vec3 col = mix(bilinear, bicubic, uQuality);
  vec2 dp = gl_FragCoord.xy + t * 60.0;
  float d = hash(dp) + hash(dp + 7.31) - 1.0;
  col += d * (uQuality / 255.0);
  if(uNoise > 0.0){
    vec2 np = floor(gl_FragCoord.xy / uNoiseScale);
    float n = hash(np) * 2.0 - 1.0;
    col += n * uNoise;
  }
  if(uHueShift != 0.0) col = hueRotate(col, uHueShift);
  gl_FragColor = vec4(col, 1.0);
}`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}

export default function GradientShader({
  className,
  style,
  mode = "crop",
}: {
  className?: string;
  style?: React.CSSProperties;
  mode?: "crop" | "stretch";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true })!;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );

    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };
    img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFYAAAA4CAYAAABnqA/dAAAQAElEQVR4AbTaWYstS9HG8XraebpWEERE9EIQR8QZvBDnGS8EL9Tvf+k8rLd+mf1U5apevfeRF4v974iMjIiMfLp6nT2cpy9/+cu3L37xiwdf+tKXbl/96ldv3/jGN27f+c53bt/61rdu3/zmN29f+9rXbl/5yldu9j//+c/fPve5z90++9nP3j796U/fPvnJT94+8YlP3D7+8Y/fPvaxj90++tGP3iFmT86nPvWp22c+85lR/4UvfGGc9fWvf32c8+1vf3uc6VxYOx9muCL+3e9+9/a9733v9v3vf//2ox/96PbTn/709otf/OL261//+vab3/zm4Fe/+tWI/+xnP7v95Cc/uf34xz++/fCHPxz84Ac/uBUxfSBHrp5Q+/Of/3z0+eUvfznO+O1vf3v73e9+d/v9739/+8Mf/nD74x//ePvTn/50e7rdbtuV//znP9u///3vgT3r8q9//WvEWfzzn//c2H/84x9bfevSPqvVs7Qv29hqt/2xtq+Hvj2na7bIk4+99PiVZEteciS8wWmvWqlJtne9612Dd7/73Rus3/Oe92x42vYnySGuwbAOaq2pGN/lVnpRMTm1V18txFnoi32M8evqy5H/iJ7Dojlq0F7JFPTp6WlDknFWkjuxR/D5S5Jn7zRJjnwigqAg5nvf+94hKn8I21KDwFAdsmsxuACIWaybX79WTWlO17XOKGapf7Xy9X0TPaO1+pVkCkNcJHOdZKQ0NhYPviRnnlzCErFUYOtD2GQWGcgFsA5Zn+3F6rNF3WvoDfssOv/qN8aKy4czWNRnX0Oeen2Seb8k460lDJJzneR4I7f9SbJ/nb+SjD01BAUhQUhvK/g4hJ3l86thDEtAFoZkcfWtV9QXHeuz1o9I8ih8xFrLlvXMq9+co8HuJBmiJhkiJS/Xybm3PT/JGSMoKigRr9h7SvJcPo2BDElA+HFvTLw0Nqu28Rldn00yhl/9ZMaSCI9LegMekeTFfpLRM8n2tsd8cmqTjFqxJHe9k7mXvLTrbAQF4UpF7ZoVG29skq2PQUrfWGKKyWHXtRiSjMHXQd6Jb1A0lw8DsuKr5V+RgyRGGXMM5/IlydhLcies2pLMnNfWjZsPZmGvDGG35yeZTVfxiAux57QxXA9IMoa8Nu7ad68+axDwwQd/pbHW9/PraruvVg2SeY9tf5LsX89fScb8ScbcvcfVJjNPXM9a56ys56/xQ9hkNtr2J8n+ddu8mSCsQJJjmCRjQIe2oUtfcbAYW7punXj99ltjzX+TXev1IAS2/UnyYu5kzp/MvbVG3WvIc1bns8aaP9bb5UlyRLylhC2KFWkMF1153/vet73//e/fPvCBDxxYN86Wta5DstAbfHn1rdWLwbp0LdeMMC+S805JxguRPLbyH6HfFWdBvj0Ww09yCFknyTi86wqbZPxJw2V6ERclHjHZD37wg1sRq2+vtIbVy3As+DAc+OIrzi568OUVdXDJK0nG25vMO9pPpp+8tPahX/uz1rB3JdnPSO6bNSnZN/c/qWzPj7cXmrmky1SoCvjhD394+9CHPrSxxboQWa46ghS9oLehV8zTtXOLfHTNdi1fL7VIzjtaryQZQjeWvMxtLxb6ozVsMvvYx/iMTc5mySVhFzfJ5iFskvHHNuIQiViEI+RHPvKR7RH2IE8+1BKWGDAoxlD7mexK98T4j1j36rNYL5/kENMekoyfUnmPcJ68WjnW7EO6mZyHNdHe2ig5DycGcYgEwr3GKqhcdUSFPs4ozoQZkjlTcp7bPfv8K2ucfyXJ+DgTV8uCD/4V8StykjlXkuMb1fjTWpDMBDEXra1vrZAVIwyhCAf+I+zB3iqqH199oKfeSObAfCRznZy2cVYt6rNojL+SzHsm03ZPPqxrV7+x5H4OObCfzL0nlxO44rL2VsSw5tr3sVAIxyc6e0Uc3lS17Wew5Hmo/aMgmf62P8n0k2mbW5vkeGOS+5zkXMt/DXeyx+LqWz8iOfsn09/2ZwjbC/aSGsPaHhGIAT7EIadYr4h3XZ/Vex0ymQM1lsx1Mu0+5/j8S+Y6ed1ee1gnM58P518RR3KfK7aSzP3ktNd98z5dRVoPJAJh5JRV3MbYxuWrK+0nXr/WQElevG3JHHrbn+Te30PHrySjNsl2fZIc3wznOaskGXXipXu1yVmfvPS35yc5955D4w9Wh7AVopYQpcJdf6zXNWFX1KjXz/AduH6ScTnx5BwueT2e3Ocl2fokGf2S0yan33NZOJct5oS1PSRnfXKetT0/SY5vnpDfNfk9v7+8Gh8FRAAhikNgbY+IhGPRz1I+7ImxRR300AsGNjz4Scw0SDIGFUdz+MncS6Z9FEtyiJtMXx6Ss07fzmLPGvySzPpk1m3PD/HwvDyMWEX1N4Ljje3lCQCHslcqGCEfYX+NW+sNvdrXJYoYvxdiTZtkiGRdknnJ5LTb/iQZuckZV5PMtf5wFvhYfflXkmzv5FlF9fcqGL/dcunisCvdIxAIBn4hqBhbvMH17cltr57RC4qLWWO9pPXKda9rOXwWa79H60cx9cm9oISDN5JdEfOjT0z4R1XsfZ7GvzD20rWGgguv2L/SfeKhYtaKlbW2da9ZF3+EuR7FH8XW3P2y481e81a/+8lLYQkIoq6WD6L6CCDq3//+9238kXbbHwe4oEGuVgzij+heLfEISdjrW9s4C7l41LcxfVfMWsTlWfNXxCoWm2QIu/pJxud6ctptf5L5L9feRsIV64orZk1QELQMYZPZ1CDXwcRg+OuetT0Y1rrIJxgIvELQFTnyS9csGq8VQ9fO5JuDD34xWzLvmEzbWO2u5fhFNA7RHkHIxvneVHhTV4awGsEhBjTYSgdszJrPqinJObQ9OfqBkMTtG1wrVuQQrFivNP7IOmPF+UjmTO6XhDlI5ltJTBCMWOAX6yJGyK753lai9m3lH/8nTE9LMv6SgigGKxXvNZvMoZPc/Wip74VXQVbB6lfg5q11crrPR/NWa24zOjfJ+NFPTrstDzFBLBCLBZ9oq+XbA98+CHnl7o3tmYbqcCzEkima9UqSlh7WwEkOkeXr4eJXwYiECrT6jT2yzdNP3/Zn4Uwkc476hjTfCrFAMBCMhXhpjbU9efDWFuvjjVXgwNLBasWTHG9AMofd9ifJ/nUbIm77o1dy/pjtobHnYvoRohCMQMVbyb9+VIjJvaIPUWv1h7NKMuczV6kwxAExUJ+FvOIe6ru2r6aC1np7h7AKoIhFkjsRDbk9eJIM0ZKMXT3gcBY2apOMfP0IgApDHFQ8Yq5U9Np1Tx30gr5Ictxje37MAjNWnFriEMvaPpQl80XhQ1yOXDUrYncfBUnUDBycZIiQnE01tHdFkRh7ZY3XT2ZvAoMIhLlSkWuJWf+a27VeRe9kntW53IEoIAIIw4pBzqNZk4w29uRB3ZW7/xNG8qi6fEnOZnIcqiFbxNey5PxmXONdJxnfOJcvBPHGVaTailkrzmehZkWf0t7ONSfMT4zaCivmTnKSjLddH731Sea95ED+in5qX7yxySy0iW15rDVTDA3ZYk+OEjYJ940kGeIm0xoeLlMIB5crRK2/7qlpnN9eyexvLnPC/D4PwXcPcQOrw9pLv2TqI1fNipj+GMIm89Akeh4XHYvLFwdr0Ia+06Ux+5pDeZK7nkmE70hy5CTTdzGXQf1edLX2rdmyrtUmGeeZyR06q9n5ZhaXlOT4Lac+0AOtl6tmre3etj/joyDJuNS+fvhLwYqG0LSD8VfsO7x1bZzMswyJZK6Tl9Y+1LJEY4t1cfnCitcms7c+5jGX+czLWovb17u1fhL4YrAvT7468FfkWN8Jm8wBkth/KLbG0NRg8KOEv/3tbxtLbNaePAdB3Wi8fElynJNM3yWK1PpJjs88Fy4EXGlcHT/J1sccK2ZCkqM3QdGe+mz7s9Y98vUR31O38deGDldckry4rGSFtQQjHBHhj3PExOrbg/yijwFY6JnMM5Ns6xzrbKsvx9rl2RV7yey37U+S/es2/ldT55mj59torc9tgqJ99ZIDtepaz4c4Vn8Iq7gkGaJaJ9FvkExfg6KRQwgHgnpra/kgNuTI9w1h1a/o67DGrK/YF2OTOVOSMXMS4QN5aL+eKSHJ8TlKSBAThL7ev33ao7ZxFtvzs9c/3b0hScaQz/uv+vY1cgChiMYSkLC1/NIY23w1aB+2QtSKrTi3e3x0XSufrze6lmv2/eKHsMQkLEFhL4m08Zbr8xrta1/B0v9piNdmScY6mVby29DMAcQC4SqmN/avf/3rxq7Yt2blo7X8FcKsyHttba+0h1zz9fLuSkCCwjrJ3Qu27Y97FfXQA3zw0by9bHwzxn+8NBZIppjJvbX3NjR2gEu4WC/FEo+IIHJZ13zYY9W8jTflOdcc5qkA7pBkvKmEde+VZN572x/32c34p2z1V9wV8thijSFsMhsmp9W0JPM3xQoau9okIySnQ7iYC4JIqxD8iljf+hH2r8gTq63vHDjT+WZxaXMZsEImGT+ZXbNJpIw3Tr466PGI7sm9MoTVLZlN+UgyDuYrYt9GkiOlh3pjXBAu69JEWCHOlb/85S9b+fOf/7xd6R5rj21P58CZFcQdknO+JONHPzltcu7Lb627lMZqG5ePrp+2B4+E8mD7jaEk4xuSTKuPwypwL8xWZBZvEpdwRR6/gloXffR2Hpz9aOBkzpe8tGYu6iviahtn0T11zrv7a0OBK028xl9bJxlvQn+0kmx99IILwxsFYoAgrDePULX8FaKu6/ry1eujrws7bz2fn+T45l/nlF9ab80nHlsat+brzWK8sZwVCRBjV8SwxpJz0GT69pPpX4e3p4eBCAxClArDFoKtVMRae63XT29nrDg3CTNIpp9kCC0on209W+zVZ7tmIVbGGysIDVeSrMvhEwlJxjCrn8xYcm9H4YMvycyzZSCClIrEEvdtqJPrrepd2BXnWLNJmIGY81GfhZiebNe1jVkXMQxhR/dXviQZAibv3F5bJS9r35TTPcMashdjQcRa+0WdmrKu67MrzW0PVu8VOY3Xv1r7aHwIa7Ee9pqf5G4rOdfJ6d8l/ReLJK9+E9c2yZknnoQZv03iuM8jXtsjIlHwyBdrPzno+mq7Nz5jHfg2kjl8kuPyrUlS9846VIAF/78lyfiPYXLa5Dwvyd08PYftJbf9scbujm+APYKBDz7qs6Vxa31q+UXv8lDY5Bw2mb6CJMwdyYwlGRe829wXDt3N+MUvAnz2EcnZL8khbjLjyYxt+3PtY31lTxuCihNlhWj9eLn6zVvr+MV+/dUOYZM491WSDNGS067JSdbl4ScZdUfgHTpJjsxk+klGr+SlPZJ3p5dz4UcQTpx9DftFTn12P2J8g1bLXzHD8SevbiSpe1xEIDnjXScZOdb/K5LzjGT6ybQ9M0ndYV1shSBojF9W4eqzkKOGhebWK2KlcevxxnKS3ImURHjEkumPwPOXJGPPF7ZCvAAAAGpJREFUMjl9ayRh/l8kZ49k+kmOc19r3gteLXEqGIvGfBTw0Ti/6MVnnXu1YitD2CRHLMkxeJIjvjrJfdwhSGY8mXatufryrzHrJOP85LGVg+Tcty5rXz4xHtE9ImJd12+dNR6d0djV/h8AAAD//1te6KUAAAAGSURBVAMANJNFGkYSQAsAAAAASUVORK5CYII=";

    const U = {
      tex: gl.getUniformLocation(prog, "uTex"),
      texSize: gl.getUniformLocation(prog, "uTexSize"),
      time: gl.getUniformLocation(prog, "uTime"),
      flow: gl.getUniformLocation(prog, "uFlow"),
      speed: gl.getUniformLocation(prog, "uSpeed"),
      scale: gl.getUniformLocation(prog, "uScale"),
      quality: gl.getUniformLocation(prog, "uQuality"),
      noise: gl.getUniformLocation(prog, "uNoise"),
      noiseScale: gl.getUniformLocation(prog, "uNoiseScale"),
      animMode: gl.getUniformLocation(prog, "uAnimMode"),
      hueShift: gl.getUniformLocation(prog, "uHueShift"),
      cropMode: gl.getUniformLocation(prog, "uCropMode"),
      resolution: gl.getUniformLocation(prog, "uResolution"),
    };

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas!.width = Math.round(canvas!.clientWidth * dpr);
      canvas!.height = Math.round(canvas!.clientHeight * dpr);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const t0 = performance.now();
    let animId: number;

    function frame(now: number) {
      animId = requestAnimationFrame(frame);
      const t = 0;
      gl.uniform1i(U.tex, 0);
      gl.uniform2f(U.texSize, 86, 56);
      gl.uniform1f(U.time, t);
      gl.uniform1f(U.flow, 0.35);
      gl.uniform1f(U.speed, 0.3);
      gl.uniform1f(U.scale, 2.5);
      gl.uniform1f(U.quality, 1);
      gl.uniform1f(U.noise, 0.02);
      gl.uniform1f(U.noiseScale, 1);
      gl.uniform1f(U.animMode, 0);
      gl.uniform1f(U.hueShift, 0);
      gl.uniform1f(U.cropMode, mode === "stretch" ? 0 : 1);
      gl.uniform2f(U.resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
