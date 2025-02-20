// Previous imports remain the same...

const ProjectForm = ({ initialData, onSubmit }: ProjectFormProps) => {
  // ... other code remains the same until the AI generation part

  const generateContent = async (prompt: string, systemPrompt: string) => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to generate content");

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  };

  // Update the click handlers to use the new generateContent function
  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project title first",
        variant: "destructive",
      });
      return;
    }

    if (formData.description?.trim()) {
      const shouldReplace = window.confirm(
        "This will replace your existing project description. Do you want to continue?",
      );
      if (!shouldReplace) return;
    }

    setIsGenerating(true);
    try {
      const description = await generateContent(
        formData.title,
        "You are a professional project manager. Generate a concise but detailed project description focusing on purpose, goals, and expected outcomes based on the project title. Return ONLY the description text, no other content or formatting.",
      );

      setFormData({
        ...formData,
        description: description,
      });

      toast({
        title: "Success",
        description: "Generated project description",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to generate description",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Similar updates for value statement and milestone generation...

  // Rest of the component remains the same...
};

export default ProjectForm;
