import React, { useState } from "react";
import ProjectForm from "./ProjectForm";
import StatusSheet from "./StatusSheet";
import { Button } from "./ui/button";

const Home = () => {
  const [mode, setMode] = useState<"form" | "preview">("form");
  const [projectData, setProjectData] = useState(null);

  const handleFormSubmit = (data: any) => {
    setProjectData(data);
    setMode("preview");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {mode === "preview" && (
          <div className="mb-4">
            <Button onClick={() => setMode("form")}>Edit Project</Button>
          </div>
        )}

        {mode === "form" ? (
          <ProjectForm onSubmit={handleFormSubmit} />
        ) : (
          <StatusSheet data={projectData} />
        )}
      </div>
    </div>
  );
};

export default Home;
