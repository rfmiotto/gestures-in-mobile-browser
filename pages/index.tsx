import { animate, motion, useMotionValue } from 'framer-motion';
import Head from 'next/head'
import { useRef, useState } from "react";
import { useGesture } from "react-use-gesture";

export default function Home() {
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 });
  const x = useMotionValue(crop.x);
  const y = useMotionValue(crop.y);
  const scale = useMotionValue(crop.scale);

  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  let animations = [];

  function maybeAdjustImage() {
    const newCrop = { x: x.get(), y: y.get(), scale: scale.get() };
    const imageBounds = imageRef.current.getBoundingClientRect();
    const containerBounds = imageContainerRef.current.getBoundingClientRect();
    const originalWidth = imageRef.current.clientWidth;
    const widthOverhang = (imageBounds.width - originalWidth) / 2;
    const originalHeight = imageRef.current.clientHeight;
    const heightOverhang = (imageBounds.height - originalHeight) / 2;

    if (imageBounds.left > containerBounds.left) {
      newCrop.x = widthOverhang;
    } else if (imageBounds.right < containerBounds.right) {
      newCrop.x = -(imageBounds.width - containerBounds.width) + widthOverhang;
    }

    if (imageBounds.top > containerBounds.top) {
      newCrop.y = heightOverhang;
    } else if (imageBounds.bottom < containerBounds.bottom) {
      newCrop.y =
        -(imageBounds.height - containerBounds.height) + heightOverhang;
    }

    animations = [
      animate(x, newCrop.x),
      animate(y, newCrop.y)
    ]

    // This is not necessary for the animation. I am only updating the state
    // so we can print the values in the screen... Framer-motion handles the
    // styling and it does not cause re-renders since any state needs to be
    // changed.
    setCrop(newCrop);
  }

  useGesture(
    {
      onDrag: ({ event, movement: [dx, dy] }) => {
        event.preventDefault();
        animations.forEach((a) => a.stop());
        x.set(dx)
        y.set(dy)
      },
      onPinch: ({
        event,
        memo,
        origin: [pinchOriginX, pinchOriginY],
        offset: [d],
      }) => {
        event.preventDefault();
        animations.forEach((a) => a.stop());

        // eslint-disable-next-line no-param-reassign
        memo ??= {
          bounds: imageRef.current.getBoundingClientRect(),
          crop: { x: x.get(), y: y.get(), scale: scale.get() }
        };

        const transformOriginX = memo.bounds.x + memo.bounds.width / 2;
        const transformOriginY = memo.bounds.y + memo.bounds.height / 2;

        const displacementX =
          (transformOriginX - pinchOriginX) / memo.crop.scale;
        const displacementY =
          (transformOriginY - pinchOriginY) / memo.crop.scale;

        const initialOffsetDistance = (memo.crop.scale - 1) * 50;
        const movementDistance = d - initialOffsetDistance;

        x.set(memo.crop.x + (displacementX * movementDistance) / 50);
        y.set(memo.crop.y + (displacementY * movementDistance) / 50);
        scale.set(1 + d / 50);

        return memo;
      },
      onDragEnd: maybeAdjustImage,
      onPinchEnd: maybeAdjustImage,
    },
    {
      drag: {
        initial: () => [x.get(), y.get()],
      },
      pinch: {
        distanceBounds: { min: 0 },
      },
      domTarget: imageRef,
      eventOptions: { passive: false },
    }
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Head>
        <meta charSet="utf-8" />

        <meta
          name="viewport"
          content="initial-scale=1, viewport-fit=cover, width=device-width, user-scalable=no"
        />
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Animations &amp; Gestures
        </h1>

        <p className="my-8 text-2xl">
          Using react-use-gesture and framer-motion to mimic the behavior of native applications in the mobile browser.
          <br />
          This can be useful when creating PWAs.
        </p>

        <div className="overflow-hidden ring-4 ring-blue-500 w-[300px] h-[400px]">
          <div ref={imageContainerRef}>
            <motion.img
              ref={imageRef}
              src="/example.jpg"
              animate={{
                
              }}
              style={{
                x: x,
                y: y,
                scale: scale,
                touchAction: "none",
              }}
              className="drag relative w-auto h-full max-w-none max-h-none"
            />
          </div>
        </div>
        <p>X: {crop.x}</p>
        <p>Y: {crop.y}</p>
        <p>Scale: {crop.scale}</p>
      </main>
    </div>
  )
}
