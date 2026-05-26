// p5.js frequency visualizer
let analyserData = null;
let frequencyArray = null;

function setup() {
  const container = document.querySelector('.visualizer-container');
  if (!container) return;
  
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  
  const canvas = createCanvas(width, height);
  canvas.parent('visualizer-container');
}

function draw() {
  background(15, 15, 20);
  
  // Get analyser from app.js
  if (typeof audioCtx === 'undefined' || !analyser) return;
  
  // Create frequency array if it doesn't exist
  if (!frequencyArray) {
    frequencyArray = new Uint8Array(analyser.frequencyBinCount);
  }
  
  // Get frequency data
  analyser.getByteFrequencyData(frequencyArray);
  
  // Draw frequency bars
  const barWidth = width / frequencyArray.length * 2.5;
  const barGap = 1;
  
  noStroke();
  // Use HSB and map to a darker red palette (base HSB ~ 352.9, 95, 49)
  colorMode(HSB, 360, 100, 100);
  const baseHue = 352.9; // dark red
  const hueSpread = 10; // small hue variation around base hue
  const satBase = 95; // saturation near full
  const briBase = 49; // darker base brightness

  for (let i = 0; i < frequencyArray.length; i++) {
    const frequency = frequencyArray[i];
    const t = i / Math.max(1, frequencyArray.length - 1);
    const hue = (baseHue + map(t, 0, 1, -hueSpread / 2, hueSpread / 2) + 360) % 360;
    const barHeight = map(frequency, 0, 255, 0, height);
    const brightness = briBase + (frequency / 255) * 20; // brighten with amplitude

    fill(hue, satBase, brightness);

    rect(i * (barWidth + barGap), height - barHeight, barWidth, barHeight);
  }

  // Restore RGB mode for other drawing
  colorMode(RGB);
}

// Resize canvas when window resizes
function windowResized() {
  const container = document.querySelector('.visualizer-container');
  if (container && width !== container.offsetWidth) {
    const newWidth = container.offsetWidth;
    const newHeight = container.offsetHeight;
    resizeCanvas(newWidth, newHeight);
  }
}
