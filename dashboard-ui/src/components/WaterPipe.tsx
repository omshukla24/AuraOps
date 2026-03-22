import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  points: [number, number, number][];
  progressRef: React.RefObject<number>;
  startAt: number;
  endAt: number;
  color: string;
}

export default function WaterPipe({ points, progressRef, startAt, endAt, color }: Props) {
  const lineRef = useRef<any>(null);

  const { curve, length, linePoints } = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const len = c.getLength();
    const pts = c.getPoints(64);
    return { curve: c, length: len, linePoints: pts };
  }, [points]);

  useFrame(() => {
    if (lineRef.current?.material) {
      const globalProgress = progressRef.current ?? 0;
      let fill = 0;
      if (globalProgress >= endAt) fill = 1;
      else if (globalProgress > startAt) fill = (globalProgress - startAt) / (endAt - startAt);
      
      lineRef.current.material.dashOffset = length - (length * fill);
      lineRef.current.material.opacity = fill > 0 ? 0.9 : 0;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={linePoints}
      color={color}
      lineWidth={3}
      transparent
      opacity={0} // dynamically set in useFrame
      dashed={true}
      dashSize={length}
      gapSize={length} // Prevents repeating dashes from rendering the entire line prematurely
      dashScale={1}
      dashOffset={length} // Initial state fully hidden
    />
  );
}
