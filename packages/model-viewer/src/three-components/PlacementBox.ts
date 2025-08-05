/* @license
* Copyright 2020 Google LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the 'License');
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an 'AS IS' BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import {BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Material, Mesh, MeshBasicMaterial, PlaneGeometry, Vector2, Vector3, XRTargetRaySpace, Color, AdditiveBlending, NormalBlending} from 'three';

import {Damper} from './Damper.js';
import {ModelScene} from './ModelScene.js';
import {Side} from './Shadow.js';

// Enhanced configuration for dynamic sizing and visual design
const CONFIG = {
 // Dynamic sizing - slightly bigger
 MIN_TOUCH_AREA: 0.05,  // minimum touch area
 BASE_RADIUS: 0.15,      // base radius
 LINE_WIDTH: 0.02,       // line width
 SEGMENTS: 16,           // segments for smoother curves
 DELTA_PHI: Math.PI / (2 * 16),

  // Enhanced visual design with more vibrant colors
 COLORS: {
   EDGE_FALLOFF: new Color(0.98, 0.98, 0.98),  // Brighter light gray
   EDGE_CUTOFF: new Color(0.8, 0.8, 0.8),      // Brighter medium gray
   FILL_FALLOFF: new Color(0.4, 0.4, 0.4),     // Brighter dark gray
   FILL_CUTOFF: new Color(0.4, 0.4, 0.4),      // Brighter dark gray
   ACTIVE_EDGE: new Color(1.0, 1.0, 1.0),      // Pure white when active
   ACTIVE_FILL: new Color(0.6, 0.6, 0.6),      // Brighter fill when active
 },

  // Opacity settings - now configurable
 MAX_OPACITY: 0.75,
 ACTIVE_OPACITY: 0.9,
 FILL_OPACITY_MULTIPLIER: 0.5,  // Fill opacity relative to edge opacity
 INTERACTIVE_OPACITY_MULTIPLIER: 1.2,  // Edge opacity multiplier when interactive

  // Distance-based scaling (similar to Footprint)
 MIN_DISTANCE: 0.5,
 MAX_DISTANCE: 10.0,
 BASE_SCALE: 1.0,
 DISTANCE_SCALE_FACTOR: 0.3,

  // Animation timing - optimized for performance
 FADE_IN_DURATION: 0.12,
 FADE_OUT_DURATION: 0.12,
 SIZE_UPDATE_DURATION: 0.05,
 COLOR_LERP_FACTOR: 0.15,  // Color transition speed

  // Screen space scaling - now configurable
 SCREEN_SPACE_SCALE: 1.2,  // Scale factor for screen space mode

  // Performance optimization thresholds
 SIZE_UPDATE_THRESHOLD: 0.001,  // Minimum size change to trigger geometry update
 GEOMETRY_UPDATE_DEBOUNCE: 100,  // ms to debounce geometry updates
} as const;

const vector2 = new Vector2();

/**
* Adds a quarter-annulus of vertices to the array, centered on cornerX,
* cornerY.
*/
const addCorner =
   (vertices: Array<number>, cornerX: number, cornerY: number, radius: number, lineWidth: number) => {
     let phi = cornerX > 0 ? (cornerY > 0 ? 0 : -Math.PI / 2) :
                             (cornerY > 0 ? Math.PI / 2 : Math.PI);
     for (let i = 0; i <= CONFIG.SEGMENTS; ++i) {
       vertices.push(
           cornerX + (radius - lineWidth) * Math.cos(phi),
           cornerY + (radius - lineWidth) * Math.sin(phi),
           0,
           cornerX + radius * Math.cos(phi),
           cornerY + radius * Math.sin(phi),
           0);
       phi += CONFIG.DELTA_PHI;
     }
   };

/**
* Enhanced PlacementBox that dynamically updates based on model size changes
* and features improved visual design inspired by Footprint.
*/
export class PlacementBox extends Mesh {
 private hitPlane!: Mesh;
 private hitBox!: Mesh;
 private shadowHeight: number = 0;
 private side: Side;
 private goalOpacity: number;
 private opacityDamper: Damper;

  // Dynamic sizing properties
 private currentSize: Vector3;
 private goalSize: Vector3;
 private sizeDamper: Damper;
 private scene: ModelScene;

  // Visual state
 private isActive: boolean = false;
 private isHovered: boolean = false;
 private edgeMaterial!: MeshBasicMaterial;
 private fillMaterial!: MeshBasicMaterial;

  // Performance optimization
 private lastGeometryUpdateTime: number = 0;
 private needsGeometryUpdate: boolean = false;

 constructor(scene: ModelScene, side: Side) {
   const geometry = new BufferGeometry();
  
   super(geometry);
  
   this.scene = scene;
   this.side = side;
   this.currentSize = new Vector3();
   this.goalSize = new Vector3();
   this.sizeDamper = new Damper();
  
   // Initialize with current scene size
   this.updateSizeFromScene();
  
   // Create enhanced materials with better visual properties
   this.edgeMaterial = new MeshBasicMaterial({
     color: CONFIG.COLORS.EDGE_FALLOFF,
     transparent: true,
     opacity: 0,
     side: DoubleSide,
     depthWrite: false,  // Better transparency handling
     blending: AdditiveBlending  // Subtle glow effect
   });
  
   this.fillMaterial = new MeshBasicMaterial({
     color: CONFIG.COLORS.FILL_FALLOFF,
     transparent: true,
     opacity: 0,
     side: DoubleSide,
     depthWrite: false,  // Better transparency handling
     blending: NormalBlending
   });
  
   this.material = this.edgeMaterial;
   this.goalOpacity = 0;
   this.opacityDamper = new Damper();
  
   // Create hit testing meshes
   this.createHitMeshes();
  
   // Position based on scene
   this.updatePositionFromScene();
  
   // Add to scene
   scene.target.add(this);
   scene.target.add(this.hitBox);
   this.offsetHeight = 0;
 }

 private updateSizeFromScene(): void {
   const {size} = this.scene;
   this.goalSize.copy(size);
  
   // Apply proportional minimum size constraints
   // For small models, use a smaller minimum size
   const modelDiagonal = Math.sqrt(size.x * size.x + size.z * size.z);
   const proportionalMinSize = Math.max(CONFIG.MIN_TOUCH_AREA, modelDiagonal * 0.4); // Increased from 0.3 to 0.4
  
   // Only apply minimum size if the model is very small
   if (this.goalSize.x < proportionalMinSize) {
     this.goalSize.x = proportionalMinSize;
   }
   if (this.goalSize.z < proportionalMinSize) {
     this.goalSize.z = proportionalMinSize;
   }
  
   // Update geometry with new size
   this.updateGeometry();
 }

 private updateGeometry(): void {
   const geometry = this.geometry as BufferGeometry;
   const triangles: Array<number> = [];
   const vertices: Array<number> = [];
  
   const x = this.goalSize.x / 2;
   const y = (this.side === 'back' ? this.goalSize.y : this.goalSize.z) / 2;
  
   // Use dynamic radius based on size - slightly bigger for better visibility
   const modelSize = Math.min(x, y);
   const radius = Math.max(CONFIG.BASE_RADIUS * 0.7, modelSize * 0.2); // Increased multipliers
   const lineWidth = Math.max(CONFIG.LINE_WIDTH * 0.7, modelSize * 0.025); // Increased line width
  
   addCorner(vertices, x, y, radius, lineWidth);
   addCorner(vertices, -x, y, radius, lineWidth);
   addCorner(vertices, -x, -y, radius, lineWidth);
   addCorner(vertices, x, -y, radius, lineWidth);

   const numVertices = vertices.length / 3;
   for (let i = 0; i < numVertices - 2; i += 2) {
     triangles.push(i, i + 1, i + 3, i, i + 3, i + 2);
   }
   const i = numVertices - 2;
   triangles.push(i, i + 1, 1, i, 1, 0);

   geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
   geometry.setIndex(triangles);
   geometry.computeBoundingSphere();
 }

 private createHitMeshes(): void {
   const x = this.goalSize.x / 2;
   const y = (this.side === 'back' ? this.goalSize.y : this.goalSize.z) / 2;
   const modelSize = Math.min(x, y);
   const radius = Math.max(CONFIG.BASE_RADIUS * 0.7, modelSize * 0.2);
  
   this.hitPlane = new Mesh(
       new PlaneGeometry(2 * (x + radius), 2 * (y + radius)));
   this.hitPlane.visible = false;
   (this.hitPlane.material as Material).side = DoubleSide;
   this.add(this.hitPlane);

   this.hitBox = new Mesh(new BoxGeometry(
       this.goalSize.x + 2 * radius,
       this.goalSize.y + radius,
       this.goalSize.z + 2 * radius));
   this.hitBox.visible = false;
   (this.hitBox.material as Material).side = DoubleSide;
   this.add(this.hitBox);
 }

 private updatePositionFromScene(): void {
   const {boundingBox} = this.scene;
   boundingBox.getCenter(this.position);

   // Reset rotation to ensure proper orientation
   this.rotation.set(0, 0, 0);

   switch (this.side) {
     case 'bottom':
       // Ensure the placement box is horizontal for floor placement
       this.rotateX(-Math.PI / 2);
       this.shadowHeight = boundingBox.min.y;
       this.position.y = this.shadowHeight;
       break;
     case 'back':
       // For wall placement, keep it vertical but ensure proper orientation
       this.shadowHeight = boundingBox.min.z;
       this.position.z = this.shadowHeight;
       break;
   }
  
   // Update hit box position with proper offset
   if (this.hitBox) {
     const offset = this.side === 'back' ?
       (this.goalSize.y + CONFIG.BASE_RADIUS) / 2 :
       (this.goalSize.y + CONFIG.BASE_RADIUS) / 2;
     this.hitBox.position.y = offset + boundingBox.min.y;
   }
 }

 /**
  * Update the placement box when model size changes
  * Optimized to batch updates and reduce performance impact
  */
 updateFromModelChanges(): void {
   this.updateSizeFromScene();
   this.updatePositionFromScene();
  
   // Force immediate geometry update for model changes
   this.updateGeometry();
   this.updateHitMeshes();
   this.ensureProperOrientation();
  
   // Reset performance tracking
   this.needsGeometryUpdate = false;
   this.lastGeometryUpdateTime = performance.now();
 }

 /**
  * Ensure the placement box is properly oriented for the current mode
  */
 private ensureProperOrientation(): void {
   // Force proper orientation based on side
   if (this.side === 'bottom') {
     // For floor placement, ensure it's horizontal
     this.rotation.x = -Math.PI / 2;
     this.rotation.y = 0;
     this.rotation.z = 0;
   } else if (this.side === 'back') {
     // For wall placement, ensure it's vertical
     this.rotation.x = 0;
     this.rotation.y = 0;
     this.rotation.z = 0;
   }
 }

 /**
  * Set screen space mode to adjust positioning for mobile AR
  */
 setScreenSpaceMode(isScreenSpace: boolean): void {
   if (isScreenSpace) {
     // In screen space mode, ensure the placement box is more visible
     // and properly positioned for touch interaction
     this.scale.set(CONFIG.SCREEN_SPACE_SCALE, CONFIG.SCREEN_SPACE_SCALE, CONFIG.SCREEN_SPACE_SCALE);
   } else {
     // Reset scale for world space mode
     this.scale.set(1.0, 1.0, 1.0);
   }
 }

 private updateHitMeshes(): void {
   if (this.hitPlane && this.hitBox) {
     const x = this.goalSize.x / 2;
     const y = (this.side === 'back' ? this.goalSize.y : this.goalSize.z) / 2;
     const modelSize = Math.min(x, y);
     const radius = Math.max(CONFIG.BASE_RADIUS * 0.7, modelSize * 0.2);
    
     // Update hit plane geometry
     const hitPlaneGeometry = new PlaneGeometry(2 * (x + radius), 2 * (y + radius));
     this.hitPlane.geometry.dispose();
     this.hitPlane.geometry = hitPlaneGeometry;
    
     // Update hit box geometry
     const hitBoxGeometry = new BoxGeometry(
         this.goalSize.x + 2 * radius,
         this.goalSize.y + radius,
         this.goalSize.z + 2 * radius);
     this.hitBox.geometry.dispose();
     this.hitBox.geometry = hitBoxGeometry;
   }
 }

 /**
  * Set interaction state for visual feedback
  */
 setInteractionState(isActive: boolean, isHovered: boolean = false): void {
   this.isActive = isActive;
   this.isHovered = isHovered;
   this.updateVisualState();
 }

 private updateVisualState(): void {
   let targetColor: Color;
   let targetFillColor: Color;
  
   if (this.isActive) {
     targetColor = CONFIG.COLORS.ACTIVE_EDGE;
     targetFillColor = CONFIG.COLORS.ACTIVE_FILL;
   } else if (this.isHovered) {
     targetColor = CONFIG.COLORS.EDGE_FALLOFF;
     targetFillColor = CONFIG.COLORS.FILL_FALLOFF;
   } else {
     targetColor = CONFIG.COLORS.EDGE_CUTOFF;
     targetFillColor = CONFIG.COLORS.FILL_CUTOFF;
   }
  
   // Smoothly transition colors with configurable response speed
   this.edgeMaterial.color.lerp(targetColor, CONFIG.COLOR_LERP_FACTOR);
   this.fillMaterial.color.lerp(targetFillColor, CONFIG.COLOR_LERP_FACTOR);
 }

 /**
  * Apply distance-based scaling
  */
 applyDistanceScaling(cameraPosition: Vector3): void {
   const distanceToCamera = cameraPosition.distanceTo(this.position);
   const clampedDistance = Math.max(
       CONFIG.MIN_DISTANCE,
       Math.min(CONFIG.MAX_DISTANCE, distanceToCamera)
   );
   const scaleFactor = CONFIG.BASE_SCALE +
       (clampedDistance - CONFIG.MIN_DISTANCE) * CONFIG.DISTANCE_SCALE_FACTOR;
  
   this.scale.set(scaleFactor, scaleFactor, scaleFactor);
 }

 /**
  * Get the world hit position if the touch coordinates hit the box, and null
  * otherwise. Pass the scene in to get access to its raycaster.
  */
 getHit(scene: ModelScene, screenX: number, screenY: number): Vector3|null {
   vector2.set(screenX, -screenY);
   this.hitPlane.visible = true;
   const hitResult = scene.positionAndNormalFromPoint(vector2, this.hitPlane);
   this.hitPlane.visible = false;
   return hitResult == null ? null : hitResult.position;
 }

 getExpandedHit(scene: ModelScene, screenX: number, screenY: number): Vector3|null {
   this.hitPlane.scale.set(1000, 1000, 1000);
   this.hitPlane.updateMatrixWorld();
   const hitResult = this.getHit(scene, screenX, screenY);
   this.hitPlane.scale.set(1, 1, 1);
   return hitResult;
 }

 controllerIntersection(scene: ModelScene, controller: XRTargetRaySpace) {
   this.hitBox.visible = true;
   const hitResult = scene.hitFromController(controller, this.hitBox);
   this.hitBox.visible = false;
   return hitResult;
 }

 /**
  * Offset the height of the box relative to the bottom of the scene. Positive
  * is up, so generally only negative values are used.
  */
 set offsetHeight(offset: number) {
   offset -= 0.001;  // push 1 mm below shadow to avoid z-fighting
   if (this.side === 'back') {
     this.position.z = this.shadowHeight + offset;
   } else {
     this.position.y = this.shadowHeight + offset;
   }
 }

 get offsetHeight(): number {
   if (this.side === 'back') {
     return this.position.z - this.shadowHeight;
   } else {
     return this.position.y - this.shadowHeight;
   }
 }

 /**
  * Set the box's visibility; it will fade in and out.
  */
 set show(visible: boolean) {
   this.goalOpacity = visible ? CONFIG.MAX_OPACITY : 0;
 }

 /**
  * Call on each frame with the frame delta to fade the box.
  */
 updateOpacity(delta: number) {
   const material = this.material as MeshBasicMaterial;
   const newOpacity = this.opacityDamper.update(
       material.opacity,
       this.goalOpacity,
       delta,
       1
   );
  
   // Update both edge and fill materials with configurable visibility
   this.edgeMaterial.opacity = newOpacity;
   this.fillMaterial.opacity = newOpacity * CONFIG.FILL_OPACITY_MULTIPLIER;
  
   // Add subtle glow effect when active or hovered
   if (this.isActive || this.isHovered) {
     this.edgeMaterial.opacity = newOpacity * CONFIG.INTERACTIVE_OPACITY_MULTIPLIER;
   }
  
   this.visible = newOpacity > 0;
 }

 /**
  * Update method to be called each frame for smooth transitions
  * Optimized to reduce frequent geometry updates for better performance
  */
 update(delta: number, cameraPosition?: Vector3): void {
   // Update opacity
   this.updateOpacity(delta);
  
   // Update size transitions with performance optimization
   if (!this.currentSize.equals(this.goalSize)) {
     const newSize = new Vector3();
     newSize.x = this.sizeDamper.update(this.currentSize.x, this.goalSize.x, delta, 1);
     newSize.y = this.sizeDamper.update(this.currentSize.y, this.goalSize.y, delta, 1);
     newSize.z = this.sizeDamper.update(this.currentSize.z, this.goalSize.z, delta, 1);
    
     // Check if size change is significant enough to warrant geometry update
     const sizeChange = newSize.distanceTo(this.currentSize);
     if (sizeChange > CONFIG.SIZE_UPDATE_THRESHOLD) {
       this.currentSize.copy(newSize);
       this.needsGeometryUpdate = true;
     }
   }
  
   // Debounce geometry updates to prevent excessive updates
   const now = performance.now();
   if (this.needsGeometryUpdate &&
       (now - this.lastGeometryUpdateTime) > CONFIG.GEOMETRY_UPDATE_DEBOUNCE) {
     this.updateGeometry();
     this.updateHitMeshes();
     this.needsGeometryUpdate = false;
     this.lastGeometryUpdateTime = now;
   }
  
   // Apply distance scaling if camera position is provided
   if (cameraPosition) {
     this.applyDistanceScaling(cameraPosition);
   }
  
   // Update visual state
   this.updateVisualState();
 }


 /**
  * Get the current size of the placement box
  */
 getSize(): Vector3 {
   return this.goalSize.clone();
 }


 /**
  * Call this to clean up Three's cache when you remove the box.
  */
 dispose() {
   const {geometry, material} = this.hitPlane;
   geometry.dispose();
   (material as Material).dispose();
   this.hitBox.geometry.dispose();
   (this.hitBox.material as Material).dispose();
   this.geometry.dispose();
   this.edgeMaterial.dispose();
   this.fillMaterial.dispose();
   this.hitBox.removeFromParent();
   this.removeFromParent();
 }
}