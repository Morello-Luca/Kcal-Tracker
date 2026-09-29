/* Vision, Barcode & OCR Camera Lookup Module */
import { round } from "./storage.js";

export function initVisionModule(addEntryFromResult) {
  // Barcode elements
  const scanBarcodeBtn = document.getElementById("scan-barcode-btn");
  const barcodeModal = document.getElementById("barcode-modal");
  const barcodeModalClose = document.getElementById("barcode-modal-close");
  const barcodeReaderEl = document.getElementById("barcode-reader");
  const barcodeStatusEl = document.getElementById("barcode-status");
  const barcodeConfirmEl = document.getElementById("barcode-confirm");
  const barcodeProductNameEl = document.getElementById("barcode-product-name");
  const barcodeSourceTagEl = document.getElementById("barcode-source-tag");
  const barcodeConfirmAccuracyBtn = document.getElementById("barcode-confirm-accuracy-btn");
  const barcodePer100gEl = document.getElementById("barcode-per-100g");
  const barcodeQuantityInput = document.getElementById("barcode-quantity-input");
  const barcodeAddBtn = document.getElementById("barcode-add-btn");
  const barcodeCancelConfirmBtn = document.getElementById("barcode-cancel-confirm-btn");
  const barcodeUploadSectionEl = document.getElementById("barcode-upload-section");
  const barcodeUploadForm = document.getElementById("barcode-upload-form");
  const barcodeUploadCodeInput = document.getElementById("barcode-upload-code");
  const barcodeUploadNameInput = document.getElementById("barcode-upload-name");
  const barcodeUploadBrandInput = document.getElementById("barcode-upload-brand");
  const barcodeUploadCaloriesInput = document.getElementById("barcode-upload-calories");
  const barcodeUploadProteinInput = document.getElementById("barcode-upload-protein");
  const barcodeUploadCarbsInput = document.getElementById("barcode-upload-carbs");
  const barcodeUploadFatInput = document.getElementById("barcode-upload-fat");
  const barcodeUploadServingInput = document.getElementById("barcode-upload-serving");
  const barcodeFallbackEl = document.getElementById("barcode-fallback");
  const barcodeFallbackForm = document.getElementById("barcode-fallback-form");
  const barcodeFallbackInput = document.getElementById("barcode-fallback-input");

  // Photo / OCR elements
  const addPhotoBtn = document.getElementById("add-photo-btn");
  const photoModal = document.getElementById("photo-modal");
  const photoModalClose = document.getElementById("photo-modal-close");
  const photoStartEl = document.getElementById("photo-start");
  const photoTakeBtn = document.getElementById("photo-take-btn");
  const photoUploadBtn = document.getElementById("photo-upload-btn");
  const photoFileInput = document.getElementById("photo-file-input");
  const photoCameraEl = document.getElementById("photo-camera");
  const photoVideoEl = document.getElementById("photo-video");
  const photoCaptureBtn = document.getElementById("photo-capture-btn");
  const photoCameraCancelBtn = document.getElementById("photo-camera-cancel-btn");
  const photoPreviewEl = document.getElementById("photo-preview");
  const photoPreviewImg = document.getElementById("photo-preview-img");
  const photoQuantityInput = document.getElementById("photo-quantity-input");
  const photoAnalyzeBtn = document.getElementById("photo-analyze-btn");
  const photoRetakeBtn = document.getElementById("photo-retake-btn");
  const photoTipEl = document.getElementById("photo-tip");
  const photoStatusEl = document.getElementById("photo-status");
  const photoConfirmEl = document.getElementById("photo-confirm");
  const photoConfirmForm = document.getElementById("photo-confirm-form");
  const photoEditDesc = document.getElementById("photo-edit-desc");
  const photoEditCalories = document.getElementById("photo-edit-calories");
  const photoEditProtein = document.getElementById("photo-edit-protein");
  const photoEditCarbs = document.getElementById("photo-edit-carbs");
  const photoEditFat = document.getElementById("photo-edit-fat");
  const photoRetryBtn = document.getElementById("photo-retry-btn");
  const photoModeAutoBtn = document.getElementById("photo-mode-auto");
  const photoModeLabelBtn = document.getElementById("photo-mode-label");

  let activePhotoMode = "auto";
  let currentPhotoResult = null;
  let capturedPhotoDataUrl = null;
  let photoCameraStream = null;
  let html5QrCodeInstance = null;
  let currentBarcodeProduct = null;

  const BARCODE_FORMATS_SUPPORTED =
    typeof window.Html5QrcodeSupportedFormats !== "undefined"
      ? [
          window.Html5QrcodeSupportedFormats.EAN_13,
          window.Html5QrcodeSupportedFormats.EAN_8,
          window.Html5QrcodeSupportedFormats.UPC_A,
          window.Html5QrcodeSupportedFormats.UPC_E,
          window.Html5QrcodeSupportedFormats.CODE_128,
        ]
      : undefined;

  function resetBarcodeModal() {
    if (barcodeStatusEl) barcodeStatusEl.textContent = "";
    if (barcodeConfirmEl) barcodeConfirmEl.hidden = true;
    if (barcodeUploadSectionEl) barcodeUploadSectionEl.hidden = true;
    if (barcodeFallbackEl) barcodeFallbackEl.hidden = true;
    if (barcodeReaderEl) barcodeReaderEl.hidden = false;
    if (barcodeFallbackInput) barcodeFallbackInput.value = "";
    if (barcodeConfirmAccuracyBtn) barcodeConfirmAccuracyBtn.textContent = "Confirm Details";
    currentBarcodeProduct = null;
  }

  async function stopBarcodeScanner() {
    if (!html5QrCodeInstance) return;
    try {
      await html5QrCodeInstance.stop();
      html5QrCodeInstance.clear();
    } catch {
      // ignore
    }
    html5QrCodeInstance = null;
  }

  function showBarcodeUploadSection(code, initialName = "") {
    if (barcodeConfirmEl) barcodeConfirmEl.hidden = true;
    if (barcodeUploadSectionEl) barcodeUploadSectionEl.hidden = false;
    if (barcodeFallbackEl) barcodeFallbackEl.hidden = false;

    if (barcodeUploadCodeInput) barcodeUploadCodeInput.value = code || "";
    if (barcodeUploadNameInput) barcodeUploadNameInput.value = initialName || "";
    if (barcodeUploadBrandInput) barcodeUploadBrandInput.value = "";
    if (barcodeUploadCaloriesInput) barcodeUploadCaloriesInput.value = "";
    if (barcodeUploadProteinInput) barcodeUploadProteinInput.value = "0";
    if (barcodeUploadCarbsInput) barcodeUploadCarbsInput.value = "0";
    if (barcodeUploadFatInput) barcodeUploadFatInput.value = "0";
    if (barcodeUploadServingInput) barcodeUploadServingInput.value = "100";
  }

  async function onBarcodeDecoded(decodedText) {
    await stopBarcodeScanner();
    if (barcodeReaderEl) barcodeReaderEl.hidden = true;
    if (barcodeStatusEl) barcodeStatusEl.textContent = `Searching databases for barcode ${decodedText}...`;

    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(decodedText)}`);
      if (!res.ok) throw new Error("Barcode search request failed.");
      const data = await res.json();

      if (!data.found || !data.product) {
        if (barcodeStatusEl) barcodeStatusEl.textContent = `No product found in databases for barcode ${decodedText}.`;
        showBarcodeUploadSection(decodedText);
        return;
      }

      const product = data.product;
      const per100g = product.per100g || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      const cals = Number(per100g.calories) || 0;

      if (!cals) {
        if (barcodeStatusEl) barcodeStatusEl.textContent = `Barcode ${decodedText} was found but lacks calorie data.`;
        showBarcodeUploadSection(decodedText, product.name);
        return;
      }

      currentBarcodeProduct = {
        code: decodedText,
        name: product.name,
        brand: product.brand || "",
        per100g: {
          calories: cals,
          protein: Number(per100g.protein_g ?? per100g.protein) || 0,
          carbs: Number(per100g.carbs_g ?? per100g.carbs) || 0,
          fat: Number(per100g.fat_g ?? per100g.fat) || 0,
        },
        source: product.source || "Shared Database",
        confirmations: product.confirmations || 0,
        serving_quantity: product.serving_quantity || 100,
      };

      const defaultGrams = Number(product.serving_quantity) > 0 ? Math.round(product.serving_quantity) : 100;

      if (barcodeProductNameEl) {
        barcodeProductNameEl.textContent = currentBarcodeProduct.brand
          ? `${currentBarcodeProduct.name} (${currentBarcodeProduct.brand})`
          : currentBarcodeProduct.name;
      }

      if (barcodeSourceTagEl) {
        const sourceName = currentBarcodeProduct.source;
        const confText = typeof currentBarcodeProduct.confirmations === "number" && currentBarcodeProduct.confirmations > 0
          ? ` · ${currentBarcodeProduct.confirmations} community confirmations`
          : "";
        barcodeSourceTagEl.textContent = `Source: ${sourceName}${confText}`;
      }

      if (barcodePer100gEl) {
        barcodePer100gEl.textContent = `${Math.round(cals)} kcal / 100g · P ${round(
          currentBarcodeProduct.per100g.protein
        )}g · C ${round(currentBarcodeProduct.per100g.carbs)}g · F ${round(currentBarcodeProduct.per100g.fat)}g`;
      }

      if (barcodeQuantityInput) barcodeQuantityInput.value = defaultGrams;
      if (barcodeStatusEl) barcodeStatusEl.textContent = "";

      if (barcodeConfirmEl) barcodeConfirmEl.hidden = false;
      if (barcodeUploadSectionEl) barcodeUploadSectionEl.hidden = true;
      if (barcodeFallbackEl) barcodeFallbackEl.hidden = true;
    } catch (err) {
      console.error("Barcode lookup failed:", err);
      if (barcodeStatusEl) barcodeStatusEl.textContent = "Database search failed. You can upload this barcode below.";
      showBarcodeUploadSection(decodedText);
    }
  }

  async function openBarcodeModal() {
    resetBarcodeModal();
    barcodeModal.hidden = false;
    barcodeStatusEl.textContent = "Point your camera at a barcode...";

    try {
      html5QrCodeInstance = new window.Html5Qrcode("barcode-reader");
      await html5QrCodeInstance.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          formatsToSupport: BARCODE_FORMATS_SUPPORTED,
        },
        onBarcodeDecoded,
        () => {}
      );
    } catch (err) {
      console.error("Camera start failed:", err);
      barcodeStatusEl.textContent =
        "Couldn't access the camera. Check permissions, or type the product name below.";
      barcodeReaderEl.hidden = true;
      barcodeFallbackEl.hidden = false;
    }
  }

  async function closeBarcodeModal() {
    await stopBarcodeScanner();
    barcodeModal.hidden = true;
  }

  if (scanBarcodeBtn) scanBarcodeBtn.addEventListener("click", openBarcodeModal);
  if (barcodeModalClose) barcodeModalClose.addEventListener("click", closeBarcodeModal);
  if (barcodeCancelConfirmBtn) barcodeCancelConfirmBtn.addEventListener("click", closeBarcodeModal);

  if (barcodeAddBtn) {
    barcodeAddBtn.addEventListener("click", () => {
      const grams = Number(barcodeQuantityInput.value) || 0;
      if (!grams || !currentBarcodeProduct) return;

      const factor = grams / 100;
      const { name, brand, per100g } = currentBarcodeProduct;
      const label = brand ? `${name} (${brand}) (${grams}g)` : `${name} (${grams}g)`;
      addEntryFromResult(label, {
        calories: per100g.calories * factor,
        protein_g: per100g.protein * factor,
        carbs_g: per100g.carbs * factor,
        fat_g: per100g.fat * factor,
      });
      closeBarcodeModal();
    });
  }

  if (barcodeConfirmAccuracyBtn) {
    barcodeConfirmAccuracyBtn.addEventListener("click", async () => {
      if (!currentBarcodeProduct || !currentBarcodeProduct.code) return;

      try {
        barcodeConfirmAccuracyBtn.disabled = true;
        barcodeConfirmAccuracyBtn.textContent = "Confirming...";

        const res = await fetch("/api/barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            code: currentBarcodeProduct.code,
            product: currentBarcodeProduct,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.product && typeof data.product.confirmations === "number") {
            currentBarcodeProduct.confirmations = data.product.confirmations;
            if (barcodeSourceTagEl) {
              barcodeSourceTagEl.textContent = `Source: Community Database · ${data.product.confirmations} community confirmations ✓`;
            }
          }
          barcodeConfirmAccuracyBtn.textContent = "Confirmed ✓";
        }
      } catch (err) {
        console.warn("Confirmation failed:", err);
      } finally {
        setTimeout(() => {
          if (barcodeConfirmAccuracyBtn) {
            barcodeConfirmAccuracyBtn.disabled = false;
            barcodeConfirmAccuracyBtn.textContent = "Confirm Details";
          }
        }, 2000);
      }
    });
  }

  if (barcodeUploadForm) {
    barcodeUploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = barcodeUploadCodeInput ? barcodeUploadCodeInput.value.trim() : "";
      const name = barcodeUploadNameInput ? barcodeUploadNameInput.value.trim() : "";
      const brand = barcodeUploadBrandInput ? barcodeUploadBrandInput.value.trim() : "";
      const calories = Number(barcodeUploadCaloriesInput?.value) || 0;
      const protein_g = Number(barcodeUploadProteinInput?.value) || 0;
      const carbs_g = Number(barcodeUploadCarbsInput?.value) || 0;
      const fat_g = Number(barcodeUploadFatInput?.value) || 0;
      const serving_quantity = Number(barcodeUploadServingInput?.value) || 100;

      if (!code || !name || !calories) {
        if (barcodeStatusEl) barcodeStatusEl.textContent = "Please fill in barcode number, product name, and calories.";
        return;
      }

      if (barcodeStatusEl) barcodeStatusEl.textContent = "Uploading product to shared community database...";

      try {
        const res = await fetch("/api/barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upload",
            code,
            name,
            brand,
            calories,
            protein_g,
            carbs_g,
            fat_g,
            serving_quantity,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed.");

        const factor = serving_quantity / 100;
        const entryName = brand ? `${name} (${brand}) (${serving_quantity}g)` : `${name} (${serving_quantity}g)`;

        addEntryFromResult(entryName, {
          calories: calories * factor,
          protein_g: protein_g * factor,
          carbs_g: carbs_g * factor,
          fat_g: fat_g * factor,
        });

        if (barcodeStatusEl) barcodeStatusEl.textContent = `Uploaded "${name}" to community database and logged!`;
        setTimeout(() => {
          closeBarcodeModal();
        }, 1200);
      } catch (err) {
        console.error("Upload error:", err);
        if (barcodeStatusEl) barcodeStatusEl.textContent = err.message || "Upload failed. Check connection.";
      }
    });
  }

  if (photoModeAutoBtn && photoModeLabelBtn) {
    photoModeAutoBtn.addEventListener("click", () => {
      activePhotoMode = "auto";
      photoModeAutoBtn.classList.add("active");
      photoModeLabelBtn.classList.remove("active");
    });
    photoModeLabelBtn.addEventListener("click", () => {
      activePhotoMode = "label";
      photoModeLabelBtn.classList.add("active");
      photoModeAutoBtn.classList.remove("active");
    });
  }

  function showPhotoPanel(panel) {
    photoStartEl.hidden = panel !== photoStartEl;
    photoCameraEl.hidden = panel !== photoCameraEl;
    photoPreviewEl.hidden = panel !== photoPreviewEl;
  }

  function stopPhotoCamera() {
    if (photoCameraStream) {
      photoCameraStream.getTracks().forEach((track) => track.stop());
      photoCameraStream = null;
    }
    photoVideoEl.srcObject = null;
  }

  function resetPhotoModal() {
    photoStatusEl.textContent = "";
    photoConfirmEl.hidden = true;
    photoTipEl.hidden = false;
    photoFileInput.value = "";
    photoQuantityInput.value = "";
    currentPhotoResult = null;
    capturedPhotoDataUrl = null;
    stopPhotoCamera();
    showPhotoPanel(photoStartEl);
  }

  function openPhotoModal() {
    resetPhotoModal();
    photoModal.hidden = false;
  }

  function closePhotoModal() {
    stopPhotoCamera();
    photoModal.hidden = true;
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Couldn't read that file."));
      reader.readAsDataURL(file);
    });
  }

  function downscaleImage(dataUrl, maxDim = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.src = dataUrl;
    });
  }

  function captureFrameFromVideo(video, maxDim = 1024, quality = 0.7) {
    let { videoWidth: width, videoHeight: height } = video;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  if (addPhotoBtn) addPhotoBtn.addEventListener("click", openPhotoModal);
  if (photoModalClose) photoModalClose.addEventListener("click", closePhotoModal);

  if (photoTakeBtn) {
    photoTakeBtn.addEventListener("click", async () => {
      photoStatusEl.textContent = "";
      try {
        photoCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        photoVideoEl.srcObject = photoCameraStream;
        await photoVideoEl.play();
        showPhotoPanel(photoCameraEl);
      } catch (err) {
        console.error("Camera start failed:", err);
        photoStatusEl.textContent =
          "Couldn't access the camera. Check permissions, or choose a photo from your gallery instead.";
      }
    });
  }

  if (photoCameraCancelBtn) {
    photoCameraCancelBtn.addEventListener("click", () => {
      stopPhotoCamera();
      showPhotoPanel(photoStartEl);
    });
  }

  if (photoCaptureBtn) {
    photoCaptureBtn.addEventListener("click", () => {
      capturedPhotoDataUrl = captureFrameFromVideo(photoVideoEl);
      stopPhotoCamera();
      photoPreviewImg.src = capturedPhotoDataUrl;
      showPhotoPanel(photoPreviewEl);
    });
  }

  if (photoUploadBtn) photoUploadBtn.addEventListener("click", () => photoFileInput.click());

  if (photoFileInput) {
    photoFileInput.addEventListener("change", async () => {
      const file = photoFileInput.files?.[0];
      if (!file) return;

      try {
        const rawDataUrl = await readFileAsDataURL(file);
        capturedPhotoDataUrl = await downscaleImage(rawDataUrl);
        photoPreviewImg.src = capturedPhotoDataUrl;
        showPhotoPanel(photoPreviewEl);
      } catch (err) {
        photoStatusEl.textContent = err.message || "Couldn't read that photo.";
      }
    });
  }

  if (photoRetakeBtn) {
    photoRetakeBtn.addEventListener("click", () => {
      capturedPhotoDataUrl = null;
      photoStatusEl.textContent = "";
      showPhotoPanel(photoStartEl);
    });
  }

  if (photoAnalyzeBtn) {
    photoAnalyzeBtn.addEventListener("click", async () => {
      if (!capturedPhotoDataUrl) {
        photoStatusEl.textContent = "Take or choose a photo first.";
        return;
      }

      photoAnalyzeBtn.disabled = true;
      photoStatusEl.textContent = "Analyzing photo...";

      try {
        const quantity = photoQuantityInput.value.trim();
        let result;

        if (activePhotoMode === "label" && typeof window.Tesseract !== "undefined") {
          photoStatusEl.textContent = "Performing client-side OCR (0 token usage)...";
          let rawText = "";
          try {
            const ocrResult = await window.Tesseract.recognize(capturedPhotoDataUrl, 'jpn+eng');
            rawText = ocrResult?.data?.text || "";
          } catch (ocrErr) {
            console.warn("Tesseract jpn+eng failed, falling back to eng:", ocrErr);
            const ocrResult = await window.Tesseract.recognize(capturedPhotoDataUrl, 'eng');
            rawText = ocrResult?.data?.text || "";
          }

          const parsed = typeof window.parseNutritionLabelText === "function" ? window.parseNutritionLabelText(rawText) : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

          result = {
            description: parsed.description || "Label OCR Product",
            calories: parsed.calories,
            protein_g: parsed.protein_g,
            carbs_g: parsed.carbs_g,
            fat_g: parsed.fat_g
          };
        } else {
          const res = await fetch("/api/vision-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: capturedPhotoDataUrl, quantity, mode: activePhotoMode }),
          });

          if (!res.ok) {
            let message = "Photo analysis failed. Try again, or add this food by typing instead.";
            try {
              const data = await res.json();
              if (data?.error) message = data.error;
            } catch {
              // ignore
            }
            throw new Error(message);
          }

          result = await res.json();
        }

        currentPhotoResult = result;

        if (photoEditDesc) photoEditDesc.value = result.description || "";
        if (photoEditCalories) photoEditCalories.value = Math.round(result.calories) || 0;
        if (photoEditProtein) photoEditProtein.value = round(result.protein_g) || 0;
        if (photoEditCarbs) photoEditCarbs.value = round(result.carbs_g) || 0;
        if (photoEditFat) photoEditFat.value = round(result.fat_g) || 0;

        showPhotoPanel(null);
        if (photoTipEl) photoTipEl.hidden = true;
        photoStatusEl.textContent = "";
        photoConfirmEl.hidden = false;
      } catch (err) {
        photoStatusEl.textContent =
          err.message || "Something went wrong. Try a clearer photo, or add this food by typing instead.";
      } finally {
        photoAnalyzeBtn.disabled = false;
      }
    });
  }

  if (photoConfirmForm) {
    photoConfirmForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const description = photoEditDesc.value.trim();
      if (!description) return;

      addEntryFromResult(description, {
        calories: Number(photoEditCalories.value) || 0,
        protein_g: Number(photoEditProtein.value) || 0,
        carbs_g: Number(photoEditCarbs.value) || 0,
        fat_g: Number(photoEditFat.value) || 0,
      });
      closePhotoModal();
    });
  }

  if (photoRetryBtn) {
    photoRetryBtn.addEventListener("click", () => {
      photoConfirmEl.hidden = true;
      photoTipEl.hidden = false;
      showPhotoPanel(photoStartEl);
      photoStatusEl.textContent = "";
    });
  }
}
