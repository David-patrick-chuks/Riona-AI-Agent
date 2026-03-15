const tf = require("@tensorflow/tfjs");
const fs = require("fs").promises;
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

/**
 * Configuration constants for the image classification model.
 * @constant {number} IMAGE_SIZE - The size to which images are resized (width and height).
 * @constant {number} CLASSIFICATION_THRESHOLD - Threshold for binary classification (0 to 1).
 *
 */
const CONFIG = {
  IMAGE_SIZE: 128,
  CLASSIFICATION_THRESHOLD: 0.6,
};

/**
 * Loads and preprocesses images from a directory.
 * @param {string} dirPath - Path to the directory containing images.
 * @param {number} label - Label for the images (1 for correct, 0 for incorrect).
 * @returns {Promise<Array>} Array of objects containing image tensors, labels, and file names.
 */
async function loadImagesFromDir(dirPath, label) {
  try {
    const files = await fs.readdir(dirPath);
    const images = [];

    console.log(`📂 Loading images from ${dirPath}...`);

    for (const file of files) {
      const imgPath = path.join(dirPath, file);
      try {
        const img = await loadImage(imgPath);
        const canvas = createCanvas(CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);
        const imageTensor = tf.browser
          .fromPixels(canvas)
          .toFloat()
          .div(tf.scalar(255.0))
          .reshape([CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE, 3]);
        images.push({ tensor: imageTensor, label, file });
        console.log(`✅ Loaded ${imgPath}`);
      } catch (err) {
        console.error(`❌ Failed to load ${imgPath}: ${err.message}`);
      }
    }

    console.log(`✅ Loaded ${images.length} images from ${dirPath}`);
    return images;
  } catch (err) {
    console.error(`❌ Error reading directory ${dirPath}: ${err.message}`);
    throw err;
  }
}

/**
 * Loads and prepares the dataset for training.
 * @returns {Promise<Object>} Dataset containing input tensors (xs), labels (ys), and samples.
 */
async function loadDataset() {
  console.log("🧪 Loading dataset...");
  try {
    const correct = await loadImagesFromDir("./data/correct", 1);
    const incorrect = await loadImagesFromDir("./data/incorrect", 0);
    const all = correct.concat(incorrect);
    console.log(`📊 Total samples: ${all.length}`);

    const xs = tf.stack(all.map((i) => i.tensor));
    const ys = tf.tensor(all.map((i) => i.label)).reshape([all.length, 1]);

    console.log("✅ Dataset tensors prepared.");
    return { xs, ys, samples: all };
  } catch (err) {
    console.error("❌ Failed to load dataset:", err.message);
    throw err;
  }
}

/**
 * Creates and compiles a convolutional neural network model.
 * @returns {tf.Sequential} Compiled TensorFlow.js model.
 */
function createModel() {
  console.log("⚙️ Creating model...");
  const model = tf.sequential();

  model.add(
    tf.layers.conv2d({
      inputShape: [CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE, 3],
      filters: 16,
      kernelSize: 3,
      activation: "relu",
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(
    tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: "relu" })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    loss: "binaryCrossentropy",
    optimizer: tf.train.adam(0.001),
    metrics: ["accuracy"],
  });

  console.log("✅ Model ready.");
  return model;
}

/**
 * Evaluates the model on provided samples.
 * @param {tf.Sequential} model - The trained model.
 * @param {Array} samples - Array of sample objects with tensors, labels, and file names.
 */
async function evaluateModel(model, samples) {
  console.log("\n🧠 Evaluating model on training samples:");
  for (const sample of samples) {
    const input = sample.tensor.reshape([
      1,
      CONFIG.IMAGE_SIZE,
      CONFIG.IMAGE_SIZE,
      3,
    ]);
    const prediction = model.predict(input);
    const score = (await prediction.data())[0];

    const expected = sample.label === 1 ? "CORRECT" : "INCORRECT";
    const predicted =
      score >= CONFIG.CLASSIFICATION_THRESHOLD ? "CORRECT ✅" : "INCORRECT ❌";

    console.log(
      `📷 ${sample.file}: score=${score.toFixed(
        4
      )} → expected=${expected} → predicted=${predicted}`
    );

    input.dispose();
    prediction.dispose();
  }
}

/**
 * Saves the model to disk in JSON format with binary weights.
 * @param {tf.Sequential} model - The model to save.
 */
async function saveModel(model) {
  try {
    console.log("💾 Saving model...");
    await model.save(
      tf.io.withSaveHandler(async (data) => {
        const modelJson = JSON.stringify({
          modelTopology: data.modelTopology,
          format: "layers-model",
          generatedBy: "TensorFlow.js",
          convertedBy: null,
        });

        await fs.mkdir("./model", { recursive: true });
        await fs.writeFile("./model/model.json", modelJson);
        await fs.writeFile("./model/weights.bin", Buffer.from(data.weightData));

        console.log("✅ Model saved to ./model");
        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: "JSON",
            weightDataBytes: data.weightData.byteLength,
          },
        };
      })
    );
  } catch (err) {
    console.error("❌ Failed to save model:", err.message);
    throw err;
  }
}

/**
 * Main function to orchestrate dataset loading, model training, and evaluation.
 */
async function main() {
  try {
    const { xs, ys, samples } = await loadDataset();
    const model = createModel();

    console.log("🚀 Starting training...");
    await model.fit(xs, ys, {
      // epochs: 20,
      // batchSize: 4,
      // validationSplit: 0.2,
      epochs: 2,
      batchSize: 8,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(
            `📈 Epoch ${epoch + 1}: loss=${logs.loss.toFixed(
              4
            )}, acc=${logs.acc.toFixed(4)}, val_acc=${logs.val_acc?.toFixed(4)}`
          );
        },
      },
    });

    await evaluateModel(model, samples);
    await saveModel(model);

    // Clean up tensors
    xs.dispose();
    ys.dispose();
    samples.forEach((sample) => sample.tensor.dispose());
    console.log("🧹 Cleaned up tensors.");
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
}

// Execute main function
// main();
