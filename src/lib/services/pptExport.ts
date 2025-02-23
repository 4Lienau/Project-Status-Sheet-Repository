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
      height: element.scrollHeight + 20, // Minimal padding
      windowHeight: element.scrollHeight + 20,
      logging: true,
      useCORS: true,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(element.id);
        if (clonedElement) {
          clonedElement.style.padding = "5px"; // Minimal padding
          clonedElement.style.paddingBottom = "15px"; // Small bottom padding for legend
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
      fontSize: 18,
      bold: true,
      color: "1D4ED8",
    });

    // Calculate dimensions to maintain aspect ratio
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    const ratio = imageHeight / imageWidth;

    // PowerPoint slide dimensions (in inches)
    const slideWidth = 10;
    const maxHeight = 5.5; // Reduced from 6.5

    // Calculate dimensions while maintaining aspect ratio
    let finalWidth = slideWidth * 0.75; // Reduced from 0.9
    let finalHeight = finalWidth * ratio;

    // If height is too tall, scale down proportionally
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = finalHeight / ratio;
    }

    // Add the image to the slide
    slide.addImage({
      data: imageData,
      x: (slideWidth - finalWidth) / 2,
      y: 0.8,
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
