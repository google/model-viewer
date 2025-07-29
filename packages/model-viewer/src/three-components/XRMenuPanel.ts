import {Camera, CanvasTexture, Mesh,Object3D, Shape,ShapeGeometry, LinearFilter, MeshBasicMaterial, PlaneGeometry, XRTargetRaySpace, Vector3} from 'three';
import {Damper} from './Damper.js';
import {ModelScene} from './ModelScene.js';
import { PlacementBox } from './PlacementBox.js';
// SVG strings for the icons are defined here to avoid io and better performance for xr.
const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#e8eaed">
    <path d="M6.4,19L5,17.6L10.6,12L5,6.4L6.4,5L12,10.6L17.6,5L19,6.4L13.4,12L19,17.6L17.6,19L12,13.4L6.4,19Z"/>
</svg>`;

const VIEW_REAL_SIZE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#e8eaed">
    <path d="M7,17V9H5V7H9V17H7ZM11,17V15H13V17H11ZM16,17V9H14V7H18V17H16ZM11,13V11H13V13H11Z"/>
</svg>`;

const REPLAY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#E1E2E8">
    <defs>
        <clipPath id="clip0">
            <path d="M0,0h24v24h-24z"/>
        </clipPath>
    </defs>
    <g clip-path="url(#clip0)">
        <path d="M12,22C10.75,22 9.575,21.767 8.475,21.3C7.392,20.817 6.442,20.175 5.625,19.375C4.825,18.558 4.183,17.608 3.7,16.525C3.233,15.425 3,14.25 3,13H5C5,14.95 5.675,16.608 7.025,17.975C8.392,19.325 10.05,20 12,20C13.95,20 15.6,19.325 16.95,17.975C18.317,16.608 19,14.95 19,13C19,11.05 18.317,9.4 16.95,8.05C15.6,6.683 13.95,6 12,6H11.85L13.4,7.55L12,9L8,5L12,1L13.4,2.45L11.85,4H12C13.25,4 14.417,4.242 15.5,4.725C16.6,5.192 17.55,5.833 18.35,6.65C19.167,7.45 19.808,8.4 20.275,9.5C20.758,10.583 21,11.75 21,13C21,14.25 20.758,15.425 20.275,16.525C19.808,17.608 19.167,18.558 18.35,19.375C17.55,20.175 16.6,20.817 15.5,21.3C14.417,21.767 13.25,22 12,22Z"/>
    </g>
</svg>`;

// Panel configuration
const PANEL_CONFIG = {
  width: 0.16,
  height: 0.07,
  cornerRadius: 0.03,
  opacity: 1,
  color: 0x000000,
  // Distance-based scaling configuration
  minDistance: 0.5,  // Minimum distance for scaling (meters)
  maxDistance: 10.0, // Maximum distance for scaling (meters)
  baseScale: 1.0,    // Base scale factor
  distanceScaleFactor: 0.3 // How much to scale per meter of distance
} as const;

// Button configuration
const BUTTON_CONFIG = {
  size: 0.05, // Fixed size for all buttons
  zOffset: 0.01, // Distance from panel surface
  spacing: 0.07 // Space between button centers
} as const;

// Icon configuration
const ICON_CONFIG = {
  canvasSize: 128,
  filter: LinearFilter
} as const;

export class XRMenuPanel extends Object3D {
  private panelMesh!: Mesh;
  private exitButton!: Mesh;
  private toggleButton!: Mesh;
  private goalOpacity: number;
  private opacityDamper: Damper;
  private isActualSize: boolean = false; // Start with normalized size
  
  // Cache for pre-rendered textures
  private static readonly iconTextures = new Map<string, CanvasTexture>();
  
  constructor() {
    super(); 
    
    // Pre-render all icons
    this.preRenderIcons();
    
    this.createPanel();
    this.createButtons();
 
    this.opacityDamper = new Damper();
    this.goalOpacity = PANEL_CONFIG.opacity;
  }

  private createPanel(): void {
    const panelShape = this.createPanelShape();
    const geometry = new ShapeGeometry(panelShape);
    const material = new MeshBasicMaterial({
      color: PANEL_CONFIG.color,
      opacity: PANEL_CONFIG.opacity,
      transparent: true
    }); 
    this.panelMesh = new Mesh(geometry, material);
    this.panelMesh.name = 'MenuPanel';
    this.add(this.panelMesh); 
  }

  private createButtons(): void {
    // Create exit button
    this.exitButton = this.createButton('close');
    this.exitButton.name = 'ExitButton';
    this.exitButton.position.set(BUTTON_CONFIG.spacing / 2, 0, BUTTON_CONFIG.zOffset);
    this.add(this.exitButton);

    // Create toggle button
    this.toggleButton = this.createButton('view-real-size');
    this.toggleButton.name = 'ToggleButton';
    this.toggleButton.position.set(-BUTTON_CONFIG.spacing / 2, 0, BUTTON_CONFIG.zOffset);
    this.add(this.toggleButton);
  }

  private createPanelShape(): Shape {
    const shape = new Shape();
    const { width: w, height: h, cornerRadius: r } = PANEL_CONFIG;
    
    // Create rounded rectangle path
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    
    return shape;
  } 

  private preRenderIcons(): void {
    const iconSvgs = [
      { key: 'close', svg: CLOSE_ICON_SVG },
      { key: 'view-real-size', svg: VIEW_REAL_SIZE_ICON_SVG },
      { key: 'replay', svg: REPLAY_ICON_SVG }
    ];

    iconSvgs.forEach(({ key, svg }) => {
      if (!XRMenuPanel.iconTextures.has(key)) {
        this.createTextureFromSvg(svg, key);
      }
    });
  }

  private createTextureFromSvg(svgContent: string, key: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = ICON_CONFIG.canvasSize;
    canvas.height = ICON_CONFIG.canvasSize;
    const ctx = canvas.getContext('2d')!;
    
    // Create an image from SVG content
    const img = new Image();
    const svgBlob = new Blob([svgContent], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, ICON_CONFIG.canvasSize, ICON_CONFIG.canvasSize);
      
      const texture = new CanvasTexture(canvas);
      texture.needsUpdate = true;
      texture.minFilter = ICON_CONFIG.filter;
      
      XRMenuPanel.iconTextures.set(key, texture);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  createButton(iconKey: string): Mesh {    
    // Create a placeholder mesh
    const material = new MeshBasicMaterial({ transparent: true });
    const geometry = new PlaneGeometry(BUTTON_CONFIG.size, BUTTON_CONFIG.size);
    const mesh = new Mesh(geometry, material);
    
    // Try to get cached texture, or create a fallback
    const cachedTexture = XRMenuPanel.iconTextures.get(iconKey);
    if (cachedTexture) {
      (mesh.material as MeshBasicMaterial).map = cachedTexture;
      (mesh.material as MeshBasicMaterial).needsUpdate = true;
    } else {
      // RACE CONDITION FIX: Texture creation is async (img.onload), but button creation is sync
      // This fallback handles the case where buttons are created before textures finish loading
      this.createTextureFromSvg(iconKey === 'close' ? CLOSE_ICON_SVG : 
                               iconKey === 'view-real-size' ? VIEW_REAL_SIZE_ICON_SVG : 
                               REPLAY_ICON_SVG, iconKey);
      
      // Polling mechanism: Wait for async texture creation to complete
      // This prevents white squares from appearing on first load
      const checkTexture = () => {
        const texture = XRMenuPanel.iconTextures.get(iconKey);
        if (texture) {
          // Texture is ready - apply it to the mesh
          (mesh.material as MeshBasicMaterial).map = texture;
          (mesh.material as MeshBasicMaterial).needsUpdate = true;
        } else {
          // Texture not ready yet - check again in 10ms
          setTimeout(checkTexture, 10);
        }
      };
      checkTexture();
    }
    
    return mesh;
  }
 
  exitButtonControllerIntersection(scene: ModelScene, controller: XRTargetRaySpace) {
      const hitResult = scene.hitFromController(controller, this.exitButton);
      return hitResult;
  }

  scaleModeButtonControllerIntersection(scene: ModelScene, controller: XRTargetRaySpace) {
      const hitResult = scene.hitFromController(controller, this.toggleButton);
      return hitResult;
  }

  handleScaleToggle(
    worldSpaceInitialPlacementDone: boolean,
    initialModelScale: number,
    minScale: number,
    maxScale: number
  ): number | null {
    if (!worldSpaceInitialPlacementDone) {
      return null;
    }
    
    this.isActualSize = !this.isActualSize;
    // Toggle between view real size icon and replay icon
    // When isActualSize is true, show replay icon (to reset)
    // When isActualSize is false, show view real size icon (to go to actual size)
    const iconKey = this.isActualSize ? 'replay' : 'view-real-size';
    this.updateScaleModeButtonLabel(iconKey);
    
    const targetScale = this.isActualSize ? 1.0 : initialModelScale;
    const goalScale = Math.max(minScale, Math.min(maxScale, targetScale));
    
    return goalScale;
  }

  private updateScaleModeButtonLabel(iconKey: string) {
    const cachedTexture = XRMenuPanel.iconTextures.get(iconKey);
    if (cachedTexture) {
      (this.toggleButton.material as MeshBasicMaterial).map = cachedTexture;
      (this.toggleButton.material as MeshBasicMaterial).needsUpdate = true;
    }
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
    
    // Calculate distance-based scaling
    const distanceToCamera = camera.position.distanceTo(panelPosition);
    const clampedDistance = Math.max(PANEL_CONFIG.minDistance, Math.min(PANEL_CONFIG.maxDistance, distanceToCamera));
    const scaleFactor = PANEL_CONFIG.baseScale + (clampedDistance - PANEL_CONFIG.minDistance) * PANEL_CONFIG.distanceScaleFactor;
    
    // Apply scaling to the entire panel (including buttons)
    this.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Make the menu panel face the camera
    this.lookAt(camera.position);
  }

  /**
   * Set the box's visibility; it will fade in and out.
   */
  set show(visible: boolean) {
    this.goalOpacity = visible ? PANEL_CONFIG.opacity : 0;
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
  