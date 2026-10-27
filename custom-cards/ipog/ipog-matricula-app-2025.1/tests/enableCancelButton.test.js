const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../src/app/cards/CheckoutCard.jsx"),
  "utf8",
);

if (!source.includes('const CANCEL_RESULT_MODAL_ID = "cancelarPreMatriculaModal";')) {
  throw new Error("Cancellation result modal id missing");
}
if (source.includes("CANCEL_MAINTENANCE_MESSAGE")) {
  throw new Error("Maintenance message still disables cancellation");
}

const start = source.indexOf("{canCancelPreEnrollment && (");
const end = source.indexOf("{showCancelConfirm &&", start);
const cancelSection = source.slice(start, end);
if (!cancelSection.includes("onClick={() => setShowCancelConfirm(true)}")) {
  throw new Error("Cancel button does not open confirmation");
}
if (!cancelSection.includes("Cancelar pré-matrícula")) {
  throw new Error("Cancel button label missing");
}

const actionRowStart = source.lastIndexOf('<Flex direction="column" gap="small">', start);
const actionRow = source.slice(actionRowStart, end);
const primaryStart = actionRow.indexOf("<Button");
const primaryEnd = actionRow.indexOf("</Button>", primaryStart);
const cancelStart = actionRow.indexOf("<LoadingButton");
const cancelEnd = actionRow.indexOf("</LoadingButton>", cancelStart);
const primaryButton = actionRow.slice(primaryStart, primaryEnd);
const cancelButton = actionRow.slice(cancelStart, cancelEnd);
if (!primaryButton.includes('size="md"') || !cancelButton.includes('size="md"')) {
  throw new Error("Buttons must use the same md size");
}

console.log("Cancellation button source assertions passed.");
