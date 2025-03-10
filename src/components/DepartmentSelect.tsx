import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/useAuth";

interface DepartmentSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  value,
  onValueChange,
  placeholder = "Select department",
  disabled = false,
}) => {
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadDepartments = async () => {
      setLoading(true);
      try {
        // Get user's department
        if (user?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("department")
            .eq("id", user.id)
            .single();

          if (profileData?.department) {
            setUserDepartment(profileData.department);

            // If no value is set, default to user's department
            if (!value && profileData.department) {
              onValueChange(profileData.department);
            }
          }
        }

        // Get all departments
        const { data, error } = await supabase
          .from("departments")
          .select("id, name")
          .order("name");

        if (error) throw error;

        if (data) {
          setDepartments(data);
        }
      } catch (error) {
        console.error("Error loading departments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDepartments();
  }, [user?.id, value, onValueChange]);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.name}>
            {dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DepartmentSelect;
