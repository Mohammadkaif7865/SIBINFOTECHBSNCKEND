const path = require('path');
const fs = require('fs');

// Existing image path (if any) from the hidden field
let imagePath = req.body.imageHidden;

// Check if a new image was uploaded
if (req.files && req.files.image != undefined && req.files.image.length > 0) {
  // New image uploaded
  const uploadedImage = req.files.image[0];
  const fileExtension = path.extname(uploadedImage.originalname);

  // Case 2: New image uploaded, but custom name not changed
  if (!req.body.image_name) {
    const oldFileName = path.basename(imagePath);
    const newFileName = oldFileName.split('.')[0] + fileExtension;
    imagePath = uploadedImage.destination + newFileName;
  } else {
    // Case 3: New image uploaded, and custom name changed
    let customImageName = req.body.image_name;
    const newFileName = ${customImageName}${fileExtension};
    imagePath = uploadedImage.destination + newFileName;
  }

  // Rename and save the new image
  fs.renameSync(uploadedImage.path, imagePath);

} else if (req.body.image_name && req.body.image_name !== '') {
  // Case 1: No new image uploaded, but custom name changed
  const oldFileName = path.basename(imagePath);
  const oldExtension = path.extname(oldFileName);
  const newFileName = ${req.body.image_name}${oldExtension};
  imagePath = path.dirname(imagePath) + '/' + newFileName;

  // Rename the existing image file with the new custom name
  fs.renameSync(req.body.imageHidden, imagePath);
}
