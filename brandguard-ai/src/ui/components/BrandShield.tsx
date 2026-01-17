import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BrandShieldProps {
  isAnimating: boolean;
}

const BrandShield: React.FC<BrandShieldProps> = ({ isAnimating }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    shield: THREE.Mesh;
    crystals: THREE.Mesh[];
    animationId: number | null;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(200, 200);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x0265DC, 1.5);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x2D9D78, 1);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Create shield geometry (dodecahedron for brand shield look)
    const shieldGeometry = new THREE.DodecahedronGeometry(1.5, 0);
    const shieldMaterial = new THREE.MeshPhongMaterial({
      color: 0x0265DC,
      transparent: true,
      opacity: 0.3,
      wireframe: false,
      shininess: 100,
      emissive: 0x0265DC,
      emissiveIntensity: 0.2
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    scene.add(shield);

    // Create crystal mesh points (wireframe overlay)
    const crystalGeometry = new THREE.IcosahedronGeometry(1.6, 1);
    const crystalMaterial = new THREE.MeshBasicMaterial({
      color: 0x00D9FF,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const crystal1 = new THREE.Mesh(crystalGeometry, crystalMaterial);
    scene.add(crystal1);

    // Inner rotating crystal
    const innerCrystalGeometry = new THREE.OctahedronGeometry(0.8, 0);
    const innerCrystalMaterial = new THREE.MeshPhongMaterial({
      color: 0x2D9D78,
      transparent: true,
      opacity: 0.5,
      wireframe: false,
      shininess: 80,
      emissive: 0x2D9D78,
      emissiveIntensity: 0.3
    });
    const innerCrystal = new THREE.Mesh(innerCrystalGeometry, innerCrystalMaterial);
    scene.add(innerCrystal);

    const crystals = [crystal1, innerCrystal];

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      shield,
      crystals,
      animationId: null
    };

    // Animation
    let time = 0;
    const animate = () => {
      if (!sceneRef.current) return;

      time += 0.01;
      
      // Rotate shield
      shield.rotation.y += 0.005;
      shield.rotation.x += 0.003;

      // Rotate crystals in opposite direction
      crystal1.rotation.y -= 0.01;
      crystal1.rotation.x -= 0.005;
      
      innerCrystal.rotation.y += 0.015;
      innerCrystal.rotation.z += 0.01;

      // Pulsing effect when analyzing
      if (isAnimating) {
        const pulse = Math.sin(time * 3) * 0.2 + 1;
        shield.scale.setScalar(pulse);
        
        // Vary opacity for breathing effect
        const breathe = Math.sin(time * 2) * 0.2 + 0.5;
        (shield.material as THREE.MeshPhongMaterial).opacity = breathe;
        (shield.material as THREE.MeshPhongMaterial).emissiveIntensity = breathe * 0.4;
        
        // Crystal glow
        (crystalMaterial as THREE.MeshBasicMaterial).opacity = 0.4 + breathe * 0.3;
        (innerCrystalMaterial as THREE.MeshPhongMaterial).emissiveIntensity = 0.3 + breathe * 0.3;
      } else {
        // Reset to normal state
        shield.scale.setScalar(1);
        (shield.material as THREE.MeshPhongMaterial).opacity = 0.3;
        (shield.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.2;
        (crystalMaterial as THREE.MeshBasicMaterial).opacity = 0.6;
        (innerCrystalMaterial as THREE.MeshPhongMaterial).emissiveIntensity = 0.3;
      }

      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      if (sceneRef.current) {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        sceneRef.current.renderer.dispose();
        sceneRef.current.shield.geometry.dispose();
        (sceneRef.current.shield.material as THREE.Material).dispose();
        sceneRef.current.crystals.forEach(crystal => {
          crystal.geometry.dispose();
          (crystal.material as THREE.Material).dispose();
        });
        if (containerRef.current && containerRef.current.contains(sceneRef.current.renderer.domElement)) {
          containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
      }
    };
  }, [isAnimating]);

  return (
    <div 
      ref={containerRef} 
      className="brand-shield-container"
      style={{
        width: '200px',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto'
      }}
    />
  );
};

export default BrandShield;
