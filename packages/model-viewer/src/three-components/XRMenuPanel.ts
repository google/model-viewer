
import {Camera, CanvasTexture, Mesh,Object3D, Shape,ShapeGeometry, LinearFilter, MeshBasicMaterial, PlaneGeometry, XRTargetRaySpace, Vector3} from 'three';
import {Damper} from './Damper.js';
import {ModelScene} from './ModelScene.js';
import { PlacementBox } from './PlacementBox.js';

const MAX_OPACITY = 1;
const PANEL_WIDTH = 0.1;
const PANEL_HEIGHT = 0.1;
const PANEL_CORNER_RADIUS = 0.02;

export class XRMenuPanel extends Object3D {
  private panelMesh: Mesh;
  private exitButton: Mesh;
  private goalOpacity: number;
  private opacityDamper: Damper;
  
  constructor() {
    super(); 
    const panelShape = new Shape();
    const w = PANEL_WIDTH, h = PANEL_HEIGHT, r = PANEL_CORNER_RADIUS;
    //  straight horizontal bottom edge and a rounded bottom-right corner with a radius of r
    panelShape.moveTo(-w / 2 + r, -h / 2);
    panelShape.lineTo(w / 2 - r, -h / 2);
    panelShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    // the right most line and the rounded up-right
    panelShape.lineTo(w / 2, h / 2 - r);
    panelShape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    // the horizontal top edge and rounded up-left
    panelShape.lineTo(-w / 2 + r, h / 2);
    panelShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    // the left line and bottom left corner
    panelShape.lineTo(-w / 2, -h / 2 + r);
    panelShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); 
    const geometry = new ShapeGeometry(panelShape);
    const material = new MeshBasicMaterial({
      color: 0x000000,
      opacity: MAX_OPACITY,
      transparent: true
    }); 
    this.panelMesh = new Mesh(geometry, material);
    this.panelMesh.name = 'MenuPanel';
    this.add(this.panelMesh); 
    this.exitButton = this.createButton('x');
    this.exitButton.name = 'ExitButton';
    this.exitButton.position.set(0, 0, 0.01);
    this.add(this.exitButton) 
    this.opacityDamper = new Damper();
    this.goalOpacity = MAX_OPACITY;
  } 

  createButton(label: string, options?: {
    width?: number;
    height?: number;
    fontSize?: number;
    textColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
  }): Mesh {
    const {
      width = 0.05,
      height = 0.05,
      fontSize = 80,
      textColor = '#cccccc',
      backgroundColor = 'transparent',
      fontFamily = 'sans-serif'
    } = options || {};
    
    const canvasSize = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d')!;
    
    // Background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasSize, canvasSize);
    }
  
    // Text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvasSize / 2, canvasSize / 2);
  
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = LinearFilter;
  
    const material = new MeshBasicMaterial({ map: texture, transparent: true });
    const geometry = new PlaneGeometry(width, height);
    return new Mesh(geometry, material);
  }
 
  exitButtonControllerIntersection(scene: ModelScene, controller: XRTargetRaySpace) {
      const hitResult = scene.hitFromController(controller, this.exitButton);
      return hitResult;
  }
   
  updatePosition(camera: Camera, placementBox: PlacementBox)  {
    if (!placementBox) {
      return;
    } 
    // Get the world position of the placement box
    const placementBoxWorldPos = new Vector3();
    placementBox.getWorldPosition(placementBoxWorldPos); 
    // Calculate a position slightly in front of the placement box
    const offsetUp = -0.2;  // Offset upward from the placement box
    const offsetForward = 0.9;  // Offset forward from the placement box 
    // Get direction from placement box to camera (horizontal only)
    const directionToCamera = new Vector3()
        .copy(camera.position)
        .sub(placementBoxWorldPos);
    directionToCamera.y = 0;  // Zero out vertical component
    directionToCamera.normalize(); 
    // Calculate the final position
    const panelPosition = new Vector3()
        .copy(placementBoxWorldPos)
        .add(new Vector3(0, offsetUp, 0))  // Move up
        .add(directionToCamera.multiplyScalar(offsetForward));  // Move forward 
    this.position.copy(panelPosition); 
    // Make the menu panel face the camera
    this.lookAt(camera.position);
  }

  /**
   * Set the box's visibility; it will fade in and out.
   */
  set show(visible: boolean) {
    this.goalOpacity = visible ? MAX_OPACITY : 0;
  }

  /**
   * Call on each frame with the frame delta to fade the box.
   */
  updateOpacity(delta: number) {
    const material = this.panelMesh.material as MeshBasicMaterial;
    const currentOpacity = material.opacity;
    const newOpacity = this.opacityDamper.update(currentOpacity, this.goalOpacity, delta, 1);
    this.traverse((child) => {
      if (child instanceof Mesh) {
        const mat = child.material as MeshBasicMaterial;
        if (mat.transparent) mat.opacity = newOpacity;
      }
    });
    this.visible = newOpacity > 0;
  }

  dispose() {
    this.children.forEach(child => {
      if (child instanceof Mesh) {
        // Dispose geometry first
        if (child.geometry) {
          child.geometry.dispose();
        }

        // Handle material(s)
        // Material can be a single Material or an array of Materials
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach(material => {
          if (material) { // Ensure material exists before proceeding
            // Dispose texture if it exists and is a CanvasTexture
            // We specifically created CanvasTextures for buttons, so check for that type.
            if ('map' in material && material.map instanceof CanvasTexture) { // Check if 'map' property exists and is a CanvasTexture
              material.map.dispose();
            }
            // Dispose material itself
            material.dispose();
          }
        });
      }
    });
  
    // Remove the panel itself from its parent in the scene graph
    this.parent?.remove(this);
  }
}
  