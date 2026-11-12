import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";

export class Avatar {
  private mixer: THREE.AnimationMixer;
  private clock = new THREE.Clock();
  private t = 0;

  constructor(private vrm: VRM) {
    this.mixer = new THREE.AnimationMixer(vrm.scene);
    this.mixer.addEventListener("finished", (e) => {
      (e.action as THREE.AnimationAction).fadeOut(0.3);
    });
  }

  playOnce(clip: THREE.AnimationClip) {
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = false;
    action.fadeIn(0.2).play();
  }

  /** Called every frame before rendering. */
  update() {
    const dt = this.clock.getDelta();
    this.t += dt;
    this.applyRestPose();
    this.mixer.update(dt);
    this.vrm.update(dt);
  }

  /** Natural standing pose plus breathing, written every frame. */
  private applyRestPose() {
    const h = this.vrm.humanoid;
    h.getNormalizedBoneNode("leftUpperArm")?.rotation.set(0, 0, 1.2);
    h.getNormalizedBoneNode("rightUpperArm")?.rotation.set(0, 0, -1.2);
    h.getNormalizedBoneNode("leftLowerArm")?.rotation.set(0, 0, 0.1);
    h.getNormalizedBoneNode("rightLowerArm")?.rotation.set(0, 0, -0.1);
    const breath = Math.sin(this.t * 1.6) * 0.02;
    h.getNormalizedBoneNode("chest")?.rotation.set(breath, 0, 0);
  }
}
