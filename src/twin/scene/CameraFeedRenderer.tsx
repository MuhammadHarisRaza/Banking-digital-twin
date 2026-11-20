import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, SRGBColorSpace, WebGLRenderTarget } from "three";
import type { BranchLayout } from "../layout/types";
import { useTwinView } from "../store";
import { FEED_FPS, FEED_H, FEED_W, feedOutput, feedPose, paintFeed } from "./cameraFeed";

/** Layer for selection brackets and other overlays the security cameras must not see. */
export const OVERLAY_LAYER = 1;

/**
 * While the inspector shows a camera panel, renders the branch from that camera into a small target a
 * dozen times a second and paints it into the panel's canvas. Nothing runs when no feed is open.
 */
export function CameraFeedRenderer({ layout }: { layout: BranchLayout }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const mainCamera = useThree((s) => s.camera);
  const res = useMemo(() => {
    const target = new WebGLRenderTarget(FEED_W, FEED_H);
    target.texture.colorSpace = SRGBColorSpace;
    return {
      target,
      camera: new PerspectiveCamera(70, FEED_W / FEED_H, 0.1, 90),
      pixels: new Uint8Array(FEED_W * FEED_H * 4),
      image: new ImageData(FEED_W, FEED_H),
    };
  }, []);
  const last = useRef(-1);

  useEffect(() => () => res.target.dispose(), [res]);
  // The main view still sees the overlay layer.
  useEffect(() => {
    mainCamera.layers.enable(OVERLAY_LAYER);
  }, [mainCamera]);

  useFrame(({ clock }) => {
    const out = feedOutput.canvas;
    const id = useTwinView.getState().selected;
    if (!out || !id || feedOutput.assetId !== id) return;
    const now = clock.elapsedTime;
    if (last.current >= 0 && now - last.current < 1 / FEED_FPS) return;
    last.current = now;
    const asset = layout.assets.find((a) => a.id === id);
    const pose = asset && feedPose(asset, layout);
    if (!pose) return;

    const { camera, target, pixels, image } = res;
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.position.set(...pose.pos);
    camera.lookAt(...pose.target);

    const previous = gl.getRenderTarget();
    const autoShadow = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false; // reuse the main view's shadow map
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.readRenderTargetPixels(target, 0, 0, FEED_W, FEED_H, pixels);
    gl.setRenderTarget(previous);
    gl.shadowMap.autoUpdate = autoShadow;
    paintFeed(out, pixels, image);
  }, -1);

  return null;
}
