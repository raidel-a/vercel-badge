/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, SoftShadows } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { NewGlitterBackground } from "./NewGlitterBackground";
import { BadgeAndBand } from "./BadgeAndBand";
import { useControls, folder } from "leva";

export default function App() {
  const { showGlitter, ...glitterControls } = useControls({
    showGlitter: {
      value: false,
      label: "Show Glitter Background",
    },
    glitterControls: folder({
      size: {
        value: 0.005,
        min: 0.0005,
        max: 0.01,
        step: 0.0001,
        label: "Size",
      },
      layers: {
        value: 3,
        min: 1,
        max: 5,
        step: 1,
        label: "Layers",
      },
      intensity: {
        value: 12,
        min: 6,
        max: 20,
        step: 0.5,
        label: "Intensity",
      },
      speed: {
        value: 0.0,
        min: 0.001,
        max: 0.09,
        step: 0.001,
        label: "Speed",
      },
    }),
    colorControls: folder(
      {
        redPower: {
          value: 0.35,
          min: 0.1,
          max: 2.0,
          step: 0.05,
          label: "Red",
        },
        greenPower: {
          value: 0.4,
          min: 0.1,
          max: 2.0,
          step: 0.05,
          label: "Green",
        },
        bluePower: {
          value: 1.8,
          min: 0.1,
          max: 2.0,
          step: 0.05,
          label: "Blue",
        },
        exposure: {
          value: 2.0,
          min: 0.5,
          max: 3.0,
          step: 0.1,
          label: "Exposure",
        },
        brightness: {
          value: 1.8,
          min: 0.5,
          max: 3.0,
          step: 0.1,
          label: "Brightness",
        },
        saturation: {
          value: 1.6,
          min: 0.5,
          max: 3.0,
          step: 0.1,
          label: "Saturation",
        },
        contrast: {
          value: 1.2,
          min: 0.5,
          max: 3.0,
          step: 0.1,
          label: "Contrast",
        },
      },
      { label: "Color Settings" }
    ),
    effectControls: folder(
      {
        displacementScale: {
          value: 1.5,
          min: 0.5,
          max: 3.0,
          step: 0.1,
          label: "Disp. Scale",
        },
        displacementSpeed: {
          value: 0.08,
          min: 0.01,
          max: 0.2,
          step: 0.01,
          label: "Disp. Speed",
        },
        displacementStrength: {
          value: 0.055,
          min: 0.01,
          max: 0.2,
          step: 0.005,
          label: "Disp. Strength",
        },
        noiseScale: {
          value: 2.0,
          min: 0.5,
          max: 5.0,
          step: 0.1,
          label: "NoiseScale",
        },
        noiseSpeed: {
          value: 0.05,
          min: 0.01,
          max: 0.2,
          step: 0.01,
          label: "NoiseSpeed",
        },
      },
      { label: "Effect Settings" }
    ),
  });

  const { maxSpeed, minSpeed, debug } = useControls("Badge Settings", {
    maxSpeed: {
      value: 20,
      min: 5,
      max: 50,
      step: 1,
      label: "Max Speed",
    },
    minSpeed: {
      value: 10,
      min: 1,
      max: 20,
      step: 1,
      label: "Min Speed",
    },
    debug: {
      value: false,
      label: "Debug Mode",
    },
  });

  const { accentLightColor, accentLightIntensity } = useControls("Lighting", {
    accentLightColor: {
      value: "#ffc700",
      label: "Backlight",
    },
    accentLightIntensity: {
      value: 5,
      min: 0,
      max: 10,
      step: 0.1,
      label: "Intensity",
    },
  });

  const bandMaterialControls = useControls("Band Material", {
    bandColor: {
      value: "#ffffff",
      label: "Band Color",
    },
    bandRoughness: {
      value: 0.8,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Roughness",
    },
    bandMetalness: {
      value: 0.8,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Metalness",
    },
    bandClearcoat: {
      value: 0.1,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Clearcoat",
    },
    bandClearcoatRoughness: {
      value: 0.1,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Clearcoat Roughness",
    },
    bandEnvMapIntensity: {
      value: 1.2,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Env Map Intensity",
    },
  });

  const bandGeometryControls = useControls("Band Geometry", {
    bandWidth: {
      value: 0.2,
      min: 0.1,
      max: 1.0,
      step: 0.05,
      label: "Width",
    },
    bandThickness: {
      value: 0.04,
      min: 0.01,
      max: 0.2,
      step: 0.01,
      label: "Thickness",
    },
    textureRepeats: {
      value: 4,
      min: 1,
      max: 10,
      step: 1,
      label: "Texture Repeats",
    },
  });

  return (
    <Canvas camera={{ position: [0, 0, 13], fov: 25 }} shadows>
      <SoftShadows size={10} samples={16} focus={0.5} />

      {showGlitter && <NewGlitterBackground {...glitterControls} />}
      {debug && <axesHelper args={[5]} />}

      <Environment background blur={0.75} resolution={256} preset="city">
        <color attach="background" args={["black"]} />
        <Lightformer
          intensity={3}
          color="#fff"
          position={[0, 5, 5]}
          scale={[10, 10, 1]}
          castShadow
        />
        <Lightformer
          intensity={2}
          color="#777"
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={accentLightIntensity}
          color={accentLightColor}
          position={[0, -5, 5]}
          rotation={[90, 90, 0]}
          scale={[20, 20, 2]}
        />
      </Environment>

      <Physics
        interpolate
        gravity={[0, -30, 0]}
        timeStep={1 / 60}
        debug={debug}
      >
        <BadgeAndBand
          maxSpeed={maxSpeed}
          minSpeed={minSpeed}
          debug={debug}
          bandMaterialProps={bandMaterialControls}
          bandGeometryProps={bandGeometryControls}
          ribbonRotationOffset={{ x: 0.0, y: 0.12, z: 0.0 }} // 90 degrees (π/2) around X axis
          rotation={{ x: 0, y: 0.0, z: 0 }}
        />
      </Physics>
    </Canvas>
  );
}
