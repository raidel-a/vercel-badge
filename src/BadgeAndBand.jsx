/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */

import * as THREE from "three";
import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, useHelper } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";

// Import assets using Vite's import.meta.url
import bandTextureUrl from "./assets/band2.jpg?url";
import tagModelUrl from "./assets/tag2.glb?url";

export function BadgeAndBand({
  debug = false,
  bandMaterialProps = {
    bandColor: "#ffffff",
    bandRoughness: 0.8,
    bandMetalness: 0.8,
    bandClearcoat: 0.1,
    bandClearcoatRoughness: 0.1,
    bandEnvMapIntensity: 1.2,
  },
  bandGeometryProps = {
    bandWidth: 0.2,
    bandThickness: 0.04,
    textureRepeats: 4,
  },
  ribbonRotationOffset = { x: 0, y: 0, z: 0 },
  // Add rotation control for the entire component
  rotation = { x: 0, y: 0, z: 0 },
}) {
  const bandRef = useRef(), fixed = useRef(), j1 = useRef(), j2 = useRef(), j3 = useRef(), card = useRef() // prettier-ignore
  const vec = new THREE.Vector3(), ang = new THREE.Vector3(), rot = new THREE.Vector3(), dir = new THREE.Vector3() // prettier-ignore
  const cardHelper = useRef();
  const tubeRef = useRef();

  // Replace the fixed referenceUp vector with a dynamically calculated one based on the card's orientation
  const dynamicReferenceUp = useRef(new THREE.Vector3());

  // Use helpers when debug is enabled
  useHelper(debug && cardHelper, THREE.BoxHelper, "cyan");

  const segmentProps = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 0.8,
    linearDamping: 3,
  };
  const { nodes, materials } = useGLTF(tagModelUrl);
  const texture = useTexture(bandTextureUrl);
  // const { width, height } = useThree((state) => state.size);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(), // Add a sixth point for our enhanced curve
      ])
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  // Create a custom flat ribbon geometry with thickness and stable orientation
  const createRibbonGeometry = (curvePoints, ribbonWidth) => {
    // Create a path from the curve points
    const path = new THREE.CatmullRomCurve3(curvePoints);
    path.curveType = "chordal";

    // Number of points along the path
    const segments = 52;

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const uvs = [];

    // Create a stable frame for the ribbon using a consistent up vector
    const tangents = [];
    const binormals = [];
    const normalVectors = [];

    // Calculate tangents along the curve
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      tangents.push(path.getTangentAt(t).normalize());
    }

    // Calculate normals and binormals with a dynamic up reference
    for (let i = 0; i <= segments; i++) {
      const tangent = tangents[i];

      // Use the dynamic reference up vector to create a stable binormal
      const binormal = new THREE.Vector3()
        .crossVectors(tangent, dynamicReferenceUp.current)
        .normalize();

      // Calculate the normal from the tangent and binormal
      const normal = new THREE.Vector3()
        .crossVectors(binormal, tangent)
        .normalize();

      binormals.push(binormal);
      normalVectors.push(normal);
    }

    // Half width of the ribbon
    const halfWidth = ribbonWidth / 2;
    // Half thickness of the ribbon - ensure it's not too small
    const halfThickness = Math.max(0.005, bandGeometryProps.bandThickness / 2);

    // Number of texture repeats along the length
    const textureRepeats = bandGeometryProps.textureRepeats;

    // Create vertices along the path
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = path.getPointAt(t);
      const normal = normalVectors[i];
      const binormal = binormals[i];

      // Front face - top edge
      const v1 = new THREE.Vector3()
        .copy(point)
        .add(new THREE.Vector3().copy(binormal).multiplyScalar(halfWidth))
        .add(new THREE.Vector3().copy(normal).multiplyScalar(halfThickness));

      // Front face - bottom edge
      const v2 = new THREE.Vector3()
        .copy(point)
        .add(new THREE.Vector3().copy(binormal).multiplyScalar(-halfWidth))
        .add(new THREE.Vector3().copy(normal).multiplyScalar(halfThickness));

      // Back face - bottom edge
      const v3 = new THREE.Vector3()
        .copy(point)
        .add(new THREE.Vector3().copy(binormal).multiplyScalar(-halfWidth))
        .add(new THREE.Vector3().copy(normal).multiplyScalar(-halfThickness));

      // Back face - top edge
      const v4 = new THREE.Vector3()
        .copy(point)
        .add(new THREE.Vector3().copy(binormal).multiplyScalar(halfWidth))
        .add(new THREE.Vector3().copy(normal).multiplyScalar(-halfThickness));

      // Add vertices
      // Front face
      vertices.push(v1.x, v1.y, v1.z);
      vertices.push(v2.x, v2.y, v2.z);
      // Back face
      vertices.push(v3.x, v3.y, v3.z);
      vertices.push(v4.x, v4.y, v4.z);

      // Add normals
      // Front face
      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);
      // Back face
      normals.push(-normal.x, -normal.y, -normal.z);
      normals.push(-normal.x, -normal.y, -normal.z);

      // Add UVs with texture repeating along the length
      // Front face
      uvs.push(t * textureRepeats, 0);
      uvs.push(t * textureRepeats, 1);
      // Back face
      uvs.push(t * textureRepeats, 1);
      uvs.push(t * textureRepeats, 0);
    }

    // Create faces (triangles)
    const indices = [];
    for (let i = 0; i < segments; i++) {
      // Front face
      const a1 = i * 4;
      const b1 = i * 4 + 1;
      const c1 = (i + 1) * 4;
      const d1 = (i + 1) * 4 + 1;

      // Back face
      const a2 = i * 4 + 2;
      const b2 = i * 4 + 3;
      const c2 = (i + 1) * 4 + 2;
      const d2 = (i + 1) * 4 + 3;

      // Front face triangles
      indices.push(a1, b1, c1);
      indices.push(c1, b1, d1);

      // Back face triangles
      indices.push(a2, c2, b2);
      indices.push(b2, c2, d2);

      // Top edge triangles
      indices.push(a1, c1, b2);
      indices.push(b2, c1, d2);

      // Bottom edge triangles
      indices.push(b1, a2, d1);
      indices.push(d1, a2, c2);
    }

    // Set attributes
    geometry.setIndex(indices);
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3)
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

    // Compute vertex normals
    geometry.computeVertexNormals();

    return geometry;
  };

  // Update the ribbon geometry
  const updateTubeGeometry = (curvePoints) => {
    if (tubeRef.current) {
      // Create a new ribbon geometry
      const newGeometry = createRibbonGeometry(
        curvePoints,
        bandGeometryProps.bandWidth
      );

      // Update the mesh geometry
      tubeRef.current.geometry.dispose();
      tubeRef.current.geometry = newGeometry;
    }
  };

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]) // prettier-ignore
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]) // prettier-ignore
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]) // prettier-ignore
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.5, 0]]) // prettier-ignore

  // Add a reference to track the card's orientation
  const cardOrientation = useRef(new THREE.Quaternion());
  // Add a reference to track the original j3 position relative to the card
  // Adjust this to match the direction we want the ribbon to flow from the clip
  const j3RelativePos = useRef(new THREE.Vector3(0, -1.52, 0));

  // Track the original rigid body type of j3
  const j3OriginalType = useRef("dynamic");

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => void (document.body.style.cursor = "auto");
    }
  }, [hovered, dragged]);

  useFrame((state) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      // Get the card's current rotation
      cardOrientation.current.copy(card.current.rotation());

      // Create a separate rotation for the Y-axis to ensure it's applied
      const yRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        ribbonRotationOffset.y * Math.PI
      );

      // Create X and Z rotations
      const xzRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          ribbonRotationOffset.x * Math.PI,
          0,
          ribbonRotationOffset.z * Math.PI
        )
      );

      // Apply rotations in sequence: first Y, then X and Z
      const adjustedRotation = new THREE.Quaternion()
        .copy(cardOrientation.current)
        .multiply(yRotation)
        .multiply(xzRotation);

      // Force j3 to match the badge rotation with the applied offset
      // First, temporarily make j3 kinematic to force rotation
      if (j3.current.bodyType() !== "kinematicPosition") {
        j3OriginalType.current = j3.current.bodyType();
        j3.current.setBodyType("kinematicPosition");
      }

      // Apply the rotation using kinematic control
      j3.current.setNextKinematicRotation(adjustedRotation);

      // Get the current position
      const j3Pos = j3.current.translation();

      // Apply the position using kinematic control to maintain it
      j3.current.setNextKinematicTranslation(j3Pos);

      // Initialize or update lerped positions for j1 and j2
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped) {
          ref.current.lerped = new THREE.Vector3().copy(
            ref.current.translation()
          );
        } else {
          // Update lerped position with a smooth transition
          ref.current.lerped.lerp(ref.current.translation(), 0.1);
        }
      });

      // Fix most of the jitter when over pulling the card
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(
            ref.current.translation()
          );
      });

      // Update cardOrientation with the card's current rotation
      cardOrientation.current.copy(card.current.rotation());

      // Calculate the ideal position for j3 based on the card's position and orientation
      const cardPos = card.current.translation();
      const idealJ3Pos = new THREE.Vector3();

      // Apply the card's rotation to the relative position
      // Use the ADJUSTED rotation that includes the offset
      idealJ3Pos.copy(j3RelativePos.current).applyQuaternion(adjustedRotation);
      // Add the card's position to get the world position
      idealJ3Pos.add(cardPos);

      // Set the position directly using kinematic control
      j3.current.setNextKinematicTranslation(idealJ3Pos);

      // Calculate catmul curve
      curve.points[0].copy(j3.current.translation());

      // Create a base direction vector (pointing up)
      const baseDirection = new THREE.Vector3(0, 1, 0);

      // Apply each axis rotation individually for more control
      // First rotate around Y axis (most problematic)
      baseDirection.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        ribbonRotationOffset.y * Math.PI
      );

      // Then rotate around X axis
      baseDirection.applyAxisAngle(
        new THREE.Vector3(1, 0, 0),
        ribbonRotationOffset.x * Math.PI
      );

      // Finally rotate around Z axis
      baseDirection.applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        ribbonRotationOffset.z * Math.PI
      );

      // Now apply the card's rotation to get the final direction
      const ribbonDirection = baseDirection
        .clone()
        .applyQuaternion(cardOrientation.current)
        .normalize();

      // Create the first intermediate point a short distance from j3 in the ribbon direction
      const firstIntermediatePoint = new THREE.Vector3()
        .copy(j3.current.translation())
        .add(ribbonDirection.clone().multiplyScalar(0.15));

      // Use this as our first intermediate control point
      curve.points[1].copy(firstIntermediatePoint);

      // For the second intermediate point, extend further in the same direction
      const secondIntermediatePoint = new THREE.Vector3()
        .copy(firstIntermediatePoint)
        .add(ribbonDirection.clone().multiplyScalar(0.2));

      // Use this as our second intermediate control point
      curve.points[2].copy(secondIntermediatePoint);

      // Ensure j2.current.lerped exists before using it
      const directionToJ2 = new THREE.Vector3();
      if (j2.current.lerped) {
        directionToJ2
          .copy(j2.current.lerped)
          .sub(secondIntermediatePoint)
          .normalize();
      } else {
        // Fallback if lerped is not available
        directionToJ2
          .copy(j2.current.translation())
          .sub(secondIntermediatePoint)
          .normalize();
      }

      // The rest of the curve follows the physics simulation
      curve.points[3].copy(j2.current.lerped);
      curve.points[4].copy(j1.current.lerped);
      curve.points[5] = curve.points[5] || new THREE.Vector3(); // Add a sixth point
      curve.points[5].copy(fixed.current.translation());

      // For the original meshLine (keeping for debug mode)
      if (bandRef.current) {
        bandRef.current.geometry.setPoints(curve.getPoints(48)); // Increase for smoother curve with 6 control points
      }

      // For the ribbon geometry
      if (tubeRef.current) {
        updateTubeGeometry(curve.getPoints(48)); // Increase for smoother curve with 6 control points
      }

      // Tilt it back towards the screen
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }

    if (card.current) {
      // Calculate the dynamicReferenceUp vector based on both the card rotation AND the ribbon offset
      // This is what was forcing the ribbon to always face the camera

      // Start with a vector pointing to the camera (z-axis)
      const cameraDirection = new THREE.Vector3(0, 0, 1);

      // Apply the ribbon rotation offset to this vector
      // This allows the ribbon rotation to affect how the ribbon faces the camera
      cameraDirection.applyAxisAngle(
        new THREE.Vector3(1, 0, 0),
        ribbonRotationOffset.x * Math.PI
      );

      cameraDirection.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        ribbonRotationOffset.y * Math.PI
      );

      cameraDirection.applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        ribbonRotationOffset.z * Math.PI
      );

      // Then apply the card's rotation
      dynamicReferenceUp.current = cameraDirection
        .applyQuaternion(card.current.rotation())
        .normalize();
    }
  });

  curve.curveType = "chordal";
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  // Create initial ribbon geometry
  const initialRibbonGeometry = useMemo(() => {
    return createRibbonGeometry(
      curve.getPoints(48),
      bandGeometryProps.bandWidth
    );
  }, [
    curve,
    bandGeometryProps.bandWidth,
    bandGeometryProps.bandThickness,
    bandGeometryProps.textureRepeats,
    dynamicReferenceUp,
  ]);

  // Create a ref for the entire component group
  const groupRef = useRef();

  // Apply rotation to the entire group when rotation prop changes
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.set(
        rotation.x * Math.PI,
        rotation.y * Math.PI,
        rotation.z * Math.PI
      );
    }
  }, [rotation.x, rotation.y, rotation.z]);

  return (
    <group ref={groupRef}>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed">
          {debug && <sphereGeometry args={[0.1]} />}
          {debug && <meshBasicMaterial color="red" wireframe />}
        </RigidBody>
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
          {debug && <sphereGeometry args={[0.1]} />}
          {debug && <meshBasicMaterial color="green" wireframe />}
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
          {debug && <sphereGeometry args={[0.1]} />}
          {debug && <meshBasicMaterial color="blue" wireframe />}
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
          {debug && <sphereGeometry args={[0.1]} />}
          {debug && <meshBasicMaterial color="yellow" wireframe />}
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            ref={cardHelper}
            scale={2.25}
            position={[0, -1.2, 0]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => (
              e.target.releasePointerCapture(e.pointerId), drag(false)
            )}
            onPointerDown={(e) => (
              e.target.setPointerCapture(e.pointerId),
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              )
            )}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={materials.base.map}
                map-anisotropy={16}
                clearcoat={1}
                clearcoatRoughness={0.15}
                roughness={0.3}
                metalness={0.5}
                envMapIntensity={1.5}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
              material-envMapIntensity={2}
            />
            <mesh
              geometry={nodes.clamp.geometry}
              material={materials.metal}
              material-envMapIntensity={2}
            />
          </group>
        </RigidBody>
      </group>

      {/* Original meshLine band (only visible in debug mode) */}
      {/* {debug && (
        <mesh ref={bandRef}>
          <meshLineGeometry />
          <meshLineMaterial
            color="cyan"
            depthTest={false}
            resolution={[width, height]}
            lineWidth={1}
            transparent
            opacity={0.5}
          />
        </mesh>
      )} */}

      {/* New ribbon geometry with lighting support */}
      <mesh ref={tubeRef} geometry={initialRibbonGeometry}>
        <meshPhysicalMaterial
          map={texture}
          map-anisotropy={16}
          clearcoat={Math.max(bandMaterialProps.bandClearcoat * 2, 0.3)}
          clearcoatRoughness={bandMaterialProps.bandClearcoatRoughness}
          roughness={Math.min(bandMaterialProps.bandRoughness * 0.8, 0.7)}
          metalness={Math.max(bandMaterialProps.bandMetalness * 1.1, 0.5)}
          envMapIntensity={bandMaterialProps.bandEnvMapIntensity * 1.5}
          color={bandMaterialProps.bandColor}
          side={THREE.DoubleSide}
          transparent
          opacity={1.0}
        />
      </mesh>

      {/* Shadow caster to create a shadow where the ribbon enters the clip */}
      <mesh
        position={[0, 0, 0]}
        scale={[0.1, 0.1, 0.1]}
        visible={false}
        castShadow
      >
        <sphereGeometry />
        <meshBasicMaterial />
      </mesh>

      {debug && (
        <group position={[0, 0, -1]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.1]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <axesHelper args={[1]} />
          <gridHelper args={[10, 10]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      )}
    </group>
  );
}
