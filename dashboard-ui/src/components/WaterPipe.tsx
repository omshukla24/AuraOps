import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  points: [number, number, number][];
  flowRef: React.RefObject<number>;
  startAt: number;
  endAt: number;
  color: string;
  radius?: number;
}

export default function WaterPipe({ points, flowRef, startAt, endAt, color, radius = 0.025 }: Props) {
  const orbRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const { curve, geometry, col } = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(c, 64, radius, 8, false);
    return { curve: c, geometry: g, col: new THREE.Color(color) };
  }, [points, color, radius]);

  useFrame(() => {
    const flow = flowRef.current ?? 0;
    const fill = Math.max(0, Math.min(1, (flow - startAt) / (endAt - startAt)));

    if (matRef.current) {
      matRef.current.opacity = fill > 0 ? 0.04 + fill * 0.2 : 0;
      matRef.current.emissiveIntensity = 0.2 + fill * 0.8;
    }

    if (orbRef.current) {
      if (fill > 0.01 && fill < 0.99) {
        const pt = curve.getPoint(fill);
        orbRef.current.position.copy(pt);
        orbRef.current.visible = true;
      } else {
        orbRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          ref={matRef}
          color={col}
          emissive={col}
          emissiveIntensity={0.2}
          transparent
          opacity={0}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <group ref={orbRef} visible={false}>
        <mesh>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={4} />
        </mesh>
        <pointLight color={color} intensity={2} distance={5} decay={2} />
      </group>
    </group>
  );
}
