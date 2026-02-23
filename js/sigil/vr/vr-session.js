/**
 * vr-session.js — WebXR Session Manager
 * ═══════════════════════════════════════════════════════════
 * Three.js scene + WebXR immersive-vr.
 * Quest 2 target: 72fps, Adreno 650.
 *
 * Browser-native ES Module.
 * ═══════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class VRSession {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.renderer = null;
        this.controllers = [];
        this.controllerGrips = [];
        this.clock = new THREE.Clock();
        this.onFrame = null;  // callback: (delta, elapsed) => void
    }

    init() {
        // ── Renderer ──
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        document.body.appendChild(this.renderer.domElement);

        // ── VR Button ──
        const vrButton = VRButton.createButton(this.renderer);
        vrButton.style.fontFamily = "'Courier New', monospace";
        vrButton.style.letterSpacing = '2px';
        document.body.appendChild(vrButton);

        // ── Camera ──
        this.camera.position.set(0, 1.6, 3);
        this.scene.add(this.camera);

        // ── Ambient ──
        this.scene.fog = new THREE.FogExp2(0x000000, 0.08);
        const ambient = new THREE.AmbientLight(0x112211, 0.3);
        this.scene.add(ambient);

        // ── Controllers ──
        this._setupControllers();

        // ── Resize handler ──
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // ── Render loop ──
        this.renderer.setAnimationLoop((timestamp, frame) => {
            const delta = this.clock.getDelta();
            const elapsed = this.clock.getElapsedTime();

            if (this.onFrame) {
                this.onFrame(delta, elapsed, frame);
            }

            this.renderer.render(this.scene, this.camera);
        });
    }

    _setupControllers() {
        const factory = new XRControllerModelFactory();

        for (let i = 0; i < 2; i++) {
            // Controller (ray origin)
            const controller = this.renderer.xr.getController(i);
            this.scene.add(controller);
            this.controllers.push(controller);

            // Controller grip (model)
            const grip = this.renderer.xr.getControllerGrip(i);
            grip.add(factory.createControllerModel(grip));
            this.scene.add(grip);
            this.controllerGrips.push(grip);

            // Ray visual
            const ray = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, 0, -4)
                ]),
                new THREE.LineBasicMaterial({
                    color: 0x33ff33,
                    transparent: true,
                    opacity: 0.4
                })
            );
            controller.add(ray);
        }
    }

    /**
     * Get the XR session (null if not in VR).
     */
    getXRSession() {
        return this.renderer.xr.getSession();
    }

    /**
     * Check if currently in VR mode.
     */
    isPresenting() {
        return this.renderer.xr.isPresenting;
    }
}
