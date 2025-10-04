import React from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { ListItemRow } from "./ListItemRow";

interface AccomplishmentsSectionProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

const AccomplishmentsSection: React.FC<AccomplishmentsSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <>
      <SectionHeader
        title="Accomplishments"
        tooltip="List key accomplishments or completed deliverables for the project to date."
      />
      <div className="space-y-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 border-4 border-border shadow-lg">
        {formData.accomplishments.map((item, index) => (
          <ListItemRow
            key={index}
            value={item}
            index={index}
            placeholder="Enter accomplishment"
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                accomplishments: prev.accomplishments.map((a, i) =>
                  i === index ? value : a,
                ),
              }))
            }
            onDelete={() =>
              setFormData((prev) => ({
                ...prev,
                accomplishments: prev.accomplishments.filter(
                  (_, i) => i !== index,
                ),
              }))
            }
          />
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              accomplishments: [...prev.accomplishments, ""],
            }))
          }
          className="bg-card/50 backdrop-blur-sm border-border"
        >
          Add Accomplishment
        </Button>
      </div>
    </>
  );
};

export default AccomplishmentsSection;