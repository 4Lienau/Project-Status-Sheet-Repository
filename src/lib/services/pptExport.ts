import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";

export const exportToPowerPoint = async (
  element: HTMLElement,
  title: string,
) => {
  try {
    // First create an image of the status sheet using html2canvas
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2, // Higher quality
      height: element.scrollHeight + 50, // Add padding to ensure we capture everything
      windowHeight: element.scrollHeight + 50,
      logging: false,
      useCORS: true,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(element.id);
        if (clonedElement) {
          clonedElement.style.padding = "25px";
        }
      },
    });

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL("image/png");

    // Create new PowerPoint presentation
    const pres = new pptxgen();

    // Add a slide
    const slide = pres.addSlide();

    // Add a title
    slide.addText(title || "Project Status", {
      x: 0.5,
      y: 0.3,
      w: "90%",
      fontSize: 24,
      bold: true,
      color: "363636",
    });

    // Calculate dimensions to maintain aspect ratio
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    const ratio = imageHeight / imageWidth;

    // PowerPoint slide dimensions (in inches)
    const slideWidth = 10; // Standard slide width
    const maxHeight = 4.0; // Reduced height to ensure everything fits

    // Calculate dimensions while maintaining aspect ratio
    let finalWidth = slideWidth * 0.65; // Use 65% of slide width
    let finalHeight = finalWidth * ratio;

    // If height is too tall, scale down proportionally
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight / ratio;
    }

    // Add the image to the slide
    slide.addImage({
      data: imageData,
      x: (slideWidth - finalWidth) / 2, // Center horizontally
      y: 1.0, // Start closer to title
      w: finalWidth,
      h: finalHeight,
    });

    // Add a footer
    slide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: 0.5,
      y: "92%",
      w: "90%",
      fontSize: 10,
      color: "666666",
      align: "right",
    });

    // Save the PowerPoint file
    await pres.writeFile({
      fileName: `${title || "status-sheet"}_${new Date().toISOString().split("T")[0]}.pptx`,
    });

    return true;
  } catch (error) {
    console.error("Error exporting to PowerPoint:", error);
    return false;
  }
};
