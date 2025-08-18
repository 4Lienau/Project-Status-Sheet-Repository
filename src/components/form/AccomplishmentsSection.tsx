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
      <div className="space-y-2 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm mb-0">
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
          className="bg-white/50 backdrop-blur-sm border-gray-200/50"
        >
          Add Accomplishment
        </Button>
      </div>
    </>
  );
};

export default AccomplishmentsSection;
