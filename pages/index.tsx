import { animate, motion, MotionValue, useMotionValue } from 'framer-motion';
import Head from 'next/head'
import { useRef, useState } from "react";
import { useGesture } from "react-use-gesture";

export default function Home() {
  // Here I am separating the logic of the image crop into a component. Since
  // we are using Framer-Motion, it handles the animation and gestures without
  // relying on any state changes, which is very performant and responsive.
  // However, there may be times when we want to access the values of the
  // position of the image and its scale to use them somewhere else in the
  // application (for example in a cropper app). For this reason, I will keep
  // the useState hook below and show 2 different approaches to handle the
  // re-renders that this state change causes.
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 });

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

        <ImageCropper src="/example.jpg" crop={crop} onCropChange={setCrop} />
        <p>X: {Math.round(crop.x * 100) / 100}</p>
        <p>Y: {Math.round(crop.y * 100) / 100}</p>
        <p>Scale: {crop.scale}</p>
      </main>
    </div>
  )
}

function dampen(val: number, [min, max]: [number, number]) {
  if (val > max) {
    const extra = val - max;
    const isExtraPositive = extra > 0
    const dampenedExtra = isExtraPositive ? Math.sqrt(extra) : -Math.sqrt(-extra)
    const factor = 2;
    return max + dampenedExtra * factor;
  } else if (val < min) {
    const extra = val - min;
    const isExtraPositive = extra > 0;
    const dampenedExtra = isExtraPositive ? Math.sqrt(extra) : -Math.sqrt(-extra)
    const factor = 2;
    return min + dampenedExtra * factor;
  } else {
    return val;
  }

}

function ImageCropper({ src, crop, onCropChange }) {
  
  const x = useMotionValue(crop.x);
  const y = useMotionValue(crop.y);
  const scale = useMotionValue(crop.scale);

  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  // When we call onCropChange, we are actually changing the state of crop. This
  // causes the parent component to re-render, which, in turn, causes the
  // ImageCropper component (children component) to re-render as well.
  // In the previous approach, when ImageCropper re-renders, the MotionValues of
  // the animations in our array "animations" were being lost. As a consequence,
  // the loops: `animations.forEach((a) => a.stop());` were not being executed.
  // To solve this issue, there exist two approaches:
  //
  // 1. We can call the stop() directly and not use this array.
  // 2. We can store this array in a ref, so that its value is shared across
  //    re-renders
  //
  // Here I am going to use the first approach, but I will leave the second one
  // commented out so you can see how to do it. 

  // let animations = useState([]);

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

    // animations.current = [
    //   animate(x, newCrop.x),
    //   animate(y, newCrop.y)
    // ]

    animate(x, newCrop.x, { type: "tween", duration: 0.4, ease: [0.25, 1, 0.5, 1]});
    animate(y, newCrop.y, { type: "tween", duration: 0.4, ease: [0.25, 1, 0.5, 1]});

    // This is not necessary for the animation. I am only updating the state
    // so we can print the values in the screen... Framer-motion handles the
    // styling and it does not cause re-renders since any state needs to be
    // changed.
    onCropChange(newCrop);
  }

  useGesture(
    {
      onDrag: ({ event, movement: [dx, dy], dragging }) => {
        event.preventDefault();
        // animations.current.forEach((a) => a.stop());
        x.stop();
        y.stop();

        setIsDragging(dragging);

        const imageBounds = imageRef.current.getBoundingClientRect();
        const containerBounds = imageContainerRef.current.getBoundingClientRect();
        const originalWidth = imageRef.current.clientWidth;
        const widthOverhang = (imageBounds.width - originalWidth) / 2;
        const originalHeight = imageRef.current.clientHeight;
        const heightOverhang = (imageBounds.height - originalHeight) / 2;

        const maxX = widthOverhang;
        const minX =  -(imageBounds.width - containerBounds.width) + widthOverhang;

        const maxY = heightOverhang;
        const minY = -(imageBounds.height - containerBounds.height) + heightOverhang;

        // This restricts the motion to the container bounds, but it does not
        // feel natural. It is like if something is broken.
        // x.set(dx > maxX ? maxX : dx < minX ? minX : dx);
        // y.set(dy > maxY ? maxY : dy < minY ? minY : dy);

        x.set(dampen(dx, [minX, maxX]));
        y.set(dampen(dy, [minY, maxY]));
      },
      onPinch: ({
        event,
        memo,
        origin: [pinchOriginX, pinchOriginY],
        offset: [d],
        pinching
      }) => {
        event.preventDefault();
        // animations.current.forEach((a) => a.stop());
        x.stop();
        y.stop();

        setIsPinching(pinching);

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
    <div 
      className={`relative overflow-hidden ring-4 ring-blue-500 w-[300px] h-[300px] ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      ref={imageContainerRef}
    >
      <motion.img
        ref={imageRef}
        src={src}
        style={{
          x: x,
          y: y,
          scale: scale,
          touchAction: "none",
          userSelect: "none",
          MozUserSelect: "none"
        }}
        className="relative w-auto max-w-none max-h-none"
      />

      <div
        className={`pointer-events-none absolute inset-0 transition duration-300 ${
          isDragging || isPinching ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 flex flex-col">
          <div className="self-stretch flex-1 border-b border-gray-50 " />
          <div className="self-stretch flex-1 border-b border-gray-50 " />
          <div className="self-stretch flex-1" />
        </div>
        <div className="absolute inset-0 flex">
          <div className="self-stretch flex-1 border-r border-gray-50 " />
          <div className="self-stretch flex-1 border-r border-gray-50 " />
          <div className="self-stretch flex-1" />
        </div>
      </div>
    </div>
  )
}
