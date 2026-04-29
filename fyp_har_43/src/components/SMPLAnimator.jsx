import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SMPL_BONE_ORDER = [
  'Pelvis', 'L_Hip', 'R_Hip', 'Spine1', 'L_Knee', 'R_Knee', 'Spine2',
  'L_Ankle', 'R_Ankle', 'Spine3', 'L_Foot', 'R_Foot', 'Neck', 'L_Collar',
  'R_Collar', 'Head', 'L_Shoulder', 'R_Shoulder', 'L_Elbow', 'R_Elbow',
  'L_Wrist', 'R_Wrist', 'L_Hand', 'R_Hand'
];

// NEW: Added modelPath and position props
export default function SMPLAnimator({ motionData, frameRef, showHelpers, modelPath = '/models/smpl_model.glb', position = [0, 0, 0] }) {
  const { scene } = useGLTF(modelPath);
  const boneMap = useRef({});
  const [modelScale, setModelScale] = useState(1);

  useEffect(() => {
    if (scene) {
      scene.updateMatrixWorld(true);
      const boundingBox = new THREE.Box3().setFromObject(scene);
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      if (maxDimension > 0 && isFinite(maxDimension)) {
        setModelScale(2.2 / maxDimension);
      }
      const map = {};
      scene.traverse((child) => {
        if (child.isBone) {
          const baseName = child.name.replace('f_avg_', '');
          map[baseName] = child;
        }
      });
      boneMap.current = map;
    }
  }, [scene]);

  useFrame(() => {
    if (!motionData || motionData.length === 0 || frameRef.current === undefined) return;
    let frameIndex = frameRef.current;
    if (frameIndex >= motionData.length) frameIndex = motionData.length - 1;
    if (frameIndex < 0) frameIndex = 0;
    const frameData = motionData[frameIndex];
    if (!frameData || frameData.length < 72) return;

    const axis = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();

    for (let i = 0; i < 24; i++) {
      const boneName = SMPL_BONE_ORDER[i];
      const bone = boneMap.current[boneName];
      if (bone) {
        const x = frameData[i * 3];
        const y = frameData[i * 3 + 1];
        const z = frameData[i * 3 + 2];
        const angle = Math.sqrt(x*x + y*y + z*z);
        if (angle > 0.0001) {
          axis.set(x, y, z).normalize();
          quaternion.setFromAxisAngle(axis, angle);
          bone.quaternion.copy(quaternion);
        } else {
          bone.quaternion.identity();
        }
      }
    }
  });

  return (
    <group position={position}>
      <primitive object={scene} scale={modelScale} rotation={[Math.PI, Math.PI, 0]} />
      {showHelpers && <gridHelper args={[3, 10, '#444444', '#222222']} position={[0, -1.1, 0]} />}
      {showHelpers && <axesHelper args={[1]} position={[0, -1.1, 0]} />}
    </group>
  );
}