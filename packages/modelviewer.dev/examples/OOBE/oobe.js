const mv = document.querySelector('model-viewer');
const nextButton = document.querySelector('#next');
const backButton = document.querySelector('#back');

class App {
  constructor() {
    this.currentAnimClipState = null;
    this.currentState = null;
    this.animReverse = false;
    this.callout_w_dots = false;
    this.anim_clip = null;
  }

  async init() {
    // Generate Clock Texture
    this.display_canvas = new DisplayCanvas(this);

    // Parse data from interaction scripts
    const json_data = new Data();
    const interaction_states_data =
        await json_data.getData('interaction_states.json');
    this.interaction_states = interaction_states_data.stages;
    this.callout_data = interaction_states_data.callouts[0];
    this.interaction.calloutData = this.callout_data;

    // set up div to contain spin indicator
    const spinIndicator = document.getElementById('spin-icon-container');
    spinIndicator.addEventListener('animationend', () => {
      spinIndicator.style.display = 'none';
    }, false);

    console.log('Setting states for ' + this.interaction_states.length);
    // TODO: JSInterface is the communication back to Android about button
    // states, etc. Replace this with communication to HTML/CSS.
    JSInterface.setStateParameters(this.interaction_states.length, false);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    this.yellow_color = '0xe6ff7b';  // KHR_materials_unlit

    // Add Mixer Event Listener to run after animation is finished.
    mv.addEventListener('finished', function(e) {
      console.log(e.action._clip.name + ' - Complete');
      console.log(this.loopFinished);
      let follow_up_anim = this.currentAnimClipState.followupAnimClipName[0];
      let reverse_follow_up_anim = this.currentAnimClipState ?
          this.currentAnimClipState.followupAnimReverseClipName[0] :
          null;

      try {
        if (e.action._clip.name != Object.keys(follow_up_anim)[0])
          this.interaction.setRotationTo(this.currentState.freeRotate, 0);
      } catch (err) {
        console.log('No follow up animation in this state.');
      }

      if (follow_up_anim &&
          e.action._clip.name == this.currentAnimClipState.fbxClipName &&
          !this.animReverse) {
        e.action.reset();
        e.action.stop();
        let follow_up_anim_key = Object.keys(follow_up_anim)[0];
        this.playAnimation(
            follow_up_anim_key,
            false,
            follow_up_anim[follow_up_anim_key].looping,
            null,
            true);
        setTimeout(function() {
          this.loopFinished = true;
        }.bind(this), 700);
      }
      if (reverse_follow_up_anim &&
          e.action._clip.name == this.currentAnimClipState.fbxClipNameReverse &&
          this.animReverse) {
        e.action.reset();
        e.action.stop();
        let reverse_follow_up_anim_key = Object.keys(reverse_follow_up_anim)[0];
        this.playAnimation(
            reverse_follow_up_anim_key,
            false,
            reverse_follow_up_anim[reverse_follow_up_anim_key].looping,
            null,
            true);
      }
      if (this.interactiveIntroAnim && e.action._clip.name == '_BandOff') {
        e.action.reset();
        e.action.stop();
        this.playAnimation('_RSB_Press', false, true, null, true);
        this.interactiveIntroAnim = false;
      }

      this.interaction.transitionSpeed = 0.1;
    }.bind(this));

    let introFade = document.getElementById('intro-fade');
    introFade.classList.add('active');
  }

  startAnimations(stateId) {
    console.log('removing fade');
    let introFade = document.getElementById('intro-fade');
    introFade.classList.remove('active');
    introFade.classList.add('disabled');
    this.setSceneState(stateId)
  }

  setSwipingEnabled(setting) {
    window.enableSwiping = boolean(setting);
  }

  // Create LED light object
  createGlowCircle(size = 1, falloff = 0, color = 'white') {
    // create a texture on canvas and apply it on material
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const x = 64, y = 64,
          // Radii of the black glow.
        innerRadius = falloff, outerRadius = 80,
          // Radius of the entire circle.
        radius = 128;

    canvas.width = radius;
    canvas.height = radius;
    const gradient =
        ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
    gradient.addColorStop(0, 'rgb(256,256,256)');
    gradient.addColorStop(0.2, 'rgb(256,256,256)');
    gradient.addColorStop(0.6, 'rgb(50,50,50)');
    gradient.addColorStop(0.7, 'rgb(10,10,10)');
    gradient.addColorStop(0.8, 'rgb(0,0,0)');

    ctx.arc(x, y, radius, 0, 2 * Math.PI);

    ctx.fillStyle = gradient;
    ctx.fill();

    return canvas;
  }

  setSceneState(id, reverse = false) {
    // Get interaction_states json values and set them as const
    this.animReverse = reverse;
    this.currentState = this.interaction_states[id];
    this.currentAnimClipState =
        reverse ? this.interaction_states[id + 1] : this.currentState;
    const lottie_animation_file = this.currentState.lottieAnimation;
    const lottie_animation_additive_file =
        this.currentState.lottieAnimationAdditive;
    const lottie_rotation = this.currentState.lottieRotation;
    const lottie_loop = this.currentState.lottieLoop;
    const lottie_offset = this.currentState.lottieOffset;
    const lottie_scale = this.currentState.lottieScale;
    const lottie_timeout = reverse ? this.currentState.lottieTimeoutReverse :
                                     this.currentState.lottieTimeout;
    const pivot_object =
        this.scene.getObjectByName(this.currentState.pivotTarget);
    const prev_pivot_object =
        this.scene.getObjectByName(this.currentAnimClipState.pivotTarget);
    const hide_web_view = this.currentState.hideWebView;
    const custom_display = this.currentState.customDisplay;
    const camera_near_clip = this.currentState.cameraNearClip;
    const lottie_display = this.currentState.lottieDisplay;
    const runMagnifyGlass = this.currentState.runMagnifyGlass;
    this.loadMagnifyGlass = false;

    if (runMagnifyGlass) {
      setTimeout(function() {
        if (this.currentState.runMagnifyGlass)
          this.loadMagnifyGlass = true;
      }.bind(this), 1500);
    }

    // if custom display is not null, replace watch face with custom display
    // texture
    if (custom_display) {
      let custom_texture = null;
      if (custom_display.split('.').pop() == 'mp4') {
        const video = document.createElement('video');
        video.src = './textures/' + custom_display;
        video.muted = true;
        video.play();
        video.loop = true;
        custom_texture = new THREE.VideoTexture(video);
      } else {
        custom_texture =
            new THREE.TextureLoader().load('./textures/' + custom_display);
      }

      custom_texture.flipY = false;
      this.display_material.emissiveMap = custom_texture;
    } else if (lottie_display) {
      if (this.lottie_loader)
        this.lottie_loader_animation.destroy();
      this.lottie_loader = new LottieLoader();
      this.lottie_loader.setQuality(2);

      this.lottie_loader.load('./' + lottie_display, function(texture) {
        texture.flipY = false;
        this.display_material.emissiveMap = texture;
        this.lottie_loader_animation = texture.animation;
      }.bind(this));
    } else {
      if (this.lottie_loader)
        this.lottie_loader_animation.destroy();
      this.display_material.emissiveMap = this.display_texture;
    }

    // show callouts, if there are some, at the end of the transition animation
    this.uicontrol.showDots = this.currentState.showDots;
    this.uicontrol.showCallouts(this.currentState.showCallout, this.darkMode);

    let state;
    // Get target for camera at current state
    for (state in this.interaction_states) {
      const pivot = this.scene.getObjectByName(
          this.interaction_states[state].pivotTarget);
      pivot.rotation.set(0, 0, 0);
    }

    const looping = this.currentAnimClipState.looping;
    const start_time = reverse ? this.currentAnimClipState.startTimeReverse :
                                 this.currentAnimClipState.startTime;

    this.interaction.transitionSpeed =
        this.currentAnimClipState.transitionSpeed ?
        this.currentAnimClipState.transitionSpeed :
        0.1;
    this.interaction.touchRotateMultiplier =
        this.currentState.touchRotateMultiplier;
    this.interaction.deviceRotateMultiplier =
        this.currentState.deviceRotateMultiplier;

    // Set the camera target to pivot from interaction states json, set camera
    // controls, and play animation
    this.interaction.setTarget(this.hrn, pivot_object);
    this.interaction.setRotationTo(this.currentState.freeRotate, 0);
    this.currentState.freeRotate ? this.interaction.addVelocity = true :
                                   this.interaction.addVelocity = false;
    this.playAnimation(clip_name, reverse, looping, start_time, false);


    JSInterface.updateText(
        this.currentState.titleStringID, this.currentState.bodyStringID);

    this.callout_w_dots =
        this.currentState.showDots && this.currentState.showCallout != '';
    JSInterface.setStateParameters(
        this.interaction_states.length,
        this.callout_w_dots ? false : this.currentState.showDots);
    JSInterface.hideWebView(hide_web_view);

    // Set delay for next and skip buttons
    if (this.currentState.showNextButtonDelay > 0) {
      JSInterface.setButton(
          'next', false, this.currentState.nextButtonTextOverride);
      setTimeout(function() {
        JSInterface.setButton(
            'next',
            this.currentState.showNextButton,
            this.currentState.nextButtonTextOverride);
      }.bind(this), this.currentState.showNextButtonDelay);
    } else {
      JSInterface.setButton(
          'next',
          this.currentState.showNextButton,
          this.currentState.nextButtonTextOverride);
    }

    if (this.currentState.showSkipButtonDelay > 0) {
      JSInterface.setButton(
          'skip', false, this.currentState.skipButtonTextOverride);
      setTimeout(function() {
        JSInterface.setButton(
            'skip',
            this.currentState.showSkipButton,
            this.currentState.skipButtonTextOverride);
      }.bind(this), this.currentState.showSkipButtonDelay);
    } else {
      JSInterface.setButton(
          'skip',
          this.currentState.showSkipButton,
          this.currentState.skipButtonTextOverride);
    }
  }

  setSku(color) {
    let bandColor;
    let hourColor;
    let secondColor;
    let frameColor;
    switch (color) {
      case 1:
        bandColor = '#e3c49f';
        hourColor = '#ffd4b6';
        secondColor = '#e78e4e';
        frameColor = null;
        break;
      case 2:
        bandColor = '#b3b555';
        hourColor = '#ebffc3';
        secondColor = '#b2e154';
        frameColor = '#c79d6d';
        break;
      case 3:
        bandColor = '#020202';
        hourColor = '#e4e4e4';
        secondColor = '#b0b0b0';
        frameColor = '#151515';
        break;
      case 4:
        bandColor = '#8c9183';
        hourColor = '#ebffc3';
        secondColor = '#b2e154';
        frameColor = '#c79d6d';
        break;
      default:
        bandColor = '#202021';
        hourColor = '#e4e4e4';
        secondColor = '#b0b0b0';
        frameColor = '#151515';
    }
    const bandMaterial =
        mv.model.getMaterialByName('rohan_anim:rohan_rig:BAND_MAT');
    const frameMaterial =
        mv.model.getMaterialByName('rohan_anim:rohan_rig:PUCK_MAT');
    // Consider adding hex string support to setBaseColorFactor API.
    // bandMaterial.pbrMetallicRoughness.setBaseColorFactor([1,1,1,1]);
  }
}

const app = new App();

mv.addEventListener('load', () => {
  app.init();
  let id = 0;
  app.setSceneState(id);
  nextButton.addEventListener('click', () => {
    app.setSceneState(++id);
  });
  backButton.addEventListener('click', () => {
    app.setSceneState(--id, true);
  });
});