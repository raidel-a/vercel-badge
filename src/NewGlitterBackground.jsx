import { shaderMaterial, useTexture } from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useMemo } from "react";

// Create a noise texture for the shader
function createNoiseTexture() {
  const size = 512; // Increased size for better quality
  const data = new Uint8Array(size * size * 4);

  for (let i = 0; i < size * size * 4; i += 4) {
    // Create different values for R and G channels for better noise effect
    data[i] = Math.random() * 255; // R
    data[i + 1] = Math.random() * 255; // G
    data[i + 2] = Math.random() * 255; // B
    data[i + 3] = 255; // A
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

// Create custom shader material
const GlitterShaderMaterial = shaderMaterial(
  {
    iTime: 0,
    iResolution: new THREE.Vector3(),
    iMouse: new THREE.Vector4(),
    iChannel0: null,
    iGlitterSize: 0.0017, // Default glitter size
    iGlitterLayers: 3.0, // Default number of layers
    iGlitterIntensity: 12.0, // Default intensity
    iSpeed: 0.01, // Default movement speed
    iRedPower: 0.35, // Default red power
    iGreenPower: 0.4, // Default green power
    iBluePower: 1.8, // Default blue power
    iExposure: 2.0, // Default exposure
    iBrightness: 1.8, // Default brightness
    iSaturation: 1.6, // Default saturation
    iContrast: 1.2, // Default contrast
    iDisplacementScale: 1.5, // Default displacement scale
    iDisplacementSpeed: 0.08, // Default displacement speed
    iDisplacementStrength: 0.055, // Default displacement strength
    iNoiseScale: 2.0, // Default noise scale
    iNoiseSpeed: 0.05, // Default noise speed
  },
  // Vertex shader
  /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  /*glsl*/ `
    uniform float iTime;
    uniform vec3 iResolution;
    uniform vec4 iMouse;
    uniform sampler2D iChannel0;
    uniform float iGlitterSize;
    uniform float iGlitterLayers;
    uniform float iGlitterIntensity;
    uniform float iSpeed;
    uniform float iRedPower;
    uniform float iGreenPower;
    uniform float iBluePower;
    uniform float iExposure;
    uniform float iBrightness;
    uniform float iSaturation;
    uniform float iContrast;
    uniform float iDisplacementScale;
    uniform float iDisplacementSpeed;
    uniform float iDisplacementStrength;
    uniform float iNoiseScale;
    uniform float iNoiseSpeed;
    varying vec2 vUv;

    #define PI 3.14159265359
    #define TAU 6.28318530718

    vec4 permute(vec4 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
    }

    vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
    }

    float snoise(vec3 v){ 
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 =   v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy);
        vec3 i2 = max( g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1. + 3.0 * C.xxx;

        i = mod(i, 289.0); 
        vec4 p = permute(permute(permute( 
            i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
            i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
            i.x + vec4(0.0, i1.x, i2.x, 1.0)
        );

        float n_ = 1.0/7.0;
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    vec3 ContrastSaturationBrightness(vec3 color, float brt, float sat, float con)
    {
        // Increase or decrease theese values to adjust r, g and b color channels seperately
        const float AvgLumR = 0.5;
        const float AvgLumG = 0.5;
        const float AvgLumB = 0.2;
        
        const vec3 LumCoeff = vec3(0.2125, 0.7154, 0.0721);
        
        vec3 AvgLumin  = vec3(AvgLumR, AvgLumG, AvgLumB);
        vec3 brtColor  = color * brt;
        vec3 intensity = vec3(dot(brtColor, LumCoeff));
        vec3 satColor  = mix(intensity, brtColor, sat);
        vec3 conColor  = mix(AvgLumin, satColor, con);
        
        return conColor;
    }

    vec3 exposure(vec3 color, float exposure){
        return color * pow(2., exposure);
    }

    float randomNoise(vec2 uv, float time) {
        float aspect = iResolution.x / iResolution.y;
        
        float result = 0.;
        
        // Use the glitterSize uniform to control the size of glitter particles
        float scale = iGlitterSize;
        vec2 absoluteSize = iResolution.xy / vec2(aspect, 1.);

        // Use the glitterLayers uniform to control the number of layers
        for(float i = 1.; i <= iGlitterLayers; i++){
            // First pattern - vertical movement
            vec2 backUV = uv * (i) * absoluteSize * scale;
            backUV.y += time * iSpeed * 100.0;

            // Second pattern - opposite vertical movement
            vec2 frontUV = uv * (i + 3.14) * absoluteSize * scale;
            frontUV.y -= time * iSpeed * 100.0;
            
            // Third pattern - horizontal movement
            vec2 sideUV = uv * (i + 1.57) * absoluteSize * scale;
            sideUV.x += time * iSpeed * 50.0;
            
            // Fourth pattern - diagonal movement
            vec2 diagUV = uv * (i + 0.78) * absoluteSize * scale;
            diagUV.x += time * iSpeed * 30.0;
            diagUV.y += time * iSpeed * 30.0;

            // Combine all patterns for more complex glitter
            result += 
                texture2D(iChannel0, backUV).r *
                texture2D(iChannel0, frontUV).g *
                texture2D(iChannel0, sideUV).b *
                (0.5 + 0.5 * texture2D(iChannel0, diagUV).r);
        }
        
        // Add small sparkles that appear and disappear
        float sparkleTime = time * iSpeed * 200.0;
        vec2 sparkleUV = uv * absoluteSize * scale * 0.5;
        float sparkle = texture2D(iChannel0, sparkleUV + vec2(sin(sparkleTime), cos(sparkleTime))).r;
        sparkle = pow(sparkle, 20.0) * 2.0;
        
        // Use the glitterIntensity uniform to control the intensity
        return pow(result + 0.2, iGlitterIntensity) + sparkle;
    }

    vec3 colorFromBrightness(float brightness) {
        // Restore gold/yellow color scheme
        return vec3(
            pow(brightness, iRedPower),   // Red component
            pow(brightness, iGreenPower), // Green component
            pow(brightness, iBluePower)   // Blue component
        );
    }

    vec3 formula(vec2 uv) {
        // Use uniform values for displacement parameters
        float displacementScale = iDisplacementScale;
        float displacementSpeed = iDisplacementSpeed;
        float displacementStrength = iDisplacementStrength;
        
        float displacement = snoise(vec3(
            uv * displacementScale,
            iTime * displacementSpeed
        ));
        
        displacement = displacement * 0.5 + 0.5;
        
        uv.x += displacementStrength * sin(displacement * TAU);
        uv.y += displacementStrength * cos(displacement * TAU);
        
        //
        
        // Use uniform values for noise parameters
        float noiseScale = iNoiseScale;
        float speed = iNoiseSpeed;
        float noiseTime = iTime * speed;
        float noise = snoise(vec3(uv * noiseScale, noiseTime));
        noise = pow(noise * 0.5 + 0.55, 8.);
       
        //
        
        return vec3(noise);
    }

    vec3 gs = vec3(0.21, 0.72, 0.07);

    vec3 bump(vec2 p, float e) {
        vec2 h = vec2(e, 0.0);
        mat3 m = mat3(
            formula(p + h) - formula(p - h),
            formula(p + h.yx) - formula(p - h.yx),
            -0.3*gs);
        
        vec3 g = (gs*m)/e;
        
        return normalize(g);
    }

    float edge(vec2 p, float e) {
        vec2 h = vec2(e, 0.0);
        float d = dot(gs, formula(p));
        vec3 n1 = gs*mat3(formula(p + h.xy), formula(p + h.yx), vec3(0));
        vec3 n2 = gs*mat3(formula(p - h.xy), formula(p - h.yx), vec3(0));
        
        vec3 vv = abs(d - 0.5*(n1 + n2));
        float v = min(1.0, pow(vv.x+vv.y+vv.z, 0.55)*1.0);
        
        return v;
    }

    void main() {
        vec2 fragCoord = vUv * iResolution.xy;
        vec4 fragColor;

        float aspect = iResolution.x / iResolution.y;
        vec2 p = fragCoord.xy / iResolution.xy;
        p -= 0.5;
        p.x *= aspect;
        p.y -= iTime * iSpeed;
        
        vec3 rd = normalize(vec3(p, 1.0));
        
        vec3 sn = bump(p, 0.01);
        vec3 re = reflect(rd, sn);
        float col = 0.;
        
        col += 0.5*clamp(dot(-rd,sn), 0.0, 1.0);
        col += 0.8*pow(clamp(1.0 + dot(rd, sn), 0.0, 1.0), 8.0);
        float f = formula(p).x;
        col *= f;
        col += pow(clamp(dot(-rd, re), 0.0, 1.0), 8.0)*(10.0*f);
        
        col *= edge(p, 0.01);
        
        col = pow(col, 1.0/2.2);
        
        //
        p.x += 0.0025 * sin(f * TAU);
        p.y += 0.0025 * cos(f * TAU);
        
        
        float result = randomNoise(p, iTime * 0.01);
        
        // Use mouse position for interactive highlight
        vec2 mp = iMouse.xy / iResolution.xy;
        
        // Fallback to center if no mouse movement
        if (length(mp) < 0.01) {
            mp = vec2(0.5, 0.5);
        }
        
        mp -= 0.5;
        mp.x *= aspect;
        mp.y -= iTime * iSpeed;
        col *= (pow(max(0.0, 0.93 - length(mp - p) * 1.8), 6.0) + 0.01);
        
        vec3 fincol = colorFromBrightness(result * col + 0.03 * col);
        
        // Adjust exposure and color balance for gold/yellow appearance
        fincol = exposure(fincol, iExposure);
        fincol = ContrastSaturationBrightness(fincol, iBrightness, iSaturation, iContrast);
        
        gl_FragColor = vec4(fincol, 1.0);
    }
  `
);

// Extend Three.js with our custom shader material
extend({ GlitterShaderMaterial });

export function NewGlitterBackground({
  size = 0.0017,
  layers = 3,
  intensity = 12,
  speed = 0.01,
  redPower = 0.35,
  greenPower = 0.4,
  bluePower = 1.8,
  exposure = 2.0,
  brightness = 1.8,
  saturation = 1.6,
  contrast = 1.2,
  displacementScale = 1.5,
  displacementSpeed = 0.08,
  displacementStrength = 0.055,
  noiseScale = 2.0,
  noiseSpeed = 0.05,
}) {
  const materialRef = useRef();
  const { pointer, size: viewportSize } = useThree();

  // Create a noise texture for the shader
  const noiseTexture = useMemo(() => createNoiseTexture(), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.iTime = state.clock.elapsedTime;
      materialRef.current.iResolution.set(
        state.size.width,
        state.size.height,
        1
      );

      // Fix inverted mouse position - use correct Y coordinate mapping
      const x = ((pointer.x + 1) / 2) * state.size.width;
      const y = ((pointer.y + 1) / 2) * state.size.height; // Fix the inversion

      materialRef.current.iMouse.set(x, y, 0, 0);

      // Update glitter parameters from props
      materialRef.current.iGlitterSize = size;
      materialRef.current.iGlitterLayers = layers;
      materialRef.current.iGlitterIntensity = intensity;
      materialRef.current.iSpeed = speed;
      materialRef.current.iRedPower = redPower;
      materialRef.current.iGreenPower = greenPower;
      materialRef.current.iBluePower = bluePower;
      materialRef.current.iExposure = exposure;
      materialRef.current.iBrightness = brightness;
      materialRef.current.iSaturation = saturation;
      materialRef.current.iContrast = contrast;
      materialRef.current.iDisplacementScale = displacementScale;
      materialRef.current.iDisplacementSpeed = displacementSpeed;
      materialRef.current.iDisplacementStrength = displacementStrength;
      materialRef.current.iNoiseScale = noiseScale;
      materialRef.current.iNoiseSpeed = noiseSpeed;
    }
  });

  return (
    <mesh position={[0, 0, -10]} scale={[20, 20, 1]}>
      <planeGeometry args={[1, 1]} />
      <glitterShaderMaterial
        ref={materialRef}
        iChannel0={noiseTexture}
        iGlitterSize={size}
        iGlitterLayers={layers}
        iGlitterIntensity={intensity}
        iSpeed={speed}
        iRedPower={redPower}
        iGreenPower={greenPower}
        iBluePower={bluePower}
        iExposure={exposure}
        iBrightness={brightness}
        iSaturation={saturation}
        iContrast={contrast}
        iDisplacementScale={displacementScale}
        iDisplacementSpeed={displacementSpeed}
        iDisplacementStrength={displacementStrength}
        iNoiseScale={noiseScale}
        iNoiseSpeed={noiseSpeed}
      />
    </mesh>
  );
}
