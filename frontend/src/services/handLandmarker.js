const MEDIAPIPE_VERSION = '1.2.0';
const WASM_FILES_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export async function createHandLandmarker() {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_FILES_URL);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: 'VIDEO',
    numHands: 2,
  });
}

export function extractHandLandmarks(result) {
  if (!Array.isArray(result?.landmarks)) {
    throw new Error('MediaPipe returned an invalid hand-landmark result.');
  }

  return {
    hands: result.landmarks.map((landmarks, index) => {
      if (!Array.isArray(landmarks) || landmarks.length !== 21) {
        throw new Error('MediaPipe must return exactly 21 landmarks for each detected hand.');
      }

      const points = landmarks.map(({ x, y, z }) => {
        if (![x, y, z].every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))) {
          throw new Error('MediaPipe returned an invalid landmark coordinate.');
        }
        return { x, y, z };
      });

      return {
        handedness: result.handedness?.[index]?.[0]?.categoryName || 'Unknown',
        landmarks: points,
      };
    }),
  };
}

function handArea(hand) {
  const xs = hand.landmarks.map(({ x }) => x);
  const ys = hand.landmarks.map(({ y }) => y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

export function normalizeRecognitionFrame(hands) {
  if (!Array.isArray(hands) || hands.length === 0) return null;

  const dominantHand = hands.reduce((largest, hand) => (
    handArea(hand) > handArea(largest) ? hand : largest
  ));
  if (!Array.isArray(dominantHand.landmarks) || dominantHand.landmarks.length !== 21) {
    throw new Error('Recognition requires exactly 21 landmarks for the selected hand.');
  }

  const wrist = dominantHand.landmarks[0];
  return dominantHand.landmarks.flatMap(({ x, y, z }) => [
    x - wrist.x,
    y - wrist.y,
    z - wrist.z,
  ]);
}
