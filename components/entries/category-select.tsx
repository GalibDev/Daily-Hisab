"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinance } from "@/components/state/finance-store";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function CategorySelect({ defaultValue }: Readonly<{ defaultValue?: string }>) {
  const { addCategory, categories } = useFinance();
  const { notify } = useToast();
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(defaultValue ?? categories[0] ?? "");
  const selectedValue = categories.includes(selectedCategory) ? selectedCategory : (categories[0] ?? "");

  function handleAddCategory() {
    const added = addCategory(newCategory);
    if (added) {
      notify("Category added successfully", "info");
      setSelectedCategory(newCategory.trim());
      setNewCategory("");
      return;
    }
    notify("Category already exists or empty", "danger");
  }

  return (
    <div className="grid gap-2">
      <select
        name="category"
        className={inputClass}
        value={selectedValue}
        onChange={(event) => setSelectedCategory(event.target.value)}
        required
      >
        <option value="" disabled>
          Select category
        </option>
        {categories.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className={inputClass}
          placeholder="New category"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={handleAddCategory} className="h-11 px-3">
          <Plus size={16} /> Add
        </Button>
      </div>
    </div>
  );
}
